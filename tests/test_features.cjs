'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('../pyatlas/assets/features-core.js');globalThis.PyAtlasFeatures=F;
const core=require('../pyatlas/assets/workspace.js');
test('fuzzy words support transpositions but phrases and exclusions stay exact',()=>{
 const r={name:'Django',description:'web framework',category:'Web',group:''},m=core.defaultMetadata();
 assert.ok(core.matches(r,m,'djnago'));assert.ok(core.matches(r,m,'framwork'));
 assert.ok(!core.matches(r,m,'"djnago"'));assert.ok(!core.matches(r,m,'django -framework'));
 assert.ok(core.matches(r,m,'django -framwork'));assert.ok(!core.matches(r,m,'xyz'));
});
test('GitHub parsing rejects credentials, lookalikes and non-GitHub hosts',()=>{
 assert.equal(F.repository('https://github.com/pallets/flask/tree/main'),'pallets/flask');
 for(const u of ['https://github.com.evil/x/y','https://u:p@github.com/a/b','https://example.com/a/b','javascript:alert(1)','http://github.com/a/b'])assert.equal(F.repository(u),null);
});
test('activity is cautious, deterministic and archive status wins',()=>{
 const now=Date.parse('2026-10-29T00:00:00Z');assert.equal(F.activity({lastCommit:'2026-10-01'},now),'Recent commit');
 assert.equal(F.activity({lastCommit:'2020-01-01'},now),'No commit in 12 months');
 assert.equal(F.activity({lastCommit:null},now),'Unknown activity');assert.equal(F.activity({archived:true},now),'Archived');
});
test('dependency drafts normalize duplicates, omit blanks and reject injection',()=>{
 assert.equal(F.suggestion('PyTorch'),'torch');assert.equal(F.suggestion('mystery'),'');
 assert.equal(F.stack([{package:'scikit_learn'},{package:'scikit-learn'},{package:''}]).match(/scikit/g).length,1);
 for(const value of ['-r bad','x\n--index-url=evil','git+https://evil','requests>=1','x[evil]'])assert.throws(()=>F.stack([{package:value}]));
 const text=F.stack([{package:'pandas'},{package:'numpy'}],'pyproject');assert.ok(text.includes('[project]'));assert.ok(text.includes('"numpy"'));
});
test('paths have ordered days and progress imports reject corrupt data',()=>{
 for(const p of F.pathDefinitions){const days=F.pathDays(p,[]);assert.equal(days.length,30);assert.deepEqual(days.map(d=>d.day),Array.from({length:30},(_,i)=>i+1));}
 assert.deepEqual(F.validateProgress({schema:1,paths:{'data-science':[1,1,30]}}).paths['data-science'],[1,30]);
 for(const v of [{schema:2,paths:{}},{schema:1,paths:{'data-science':[31]}},{schema:1,paths:{'data-science':['1']}}])assert.throws(()=>F.validateProgress(v));
});
