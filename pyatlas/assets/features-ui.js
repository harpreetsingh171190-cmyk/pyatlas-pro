'use strict';
(() => {
  const $=id=>document.getElementById(id),app=globalThis.PyAtlasApp,F=globalThis.PyAtlasFeatures;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function read(key,fallback){try{return JSON.parse(localStorage.getItem('pyatlas-pro:'+key))??fallback;}catch(_){return fallback;}}
  function save(key,value){try{localStorage.setItem('pyatlas-pro:'+key,JSON.stringify(value));return true;}catch(_){app.notice('Browser storage is unavailable. Export your progress before closing.');return false;}}
  function show(id){$(id).showModal();}
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  // Optional local aggregate counters: no query text, project IDs, timestamps or network.
  let usage=read('usage:v1',{enabled:false,counts:{}});
  if(!usage||typeof usage.enabled!=='boolean'||!usage.counts||typeof usage.counts!=='object')usage={enabled:false,counts:{}};
  const allowed=['Searches','Project visits','Workspace edits','Stack drafts','GitHub checks','Learning steps'];
  usage.counts=Object.fromEntries(allowed.map(k=>[k,Number.isSafeInteger(usage.counts[k])&&usage.counts[k]>=0?usage.counts[k]:0]));
  function count(key){if(usage.enabled){usage.counts[key]=(usage.counts[key]||0)+1;save('usage:v1',usage);}}
  let searchTimer;$('query').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>count('Searches'),600);});
  document.addEventListener('click',e=>{if(e.target.closest('.card a'))count('Project visits');});
  $('project-form').addEventListener('submit',()=>{if(!$('editor-error').textContent)count('Workspace edits');});
  function renderUsage(){const box=$('usage-counts');box.replaceChildren();for(const key of allowed){const p=el('p');p.append(el('span',key),document.createTextNode(': '+usage.counts[key]));box.append(p);}$('usage-enabled').checked=usage.enabled;}
  $('usage-open').onclick=()=>{renderUsage();show('usage-dialog');};
  $('usage-enabled').onchange=()=>{usage.enabled=$('usage-enabled').checked;save('usage:v1',usage);};
  $('usage-clear').onclick=()=>{for(const k of allowed)usage.counts[k]=0;save('usage:v1',usage);renderUsage();};
  $('usage-export').onclick=()=>app.saveFile('pyatlas-local-usage.json',JSON.stringify(usage,null,2),'application/json');
  // Stack builder uses the existing unlimited bulk selection, not the 3-item comparison.
  let stackRows=[];
  function updateDraft(){try{$('stack-output').value=F.stack(stackRows,$('stack-format').value);$('stack-download').disabled=!stackRows.some(r=>r.package.trim());}catch(error){$('stack-output').value=error.message;$('stack-download').disabled=true;}}
  $('stack-open').onclick=()=>{
    stackRows=app.entries().filter(r=>app.bulk.has(r.id)).map(r=>({row:r,package:F.suggestion(r.name)}));$('stack-rows').replaceChildren();
    if(!stackRows.length)$('stack-rows').append(el('p','Select projects using the bulk checkboxes first.'));
    for(const item of stackRows){const label=el('label');label.append(el('span',item.row.name));const input=el('input');input.value=item.package;input.placeholder='Verified pip package name';input.maxLength=100;input.oninput=()=>{item.package=input.value;updateDraft();};label.append(input);$('stack-rows').append(label);}
    updateDraft();show('stack-dialog');
  };
  $('stack-format').onchange=updateDraft;$('stack-download').onclick=()=>{updateDraft();if($('stack-download').disabled)return;app.saveFile($('stack-format').value==='pyproject'?'pyproject.toml':'requirements.txt',$('stack-output').value,'text/plain');count('Stack drafts');};
  // Learning paths survive reloads and have their own portable progress export/import.
  let progress;try{progress=F.validateProgress(read('learning:v1',{schema:1,paths:{}}));}catch(_){progress={schema:1,paths:{}};}
  const P=globalThis.PyAtlasProfessional;
  function getCustom(){try{return P.customPaths(read('custompaths:v1',{schema:1,paths:[]}));}catch(_){return {schema:1,paths:[]};}}
  function paths(){return [...F.pathDefinitions,...getCustom().paths];}
  function refreshPaths(){const current=$('path-select').value;$('path-select').replaceChildren(...paths().map(p=>new Option(p.title,p.id)));if(paths().some(p=>p.id===current))$('path-select').value=current;}
  refreshPaths();globalThis.addEventListener('pyatlas-paths-changed',()=>{refreshPaths();renderPath();});
  function renderPath(){
    const path=paths().find(p=>p.id===$('path-select').value)||F.pathDefinitions[0],days=new Set(progress.paths[path.id]||[]);
    const items=path.steps?path.steps.map((s,i)=>({day:i+1,name:'',phase:s.text,row:app.entries().find(r=>r.id===s.projectId),step:s})):F.pathDays(path,app.entries());
    const done=()=>path.steps?path.steps.filter(s=>s.done).length:days.size;
    const update=()=>{$('path-progress').max=items.length;$('path-progress').value=done();$('path-count').textContent=done()+' / '+items.length+' · Completed steps';};
    $('path-days').replaceChildren();update();
    for(const item of items){const box=el('article'),label=el('label'),input=el('input');input.type='checkbox';input.checked=item.step?item.step.done:days.has(item.day);input.onchange=()=>{
      if(item.step){item.step.done=input.checked;const store=getCustom();store.paths=store.paths.map(p=>p.id===path.id?path:p);save('custompaths:v1',store);}else{if(input.checked)days.add(item.day);else days.delete(item.day);progress.paths[path.id]=[...days];save('learning:v1',progress);}count('Learning steps');update();
    };label.append(input,el('span','Step '+item.day+' · '+(item.name?item.name+' · ':'')+item.phase));box.append(label);
      if(item.row){const button=el('button','Open project workspace');button.onclick=()=>{$('paths-dialog').close();app.openEditor(item.row);};box.append(button);}else if(!item.step)box.append(el('p','Not in this catalogue snapshot; consult the official documentation.'));
      $('path-days').append(box);
    }
  }
  $('paths-open').onclick=()=>{refreshPaths();renderPath();show('paths-dialog');};$('path-select').onchange=renderPath;
  $('path-export').onclick=()=>app.saveFile('pyatlas-learning-progress.json',JSON.stringify({schema:2,builtin:progress,custom:getCustom()},null,2),'application/json');
  $('path-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2*1024*1024)throw new Error('Learning progress file is too large.');const raw=JSON.parse(await file.text()),incoming=F.validateProgress(raw.schema===2?raw.builtin:raw),custom=raw.schema===2?P.customPaths(raw.custom):null;
    for(const p of F.pathDefinitions)progress.paths[p.id]=[...new Set([...(progress.paths[p.id]||[]),...incoming.paths[p.id]])];
    if(custom){const store=getCustom(),merged=new Map(store.paths.map(p=>[p.id,p]));for(const p of custom.paths){const old=merged.get(p.id);if(old)p.steps=p.steps.map(s=>({...s,done:s.done||old.steps.some(o=>o.id===s.id&&o.done)}));merged.set(p.id,p);}const checked=P.customPaths({schema:1,paths:[...merged.values()]});if(!save('custompaths:v1',checked))throw new Error('Could not save imported paths.');}
    save('learning:v1',progress);refreshPaths();renderPath();
   }catch(error){app.notice(error.message);}finally{e.target.value='';}};
  app.getLearningProgress=()=>F.validateProgress(progress);app.getUsageCounts=()=>JSON.parse(JSON.stringify(usage));
  // Native dialog supplies focus trapping, Escape and focus restoration.
  const commands=[['Charts and diagrams',()=>$('visuals-open').click()],['Project Starter',()=>$('starter-open').click()],['Dependency and Security Check',()=>$('audit-open').click()],['Complete Backup',()=>$('complete-open').click()],['Advanced Comparison',()=>$('decision-open').click()],['Edit learning paths',()=>$('path-manager-open').click()],['Search projects',()=>{$('query').focus();}],['Stack Builder',()=>$('stack-open').click()],['Learning paths',()=>$('paths-open').click()],['Usage insights',()=>$('usage-open').click()],['Insights',()=>$('analytics-open').click()],['Bookmarks',()=>$('saved').click()],['Toggle light and dark theme',()=>$('theme').click()],['Install app',()=>$('install-app').click()]];
  function renderCommands(){const q=$('command-query').value.toLocaleLowerCase();$('command-list').replaceChildren();commands.filter(([name])=>F.fuzzy(name.toLocaleLowerCase(),q)).forEach(([name,run])=>{const b=el('button',name);b.onclick=()=>{$('command-dialog').close();run();};$('command-list').append(b);});}
  $('command-open').onclick=()=>{$('command-query').value='';renderCommands();show('command-dialog');$('command-query').focus();};$('command-query').oninput=renderCommands;
  $('command-query').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();$('command-list').querySelector('button')?.focus();}if(e.key==='Enter')$('command-list').querySelector('button')?.click();};
  $('command-list').onkeydown=e=>{const list=[...$('command-list').querySelectorAll('button')],i=list.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;list[next]?.focus();}};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!document.querySelector('dialog[open]'))$('command-open').click();}});
  // GitHub requests ONLY originate in a click handler. Never during render/startup.
  const rawGithub=read('github:v1',{}),githubCache=rawGithub&&typeof rawGithub==='object'&&!Array.isArray(rawGithub)?rawGithub:{},fetched=new Map();
  async function request(url){const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:P.timeoutSignal(12000)});if(!response.ok)throw new Error(response.status===403||response.status===429?'GitHub rate limit reached. Try again later.':response.status===404?'Repository or commit history is unavailable.':'GitHub request failed.');return response.json();}
  function githubText(info){return '★ '+info.stars+' · '+'Last commit'+': '+(info.lastCommit?info.lastCommit.slice(0,10):'Unknown')+' · '+'License'+': '+info.license+' · '+F.activity(info)+' · '+'Checked'+': '+info.checkedAt.slice(0,10);}
  function enhanceCards(){document.querySelectorAll('.card').forEach(card=>{
    if(card.querySelector('.github-panel'))return;const link=card.querySelector('.card-bottom a'),repo=link&&F.repository(link.href);if(!repo)return;
    const panel=el('section');panel.className='github-panel';const status=el('p');status.setAttribute('role','status');const cached=fetched.get(repo)||githubCache[repo];
    if(cached&&Number.isFinite(cached.stars)&&typeof cached.checkedAt==='string'&&typeof cached.license==='string'){status.textContent=githubText(cached)+' · '+'Cached snapshot';}
    const button=el('button','Check GitHub now');button.type='button';button.onclick=async()=>{
      button.disabled=true;status.textContent='Checking GitHub…';count('GitHub checks');
      try{const base='https://api.github.com/repos/'+repo,info=await request(base);let lastCommit=null;
        try{const commits=await request(base+'/commits?per_page=1');lastCommit=commits[0]?.commit?.committer?.date||null;}catch(error){if(!info.archived)throw error;}
        const value={stars:info.stargazers_count,license:info.license?.spdx_id||'Unknown',archived:!!info.archived,disabled:!!info.disabled,lastCommit,checkedAt:new Date().toISOString()};
        fetched.set(repo,value);githubCache[repo]=value;save('github:v1',githubCache);status.textContent=githubText(value);status.title='Commit recency is a signal, not proof of maintenance or abandonment.';
      }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
    };panel.append(button,status);card.append(panel);
  });}
  new MutationObserver(enhanceCards).observe($('results'),{childList:true});enhanceCards();
  // Install only on supported secure origins. The standalone file still works offline.
  let installEvent=null;
  globalThis.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});
  $('install-app').onclick=async()=>{if(installEvent){const event=installEvent;installEvent=null;await event.prompt();}else app.notice('Install from your browser menu on HTTPS or localhost. On iPhone use Share → Add to Home Screen.');};
  if('serviceWorker' in navigator&&['http:','https:'].includes(location.protocol)&&globalThis.isSecureContext){
    const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='./manifest.webmanifest';document.head.append(manifest);
    navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(async registration=>{await navigator.serviceWorker.ready;$('pwa-state').textContent='Offline cache ready. GitHub refresh is optional.';if(registration.waiting)$('pwa-state').textContent='Update ready. Close all app windows and reopen.';registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('pwa-state').textContent='Update ready. Close all app windows and reopen.';});});}).catch(()=>{$('pwa-state').textContent='Offline cache unavailable. The downloaded HTML still works offline.';});
  }else $('pwa-state').textContent='File mode: offline works; installation needs HTTPS or localhost.';
})();
