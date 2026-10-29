'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),V=require('../pyatlas/assets/visual-core.js'),W=require('../pyatlas/assets/workspace.js'),P=require('../pyatlas/assets/professional-core.js');
const empty=()=>({schema:1,images:[],history:[]});
test('visual datasets are computed from workspace and never invent comparison ratings',()=>{
 const rows=[{id:'0123456789abcdef',name:'A',category:'Web',group:'',description:'',url:'https://example.com'}],s=W.empty();
 const d=V.datasets(rows,s,{schema:1,paths:{}},{schema:1,paths:[]},{schema:1,weights:[1,1,1,1],scores:{}});
 assert.equal(d.categories[0].value,1);assert.equal(d.statuses.reduce((n,r)=>n+r.value,0),1);assert.equal(d.comparison.length,0);assert.equal(d.learning[0].value,0);
});
test('daily snapshots replace their date, sort dates and reject impossible counts',()=>{
 const store=V.record(empty(),'2026-10-29',{completedTasks:2,tasks:4,bookmarks:1});const next=V.record(store,'2026-10-29',{completedTasks:3,tasks:4,bookmarks:2});
 assert.equal(next.history.length,1);assert.equal(next.history[0].completedTasks,3);assert.equal(store.history[0].completedTasks,2);
 assert.throws(()=>V.record(empty(),'2026-02-30',{completedTasks:0,tasks:1,bookmarks:0}));assert.throws(()=>V.record(empty(),'2026-10-29',{completedTasks:2,tasks:1,bookmarks:0}));
});
test('media rejects SVG/remote URLs, excessive images and duplicate identities',()=>{
 const image={id:'img-abcdefgh',projectId:'0123456789abcdef',caption:'My screenshot',data:'data:image/jpeg;base64,/9j/AA==',createdAt:'2026-10-29T00:00:00Z',kind:'user-upload'};
 assert.equal(V.media({schema:1,images:[image],history:[]}).images.length,1);
 for(const data of ['https://tracker.test/x.png','data:image/svg+xml;base64,AAAA','javascript:alert(1)'])assert.throws(()=>V.media({schema:1,images:[{...image,data}],history:[]}));
 assert.throws(()=>V.media({schema:1,images:[image,image],history:[]}));assert.throws(()=>V.media({schema:1,images:Array(21).fill(image),history:[]}));
});
test('project preview XML escapes data; suggested blueprints are explicitly qualified',()=>{
 const row={name:'<script>&"',category:'Web Frameworks'};const tile=V.thumbnail(row);assert.ok(!tile.includes('<script>'));assert.ok(tile.includes('&lt;script&gt;'));assert.ok(V.blueprint(row).description.includes('Not an independently verified architecture'));
});
test('visual history participates in validated complete backup/restore',()=>{
 const raw=V.record(empty(),'2026-10-29',{completedTasks:1,tasks:2,bookmarks:0});const value=P.bundle({format:'pyatlas-complete-backup',version:1,storage:{'workspace:v4':JSON.stringify(W.empty()),'visuals:v1':JSON.stringify(raw)}});
 assert.equal(JSON.parse(value.storage['visuals:v1']).history.length,1);assert.throws(()=>P.bundle({...value,storage:{...value.storage,'visuals:v1':'{}'}}));
});
