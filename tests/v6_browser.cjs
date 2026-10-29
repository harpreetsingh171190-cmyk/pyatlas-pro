'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
fs.mkdirSync('reports',{recursive:true});
const hosted=fs.mkdtempSync(require('node:os').tmpdir()+'/pyatlas-v6-');
fs.cpSync('dist',hosted,{recursive:true});fs.cpSync('dist',path.join(hosted,'nested/app'),{recursive:true});
const port=18765,base=`http://127.0.0.1:${port}`,server=spawn('python',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',hosted],{stdio:'ignore'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(page,predicate){for(let i=0;i<150;i++){if(await page.evaluate(predicate))return;await pause(100);}throw new Error('Timed out waiting for browser state');}
(async()=>{
 let browser;const report={checks:[],axe:[]};try{
  for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch(_){}await pause(100);}
  browser=await chromium.launch({headless:true,...(process.env.PYATLAS_BROWSER_EXECUTABLE?{executablePath:process.env.PYATLAS_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage(),errors=[],github=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://api.github.com/**',route=>{github.push(route.request().url());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(route.request().url().includes('/commits?')?[{commit:{committer:{date:'2026-10-01T00:00:00Z'}}}]:{stargazers_count:123,license:{spdx_id:'MIT'},archived:false,disabled:false})});});
  await page.goto(base+'/index.html');await page.waitForSelector('.card');assert.equal(github.length,0);
  await until(page,()=>document.getElementById('pwa-state').textContent.includes('Offline cache ready'));
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await until(page,()=>!!navigator.serviceWorker.controller);
  const manifest=await page.evaluate(async()=>{const r=await fetch('./manifest.webmanifest');return r.json();});assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,2);
  await context.setOffline(true);await page.reload();await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),48);
  await page.fill('#query','djnago');assert.ok(await page.locator('.card').count()>0);report.checks.push('PWA control, precache and offline reload; typo-tolerant search');
  await page.keyboard.press('Control+k');await page.waitForSelector('#command-dialog[open]');await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');assert.equal(await page.locator('#command-dialog').evaluate(e=>e.open),false);
  await page.locator('#query').blur();await page.keyboard.press('/');assert.equal(await page.evaluate(()=>document.activeElement.id),'query');
  await page.fill('#query','numpy');await page.locator('.card').filter({has:page.getByRole('heading',{name:'numpy',exact:true})}).locator('[data-bulk-id]').check();await page.click('#stack-open');assert.ok((await page.inputValue('#stack-output')).includes('numpy'));
  await page.selectOption('#stack-format','pyproject');assert.ok((await page.inputValue('#stack-output')).includes('[project]'));
  await page.locator('[data-close="stack-dialog"]').click();report.checks.push('Keyboard shortcuts, native dialogs, bulk-selection requirements and TOML drafts');
  await page.click('#paths-open');await page.locator('#path-days input').first().check();await page.locator('[data-close="paths-dialog"]').click();await page.reload();await page.click('#paths-open');assert.equal(await page.locator('#path-progress').getAttribute('value'),'1');await page.locator('[data-close="paths-dialog"]').click();
  await page.click('#usage-open');assert.equal(await page.isChecked('#usage-enabled'),false);await page.check('#usage-enabled');await page.locator('[data-close="usage-dialog"]').click();
  assert.equal(await page.locator('#language').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
  await page.evaluate(()=>localStorage.setItem('pyatlas-pro:language','pa'));
  await page.reload();await page.waitForSelector('.card');
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
  assert.equal(await page.textContent('#paths-open'),'Learning paths');
  assert.equal(await page.evaluate(()=>typeof globalThis.PyAtlasI18n),'undefined');
  await context.setOffline(false);await page.fill('#query','flask');assert.equal(github.length,0);await page.locator('.github-panel button').first().click();await until(page,()=>document.querySelector('.github-panel').textContent.includes('123'));assert.equal(github.length,2);
  await page.fill('#query','django');await page.fill('#query','flask');assert.equal(github.length,2);await context.setOffline(true);await page.reload();await page.waitForSelector('.github-panel');assert.ok((await page.locator('.github-panel').first().textContent()).includes('Cached snapshot'));assert.equal(github.length,2);report.checks.push('Progress persistence, English-only UI (including a legacy stored preference), opt-in counters, click-only GitHub and offline cached snapshot');
  await context.setOffline(false);await page.fill('#query','');
  const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
  for(const theme of ['light','dark']){
await page.evaluate(mode=>document.body.classList.toggle('dark',mode==='dark'),theme);
    await page.evaluate(axe);const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
    report.axe.push({language:"en",theme,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
  }
  // Audit every new modal too, not only the landing page.
  for(const id of ['stack','paths','usage','command']){
    await page.click('#'+id+'-open');const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));report.axe.push({dialog:id,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'reports/v6-mobile.png',fullPage:false});
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>document.body.classList.remove('dark'));await page.screenshot({path:'reports/v6-english.png',fullPage:false});

  const scoped=await context.newPage();await scoped.goto(base+'/nested/app/index.html');await scoped.waitForSelector('.card');await until(scoped,async()=>!!(await navigator.serviceWorker.getRegistration())?.active);await scoped.reload();await until(scoped,()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true);await scoped.reload();await scoped.waitForSelector('.card');assert.equal(await scoped.locator('.card').count(),48);await context.setOffline(false);
  const scopes=await page.evaluate(()=>caches.keys());assert.ok(scopes.some(k=>decodeURIComponent(k).includes('/nested/app/')));assert.ok(scopes.some(k=>!decodeURIComponent(k).includes('/nested/app/')));
  await scoped.close();
  const workerPath=path.join(hosted,'sw.js');fs.writeFileSync(workerPath,fs.readFileSync(workerPath,'utf8').replace(/-([a-f0-9]{16})'/, '-test-update-cache\'')+'\nself.skipWaiting();');
  await page.evaluate(async()=>{globalThis.workerChanged=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{globalThis.workerChanged=true;},{once:true});await (await navigator.serviceWorker.getRegistration()).update();});
  await until(page,()=>globalThis.workerChanged);const afterUpdate=await page.evaluate(()=>caches.keys());assert.ok(afterUpdate.some(k=>decodeURIComponent(k).includes('/nested/app/')),'Root update removed nested cache');
  report.checks.push('Nested-path offline reload, independent scope caches and root-update cache isolation');
  assert.deepEqual(errors,[]);assert.ok(report.axe.every(r=>r.violations.length===0),JSON.stringify(report.axe.filter(r=>r.violations.length)));
  report.checks.push('No runtime errors; responsive mobile layout; axe WCAG A/AA in English light/dark themes and new dialogs');
  console.log(JSON.stringify(report,null,2));
 }finally{fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/v6-browser.json',JSON.stringify(report,null,2));if(browser)await browser.close();server.kill();fs.rmSync(hosted,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
