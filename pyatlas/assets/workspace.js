/* Shared workspace validation; usable in the browser and Node.js tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PyAtlasCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const statuses = ['Unreviewed', 'Learning', 'Evaluating', 'In use', 'Archived'];
  const empty = () => ({schema_version: 4, custom: [], bookmarks: [], metadata: {}, savedSearches: []});
  const idOK = value => typeof value === 'string' && /^(?:[a-f0-9]{16}|custom-[a-z0-9-]{8,80})$/.test(value);
  function text(value, max, label, required=false) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`Invalid ${label}`);
    return value.trim();
  }
  function list(value, label) {
    if (!Array.isArray(value) || value.length > 30) throw new Error(`Invalid ${label}`);
    return [...new Set(value.map(v=>text(v,60,label,true)))];
  }
  function project(value) {
    if (!value || !idOK(value.id) || !value.id.startsWith('custom-')) throw new Error('Invalid custom project ID');
    const url = new URL(text(value.url,2048,'project URL',true));
    if (!['https:','http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error('Only HTTP(S) URLs without credentials are allowed');
    return {id:value.id,name:text(value.name,120,'project name',true),url:url.href,
      description:text(value.description,3000,'description',true),category:text(value.category,120,'category',true),group:text(value.group,120,'specialism')};
  }
  function metadata(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid project metadata');
    if (!statuses.includes(value.status) || !Number.isInteger(value.rating) || value.rating < 0 || value.rating > 5) throw new Error('Invalid status or rating');
    const priority=value.priority===undefined?'Normal':value.priority,dueDate=value.dueDate===undefined?'':value.dueDate,tasks=value.tasks===undefined?[]:value.tasks;
    if (!['Low','Normal','High'].includes(priority)) throw new Error('Invalid priority');
    if (typeof dueDate!=='string' || (dueDate && !validDate(dueDate))) throw new Error('Invalid deadline');
    if (!Array.isArray(tasks) || tasks.length>50) throw new Error('At most 50 checklist tasks are allowed per project');
    const ids=new Set();
    const checkedTasks=tasks.map(t=>{if(!t || typeof t.id!=='string' || !/^task-[a-z0-9-]{8,80}$/.test(t.id) || ids.has(t.id) || typeof t.done!=='boolean')throw new Error('Invalid or duplicate task ID');ids.add(t.id);return {id:t.id,text:text(t.text,240,'task text',true),done:t.done};});
    return {notes:text(value.notes,10000,'notes'),tags:list(value.tags,'tags'),collections:list(value.collections,'collections'),status:value.status,rating:value.rating,priority,dueDate,tasks:checkedTasks};
  }
  function validate(value) {
    if (!value || ![2,3,4].includes(value.schema_version) || !Array.isArray(value.custom) || !Array.isArray(value.bookmarks) || !value.metadata || typeof value.metadata !== 'object' || Array.isArray(value.metadata)) throw new Error('This is not a PyAtlas workspace backup (schema 2, 3 or 4)');
    if (value.custom.length > 5000 || value.bookmarks.length > 10000 || Object.keys(value.metadata).length > 10000) throw new Error('Workspace exceeds item limits');
    const out=empty(),seen=new Set();
    out.custom=value.custom.map(v=>{const row=project(v);if(seen.has(row.id))throw new Error('Duplicate custom project ID');seen.add(row.id);return row;});
    out.bookmarks=[...new Set(value.bookmarks.map(id=>{if(!idOK(id))throw new Error('Invalid bookmark ID');return id;}))];
    for (const [id,m] of Object.entries(value.metadata)) {if(!idOK(id))throw new Error('Invalid metadata ID');out.metadata[id]=metadata(m);}
    if (value.schema_version >= 3) {
      if (!Array.isArray(value.savedSearches) || value.savedSearches.length > 50) throw new Error('Invalid saved searches');
      const names = new Set();
      out.savedSearches = value.savedSearches.map(raw => {const item=savedSearch(raw);if(names.has(item.name))throw new Error('Duplicate saved search name');names.add(item.name);return item;});
    }
    return out;
  }
  function savedSearch(value) {
    if (!value || !value.filters || typeof value.filters !== 'object') throw new Error('Invalid saved search');
    const f=value.filters;
    if (typeof f.savedOnly !== 'boolean' || !['name','category','priority','deadline','rating'].includes(f.sort) || !['','custom','catalogue'].includes(f.source) || !['',...statuses].includes(f.status) || !Number.isInteger(f.rating) || f.rating<0 || f.rating>5) throw new Error('Invalid saved search filters');
    const priority=f.priority===undefined?'':f.priority,due=f.due===undefined?'':f.due;if(!['','Low','Normal','High'].includes(priority)||!['','overdue','soon','none'].includes(due))throw new Error('Invalid planning filters');const tag=f.tag===undefined?'':text(f.tag,60,'search tag');
    return {name:text(value.name,80,'search name',true),filters:{query:text(f.query,500,'search query'),category:text(f.category,120,'search category'),collection:text(f.collection,60,'search collection'),savedOnly:f.savedOnly,sort:f.sort,source:f.source,status:f.status,rating:f.rating,priority,due,tag}};
  }
  function merge(current, incoming) {
    const a=validate(current),b=validate(incoming),custom=new Map(a.custom.map(r=>[r.id,r]));
    b.custom.forEach(r=>custom.set(r.id,r));
    const searches=new Map(a.savedSearches.map(v=>[v.name,v]));b.savedSearches.forEach(v=>searches.set(v.name,v));
    return validate({schema_version:4,custom:[...custom.values()],bookmarks:[...new Set([...a.bookmarks,...b.bookmarks])],metadata:{...a.metadata,...b.metadata},savedSearches:[...searches.values()]});
  }
  const defaultMetadata = () => ({notes:'',tags:[],collections:[],status:'Unreviewed',rating:0,priority:'Normal',dueDate:'',tasks:[]});
  function batch(current, ids, changes) {
    const out=validate(current);
    if (!Array.isArray(ids) || ids.length>10000 || ids.some(id=>!idOK(id))) throw new Error('Invalid batch selection');
    if (changes.status && !statuses.includes(changes.status)) throw new Error('Invalid batch status');
    const additions=changes.collection ? list([changes.collection],'collection') : [];
    for(const id of new Set(ids)) {
      const previous=out.metadata[id] || defaultMetadata();
      if(additions.length&&new Set([...previous.collections,...additions]).size>30)throw new Error('A selected project already has 30 collections; remove one before adding another. No changes were made.');
      out.metadata[id]=metadata({...previous,status:changes.status||previous.status,collections:[...new Set([...previous.collections,...additions])]});
    }
    return validate(out);
  }
  function analytics(rows, current) {
    const state=validate(current),statusesCount=Object.fromEntries(statuses.map(s=>[s,0])),categories=new Map(),ids=new Set(rows.map(r=>r.id));
    let notes=0,rated=0,ratingSum=0,tasks=0,completedTasks=0;
    for (const row of rows) {const m=state.metadata[row.id]||defaultMetadata();statusesCount[m.status]++;categories.set(row.category,(categories.get(row.category)||0)+1);if(m.notes)notes++;if(m.rating){rated++;ratingSum+=m.rating;}tasks+=m.tasks.length;completedTasks+=m.tasks.filter(t=>t.done).length;}
    return {tasks,completedTasks,total:rows.length,custom:rows.filter(r=>r.id.startsWith('custom-')).length,bookmarks:state.bookmarks.filter(id=>ids.has(id)).length,notes,rated,averageRating:rated?ratingSum/rated:0,statuses:statusesCount,categories:[...categories].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
  }
  function validDate(value) {return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value+'T00:00:00Z')) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
  function dueBucket(m,today) {
    if(!validDate(today))throw new Error('Invalid reference date');
    if(!m.dueDate)return 'none';
    if(m.dueDate<today)return 'overdue';
    return (Date.parse(m.dueDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000<=7?'soon':'later';
  }
  function matches(row,m,query) {
    const haystack=[row.name,row.description,row.category,row.group,m.notes,m.status,m.priority,...m.tags,...m.collections,...m.tasks.map(t=>t.text)].join(' ').toLocaleLowerCase();
    const tokens=[...query.matchAll(/(-?)(?:"([^"]*)"|([^\s"]+))/g)];
    return tokens.every(token=>{const term=(token[2]||token[3]||'').toLocaleLowerCase();return !term || (token[1]==='-'?!haystack.includes(term):(token[2]!==undefined?haystack.includes(term):(globalThis.PyAtlasFeatures?globalThis.PyAtlasFeatures.fuzzy(haystack,term):haystack.includes(term))));});
  }
  function compare(a,b,current,sort) {
    const ma=current.metadata[a.id]||defaultMetadata(),mb=current.metadata[b.id]||defaultMetadata();let result=0;
    if(sort==='priority')result=['High','Normal','Low'].indexOf(ma.priority)-['High','Normal','Low'].indexOf(mb.priority);
    else if(sort==='deadline')result=(ma.dueDate||'9999-12-31').localeCompare(mb.dueDate||'9999-12-31');
    else if(sort==='rating')result=mb.rating-ma.rating;
    else result=a[sort].localeCompare(b[sort]);
    return result||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
  }
  function report(rows,current,options={}) {
    const state=validate(current),a=analytics(rows,state);
    const plain=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~-])/g,'\\$1');
    const lines=['# PyAtlas Pro — Progress report','',`Projects: ${a.total} · Tasks completed: ${a.completedTasks}/${a.tasks}`,'','This report covers the current filtered result set. Ratings, plans and notes are personal workspace data.',''];
    for(const row of rows){const m=state.metadata[row.id]||defaultMetadata();lines.push('## '+plain(row.name),'',plain(row.description),'',`Project URL: ${plain(row.url)}`,'',`Category: ${plain(row.category)} · Status: ${plain(m.status)} · Priority: ${m.priority} · Deadline: ${m.dueDate||'None'}`,'',`Personal rating: ${m.rating||'Unrated'} · Collections: ${plain(m.collections.join(', ')||'None')}`,'');
      for(const t of m.tasks)lines.push(`- [${t.done?'x':' '}] ${plain(t.text)}`);
      if(m.tasks.length)lines.push('');
      if(options.includeNotes&&m.notes)lines.push('### Private notes','',...m.notes.split(/\r?\n/).map(line=>'> '+plain(line)),'');
    }
    lines.push('---','','Catalogue adapted from Awesome Python by Vinta Chen and contributors (CC BY 4.0).','Source: https://github.com/vinta/awesome-python','Licence: https://creativecommons.org/licenses/by/4.0/','Custom projects retain their own ownership and licences.');return lines.join('\n')+'\n';
  }
  const sorts=['name','category','priority','deadline','rating'];
  const viewDefaults={query:'',category:'',collection:'',savedOnly:false,sort:'name',source:'',status:'',rating:0,priority:'',due:'',tag:''};
  const viewKeys={query:'q',category:'cat',collection:'coll',savedOnly:'saved',sort:'sort',source:'src',status:'status',rating:'rating',priority:'prio',due:'due',tag:'tag'};
  function encodeView(view) {
    const params=new URLSearchParams();
    for(const [key,short] of Object.entries(viewKeys)){const value=view[key],fallback=viewDefaults[key];if(value===undefined||value===fallback)continue;params.set(short,typeof value==='boolean'?(value?'1':'0'):String(value));}
    return params.toString();
  }
  function decodeView(hash) {
    const raw=String(hash||'').replace(/^#/,'');if(!raw.includes('='))return null;
    let params;try{params=new URLSearchParams(raw);}catch(_){return null;}
    const str=(key,max)=>{const value=params.get(key)||'';return value.length<=max?value:'';};
    const pick=(key,allowed)=>{const value=params.get(key)||'';return allowed.includes(value)?value:viewDefaults[Object.keys(viewKeys).find(k=>viewKeys[k]===key)];};
    const rating=Number(params.get('rating')||0);
    return {query:str('q',500),category:str('cat',120),collection:str('coll',60),savedOnly:params.get('saved')==='1',sort:pick('sort',sorts),source:pick('src',['','custom','catalogue']),status:pick('status',['',...statuses]),rating:Number.isInteger(rating)&&rating>=0&&rating<=5?rating:0,priority:pick('prio',['','Low','Normal','High']),due:pick('due',['','overdue','soon','none']),tag:str('tag',60)};
  }
  function urlKey(value) {
    try{const u=new URL(value);return u.hostname.toLowerCase().replace(/^www\./,'')+u.pathname.replace(/\/+$/,'').toLowerCase()+u.search;}catch(_){return String(value).trim().toLowerCase();}
  }
  function duplicates(rows) {
    const groups=new Map();
    for(const row of rows){const key=urlKey(row.url);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
    const out={};
    for(const group of groups.values())if(group.length>1)for(const row of group)out[row.id]=group.filter(other=>other.id!==row.id);
    return out;
  }
  return {encodeView,decodeView,urlKey,duplicates,empty,validate,merge,project,metadata,defaultMetadata,statuses,savedSearch,batch,analytics,validDate,dueBucket,matches,compare,report};
});
