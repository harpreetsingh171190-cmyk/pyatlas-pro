/* Professional tooling: pure, offline functions; safe data and ZIP generation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./workspace.js'),require('./features-core.js'));else root.PyAtlasProfessional=factory(root.PyAtlasCore,root.PyAtlasFeatures);})(globalThis,function(W,F){
 'use strict';
 const canonical=s=>s.toLowerCase().replace(/[-_.]+/g,'-');
 // AbortSignal.timeout (Chrome 103/Safari 16) and AbortSignal.any (Chrome 116/Safari 17.4/Firefox 124) are missing in older browsers.
 function timeoutSignal(ms){if(typeof AbortSignal.timeout==='function')return AbortSignal.timeout(ms);const c=new AbortController();setTimeout(()=>c.abort(new Error('Timed out')),ms);return c.signal;}
 function anySignal(signals){if(typeof AbortSignal.any==='function')return AbortSignal.any(signals);const c=new AbortController();for(const s of signals){if(s.aborted){c.abort(s.reason);break;}s.addEventListener('abort',()=>c.abort(s.reason),{once:true});}return c.signal;}
 function plain(value,max,label){if(typeof value!=='string'||value.length>max||!value.trim())throw new Error('Invalid '+label);return value.trim();}
 function requirements(text){
  if(typeof text!=='string'||text.length>20000)throw new Error('Requirements text is too large.');
  const rows=[];for(const line of text.split(/\r?\n/)){const clean=line.trim();if(!clean||clean.startsWith('#'))continue;
   const match=clean.match(/^([A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?)(?:==([A-Za-z0-9][A-Za-z0-9.!+_-]{0,99}))?$/);
   if(!match)throw new Error('Use package names or exact name==version pins, one per line. URLs, options, ranges and wildcards are not supported in this browser form.');
   if(match[2]&&!/^(?:\d+!)?\d+(?:\.\d+)*(?:(?:a|b|rc)\d+)?(?:\.post\d+)?(?:\.dev\d+)?(?:\+[a-z0-9]+(?:[._-][a-z0-9]+)*)?$/i.test(match[2]))throw new Error('Use normalized numeric versions, such as 1.2.3 or 1.0rc1.');
   rows.push({name:F.dependency(match[1]),version:match[2]||null});if(rows.length>100)throw new Error('At most 100 package lines are supported.');
  }
  const pins=new Map(),out=[];for(const row of rows){const key=canonical(row.name);if(pins.has(key)){const old=pins.get(key);if(old.version!==row.version)throw new Error('Conflicting or ambiguous requirements for '+row.name);continue;}pins.set(key,row);out.push(row);}return out;
 }
 function pythonSupport(spec,target){
  if(!/^3\.\d{1,2}(?:\.\d{1,2})?$/.test(target))throw new Error('Use a Python version such as 3.12 or 3.12.1.');
  if(!spec)return 'Unknown';
  const cmp=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d);}return 0;};
  const current=target.split('.').map(Number);let unsupported=false,unknown=false;
  for(const raw of spec.split(',')){const m=raw.trim().match(/^(>=|<=|==|!=|~=|>|<)\s*(\d+(?:\.\d+){0,2})(\.\*)?$/);if(!m){unknown=true;continue;}
   const base=m[2].split('.').map(Number),c=cmp(current,base);let yes;
   if(m[3]){if(!['==','!='].includes(m[1])){unknown=true;continue;}const match=base.every((v,i)=>v===(current[i]||0));yes=m[1]==='=='?match:!match;}
   else if(m[1]==='~='){if(base.length<2){unknown=true;continue;}const upper=base.slice(0,-1);upper[upper.length-1]++;yes=c>=0&&cmp(current,upper)<0;}
   else yes={'>=':c>=0,'<=':c<=0,'==':c===0,'!=':c!==0,'>':c>0,'<':c<0}[m[1]];
   if(!yes)unsupported=true;
  }
  return unsupported?'Unsupported':unknown?'Unknown':'Supported by Requires-Python';
 }
 function customPaths(value){
  if(!value||value.schema!==1||!Array.isArray(value.paths)||value.paths.length>50)throw new Error('Invalid custom learning paths');
  const ids=new Set();return {schema:1,paths:value.paths.map(p=>{
   if(!p||!/^path-[a-z0-9-]{8,80}$/.test(p.id)||ids.has(p.id)||!Array.isArray(p.steps)||!p.steps.length||p.steps.length>120)throw new Error('Invalid or duplicate custom learning path');ids.add(p.id);const seen=new Set();
   return {id:p.id,title:plain(p.title,120,'path title'),steps:p.steps.map(s=>{if(!s||!/^step-[a-z0-9-]{8,80}$/.test(s.id)||seen.has(s.id)||typeof s.done!=='boolean'||(s.projectId!==''&&! /^(?:[a-f0-9]{16}|custom-[a-z0-9-]{8,80})$/.test(s.projectId)))throw new Error('Invalid path step');seen.add(s.id);return {id:s.id,text:plain(s.text,240,'step'),projectId:s.projectId,done:s.done};})};
  })};
 }
 function moveStep(path,index,delta){const steps=path.steps.slice(),other=index+delta;if(other<0||other>=steps.length)return path;[steps[index],steps[other]]=[steps[other],steps[index]];return {...path,steps};}
 const criteria=['Suitability','Documentation','License fit','Maintenance confidence'];
 function comparison(value){
  if(!value||value.schema!==1||!Array.isArray(value.weights)||value.weights.length!==4||value.weights.some(n=>!Number.isInteger(n)||n<0||n>10)||!value.scores||typeof value.scores!=='object'||Array.isArray(value.scores))throw new Error('Invalid comparison');
  const scores={};if(Object.keys(value.scores).length>10000)throw new Error('Too many comparison scores');
  for(const [id,s]of Object.entries(value.scores)){if(!/^(?:[a-f0-9]{16}|custom-[a-z0-9-]{8,80})$/.test(id)||!s||!Array.isArray(s.ratings)||s.ratings.length!==4||s.ratings.some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>5))||typeof s.notes!=='string'||s.notes.length>2000)throw new Error('Invalid project assessment');scores[id]={ratings:s.ratings.slice(),notes:s.notes};}
  return {schema:1,weights:value.weights.slice(),scores};
 }
 function rank(rows,weights,scores){const total=weights.reduce((a,b)=>a+b,0);return rows.map(row=>{const ratings=scores[row.id]?.ratings||[null,null,null,null];const complete=total>0&&weights.every((w,i)=>!w||Number.isInteger(ratings[i]));return {row,score:complete?Math.round(weights.reduce((sum,w,i)=>sum+w*(ratings[i]||0),0)/total*100)/100:null};}).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.row.name.localeCompare(b.row.name));}
 const allowedKeys=['workspace:v4','theme','learning:v1','custompaths:v1','github:v1','usage:v1','comparison:v1','audits:v1','results-layout','view:v1','visuals:v1'];
 function bundle(value){
  if(!value||value.format!=='pyatlas-complete-backup'||value.version!==1||!value.storage||typeof value.storage!=='object'||Array.isArray(value.storage))throw new Error('Invalid complete backup');
  if(new TextEncoder().encode(JSON.stringify(value)).length>8*1024*1024)throw new Error('Complete backup exceeds 8 MB');
  const storage={};for(const [key,raw]of Object.entries(value.storage)){
   if(!allowedKeys.includes(key)||typeof raw!=='string')throw new Error('Unsupported complete-backup key');
   if(key==='workspace:v4')storage[key]=JSON.stringify(W.validate(JSON.parse(raw)));
   else if(key==='theme'){if(!['dark','light'].includes(raw))throw new Error('Invalid theme');storage[key]=raw;}
   else if(key==='results-layout'){if(!['list','cards'].includes(raw))throw new Error('Invalid layout');storage[key]=raw;}
   else{const parsed=JSON.parse(raw);if(key==='visuals:v1'){const visual=typeof module==='object'&&module.exports?require('./visual-core.js'):globalThis.PyAtlasVisual;visual.media(parsed);}if(key==='view:v1')W.savedSearch({name:'Backup view',filters:parsed});if(key==='learning:v1')F.validateProgress(parsed);if(key==='custompaths:v1')customPaths(parsed);if(key==='comparison:v1')comparison(parsed);if(key==='audits:v1')auditReport(parsed);
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid backup settings');
    if(key==='usage:v1'&&(typeof parsed.enabled!=='boolean'||!parsed.counts||typeof parsed.counts!=='object'||Object.values(parsed.counts).some(n=>!Number.isSafeInteger(n)||n<0)))throw new Error('Invalid usage counters');
    if(key==='github:v1')for(const [repo,item]of Object.entries(parsed)){if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!item||!Number.isSafeInteger(item.stars)||item.stars<0||typeof item.license!=='string'||item.license.length>10000||typeof item.checkedAt!=='string'||!Number.isFinite(Date.parse(item.checkedAt))||(item.lastCommit!==null&&(typeof item.lastCommit!=='string'||!Number.isFinite(Date.parse(item.lastCommit)))))throw new Error('Invalid cached repository metadata');}
    storage[key]=raw;}
  }
  if(!storage['workspace:v4'])throw new Error('Complete backup has no workspace');return {format:'pyatlas-complete-backup',version:1,storage};
 }
 function restoreStorage(storage,value){
  const checked=bundle(value),previous={};for(const key of allowedKeys)previous[key]=storage.getItem('pyatlas-pro:'+key);
  try{for(const key of allowedKeys)storage.removeItem('pyatlas-pro:'+key);for(const [key,raw]of Object.entries(checked.storage))storage.setItem('pyatlas-pro:'+key,raw);}
  catch(error){try{for(const key of allowedKeys)storage.removeItem('pyatlas-pro:'+key);for(const [key,raw]of Object.entries(previous))if(raw!==null)storage.setItem('pyatlas-pro:'+key,raw);}catch(_){throw new Error('Restore failed and storage rollback could not finish. Keep your downloaded backups; do not close this session.');}throw new Error('Restore failed. Previous app data was restored.');}
  return checked;
 }
 function licenseReview(value){if(!value||value==='Unknown')return 'Unknown license: review the project and distribution license files.';return /(?:^|[^A-Z])(?:A?GPL|LGPL|MPL|EPL)(?:[^A-Z]|$)/i.test(value)?'Review redistribution, linking and source-availability obligations; this is not legal advice.':'Metadata only: verify the distribution license and dependencies for your intended use.';}
 function auditReport(value){if(!value||value.schema!==1||value.kind!=='pyatlas-audit'||!Array.isArray(value.packages)||value.packages.length>500||typeof value.checkedAt!=='string'||typeof value.source!=='string')throw new Error('Invalid audit report');if(JSON.stringify(value).length>4*1024*1024)throw new Error('Audit report exceeds 4 MB');for(const p of value.packages){F.dependency(p.name);if(typeof p.version!=='string'||p.version.length>100||typeof p.license!=='string'||p.license.length>10000||!Array.isArray(p.vulnerabilities)||p.vulnerabilities.length>1000||!['complete','error'].includes(p.scanStatus))throw new Error('Invalid package audit');}return value;}
 function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
 function zip(files){const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0;const put=(length)=>new Uint8Array(length),u16=(b,p,n)=>new DataView(b.buffer).setUint16(p,n,true),u32=(b,p,n)=>new DataView(b.buffer).setUint32(p,n,true);
  for(const [name,text]of Object.entries(files)){
   if(!/^[A-Za-z0-9_.\/-]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..'))throw new Error('Unsafe ZIP path');
   const n=encoder.encode(name),body=encoder.encode(text),crc=crc32(body),local=put(30+n.length+body.length);u32(local,0,0x04034b50);u16(local,4,20);u16(local,6,0x800);u16(local,12,33);u32(local,14,crc);u32(local,18,body.length);u32(local,22,body.length);u16(local,26,n.length);local.set(n,30);local.set(body,30+n.length);locals.push(local);
   const c=put(46+n.length);u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x800);u16(c,14,33);u32(c,16,crc);u32(c,20,body.length);u32(c,24,body.length);u16(c,28,n.length);u32(c,42,offset);c.set(n,46);centrals.push(c);offset+=local.length;
  }
  const centralSize=centrals.reduce((n,b)=>n+b.length,0),end=put(22);u32(end,0,0x06054b50);u16(end,8,centrals.length);u16(end,10,centrals.length);u32(end,12,centralSize);u32(end,16,offset);const result=put(offset+centralSize+22);let pos=0;for(const b of [...locals,...centrals,end]){result.set(b,pos);pos+=b.length;}return result;
 }
 function starter(name,dependencyText){
  if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)||name.length>60)throw new Error('Use a lowercase project name such as my-python-app.');
  if(['False','None','True','and','as','assert','async','await','break','class','continue','def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda','nonlocal','not','or','pass','raise','return','try','while','with','yield'].includes(name.replace(/-/g,'_')))throw new Error('Choose a project name that is not a reserved Python keyword.');
  const deps=requirements(dependencyText).map(p=>p.name+(p.version?'=='+p.version:'')),pkg=name.replace(/-/g,'_');
  const files={
   'pyproject.toml':'[build-system]\nrequires = ["setuptools>=77"]\nbuild-backend = "setuptools.build_meta"\n\n[project]\nname = '+JSON.stringify(name)+'\nversion = "0.1.0"\nrequires-python = ">=3.10"\ndependencies = '+JSON.stringify(deps,null,2)+'\n\n[project.optional-dependencies]\ndev = ["pytest>=8"]\n\n[project.scripts]\n'+name+' = "'+pkg+'.cli:main"\n\n[tool.setuptools.packages.find]\nwhere = ["src"]\n',
   ['src/'+pkg+'/__init__.py']:'"""'+name+' application package."""\n',
   ['src/'+pkg+'/cli.py']:'"""Command line entry point."""\n\ndef message() -> str:\n    return "Hello from '+name+'"\n\ndef main() -> None:\n    print(message())\n\nif __name__ == "__main__":\n    main()\n',
   'tests/test_cli.py':'from '+pkg+'.cli import message\n\ndef test_message():\n    assert message() == "Hello from '+name+'"\n',
   'requirements.txt':deps.join('\n')+'\n',
   'README.md':'# '+name+'\n\nGenerated locally by PyAtlas Pro. Review dependency identities, versions and licenses.\n\n## Run\n\n```sh\npython -m venv .venv\n# Activate the environment using your OS instructions.\npython -m pip install -e ".[dev]"\npython -m pytest\n'+name+'\n```\n\n## Docker\n\n```sh\ndocker build -t '+name+' .\ndocker run --rm '+name+'\n```\n\nNo third-party source code or license grants are included. Choose a license before publishing. Dependencies are drafts until resolved and checked.\n',
   '.gitignore':'.venv/\n__pycache__/\n*.egg-info/\n.pytest_cache/\ndist/\nbuild/\n',
   '.dockerignore':'.git\n.venv\n__pycache__\n*.egg-info\n',
   'Dockerfile':'FROM python:3.12-slim\nWORKDIR /app\nCOPY pyproject.toml README.md ./\nCOPY src ./src\nRUN python -m pip install --no-cache-dir .\nUSER 65532:65532\nENTRYPOINT ["'+name+'"]\n',
   '.github/workflows/ci.yml':'name: Tests\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  test:\n    runs-on: ubuntu-latest\n    strategy:\n      matrix:\n        python: ["3.10", "3.12", "3.14"]\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: ${{ matrix.python }}\n      - run: python -m pip install -e ".[dev]"\n      - run: python -m pytest\n'
  };return files;
 }
 return {timeoutSignal,anySignal,requirements,pythonSupport,canonical,customPaths,moveStep,criteria,comparison,rank,allowedKeys,bundle,restoreStorage,licenseReview,auditReport,crc32,zip,starter};
});
