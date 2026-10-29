'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const core=require('../pyatlas/assets/workspace.js');
const id='custom-12345678-abcd';
const row={id,name:'My tool',url:'https://example.com',description:'A personal project',category:'My stack',group:''};
const m={notes:'Research this',tags:['api','api'],collections:['Next stack'],status:'Evaluating',rating:4};
const populated=()=>({schema_version:2,custom:[row],bookmarks:[id],metadata:{[id]:m}});

test('valid project roundtrip and deduplication',()=>{const out=core.validate(populated());assert.equal(out.custom[0].url,'https://example.com/');assert.deepEqual(out.metadata[id].tags,['api']);assert.deepEqual(core.validate(JSON.parse(JSON.stringify(out))),out);});
test('merge preserves unrelated data and incoming matching IDs win',()=>{const old=populated(),incoming=populated();old.metadata['0123456789abcdef']=core.defaultMetadata();incoming.metadata[id]={...m,notes:'Updated notes'};incoming.custom[0]={...row,name:'Renamed'};const out=core.merge(old,incoming);assert.equal(out.custom.length,1);assert.equal(out.custom[0].name,'Renamed');assert.equal(out.metadata[id].notes,'Updated notes');assert.ok(out.metadata['0123456789abcdef']);assert.equal(out.bookmarks.length,1);});
test('invalid URL protocols and embedded credentials are rejected',()=>{for(const url of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com','file:///etc/passwd'])assert.throws(()=>core.project({...row,url}));});
test('malformed imports and duplicate IDs are rejected atomically',()=>{for(const value of [null,[],{}, {...populated(),schema_version:1},{...populated(),custom:[row,row]},{...populated(),metadata:[]}])assert.throws(()=>core.validate(value));});
test('prototype pollution IDs cannot enter metadata',()=>{const bad=JSON.parse('{"schema_version":2,"custom":[],"bookmarks":[],"metadata":{"__proto__":{"polluted":true}}}');assert.throws(()=>core.validate(bad));assert.equal({}.polluted,undefined);});
test('metadata field bounds and enums are enforced',()=>{for(const change of [{rating:6},{rating:2.5},{status:'anything'},{notes:'a'.repeat(10001)},{tags:['x'.repeat(61)]},{collections:Array(31).fill('x')}])assert.throws(()=>core.metadata({...m,...change}));});
test('immutable import validation does not mutate current workspace',()=>{const value=populated(),original=JSON.stringify(value);core.validate(value);assert.equal(JSON.stringify(value),original);assert.throws(()=>core.merge(value,{...populated(),bookmarks:['bad-id']}));assert.equal(JSON.stringify(value),original);});
test('custom and built-in ID namespaces stay distinct',()=>{assert.throws(()=>core.project({...row,id:'0123456789abcdef'}));assert.throws(()=>core.validate({...populated(),bookmarks:['__proto__']}));});
test('HTML-like notes remain plain strings for safe text rendering',()=>{assert.equal(core.metadata({...m,notes:'<script>alert(1)</script>'}).notes,'<script>alert(1)</script>');});

test('version-2 workspace upgrades to version 4 without losing notes',()=>{const old=populated(),out=core.validate(old);assert.equal(out.schema_version,4);assert.deepEqual(out.savedSearches,[]);assert.equal(out.metadata[id].notes,m.notes);});
const searchFilters={query:'web api',category:'Web Frameworks',collection:'Next stack',savedOnly:true,sort:'name',source:'',status:'Learning',rating:3};
test('saved search filters survive backup roundtrip',()=>{const state=core.empty();state.savedSearches.push({name:'Backend plan',filters:searchFilters});assert.deepEqual(core.validate(JSON.parse(JSON.stringify(state))).savedSearches,[core.savedSearch(state.savedSearches[0])]);});
test('saved searches reject invalid fields and duplicate names',()=>{assert.throws(()=>core.savedSearch({name:'x',filters:{...searchFilters,sort:'stars'}}));assert.throws(()=>core.savedSearch({name:'x',filters:{...searchFilters,rating:6}}));assert.throws(()=>core.savedSearch({name:'',filters:searchFilters}));const state=core.empty();state.savedSearches=[{name:'x',filters:searchFilters},{name:'x',filters:searchFilters}];assert.throws(()=>core.validate(state));});
test('backup merge combines saved searches and incoming matching name wins',()=>{const a=core.empty(),b=core.empty();a.savedSearches=[{name:'x',filters:searchFilters}];b.savedSearches=[{name:'x',filters:{...searchFilters,query:'changed'}},{name:'y',filters:searchFilters}];const out=core.merge(a,b);assert.equal(out.savedSearches.length,2);assert.equal(out.savedSearches[0].filters.query,'changed');});
test('bulk edits preserve notes and ratings while deduplicating membership',()=>{const a=populated(),original=JSON.stringify(a),out=core.batch(a,[id,id],{status:'In use',collection:'Next stack'});assert.equal(out.metadata[id].status,'In use');assert.equal(out.metadata[id].rating,4);assert.equal(out.metadata[id].notes,m.notes);assert.deepEqual(out.metadata[id].collections,['Next stack']);assert.equal(JSON.stringify(a),original);});
test('bulk edits create default metadata and reject unsafe IDs or statuses',()=>{const out=core.batch(core.empty(),['0123456789abcdef'],{status:'Learning',collection:'Study'});assert.equal(out.metadata['0123456789abcdef'].status,'Learning');assert.deepEqual(out.metadata['0123456789abcdef'].collections,['Study']);assert.throws(()=>core.batch(core.empty(),['__proto__'],{status:'Learning'}));assert.throws(()=>core.batch(core.empty(),[id],{status:'Unknown'}));});
test('bulk validation failures leave the original workspace intact',()=>{const a=populated(),before=JSON.stringify(a);assert.throws(()=>core.batch(a,[id],{collection:'x'.repeat(61)}));assert.equal(JSON.stringify(a),before);});
test('workspace analytics counts metadata only for existing catalogue rows',()=>{const state=populated();state.metadata['0123456789abcdef']={...m,status:'Learning'};state.bookmarks.push('0123456789abcdef');const a=core.analytics([row],state);assert.equal(a.total,1);assert.equal(a.bookmarks,1);assert.equal(a.notes,1);assert.equal(a.rated,1);assert.equal(a.averageRating,4);assert.equal(a.statuses.Evaluating,1);assert.equal(a.statuses.Learning,0);assert.deepEqual(a.categories,[['My stack',1]]);});
test('empty analytics produces finite values and zero counts',()=>{const a=core.analytics([],core.empty());assert.equal(a.averageRating,0);assert.equal(a.total,0);assert.deepEqual(a.categories,[]);assert.equal(Object.values(a.statuses).reduce((a,b)=>a+b,0),0);});

const task={id:'task-12345678-abcd',text:'Build a demo API',done:false};
const planned=()=>({...core.defaultMetadata(),priority:'High',dueDate:'2026-11-01',tasks:[task]});
test('planner fields roundtrip and old metadata gets safe defaults',()=>{const old=core.metadata(m);assert.equal(old.priority,'Normal');assert.equal(old.dueDate,'');assert.deepEqual(old.tasks,[]);assert.deepEqual(core.metadata(planned()),planned());});
test('deadline validation rejects invalid calendar dates and accepts leap days',()=>{assert.equal(core.validDate('2028-02-29'),true);assert.equal(core.validDate('2026-02-29'),false);assert.equal(core.validDate('2026-13-01'),false);assert.equal(core.validDate('2026-2-01'),false);assert.throws(()=>core.metadata({...planned(),dueDate:'2026-02-30'}));assert.throws(()=>core.metadata({...planned(),priority:'Critical'}));});
test('due filters use calendar days and include today and day seven',()=>{assert.equal(core.dueBucket({...planned(),dueDate:'2026-10-28'},'2026-10-29'),'overdue');assert.equal(core.dueBucket({...planned(),dueDate:'2026-10-29'},'2026-10-29'),'soon');assert.equal(core.dueBucket({...planned(),dueDate:'2026-11-05'},'2026-10-29'),'soon');assert.equal(core.dueBucket({...planned(),dueDate:'2026-11-06'},'2026-10-29'),'later');assert.equal(core.dueBucket(core.defaultMetadata(),'2026-10-29'),'none');});
test('task limits, duplicates, empty text and wrong booleans are rejected',()=>{for(const tasks of [[task,task],[{...task,text:''}],[{...task,done:'yes'}],Array(51).fill(task)])assert.throws(()=>core.metadata({...planned(),tasks}));});
test('bulk changes preserve planner fields and task progress',()=>{const state=core.empty();state.metadata[id]=planned();const updated=core.batch(state,[id],{status:'Learning'});assert.deepEqual(updated.metadata[id].tasks,[task]);assert.equal(updated.metadata[id].priority,'High');assert.equal(updated.metadata[id].dueDate,'2026-11-01');});
test('advanced search matches phrases, excludes words and searches tasks',()=>{const r={...row,description:'An excellent web framework'};assert.equal(core.matches(r,planned(),'"web framework" -django'),true);assert.equal(core.matches(r,planned(),'"framework web"'),false);assert.equal(core.matches(r,planned(),'-demo'),false);assert.equal(core.matches(r,planned(),'"demo api"'),true);assert.equal(core.matches(r,planned(),'high'),true);});
test('planning sort handles missing deadlines and uses deterministic tie breaks',()=>{const b={...row,id:'0123456789abcdef',name:'Other tool'},state=core.empty();state.metadata[id]=planned();assert.ok(core.compare(row,b,state,'deadline')<0);assert.ok(core.compare(row,b,state,'priority')<0);state.metadata[id].rating=5;assert.ok(core.compare(row,b,state,'rating')<0);});
test('reports omit notes by default and include explicit opt-in with attribution',()=>{const state=core.empty();state.metadata[id]={...planned(),notes:'PRIVATE-NOTE-123'};const publicReport=core.report([row],state);assert.equal(publicReport.includes('PRIVATE-NOTE-123'),false);assert.ok(publicReport.includes('- [ ] Build a demo API'));assert.ok(publicReport.includes('CC BY 4.0'));assert.ok(core.report([row],state,{includeNotes:true}).includes('PRIVATE\\-NOTE\\-123'));});
test('report escapes HTML and Markdown in user fields',()=>{const report=core.report([{...row,name:'<script>alert(1)</script>',description:'[bad](javascript:alert(1))'}],core.empty());assert.equal(report.includes('<script>'),false);assert.ok(report.includes('&lt;script&gt;'));assert.ok(report.includes('\\[bad\\]'));});
test('schema-3 backup migrates planner defaults and saved-search planning filters',()=>{const old={...populated(),schema_version:3,savedSearches:[{name:'Old search',filters:searchFilters}]};const upgraded=core.validate(old);assert.equal(upgraded.schema_version,4);assert.equal(upgraded.metadata[id].priority,'Normal');assert.equal(upgraded.savedSearches[0].filters.due,'');assert.equal(upgraded.savedSearches[0].filters.priority,'');});
test('task analytics counts only current projects and completed tasks',()=>{const state=core.empty();state.metadata[id]={...planned(),tasks:[task,{...task,id:'task-87654321-abcd',done:true}]};const a=core.analytics([row],state);assert.equal(a.tasks,2);assert.equal(a.completedTasks,1);});

test('bulk collection add reports the 30-collection limit atomically',()=>{
  const id='a'.repeat(16),full=Array.from({length:30},(_,i)=>'c'+i),base=core.empty();
  base.metadata[id]={...core.defaultMetadata(),collections:full};
  assert.throws(()=>core.batch(base,[id],{collection:'extra'}),/30 collections/);
});

test('view links round-trip, omit defaults and reject hostile values', () => {
  const view={query:'web framework',category:'Web Frameworks',collection:'My next stack',savedOnly:true,sort:'rating',source:'custom',status:'In use',rating:4,priority:'High',due:'soon',tag:'api'};
  const hash=core.encodeView(view);
  assert.deepEqual(core.decodeView('#'+hash),view);
  assert.equal(core.encodeView({query:'',sort:'name',rating:0,savedOnly:false}),'');
  assert.equal(core.decodeView('#results'),null);
  assert.equal(core.decodeView(''),null);
  const hostile=core.decodeView('#sort=__proto__&status=<script>&rating=99&src=x&prio=Urgent&due=never&q='+'a'.repeat(501)+'&saved=yes');
  assert.deepEqual(hostile,{query:'',category:'',collection:'',savedOnly:false,sort:'name',source:'',status:'',rating:0,priority:'',due:'',tag:''});
});

test('duplicate project URLs are found across categories, ignoring case, www and trailing slash', () => {
  const rows=[{id:'a'.repeat(16),url:'https://github.com/django/django',category:'A'},{id:'b'.repeat(16),url:'https://www.GitHub.com/django/django/',category:'B'},{id:'c'.repeat(16),url:'https://github.com/django/other',category:'C'}];
  const found=core.duplicates(rows);
  assert.deepEqual(found[rows[0].id].map(r=>r.id),[rows[1].id]);
  assert.deepEqual(found[rows[1].id].map(r=>r.id),[rows[0].id]);
  assert.equal(found[rows[2].id],undefined);
  assert.equal(core.urlKey('https://example.com/a?x=1'),'example.com/a?x=1');
});

test('saved searches carry an optional validated tag filter', () => {
  const base={name:'t',filters:{query:'',category:'',collection:'',savedOnly:false,sort:'name',source:'',status:'',rating:0}};
  assert.equal(core.savedSearch(base).filters.tag,'');
  assert.equal(core.savedSearch({...base,filters:{...base.filters,tag:'api'}}).filters.tag,'api');
  assert.throws(()=>core.savedSearch({...base,filters:{...base.filters,tag:'x'.repeat(61)}}));
});
