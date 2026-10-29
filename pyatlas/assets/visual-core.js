/* Local chart datasets, media validation and explicitly illustrative project diagrams. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./workspace.js'),require('./features-core.js'),require('./professional-core.js'));else root.PyAtlasVisual=factory(root.PyAtlasCore,root.PyAtlasFeatures,root.PyAtlasProfessional);})(globalThis,function(W,F,P){
 'use strict';
 const projectId=id=>typeof id==='string'&&/^(?:[a-f0-9]{16}|custom-[a-z0-9-]{8,80})$/.test(id);
 function media(value){
  if(!value||value.schema!==1||!Array.isArray(value.images)||value.images.length>20||!Array.isArray(value.history)||value.history.length>90)throw new Error('Invalid visual media store');
  const ids=new Set(),dates=new Set();let bytes=0;
  const images=value.images.map(im=>{if(!im||!/^img-[a-z0-9-]{8,80}$/.test(im.id)||ids.has(im.id)||!projectId(im.projectId)||typeof im.caption!=='string'||!im.caption.trim()||im.caption.length>200||typeof im.data!=='string'||im.data.length>500000||!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/=]+$/.test(im.data)||!Number.isFinite(Date.parse(im.createdAt))||im.kind!=='user-upload')throw new Error('Invalid project image');ids.add(im.id);bytes+=im.data.length;return {id:im.id,projectId:im.projectId,caption:im.caption.trim(),data:im.data,createdAt:im.createdAt,kind:'user-upload'};});
  if(bytes>3*1024*1024)throw new Error('Project images exceed the 3 MB local gallery limit');
  const history=value.history.map(row=>{if(!row||!W.validDate(row.date)||dates.has(row.date)||['completedTasks','totalTasks','bookmarks'].some(k=>!Number.isSafeInteger(row[k])||row[k]<0||row[k]>1000000)||row.completedTasks>row.totalTasks)throw new Error('Invalid recorded progress');dates.add(row.date);return {date:row.date,completedTasks:row.completedTasks,totalTasks:row.totalTasks,bookmarks:row.bookmarks};}).sort((a,b)=>a.date.localeCompare(b.date));
  return {schema:1,images,history};
 }
 function record(store,date,stats){const source=media(store),row={date,completedTasks:stats.completedTasks,totalTasks:stats.tasks,bookmarks:stats.bookmarks};return media({...source,history:[...source.history.filter(r=>r.date!==date),row].sort((a,b)=>a.date.localeCompare(b.date)).slice(-90)});}
 function datasets(entries,state,progress,custom,decision){
  const stats=W.analytics(entries,state),learning=F.pathDefinitions.map(p=>({label:p.title,value:(progress.paths[p.id]||[]).length,total:30}));
  for(const p of P.customPaths(custom).paths)learning.push({label:p.title,value:p.steps.filter(s=>s.done).length,total:p.steps.length});
  const ranked=P.rank(entries.filter(r=>decision.scores[r.id]),decision.weights,decision.scores).filter(r=>r.score!==null).slice(0,8).map(r=>({label:r.row.name,value:r.score}));
  return {categories:stats.categories.slice(0,10).map(([label,value])=>({label,value})),statuses:Object.entries(stats.statuses).map(([label,value])=>({label,value})),learning,comparison:ranked,stats};
 }
 const diagrams={
  architecture:{title:'PyAtlas application architecture',description:'Actual application components. Network endpoints are used only by explicit online actions.',nodes:[['catalog','Bundled catalogue',30,35],['app','Browser workspace',270,35],['storage','Local browser data',510,35],['worker','Service worker',270,160],['cache','Offline shell cache',30,285],['api','Optional public APIs',510,285]],edges:[['catalog','app'],['app','storage'],['app','worker'],['worker','cache'],['app','api']]},
  workflow:{title:'Suggested project workflow',description:'An editable-workspace workflow, not a claim that generated projects have been deployed.',nodes:[['discover','Discover projects',30,35],['compare','Compare options',270,35],['select','Select and verify stack',510,35],['check','Check dependencies',510,170],['starter','Generate starter ZIP',270,170],['test','Test and develop',30,170],['release','Publish manually',30,305]],edges:[['discover','compare'],['compare','select'],['select','check'],['check','starter'],['starter','test'],['test','release']]},
  backup:{title:'Encrypted backup and restore',description:'Actual backup flow: validation precedes replacement; failed storage writes trigger rollback.',nodes:[['snapshot','Snapshot app data',30,30],['encrypt','Validate and encrypt',270,30],['download','Download backup',510,30],['unlock','Choose file and unlock',510,165],['preview','Validate and preview',270,165],['restore','Explicit restore',30,165],['reload','Success: reload',30,300],['rollback','Failure: rollback',270,300]],edges:[['snapshot','encrypt'],['encrypt','download'],['download','unlock'],['unlock','preview'],['preview','restore'],['restore','reload'],['restore','rollback']]}
 };
 function blueprint(project){const cat=project.category.toLowerCase(),web=/web|api|server|framework/.test(cat),data=/data|science|machine|visual|learning/.test(cat);
  const labels=web?['Client request','Application routes','Service / library','Data store','Tests and CI']:data?['Input dataset','Prepare / validate','Analysis / model','Output / charts','Tests and CI']:['CLI or notebook','Application code','Selected library','Results / files','Tests and CI'];
  return {title:project.name+' · suggested architecture',description:'Illustrative planning blueprint based on the catalogue category. Not an independently verified architecture of '+project.name+'.',nodes:labels.map((text,i)=>['p'+i,text,30+(i%3)*240,40+Math.floor(i/3)*160]),edges:[['p0','p1'],['p1','p2'],['p2','p3'],['p4','p1']]};
 }
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function thumbnail(project){return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260" viewBox="0 0 600 260"><rect width="600" height="260" rx="20" fill="#153d30"/><circle cx="510" cy="68" r="100" fill="#28684e"/><text x="32" y="68" font-family="sans-serif" font-size="18" fill="#c9ead8">ILLUSTRATED PROJECT PREVIEW</text><text x="32" y="146" font-family="sans-serif" font-size="38" font-weight="700" fill="white">'+escape(project.name.slice(0,24))+'</text><text x="32" y="204" font-family="sans-serif" font-size="20" fill="#c9ead8">'+escape(project.category.slice(0,43))+'</text></svg>';}
 return {media,record,datasets,diagrams,blueprint,thumbnail};
});
