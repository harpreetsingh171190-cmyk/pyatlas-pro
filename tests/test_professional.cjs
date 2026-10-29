'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),P=require('../pyatlas/assets/professional-core.js'),W=require('../pyatlas/assets/workspace.js'),V=require('../pyatlas/assets/vault.js');
const id='0123456789abcdef',path={id:'path-abcdefgh',title:'My path',steps:[{id:'step-abcdefgh',text:'First',projectId:id,done:true},{id:'step-ijklmnop',text:'Second',projectId:'',done:false}]};
test('browser requirements reject directives, URLs, malformed pins and ambiguous duplicates',()=>{
 assert.deepEqual(P.requirements('numpy==1.26.4\n# comment\nNUMPY==1.26.4'),[{name:'numpy',version:'1.26.4'}]);
 for(const input of ['numpy==1.0\nnumpy==2.0','numpy\nnumpy==1.0','-r secret.txt','https://evil/pkg.whl','x @ https://evil','x==..1'])assert.throws(()=>P.requirements(input));
});
test('Python Requires-Python handling is conservative and supports exclusions and compatible releases',()=>{
 assert.equal(P.pythonSupport('>=3.9,<3.13','3.12'),'Supported by Requires-Python');
 assert.equal(P.pythonSupport('>=3.9,<3.13','3.8'),'Unsupported');assert.equal(P.pythonSupport('~=3.10.0','3.11'),'Unsupported');
 assert.equal(P.pythonSupport('!=3.12.*','3.12.3'),'Unsupported');assert.equal(P.pythonSupport('nonsense','3.12'),'Unknown');assert.equal(P.pythonSupport('','3.12'),'Unknown');
});
test('custom steps keep identity and completion after reordering and reject corrupt imports',()=>{
 const checked=P.customPaths({schema:1,paths:[path]}).paths[0],moved=P.moveStep(checked,0,1);
 assert.equal(moved.steps[1].id,'step-abcdefgh');assert.equal(moved.steps[1].done,true);assert.equal(checked.steps[0].id,'step-abcdefgh');
 assert.throws(()=>P.customPaths({schema:1,paths:[{...path,steps:[path.steps[0],path.steps[0]]}]}));assert.throws(()=>P.customPaths({schema:1,paths:[path,path]}));
});
test('weighted comparison never ranks missing active criteria; zero is a real assessment',()=>{
 const rows=[{id,name:'A'}];assert.equal(P.rank(rows,[1,0,0,0],{[id]:{ratings:[0,null,null,null]}})[0].score,0);
 assert.equal(P.rank(rows,[1,1,0,0],{[id]:{ratings:[5,null,null,null]}})[0].score,null);
 assert.equal(P.rank(rows,[0,0,0,0],{})[0].score,null);assert.equal(P.rank(rows,[3,1,0,0],{[id]:{ratings:[5,1,null,null]}})[0].score,4);
});
const backup=()=>({format:'pyatlas-complete-backup',version:1,storage:{'workspace:v4':JSON.stringify(W.empty()),'custompaths:v1':JSON.stringify({schema:1,paths:[path]}),theme:'dark'}});
test('complete backup validates every section and rejects unknown storage keys before writing',()=>{
 assert.equal(P.bundle(backup()).storage.theme,'dark');assert.throws(()=>P.bundle({...backup(),storage:{...backup().storage,credentials:'secret'}}));
 assert.throws(()=>P.bundle({...backup(),storage:{...backup().storage,theme:'invalid'}}));assert.throws(()=>P.bundle({...backup(),storage:{...backup().storage,'comparison:v1':'{}'}}));
});
test('failed storage restore rolls back all covered keys and preserves unrelated application data',()=>{
 const values=new Map([['pyatlas-pro:theme','light'],['other-app','do not touch']]);let fail=true;
 const store={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem:(k,v)=>{if(fail&&k==='pyatlas-pro:theme'){fail=false;throw new Error('quota');}values.set(k,v);}};
 assert.throws(()=>P.restoreStorage(store,backup()),/Previous app data was restored/);assert.equal(values.get('pyatlas-pro:theme'),'light');assert.equal(values.get('other-app'),'do not touch');assert.equal(values.has('pyatlas-pro:workspace:v4'),false);
 P.restoreStorage(store,backup());assert.equal(values.get('pyatlas-pro:theme'),'dark');assert.equal(values.get('other-app'),'do not touch');
});
test('complete encrypted backups preserve all data; wrong passwords and relabelled envelopes fail',async()=>{
 const source=P.bundle(backup()),sealed=await V.encryptBundle(source,'Test-only strong password 123!');assert.ok(!JSON.stringify(sealed).includes('My path'));
 assert.deepEqual(P.bundle(await V.decryptBundle(sealed,'Test-only strong password 123!')),source);
 await assert.rejects(V.decryptBundle(sealed,'Wrong password 123456!'));await assert.rejects(V.decrypt({...sealed,format:'pyatlas-encrypted-workspace'},'Test-only strong password 123!'));
});
test('starter ZIP has safe names and Python module names reject keywords',()=>{
 const files=P.starter('my-app','numpy==1.26.4');assert.ok(files['src/my_app/cli.py']);assert.ok(files['.github/workflows/ci.yml']);
 assert.equal(new DataView(P.zip(files).buffer).getUint32(0,true),0x04034b50);assert.equal(P.crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 for(const name of ['../evil','class','hello;echo','123app'])assert.throws(()=>P.starter(name,''));assert.throws(()=>P.zip({'../evil':'x'}));
});

test('abort-signal helpers work without AbortSignal.any/timeout', async () => {
  const any = AbortSignal.any, timeout = AbortSignal.timeout;
  try {
    delete AbortSignal.any; delete AbortSignal.timeout;
    const controller = new AbortController();
    const combined = P.anySignal([controller.signal, P.timeoutSignal(60000)]);
    assert.equal(combined.aborted, false);
    controller.abort();
    assert.equal(combined.aborted, true);
    const late = P.timeoutSignal(5);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(late.aborted, true);
  } finally { AbortSignal.any = any; AbortSignal.timeout = timeout; }
});
