/* Pure functions shared with Node tests. No network or browser storage. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PyAtlasFeatures=factory();})(globalThis,function(){
  'use strict';
  function distance(a,b){
    if(Math.abs(a.length-b.length)>2)return 3;
    let previous=Array.from({length:b.length+1},(_,i)=>i),older;
    for(let i=1;i<=a.length;i++){
      const current=[i];for(let j=1;j<=b.length;j++){
        current[j]=Math.min(previous[j]+1,current[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
        if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])current[j]=Math.min(current[j],older[j-2]+1);
      }older=previous;previous=current;
    }return previous[b.length];
  }
  function fuzzy(haystack,term){
    if(haystack.includes(term))return true;if(term.length<4||term.length>60)return false;
    return haystack.split(/[^\p{L}\p{N}_.+-]+/u).some(word=>Math.abs(word.length-term.length)<=2&&distance(word,term)<=(term.length>=8?2:1));
  }
  function repository(url){try{const u=new URL(url);if(u.protocol!=='https:'||!['github.com','www.github.com'].includes(u.hostname)||u.username||u.password)return null;const parts=u.pathname.split('/').filter(Boolean);if(parts.length<2||!parts.slice(0,2).every(p=>/^[\w.-]+$/.test(p)))return null;return parts.slice(0,2).join('/').replace(/\.git$/,'');}catch(_){return null;}}
  function activity(info,now=Date.now()){
    if(info.archived)return 'Archived';if(info.disabled)return 'Disabled';
    const date=Date.parse(info.lastCommit);if(!Number.isFinite(date))return 'Unknown activity';
    return now-date<=365*86400000?'Recent commit':'No commit in 12 months';
  }
  const packages={numpy:'numpy',pandas:'pandas',matplotlib:'matplotlib',scipy:'scipy','scikit-learn':'scikit-learn',jupyter:'jupyter',django:'Django',flask:'Flask',fastapi:'fastapi',pytest:'pytest',requests:'requests',pytorch:'torch',tensorflow:'tensorflow',seaborn:'seaborn',polars:'polars',sqlalchemy:'SQLAlchemy',pydantic:'pydantic'};
  const suggestion=name=>packages[String(name).toLowerCase()]||'';
  function dependency(name){name=String(name).trim();if(!/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/.test(name)||name.length>100)throw new Error('Use a valid package name without versions, URLs, or options.');return name;}
  function stack(rows,format='requirements'){
    const unique=new Map();for(const row of rows){if(!row.package.trim())continue;const name=dependency(row.package);unique.set(name.toLowerCase().replace(/[-_.]+/g,'-'),name);}
    const names=[...unique.values()].sort((a,b)=>a.localeCompare(b));
    if(format==='pyproject')return '# Draft only: verify package names, compatibility and licenses.\n[project]\nname = "my-python-stack"\nversion = "0.1.0"\nrequires-python = ">=3.10"\ndependencies = '+JSON.stringify(names,null,2)+'\n';
    return '# Draft only: verify package names, compatibility and licenses.\n'+names.join('\n')+'\n';
  }
  const pathDefinitions=[
    {id:'data-science',title:'Data Science · 30 days',tools:['jupyter','numpy','pandas','matplotlib','seaborn','scipy','scikit-learn','polars','pytorch','pytest']},
    {id:'web-development',title:'Web Development · 30 days',tools:['flask','django','fastapi','pydantic','sqlalchemy','requests','pytest','jinja2','uvicorn','httpx']}
  ];
  function pathDays(path,entries){return Array.from({length:30},(_,i)=>{
    const name=path.tools[Math.floor(i/3)],row=entries.find(r=>r.name.toLowerCase()===name)||null;
    return {day:i+1,name,phase:['Explore the documentation','Build a small example','Review and practise'][i%3],row};
  });}
  function validateProgress(value){
    if(!value||value.schema!==1||!value.paths||typeof value.paths!=='object'||Array.isArray(value.paths))throw new Error('Invalid learning progress');
    const out={schema:1,paths:{}};for(const p of pathDefinitions){const days=value.paths[p.id]||[];if(!Array.isArray(days)||days.some(d=>!Number.isInteger(d)||d<1||d>30))throw new Error('Invalid learning progress');out.paths[p.id]=[...new Set(days)];}return out;
  }
  return {distance,fuzzy,repository,activity,suggestion,dependency,stack,pathDefinitions,pathDays,validateProgress};
});
