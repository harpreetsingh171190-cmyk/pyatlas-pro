'use strict';
(()=>{
 const $=id=>document.getElementById(id),A=globalThis.PyAtlasApp,W=globalThis.PyAtlasCore,F=globalThis.PyAtlasFeatures,P=globalThis.PyAtlasProfessional,V=globalThis.PyAtlasVisual;
 const ns='http://www.w3.org/2000/svg',assets=JSON.parse($('visual-assets').textContent).assets;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n;};
 function svg(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;}
 function stored(key,fallback){try{return JSON.parse(localStorage.getItem('pyatlas-pro:'+key))??fallback;}catch(_){return fallback;}}
 let media;try{media=V.media(stored('visuals:v1',{schema:1,images:[],history:[]}));}catch(_){media={schema:1,images:[],history:[]};A.notice('Saved visual media is invalid. Other workspace data is unchanged.');}
 function persist(next){const checked=V.media(next);localStorage.setItem('pyatlas-pro:visuals:v1',JSON.stringify(checked));media=checked;}
 A.getVisualMedia=()=>V.media(media);
 function palette(){return document.body.classList.contains('dark')?{ink:'#e8f3ed',bg:'#172923',grid:'#80978a',accent:'#9ddbaf',muted:'#c1d3c7'}:{ink:'#172923',bg:'#ffffff',grid:'#9caea2',accent:'#215c42',muted:'#455e50'};}
 const colors=['#215c42','#315c9a','#9a4b2c','#71569c','#6d7026','#993b71','#28696a','#6a513c'];
 function base(title,width=760,height=360){const p=palette(),s=svg('svg',{xmlns:ns,viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':title});s.append(svg('title',{},title),svg('rect',{width,height,rx:12,fill:p.bg}));return s;}
 function text(s,x,y,value,extra={}){s.append(svg('text',{x,y,fill:palette().ink,'font-family':'system-ui,sans-serif','font-size':14,...extra},value));}
 function table(rows,headings=['Item','Value']){const t=el('table'),caption=el('caption','Data used in this visualization');t.append(caption);const tr=el('tr');for(const h of headings){const th=el('th',h);th.scope='col';tr.append(th);}const thead=el('thead');thead.append(tr);t.append(thead);const tbody=el('tbody');for(const row of rows){const tr=el('tr');row.forEach((v,i)=>{const cell=el(i?'td':'th',v);if(!i)cell.scope='row';tr.append(cell);});tbody.append(tr);}t.append(tbody);return t;}
 function downloadable(section,s,name){const b=el('button','Download SVG');b.onclick=()=>A.saveFile(name+'.svg',new XMLSerializer().serializeToString(s),'image/svg+xml');section.append(b);}
 function chart(title,rows,type='bars',note=''){const section=el('section');section.className='visual-panel';section.append(el('h3',title));if(note)section.append(el('p',note));const s=base(title,760,type==='donut'?360:Math.max(220,rows.length*42+70));
  if(!rows.length){text(s,30,65,'No data yet. Add progress or personal assessments to see this chart.');}
  else if(type==='donut'){
   const seriesColors=document.body.classList.contains('dark')?['#8fd9b0','#95bdf7','#ffbd92','#c9a7fa','#d4d68a','#f5a8d2','#90d9db','#e0bb9c']:colors;
   const total=rows.reduce((sum,r)=>sum+r.value,0),radius=100,circ=2*Math.PI*radius;let consumed=0;
   s.append(svg('circle',{cx:170,cy:175,r:radius,fill:'none',stroke:palette().grid,'stroke-width':40}));
   if(total)rows.forEach((r,i)=>{const part=r.value/total*circ;s.append(svg('circle',{cx:170,cy:175,r:radius,fill:'none',stroke:seriesColors[i%seriesColors.length],'stroke-width':40,'stroke-dasharray':`${part} ${circ-part}`,'stroke-dashoffset':-consumed,transform:'rotate(-90 170 175)'}));consumed+=part;});
   text(s,170,177,total,{'font-size':34,'text-anchor':'middle'});text(s,170,202,'projects',{'text-anchor':'middle'});
   rows.forEach((r,i)=>{s.append(svg('rect',{x:350,y:57+i*43,width:18,height:18,fill:seriesColors[i%seriesColors.length]}));text(s,380,72+i*43,r.label+': '+r.value);});
  }else{
   const max=type==='scores'?5:Math.max(1,...rows.map(r=>r.total?100:r.value));
   rows.forEach((r,i)=>{const y=32+i*42,value=r.total?r.value/r.total*100:r.value;const label=r.label.length>28?r.label.slice(0,27)+'…':r.label;
    text(s,20,y+20,label);s.append(svg('rect',{x:280,y,width:360,height:26,rx:4,fill:palette().grid,opacity:.2}),svg('rect',{x:280,y,width:360*value/max,height:26,rx:4,fill:palette().accent}));text(s,654,y+20,r.total?r.value+' / '+r.total:String(r.value));
   });
  }
  section.append(s);const details=el('details');details.append(el('summary','View chart data'),table(rows.map(r=>[r.label,r.total?r.value+' / '+r.total:r.value])));section.append(details);downloadable(section,s,title.toLowerCase().replace(/[^a-z0-9]+/g,'-'));return section;
 }
 function trend(){const section=el('section');section.className='visual-panel';section.append(el('h3','Recorded checklist progress'),el('p','Daily snapshots are recorded only when you press Record today’s progress. Existing dates are updated; no history is invented.'));
  const rows=media.history.filter(r=>r.totalTasks>0),s=base('Recorded checklist completion percentage');
  if(rows.length<2)text(s,30,65,'Record snapshots on at least two different days with checklist tasks.');
  else{const first=Date.parse(rows[0].date+'T00:00:00Z'),last=Date.parse(rows.at(-1).date+'T00:00:00Z');
   for(let n=0;n<=100;n+=25){const y=290-n*2.2;s.append(svg('line',{x1:65,y1:y,x2:710,y2:y,stroke:palette().grid,'stroke-width':1}));text(s,48,y+5,n+'%',{'text-anchor':'end'});}
   const points=rows.map(r=>[65+(Date.parse(r.date+'T00:00:00Z')-first)/(last-first)*645,290-r.completedTasks/r.totalTasks*220]);
   s.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:palette().accent,'stroke-width':3}));points.forEach((point,i)=>{const c=svg('circle',{cx:point[0],cy:point[1],r:4,fill:palette().accent});c.append(svg('title',{},rows[i].date+': '+Math.round(rows[i].completedTasks/rows[i].totalTasks*100)+'%'));s.append(c);});text(s,65,325,rows[0].date);text(s,710,325,rows.at(-1).date,{'text-anchor':'end'});
  }
  section.append(s);const d=el('details');d.append(el('summary','View recorded history'),table(media.history.map(r=>[r.date,r.completedTasks+' / '+r.totalTasks,r.bookmarks]),['Date','Completed checklist tasks','Bookmarks']));section.append(d);downloadable(section,s,'recorded-checklist-progress');return section;
 }
 let currentDatasets=null;
 function renderCharts(){const state=A.getState(),progress=A.getLearningProgress(),custom=P.customPaths(stored('custompaths:v1',{schema:1,paths:[]}));let decision;try{decision=P.comparison(stored('comparison:v1',{schema:1,weights:[5,3,4,3],scores:{}}));}catch(_){decision={schema:1,weights:[5,3,4,3],scores:{}};}
  currentDatasets=V.datasets(A.entries(),state,progress,custom,decision);
  $('chart-grid').replaceChildren(chart('Top catalogue categories',currentDatasets.categories),chart('Workspace status distribution',currentDatasets.statuses,'donut'),chart('Learning path completion',currentDatasets.learning,'bars','Completed steps, not certification or measured skill.'),chart('Personal weighted comparison',currentDatasets.comparison,'scores','0–5 weighted personal ratings. Only fully assessed projects appear; at most eight are shown.'),trend());
 }
 function diagram(model){const section=el('section');section.className='visual-panel';section.append(el('h3',model.title),el('p',model.description));const s=base(model.title,760,440),p=palette(),lookup=new Map(model.nodes.map(n=>[n[0],n]));
  model.edges.forEach(([from,to])=>{const a=lookup.get(from),b=lookup.get(to);if(!a||!b)return;const ax=a[2]+95,ay=a[3]+38,bx=b[2]+95,by=b[3]+38;let x1=ax,y1=ay,x2=bx,y2=by;
   if(Math.abs(bx-ax)>Math.abs(by-ay)){x1+=Math.sign(bx-ax)*95;x2-=Math.sign(bx-ax)*101;}else{y1+=Math.sign(by-ay)*38;y2-=Math.sign(by-ay)*44;}
   let angle=Math.atan2(y2-y1,x2-x1);
   if(ax!==bx&&ay!==by){let points;
    if(Math.abs(bx-ax)<=240){x1=ax+Math.sign(bx-ax)*95;y1=ay;x2=bx-Math.sign(bx-ax)*101;y2=by;const mid=(x1+x2)/2;points=[[x1,y1],[mid,y1],[mid,y2],[x2,y2]];angle=bx>ax?0:Math.PI;}
    else{x1=ax;y1=ay+Math.sign(by-ay)*38;x2=bx;y2=by-Math.sign(by-ay)*44;const mid=(y1+y2)/2;points=[[x1,y1],[x1,mid],[x2,mid],[x2,y2]];angle=by>ay?Math.PI/2:-Math.PI/2;}
    s.append(svg('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:p.accent,'stroke-width':2}));
   }else s.append(svg('line',{x1,y1,x2,y2,stroke:p.accent,'stroke-width':2}));const size=9;const points=[[x2,y2],[x2-size*Math.cos(angle-.5),y2-size*Math.sin(angle-.5)],[x2-size*Math.cos(angle+.5),y2-size*Math.sin(angle+.5)]];s.append(svg('polygon',{points:points.map(p=>p.join(',')).join(' '),fill:p.accent}));
  });
  model.nodes.forEach(([,label,x,y])=>{s.append(svg('rect',{x,y,width:190,height:76,rx:12,fill:p.bg,stroke:p.accent,'stroke-width':2}));const words=label.split(' '),lines=[''];for(const word of words){if((lines.at(-1)+' '+word).trim().length>23)lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}lines.slice(0,3).forEach((line,i)=>text(s,x+95,y+30+i*19,line,{'text-anchor':'middle'}));});
  section.append(s);const d=el('details');d.append(el('summary','Diagram connections as text'),table(model.edges.map(([a,b])=>[lookup.get(a)[1],lookup.get(b)[1]]),['From','To']));section.append(d);downloadable(section,s,model.title.toLowerCase().replace(/[^a-z0-9]+/g,'-'));return section;
 }
 function renderDiagram(){$('diagram-display').replaceChildren(diagram(V.diagrams[$('diagram-select').value]||V.diagrams.architecture));}
 $('visuals-open').onclick=()=>{try{renderCharts();renderDiagram();$('visuals-status').textContent='Local workspace charts. No network requests were made.';$('visuals-dialog').showModal();}catch(error){A.notice(error.message);}};
 $('visuals-refresh').onclick=()=>{try{renderCharts();renderDiagram();$('visuals-status').textContent='Updated from current workspace.';}catch(error){$('visuals-status').textContent=error.message;}};
 $('diagram-select').onchange=renderDiagram;
 $('visuals-record').onclick=()=>{try{const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');persist(V.record(media,day,W.analytics(A.entries(),A.getState())));renderCharts();$('visuals-status').textContent='Saved today’s local snapshot. Recording again today replaces the same date.';}catch(error){$('visuals-status').textContent=error.message;}};
 $('visuals-json').onclick=()=>{try{renderCharts();A.saveFile('pyatlas-visual-data.json',JSON.stringify({scope:'Full local workspace; comparison scores are personal',datasets:currentDatasets,recordedHistory:media.history},null,2),'application/json');}catch(error){$('visuals-status').textContent=error.message;}};
 // Project gallery: explicit image provenance and local, re-encoded raster uploads.
 function row(){return A.entries().find(r=>r.id===$('gallery-project').value);}
 function bundled(r){return assets.filter(im=>im.projectName.toLowerCase()===r.name.toLowerCase());}
 function thumb(r){const uploaded=media.images.find(im=>im.projectId===r.id),official=bundled(r)[0];return uploaded?{src:uploaded.data,label:'Your uploaded screenshot'}:official?{src:official.data,label:official.kind}:{src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(V.thumbnail(r)),label:'Illustrated project preview'};}
 let uploadTicket=0;
 function renderGallery(){const r=row();if(!r)return;$('gallery-title').textContent=r.name+' · Images & Screenshots';$('gallery-images').replaceChildren();
  const list=[...bundled(r),...media.images.filter(im=>im.projectId===r.id)];
  if(!list.length)list.push({data:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(V.thumbnail(r)),caption:r.name+' illustrated project card',kind:'Illustrated preview, not a screenshot',source:'',license:'Original PyAtlas artwork'});
  for(const im of list){const figure=el('figure'),image=el('img');image.src=im.data;image.alt=im.caption;image.loading='lazy';figure.append(image,el('figcaption',im.caption+' · '+im.kind));if(im.source){const a=el('a','Source documentation ↗');a.href=im.source;a.target='_blank';a.rel='noopener noreferrer';figure.append(a,el('p',im.license+' · Retrieved '+im.retrieved));}
   if(im.id){const b=el('button','Remove uploaded screenshot');b.setAttribute('aria-label','Remove screenshot: '+im.caption);b.onclick=()=>{try{persist({...media,images:media.images.filter(x=>x.id!==im.id)});renderGallery();enhanceCards(true);$('gallery-status').textContent='Screenshot removed.';}catch(error){$('gallery-status').textContent=error.message;}};figure.append(b);} $('gallery-images').append(figure);
  }
  $('gallery-blueprint').replaceChildren(diagram(V.blueprint(r)));
 }
 function openGallery(id){uploadTicket++;$('gallery-project').replaceChildren(...A.entries().map(r=>new Option(r.name+' · '+r.category,r.id)));if(id)$('gallery-project').value=id;$('gallery-caption').value='';$('gallery-status').textContent='';renderGallery();$('gallery-dialog').showModal();}
 $('gallery-project').onchange=()=>{uploadTicket++;$('gallery-file').value='';$('gallery-status').textContent='';renderGallery();};$('gallery-dialog').addEventListener('close',()=>{uploadTicket++;$('gallery-file').value='';});
 async function normalize(file){if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Choose a PNG, JPEG or WebP image of at most 8 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Cannot read image'));r.readAsDataURL(file);});
  const image=new Image();image.src=data;await image.decode();if(!image.naturalWidth||image.naturalWidth>8192||image.naturalHeight>8192)throw new Error('Image dimensions exceed 8192 pixels.');const scale=Math.min(1,1200/image.naturalWidth,1200/image.naturalHeight),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.7,.55]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length<=500000)return result;}throw new Error('Image is still too large after resizing. Upload a smaller screenshot.');
 }
 $('gallery-file').onchange=async e=>{const ticket=++uploadTicket,r=row(),file=e.target.files[0],caption=$('gallery-caption').value.trim();if(!file||!r)return;try{if(!caption)throw new Error('Enter a screenshot caption first.');$('gallery-status').textContent='Processing locally…';const data=await normalize(file);if(ticket!==uploadTicket||!$('gallery-dialog').open)return;const im={id:'img-'+crypto.randomUUID(),projectId:r.id,caption,data,createdAt:new Date().toISOString(),kind:'user-upload'};persist({...media,images:[...media.images,im]});renderGallery();enhanceCards(true);$('gallery-status').textContent='Screenshot saved locally. It is included in Complete Backup.';}catch(error){if(ticket===uploadTicket)$('gallery-status').textContent=error.message;}finally{if(ticket===uploadTicket)e.target.value='';}};
 function enhanceCards(refresh=false){const rows=new Map(A.entries().map(r=>[r.id,r]));document.querySelectorAll('.card').forEach(card=>{if(card.querySelector('.project-visual')&&!refresh)return;const r=rows.get(card.dataset.projectId);if(!r)return;card.querySelector('.project-visual')?.remove();const figure=el('figure');figure.className='project-visual';const im=el('img'),preview=thumb(r);im.src=preview.src;im.alt='';im.loading='lazy';im.width=600;im.height=260;const b=el('button','Images & diagrams');b.type='button';b.setAttribute('aria-label','Images and diagrams for '+r.name);b.onclick=()=>openGallery(r.id);figure.append(im,el('figcaption',preview.label),b);card.prepend(figure);});}
 new MutationObserver(()=>enhanceCards()).observe($('results'),{childList:true});enhanceCards();
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
})();
