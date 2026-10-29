'use strict';
(() => {
  const $=id=>document.getElementById(id), core=globalThis.PyAtlasCore,productivity=globalThis.PyAtlasProductivity,vault=globalThis.PyAtlasVault;
  const data=JSON.parse($('catalog-data').textContent), selected=new Set();
  const stateKey='pyatlas-pro:workspace:v4',bulk=new Set(),history=[],future=[];
  let boardMode=false,draftTasks=[],focusLimit=24,vaultMode='backup',lockedImport=null,vaultTicket=0;
  const ask=(message,value)=>prompt(message,value);
  const confirmAction=message=>confirm(message);
  function today(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
  let dupes={},dupAcknowledged='',state=core.empty(),category='',savedOnly=false,limit=48,editing=null,pendingImport=null;
  function notice(message) {$('storage-notice').hidden=false;$('storage-notice').textContent=message;}
  try {
    const raw=localStorage.getItem(stateKey)||localStorage.getItem('pyatlas-pro:workspace:v3')||localStorage.getItem('pyatlas-pro:workspace:v2');
    if(raw) state=core.validate(JSON.parse(raw));
    else {const old=JSON.parse(localStorage.getItem('pyatlas-pro:bookmarks:v1')||'[]');if(Array.isArray(old))state.bookmarks=old.filter(id=>data.entries.some(r=>r.id===id));}
  } catch (_) {notice('Saved workspace could not be loaded. Changes are available in this session; export a backup before closing.');}
  let storedTheme=null;try {storedTheme=localStorage.getItem('pyatlas-pro:theme');} catch (_) {}
  document.body.classList.toggle('dark',storedTheme?storedTheme==='dark':!!(globalThis.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches));
  function persist() {try {localStorage.setItem(stateKey,JSON.stringify(state));return true;} catch (_) {notice('Browser storage is unavailable or full. Export a workspace backup before closing to keep your changes.');return false;}}
  function syncHistory() {$('undo').disabled=history.length===0;$('redo').disabled=future.length===0;}
  function commit(next) {const checked=core.validate(next);history.push(core.validate(state));if(history.length>20)history.shift();future.length=0;state=checked;syncHistory();return persist();}
  function refreshAll() {const ids=new Set(entries().map(r=>r.id));for(const id of bulk)if(!ids.has(id))bulk.delete(id);for(const id of selected)if(!ids.has(id))selected.delete(id);refreshNavigation();refreshSavedSearches();render();syncHistory();}
  $('undo').onclick=()=>{if(!history.length)return;future.push(core.validate(state));state=history.pop();const saved=persist();refreshAll();if(saved)notice('Last workspace change undone. Undo history lasts only for this session.');};
  $('redo').onclick=()=>{if(!future.length)return;history.push(core.validate(state));state=future.pop();const saved=persist();refreshAll();if(saved)notice('Workspace change restored.');};
  const entries=()=>[...data.entries,...state.custom];
  const meta=id=>state.metadata[id]||core.defaultMetadata();
  const custom=row=>row.id.startsWith('custom-');
  function node(tag,text,className) {const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
  function ensureOption(select,value) {if(value&&![...select.options].some(o=>o.value===value))select.append(new Option(value+' (no current members)',value));}
  function link(row) {const a=node('a','Visit project ↗');a.href=row.url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function saveFile(name,body,type) {const url=URL.createObjectURL(new Blob([body],{type}));const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function filtered() {
    const query=$('query').value,key=$('sort').value,day=today();
    return entries().filter(r=>{const m=meta(r.id);return (!category||r.category===category)&&(!savedOnly||state.bookmarks.includes(r.id))&&(!$('status-filter').value||m.status===$('status-filter').value)&&(!$('collection-filter').value||m.collections.includes($('collection-filter').value))&&(!$('tag-filter').value||m.tags.includes($('tag-filter').value))&&(!$('source-filter').value||custom(r)===($('source-filter').value==='custom'))&&m.rating>=Number($('rating-filter').value)&&(!$('priority-filter').value||m.priority===$('priority-filter').value)&&(!$('due-filter').value||core.dueBucket(m,day)===$('due-filter').value)&&core.matches(r,m,query);})
      .sort((a,b)=>core.compare(a,b,state,key));
  }
  function updateCompare() {
    $('compare-tray').hidden=selected.size===0;$('compare-label').textContent=`${selected.size} of 3 projects selected`;$('compare-open').disabled=selected.size<2;
    document.querySelectorAll('[data-compare-id]').forEach(e=>{e.checked=selected.has(e.dataset.compareId);e.disabled=selected.size>=3&&!e.checked;});
  }
  function card(row) {
    const m=meta(row.id),article=node('article',undefined,'card'),head=node('div',undefined,'card-head');head.append(node('span',row.name.slice(0,2).toUpperCase(),'icon'));
    article.dataset.projectId=row.id;
    const star=node('button',state.bookmarks.includes(row.id)?'★':'☆','bookmark');star.setAttribute('aria-label',`Bookmark ${row.name}`);star.setAttribute('aria-pressed',String(state.bookmarks.includes(row.id)));
    star.onclick=()=>{const bookmarks=state.bookmarks.includes(row.id)?state.bookmarks.filter(id=>id!==row.id):[...state.bookmarks,row.id];commit({...state,bookmarks});if(savedOnly)render();else{star.textContent=state.bookmarks.includes(row.id)?'★':'☆';star.setAttribute('aria-pressed',String(state.bookmarks.includes(row.id)));$('saved-count').textContent=state.bookmarks.filter(id=>entries().some(r=>r.id===id)).length;}};
    const pick=node('input');pick.type='checkbox';pick.dataset.bulkId=row.id;pick.checked=bulk.has(row.id);pick.setAttribute('aria-label',`Select ${row.name} for bulk update`);pick.onchange=()=>{if(pick.checked)bulk.add(row.id);else bulk.delete(row.id);updateBulk();};head.append(pick,star);article.append(head,node('h3',row.name),node('span',row.category,'tag'),node('p',row.description));
    const badges=node('div',undefined,'badges');const also=dupes[row.id]||[];if(also.length){const same=node('span','Also in '+[...new Set(also.map(o=>o.category))].slice(0,2).join(', '),'tag');same.title='The same project URL is listed in: '+also.map(o=>o.category).join(', ');badges.append(same);}if(custom(row))badges.append(node('span','Custom','tag'));if(m.status!=='Unreviewed')badges.append(node('span',m.status,'tag'));if(m.rating)badges.append(node('span','★'.repeat(m.rating),'rating'));if(m.priority==='High')badges.append(node('span','High priority','tag priority-high'));if(m.dueDate)badges.append(node('span','Due '+m.dueDate,'tag '+(core.dueBucket(m,today())==='overdue'?'overdue':'')));if(m.tasks.length)badges.append(node('span',`${m.tasks.filter(t=>t.done).length}/${m.tasks.length} tasks`,'tag'));m.tags.slice(0,3).forEach(t=>{const chip=node('button',t,'tag tag-button');chip.type='button';chip.setAttribute('aria-label','Filter by tag '+t);chip.onclick=()=>{ensureOption($('tag-filter'),t);$('tag-filter').value=t;limit=48;render();};badges.append(chip);});article.append(badges);
    const details=node('button',m.notes?'Workspace · notes saved':'Notes & details','details-button');details.onclick=()=>openEditor(row);article.append(details);
    const bottom=node('div',undefined,'card-bottom'),label=node('label'),check=node('input');check.type='checkbox';check.dataset.compareId=row.id;check.setAttribute('aria-label',`Compare ${row.name}`);check.onchange=()=>{if(check.checked&&selected.size<3)selected.add(row.id);else selected.delete(row.id);updateCompare();};label.append(check,document.createTextNode('Compare'));bottom.append(link(row),label);article.append(bottom);return article;
  }
  function refreshNavigation() {
    const all=entries(),counts=new Map();all.forEach(r=>counts.set(r.category,(counts.get(r.category)||0)+1));$('categories').replaceChildren();$('category-options').replaceChildren();
    [...counts].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,count])=>{const button=node('button',name,'category');button.dataset.category=name;button.append(node('span',count));button.onclick=()=>{category=category===name?'':name;limit=48;render();};$('categories').append(button);const option=node('option');option.value=name;$('category-options').append(option);});
    const previous=$('collection-filter').value;$('collection-filter').replaceChildren(new Option('All collections',''));
    [...new Set(Object.values(state.metadata).flatMap(m=>m.collections))].sort().forEach(name=>$('collection-filter').append(new Option(name,name)));
    if(previous&&![...$('collection-filter').options].some(o=>o.value===previous))$('collection-filter').append(new Option(previous+' (no current members)',previous));$('collection-filter').value=previous;
    const previousTag=$('tag-filter').value;$('tag-filter').replaceChildren(new Option('All tags',''));[...new Set(Object.values(state.metadata).flatMap(m=>m.tags))].sort().forEach(name=>$('tag-filter').append(new Option(name,name)));ensureOption($('tag-filter'),previousTag);$('tag-filter').value=previousTag;
    $('total').textContent=all.length;$('stat-projects').textContent=all.length;$('stat-categories').textContent=counts.size;
    if(category&&!counts.has(category))category='';
  }
  function render() {
    dupes=core.duplicates(entries());const rows=filtered();$('results').hidden=boardMode;$('workflow-board').hidden=!boardMode;$('layout-toggle').disabled=boardMode;if(boardMode)renderBoard(rows.slice(0,limit));$('results').replaceChildren(...rows.slice(0,limit).map(r=>card(r)));$('status').textContent=`${rows.length} projects · showing ${Math.min(rows.length,limit)}`;$('empty').hidden=rows.length>0;$('more').hidden=limit>=rows.length;
    const ids=new Set(entries().map(r=>r.id));$('saved-count').textContent=state.bookmarks.filter(id=>ids.has(id)).length;$('view-title').textContent=category||(savedOnly?'Your bookmarked projects':'Explore all projects');$('all').classList.toggle('active',!savedOnly);$('saved').classList.toggle('active',savedOnly);
    document.querySelectorAll('.category').forEach(e=>{const active=e.dataset.category===category;e.classList.toggle('active',active);e.setAttribute('aria-pressed',String(active));});updateCompare();updateBulk();syncLocation();
  }
  function openEditor(row=null) {
    editing=row;dupAcknowledged='';const editable=!row||custom(row),m=row?meta(row.id):core.defaultMetadata();$('editor-title').textContent=row?row.name:'Add a custom project';$('editor-hint').textContent=editable?'Your project and workspace changes are saved in this browser.':'Bundled catalogue fields are read-only. Your notes, tags, collections, status and rating are editable.';
    for(const key of ['name','url','category','group','description']){$('edit-'+key).value=row?row[key]:'';$('edit-'+key).disabled=!editable;}
    draftTasks=m.tasks.map(t=>({...t}));$('task-text').value='';renderTasks();$('edit-priority').value=m.priority;$('edit-deadline').value=m.dueDate;$('edit-notes').value=m.notes;$('edit-tags').value=m.tags.join(', ');$('edit-collections').value=m.collections.join(', ');$('edit-status').value=m.status;$('edit-rating').value=String(m.rating);$('delete-project').hidden=!row||!custom(row);$('editor-error').textContent='';$('editor').showModal();
  }
  $('project-form').onsubmit=e=>{
    e.preventDefault();try {
      let row=editing;
      if(!row||custom(row)){const id=row?row.id:'custom-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));const draft={id};for(const key of ['name','url','category','group','description'])draft[key]=$('edit-'+key).value;row=core.project(draft);const clash=(!editing||core.urlKey(editing.url)!==core.urlKey(row.url))?entries().find(o=>o.id!==row.id&&core.urlKey(o.url)===core.urlKey(row.url)):null;if(clash&&dupAcknowledged!==core.urlKey(row.url)){dupAcknowledged=core.urlKey(row.url);throw new Error(`This URL is already listed as “${clash.name}” in ${clash.category}. Choose Save project again to add it anyway.`);}}
      const split=value=>value.split(',').map(t=>t.trim()).filter(Boolean);
      const m=core.metadata({notes:$('edit-notes').value,tags:split($('edit-tags').value),collections:split($('edit-collections').value),status:$('edit-status').value,rating:Number($('edit-rating').value),priority:$('edit-priority').value,dueDate:$('edit-deadline').value,tasks:draftTasks});
      const next={...state,metadata:{...state.metadata,[row.id]:m},custom:custom(row)?[...state.custom.filter(r=>r.id!==row.id),row]:state.custom};const saved=commit(next);refreshAll();$('editor').close();if(saved)notice('Project workspace saved. Export a backup to keep a portable copy.');
    } catch(error) {$('editor-error').textContent=error.message;}
  };
  $('delete-project').onclick=()=>{if(!editing||!custom(editing)||!confirmAction(`Delete ${editing.name} and its private notes? Undo can restore it during this session. Export a backup for a durable copy.`))return;const id=editing.id,next=core.validate(state);next.custom=next.custom.filter(r=>r.id!==id);next.bookmarks=next.bookmarks.filter(v=>v!==id);delete next.metadata[id];commit(next);selected.delete(id);bulk.delete(id);refreshAll();$('editor').close();};
  $('add-project').onclick=()=>openEditor();$('editor-close').onclick=()=>$('editor').close();
  core.statuses.forEach(s=>{$('edit-status').append(new Option(s,s));$('status-filter').append(new Option(s,s));$('bulk-status').append(new Option(s,s));});
  for(const id of ['query','sort','status-filter','collection-filter','tag-filter','source-filter','rating-filter','priority-filter','due-filter'])$(id)[id==='query'?'oninput':'onchange']=()=>{limit=48;render();};
  $('all').onclick=()=>{savedOnly=false;category='';limit=48;render();};$('saved').onclick=()=>{savedOnly=true;category='';limit=48;render();};
  $('reset').onclick=()=>{category='';savedOnly=false;$('query').value='';for(const id of ['status-filter','collection-filter','tag-filter','source-filter','priority-filter','due-filter'])$(id).value='';$('rating-filter').value='0';limit=48;render();};
  $('reset-filters').onclick=()=>$('reset').onclick();
  $('more').onclick=()=>{limit+=48;render();};$('layout-toggle').onclick=()=>{const active=$('results').classList.toggle('list-view');$('layout-toggle').setAttribute('aria-pressed',String(active));$('layout-toggle').textContent=active?'Card view':'List view';try{localStorage.setItem('pyatlas-pro:results-layout',active?'list':'cards');}catch(_){}};
  $('theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('pyatlas-pro:theme',document.body.classList.contains('dark')?'dark':'light');}catch(_){notice('Theme changes last for this session only.');}};
  document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('query').focus();}});
  function download(format) {
    const rows=filtered();let body;
    if(format==='json')body=JSON.stringify({schema_version:1,source:data.source,source_commit:data.source_commit,snapshot_date:data.snapshot_date,license:data.license,custom_project_ids:rows.filter(custom).map(r=>r.id),entries:rows},null,2);
    else{const keys=['id','name','url','description','category','group'];const cell=v=>{v=String(v);if(/^\s*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};body=[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(',')).join('\r\n');}
    saveFile(`pyatlas-pro-export.${format}`,body,format==='json'?'application/json':'text/csv;charset=utf-8');
  }
  $('export-json').onclick=()=>download('json');$('export-csv').onclick=()=>download('csv');
  $('backup').onclick=()=>{const text=JSON.stringify({...state,exported_at:new Date().toISOString()},null,2);if(new TextEncoder().encode(text).length>8*1024*1024){notice('Plain backup exceeds the 8 MB import limit. Reduce workspace data or try the compact encrypted backup.');return;}saveFile('pyatlas-workspace-backup.json',text,'application/json');};
  $('restore').onclick=()=>$('backup-file').click();
  function previewImport(value){pendingImport=core.validate(value);const impact=productivity.preview(state,pendingImport);$('import-summary').textContent=`Ready to merge ${pendingImport.custom.length} custom projects, ${pendingImport.bookmarks.length} bookmarks, ${Object.keys(pendingImport.metadata).length} project workspaces and ${pendingImport.savedSearches.length} saved searches.`;$('import-impact').replaceChildren(insightTable([['New custom projects',impact.newProjects],['Matching custom projects replaced',impact.replacedProjects],['Existing project workspaces replaced',impact.replacedWorkspaces],['Matching saved searches replaced',impact.replacedSearches],['New bookmarks',impact.newBookmarks]],'Import impact'));$('import-dialog').showModal();}
  $('backup-file').onchange=async e=>{pendingImport=null;lockedImport=null;try{const file=e.target.files[0];if(!file)return;if(file.size>16*1024*1024)throw new Error('Backup file exceeds 16 MB');const value=JSON.parse(await file.text());if(vault.isEnvelope(value)){lockedImport=value;openVault('unlock');}else{if(file.size>8*1024*1024)throw new Error('Plain backup exceeds 8 MB');previewImport(value);}}catch(error){notice('Import rejected: '+error.message);}finally{e.target.value='';}};
  $('import-cancel').onclick=()=>{pendingImport=null;$('import-dialog').close();};
  $('import-confirm').onclick=()=>{if(!pendingImport)return;try{const saved=commit(core.merge(state,pendingImport));refreshAll();$('import-dialog').close();pendingImport=null;if(saved)notice('Workspace backup merged successfully.');}catch(error){notice('Import rejected: '+error.message);}};
  $('compare-clear').onclick=()=>{selected.clear();updateCompare();};
  $('compare-open').onclick=()=>{
    const rows=entries().filter(r=>selected.has(r.id)),table=node('table');table.append(node('caption','Selected Python projects'));const thead=node('thead'),titles=node('tr');titles.append(node('th','Field'));rows.forEach(r=>titles.append(node('th',r.name)));thead.append(titles);table.append(thead);const tbody=node('tbody');
    for(const [label,key] of [['Category','category'],['Specialism','group'],['Description','description'],['Status','status'],['Your rating','rating'],['Collections','collections'],['Priority','priority'],['Deadline','dueDate'],['Checklist','tasks'],['Project link','url']]){const tr=node('tr'),heading=node('th',label);heading.scope='row';tr.append(heading);rows.forEach(r=>{const td=node('td'),m=meta(r.id);const value=key==='rating'?(m.rating?'★'.repeat(m.rating):'Unrated'):key==='collections'?m.collections.join(', '):key==='tasks'?`${m.tasks.filter(t=>t.done).length}/${m.tasks.length} complete`:['priority','dueDate','status'].includes(key)?m[key]:r[key];td.append(key==='url'?link(r):node('span',value||'—'));tr.append(td);});tbody.append(tr);}table.append(tbody);$('compare-content').replaceChildren(table);$('comparison').showModal();
  };
  function updateBulk() {
    $('bulk-count').textContent=`${bulk.size} selected for bulk update`;$('bulk-apply').disabled=bulk.size===0;
    document.querySelectorAll('[data-bulk-id]').forEach(input=>{input.checked=bulk.has(input.dataset.bulkId);});
  }
  $('select-matches').onclick=()=>{filtered().forEach(row=>bulk.add(row.id));updateBulk();};
  $('bulk-clear').onclick=()=>{bulk.clear();updateBulk();};
  $('bulk-apply').onclick=()=>{try {
    const changes={status:$('bulk-status').value,collection:$('bulk-collection').value.trim()};if(!changes.status&&!changes.collection){notice('Choose a status or enter a collection before applying.');return;}
    const count=bulk.size,saved=commit(core.batch(state,[...bulk],changes));bulk.clear();refreshAll();if(saved)notice(`Updated ${count} selected projects. Use Undo to reverse this change.`);
  }catch(error){notice('Bulk update rejected: '+error.message);}};
  function renderBoard(rows) {
    $('workflow-board').replaceChildren();
    for(const status of core.statuses){const column=node('section',undefined,'board-column'),members=rows.filter(r=>meta(r.id).status===status);column.append(node('h3',`${status} · ${members.length}`));
      for(const row of members){const tile=node('article',undefined,'board-tile'),open=node('button',row.name,'board-project');open.onclick=()=>openEditor(row);tile.append(open,node('span',row.category,'tag'));
        const select=node('select');select.setAttribute('aria-label',`Move ${row.name} to status`);core.statuses.forEach(value=>select.append(new Option(value,value)));select.value=status;
        select.onchange=()=>{try{const saved=commit(core.batch(state,[row.id],{status:select.value}));refreshAll();if(saved)notice(`${row.name} moved to ${select.value}.`);}catch(error){notice(error.message);}};
        tile.append(select);column.append(tile);
      }if(!members.length)column.append(node('p','No visible projects in this status.'));$('workflow-board').append(column);
    }
  }
  $('board-toggle').onclick=()=>{boardMode=!boardMode;$('board-toggle').setAttribute('aria-pressed',String(boardMode));$('board-toggle').textContent=boardMode?'Back to directory':'Workflow board';render();};
  function currentFilters(){return {query:$('query').value,category,collection:$('collection-filter').value,savedOnly,sort:$('sort').value,source:$('source-filter').value,status:$('status-filter').value,rating:Number($('rating-filter').value),priority:$('priority-filter').value,due:$('due-filter').value,tag:$('tag-filter').value};}
  function refreshSavedSearches(){const previous=$('saved-search').value;$('saved-search').replaceChildren(new Option('Choose a search…',''));state.savedSearches.forEach(item=>$('saved-search').append(new Option(item.name,item.name)));if(state.savedSearches.some(item=>item.name===previous))$('saved-search').value=previous;$('delete-search').disabled=!$('saved-search').value;}
  $('save-search').onclick=()=>{const name=ask('Name this search (up to 80 characters). Reusing a name replaces that saved search.');if(name===null)return;try{const item=core.savedSearch({name,filters:currentFilters()}),saved=commit({...state,savedSearches:[...state.savedSearches.filter(v=>v.name!==item.name),item]});refreshSavedSearches();$('saved-search').value=item.name;$('delete-search').disabled=false;if(saved)notice('Search saved, including its filters.');}catch(error){notice(error.message);}};
  $('saved-search').onchange=()=>{const item=state.savedSearches.find(v=>v.name===$('saved-search').value);$('delete-search').disabled=!item;if(!item)return;const f=item.filters;category=f.category;savedOnly=f.savedOnly;$('query').value=f.query;$('sort').value=f.sort;$('source-filter').value=f.source;$('status-filter').value=f.status;$('rating-filter').value=String(f.rating);$('priority-filter').value=f.priority;$('due-filter').value=f.due;
    if(![...$('collection-filter').options].some(o=>o.value===f.collection))$('collection-filter').append(new Option(f.collection+' (no current members)',f.collection));$('collection-filter').value=f.collection;ensureOption($('tag-filter'),f.tag);$('tag-filter').value=f.tag;limit=48;render();};
  $('delete-search').onclick=()=>{const name=$('saved-search').value;if(!name)return;commit({...state,savedSearches:state.savedSearches.filter(v=>v.name!==name)});refreshSavedSearches();};
  function insightTable(pairs,heading){const table=node('table'),head=node('thead'),tr=node('tr');tr.append(node('th',heading),node('th','Projects'));head.append(tr);table.append(head);const body=node('tbody');pairs.forEach(([label,value])=>{const row=node('tr');row.append(node('td',label),node('td',String(value)));body.append(row);});table.append(body);return table;}
  $('analytics-open').onclick=()=>{const a=core.analytics(entries(),state);$('analytics-summary').replaceChildren();for(const [label,value] of [['Total projects',a.total],['Custom projects',a.custom],['Bookmarked',a.bookmarks],['With notes',a.notes],['Personally rated',a.rated],['Average personal rating',a.rated?a.averageRating.toFixed(1)+'/5':'Unrated'],['Checklist tasks',a.tasks],['Completed tasks',a.completedTasks],['Overdue projects',entries().filter(r=>core.dueBucket(meta(r.id),today())==='overdue').length]]){const tile=node('div');tile.append(node('strong',String(value)),node('span',label));$('analytics-summary').append(tile);}$('analytics-status').replaceChildren(insightTable(Object.entries(a.statuses),'Status'));$('analytics-categories').replaceChildren(insightTable(a.categories.slice(0,10),'Category'));$('analytics').showModal();};
  function renderTasks(){
    $('task-list').replaceChildren();$('task-progress').textContent=`${draftTasks.filter(t=>t.done).length} of ${draftTasks.length} complete`;
    for(const task of draftTasks){const row=node('div',undefined,'task-row'),label=node('label'),check=node('input');check.type='checkbox';check.checked=task.done;check.onchange=()=>{task.done=check.checked;$('task-progress').textContent=`${draftTasks.filter(t=>t.done).length} of ${draftTasks.length} complete`;};label.append(check,node('span',task.text));const remove=node('button','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove task: ${task.text}`);remove.onclick=()=>{draftTasks=draftTasks.filter(t=>t.id!==task.id);renderTasks();};row.append(label,remove);$('task-list').append(row);}
    $('task-add').disabled=draftTasks.length>=50;
  }
  function addTask(){const text=$('task-text').value.trim();if(!text||draftTasks.length>=50)return;draftTasks.push({id:'task-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)),text,done:false});$('task-text').value='';renderTasks();}
  $('task-add').onclick=addTask;$('task-text').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addTask();}};
  $('report-open').onclick=()=>{$('report-notes').checked=false;$('report-dialog').showModal();};
  $('report-cancel').onclick=()=>$('report-dialog').close();
  $('report-download').onclick=()=>{saveFile('pyatlas-progress-report.md',core.report(filtered(),state,{includeNotes:$('report-notes').checked}),'text/markdown;charset=utf-8');$('report-dialog').close();};
  function openVault(mode){vaultTicket++;$('vault-submit').disabled=false;vaultMode=mode;$('vault-password').value='';$('vault-confirm-password').value='';$('vault-error').textContent='';$('vault-title').textContent=mode==='backup'?'Password-protected backup':'Unlock encrypted backup';$('vault-confirm-label').hidden=mode!=='backup';$('vault-confirm-password').disabled=mode!=='backup';$('vault-password').autocomplete=mode==='backup'?'new-password':'current-password';$('vault-submit').textContent=mode==='backup'?'Encrypt & download':'Unlock & preview';$('vault-dialog').showModal();}
  $('secure-backup').onclick=()=>{lockedImport=null;openVault('backup');};
  $('vault-close').onclick=()=>$('vault-dialog').close();
  $('vault-dialog').addEventListener('close',()=>{if($('vault-dialog').open)return;vaultTicket++;$('vault-password').value='';$('vault-confirm-password').value='';lockedImport=null;});
  $('vault-form').onsubmit=async event=>{event.preventDefault();$('vault-error').textContent='';$('vault-submit').disabled=true;const ticket=vaultTicket;try{
    const password=$('vault-password').value;if(vaultMode==='backup'){
      if(password!==$('vault-confirm-password').value)throw new Error('Passwords do not match.');
      const envelope=await vault.encrypt(state,password);if(!$('vault-dialog').open||ticket!==vaultTicket)return;saveFile('pyatlas-encrypted-backup.json',JSON.stringify(envelope,null,2),'application/json');$('vault-dialog').close();notice('Encrypted backup downloaded. Keep the password separately; it cannot be recovered.');
    }else{const workspace=await vault.decrypt(lockedImport,password);if(!$('vault-dialog').open||ticket!==vaultTicket)return;$('vault-dialog').close();previewImport(workspace);}
  }catch(error){if(ticket===vaultTicket)$('vault-error').textContent=error.message;}finally{if(ticket===vaultTicket)$('vault-submit').disabled=false;}};
  $('calendar-export').onclick=()=>{const rows=filtered().filter(row=>meta(row.id).dueDate&&meta(row.id).status!=='Archived');if(!rows.length){notice('No non-archived projects with deadlines match your filters.');return;}saveFile('pyatlas-deadlines.ics',productivity.calendar(rows,state),'text/calendar;charset=utf-8');notice(`Exported ${rows.length} all-day project deadlines. Import the file in your calendar app. Repeated imports may create duplicates; this is not a live sync.`);};
  function renderFocus(){const items=productivity.focus(entries(),state,today());$('focus-count').textContent=`${items.length} focus projects · showing ${Math.min(items.length,focusLimit)}`;$('focus-results').replaceChildren();
    for(const {row,metadata:m} of items.slice(0,focusLimit)){const article=node('article',undefined,'focus-card'),open=node('button',row.name,'focus-project');open.onclick=()=>{$('focus-dialog').close();openEditor(row);};article.append(open,node('p',`${m.priority} priority · ${m.status} · Deadline: ${m.dueDate||'not set'}`));
      const pending=m.tasks.filter(task=>!task.done);for(const task of pending){const label=node('label'),check=node('input');check.type='checkbox';check.setAttribute('aria-label',`Complete task: ${task.text}`);check.onchange=()=>{try{const next={...state,metadata:{...state.metadata,[row.id]:{...meta(row.id),tasks:meta(row.id).tasks.map(t=>t.id===task.id?{...t,done:check.checked}:t)}}};const saved=commit(next);refreshAll();renderFocus();if(saved)notice('Task updated. Use Undo to reverse this change.');}catch(error){notice(error.message);}};label.append(check,node('span',task.text));article.append(label);}if(!pending.length)article.append(node('p','No incomplete checklist tasks. Review the deadline or update it in the project editor.'));$('focus-results').append(article);
    }if(!items.length)$('focus-results').append(node('p','No upcoming deadlines or unfinished tasks. Add a task or target deadline in a project workspace.'));$('focus-more').hidden=items.length<=focusLimit;
  }
  $('focus-open').onclick=()=>{focusLimit=24;renderFocus();$('focus-dialog').showModal();};$('focus-close').onclick=()=>$('focus-dialog').close();$('focus-more').onclick=()=>{focusLimit+=24;renderFocus();};
  $('analytics-close').onclick=()=>$('analytics').close();
  $('compare-close').onclick=()=>$('comparison').close();if(matchMedia('(max-width:760px)').matches)$('workspace-tools').open=false;$('snapshot').textContent=`CATALOGUE SNAPSHOT · ${data.snapshot_date}`;function syncLocation(){try{const hash=core.encodeView(currentFilters());globalThis.history.replaceState(null,'',location.pathname+location.search+(hash?'#'+hash:''));}catch(_){}}
  function applyView(v){category=entries().some(r=>r.category===v.category)?v.category:'';savedOnly=v.savedOnly;$('query').value=v.query;$('sort').value=v.sort;$('status-filter').value=v.status;ensureOption($('collection-filter'),v.collection);$('collection-filter').value=v.collection;ensureOption($('tag-filter'),v.tag);$('tag-filter').value=v.tag;$('source-filter').value=v.source;$('rating-filter').value=String(v.rating);$('priority-filter').value=v.priority;$('due-filter').value=v.due;limit=48;}
  $('copy-link').onclick=async()=>{syncLocation();const url=location.href;try{await navigator.clipboard.writeText(url);notice('View link copied. It contains only your search and filter choices, never notes, tasks or backups.');}catch(_){ask('Copy this link to share the current view (search and filters only):',url);}};
  globalThis.addEventListener('hashchange',()=>{const v=core.decodeView(location.hash);if(v){applyView(v);render();}});
  globalThis.PyAtlasApp={entries,bulk,saveFile,notice,render,openEditor,meta,getState:()=>core.validate(state),getView:currentFilters,getCompared:()=>[...selected]};
  refreshNavigation();refreshSavedSearches();const initialView=core.decodeView(location.hash);if(initialView)applyView(initialView);render();syncHistory();try{if(localStorage.getItem('pyatlas-pro:results-layout')==='list')$('layout-toggle').click();}catch(_){}
})();
