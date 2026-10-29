/* Calendar interoperability, focus planning and import impact analysis. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./workspace.js'));else root.PyAtlasProductivity=factory(root.PyAtlasCore);})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  function focus(rows,current,today){
    const state=core.validate(current);
    return rows.map(row=>({row,metadata:state.metadata[row.id]||core.defaultMetadata()}))
      .filter(item=>item.metadata.status!=='Archived'&&(item.metadata.tasks.some(t=>!t.done)||['overdue','soon'].includes(core.dueBucket(item.metadata,today))))
      .sort((a,b)=>{const rank=m=>core.dueBucket(m,today)==='overdue'?0:core.dueBucket(m,today)==='soon'?1:2;return rank(a.metadata)-rank(b.metadata)||(['High','Normal','Low'].indexOf(a.metadata.priority)-['High','Normal','Low'].indexOf(b.metadata.priority))||(a.metadata.dueDate||'9999-12-31').localeCompare(b.metadata.dueDate||'9999-12-31')||a.row.name.localeCompare(b.row.name)||a.row.id.localeCompare(b.row.id);});
  }
  function preview(current,incoming){
    const a=core.validate(current),b=core.validate(incoming),ids=new Set(a.custom.map(row=>row.id)),names=new Set(a.savedSearches.map(item=>item.name));
    return {newProjects:b.custom.filter(row=>!ids.has(row.id)).length,replacedProjects:b.custom.filter(row=>ids.has(row.id)).length,replacedWorkspaces:Object.keys(b.metadata).filter(id=>Object.hasOwn(a.metadata,id)).length,replacedSearches:b.savedSearches.filter(item=>names.has(item.name)).length,newBookmarks:b.bookmarks.filter(id=>!a.bookmarks.includes(id)).length};
  }
  function escapeText(value){return String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function fold(line){
    const encoder=new TextEncoder();let pieces=[],part='',bytes=0;
    for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){pieces.push(part);part=' ';bytes=1;}part+=char;bytes+=size;}
    pieces.push(part);return pieces.join('\r\n');
  }
  function calendar(rows,current,now=new Date()){
    const state=core.validate(current),stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PyAtlas Pro//Planner 5.0//EN','CALSCALE:GREGORIAN'];
    for(const row of rows){const m=state.metadata[row.id]||core.defaultMetadata();if(!m.dueDate||m.status==='Archived')continue;
      lines.push('BEGIN:VEVENT','UID:'+row.id+'@pyatlas.local','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+m.dueDate.replace(/-/g,''),'SUMMARY:'+escapeText(row.name+' — project deadline'),'DESCRIPTION:'+escapeText(`Category: ${row.category}\nStatus: ${m.status}\nPriority: ${m.priority}\nProject: ${row.url}`),'TRANSP:TRANSPARENT','END:VEVENT');
    }
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  return {focus,preview,escapeText,fold,calendar};
});
