/* Optional browser integration test: npm install; npx playwright install chromium; npm run test:browser */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
async function until(page,predicate){for(let i=0;i<150;i++){if(await page.evaluate(predicate))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out waiting for browser state');}
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.PYATLAS_BROWSER_EXECUTABLE?{executablePath:process.env.PYATLAS_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}: {})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1080},acceptDownloads:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
    assert.equal(await page.locator('.card').count(),48);
    await page.locator('#query').fill('django');assert.ok(await page.locator('.card').count()>0);
    await page.locator('.bookmark').first().click();await page.locator('#saved').click();assert.equal(await page.locator('.card').count(),1);
    await page.reload();assert.equal(await page.locator('#saved-count').textContent(),'1');
    await page.locator('#reset-filters').click();
    const compare=page.locator('[data-compare-id]');for(let i=0;i<3;i++)await compare.nth(i).check();assert.equal(await compare.nth(3).isDisabled(),true);
    await page.locator('#compare-open').click();assert.equal(await page.locator('#comparison').evaluate(e=>e.open),true);await page.locator('#compare-close').click();await page.locator('#compare-clear').click();
    await page.locator('#add-project').click();
    await page.locator('#edit-name').fill('Professional QA Project');await page.locator('#edit-url').fill('https://example.com/qa');await page.locator('#edit-category').fill('Personal QA');await page.locator('#edit-description').fill('A local searchable demo project');
    await page.locator('#edit-notes').fill('PRIVATE-QA-NOTE');await page.locator('#edit-tags').fill('qa, demo');await page.locator('#edit-collections').fill('QA Collection');await page.locator('#edit-status').selectOption('Learning');await page.locator('#edit-rating').selectOption('4');await page.locator('#edit-priority').selectOption('High');await page.locator('#edit-deadline').fill('2026-01-01');
    await page.locator('#task-text').fill('Ship the QA demo');await page.locator('#task-add').click();await page.locator('#task-list input').check();await page.locator('#project-form button[type=submit]').click();
    await page.locator('#source-filter').selectOption('custom');assert.equal(await page.locator('.card').count(),1);assert.ok((await page.locator('.card').textContent()).includes('1/1 tasks'));
    await page.locator('#priority-filter').selectOption('High');await page.locator('#due-filter').selectOption('overdue');assert.equal(await page.locator('.card').count(),1);
    await page.locator('#query').fill('"qa demo" -django');assert.equal(await page.locator('.card').count(),1);
    await page.locator('#query').fill('"qa demo" -ship');assert.equal(await page.locator('.card').count(),0);await page.locator('#query').fill('');
    page.once('dialog',dialog=>dialog.accept('QA saved search'));await page.locator('#save-search').click();assert.equal(await page.locator('#saved-search').inputValue(),'QA saved search');
    await page.locator('#report-open').click();let download=await Promise.all([page.waitForEvent('download'),page.locator('#report-download').click()]);let report=fs.readFileSync(await download[0].path(),'utf8');assert.ok(report.includes('Ship the QA demo'));assert.equal(report.includes('PRIVATE'),false);
    await page.locator('#report-open').click();await page.locator('#report-notes').check();download=await Promise.all([page.waitForEvent('download'),page.locator('#report-download').click()]);report=fs.readFileSync(await download[0].path(),'utf8');assert.ok(report.includes('PRIVATE'));
    let calendarDownload=await Promise.all([page.waitForEvent('download'),page.locator('#calendar-export').click()]);const calendar=fs.readFileSync(await calendarDownload[0].path(),'utf8');assert.ok(calendar.includes('BEGIN:VEVENT'));assert.ok(calendar.includes('DTSTART;VALUE=DATE:20260101'));assert.equal(calendar.includes('PRIVATE'),false);
    await page.locator('.details-button').click();await page.locator('#task-text').fill('Focus next step');await page.locator('#task-add').click();await page.locator('#project-form button[type=submit]').click();
    await page.locator('#focus-open').click();assert.equal(await page.locator('.focus-card').count(),1);await page.getByRole('checkbox',{name:'Complete task: Focus next step',exact:true}).click();assert.equal(await page.locator('#focus-results input').count(),0);await page.locator('#focus-close').click();
    await page.locator('#secure-backup').click();await page.locator('#vault-password').fill('Browser backup password 2026!');await page.locator('#vault-confirm-password').fill('Different backup password 2026!');await page.locator('#vault-submit').click();assert.ok((await page.locator('#vault-error').textContent()).includes('do not match'));
    await page.locator('#vault-confirm-password').fill('Browser backup password 2026!');const secure=await Promise.all([page.waitForEvent('download'),page.locator('#vault-submit').click()]);const sealed=fs.readFileSync(await secure[0].path(),'utf8');assert.equal(sealed.includes('PRIVATE'),false);assert.equal(JSON.parse(sealed).format,'pyatlas-encrypted-workspace');
    await page.locator('#backup-file').setInputFiles({name:'protected.json',mimeType:'application/json',buffer:Buffer.from(sealed)});await page.locator('#vault-password').fill('Incorrect password value!');await page.locator('#vault-submit').click();await until(page,()=>document.getElementById('vault-error').textContent.includes('Wrong password'));assert.equal(await page.locator('.card').count(),1);
    await page.locator('#vault-password').fill('Browser backup password 2026!');await page.locator('#vault-submit').click();await page.locator('#import-dialog').waitFor({state:'visible'});assert.ok((await page.locator('#import-impact').textContent()).includes('Matching custom projects replaced'));await page.locator('#import-confirm').click();
    await page.locator('#select-matches').click();await page.locator('#bulk-status').selectOption('In use');await page.locator('#bulk-apply').click();await page.locator('.details-button').click();assert.equal(await page.locator('#edit-status').inputValue(),'In use');await page.locator('#editor-close').click();await page.locator('#undo').click();await page.locator('.details-button').click();assert.equal(await page.locator('#edit-status').inputValue(),'Learning');await page.locator('#editor-close').click();await page.locator('#redo').click();
    await page.locator('#board-toggle').click();assert.equal(await page.locator('.board-tile').count(),1);await page.locator('.board-tile select').selectOption('Evaluating');await page.locator('#board-toggle').click();
    download=await Promise.all([page.waitForEvent('download'),page.locator('#backup').click()]);const backup=JSON.parse(fs.readFileSync(await download[0].path(),'utf8'));assert.equal(backup.schema_version,4);assert.equal(backup.custom.length,1);const id=backup.custom[0].id;assert.equal(backup.metadata[id].tasks[0].done,true);assert.equal(backup.savedSearches[0].filters.priority,'High');
    await page.locator('.details-button').click();page.once('dialog',dialog=>dialog.accept());await page.locator('#delete-project').click();assert.equal(await page.locator('.card').count(),0);await page.locator('#undo').click();assert.equal(await page.locator('.card').count(),1);
    const legacy={schema_version:3,custom:[],bookmarks:[],metadata:{},savedSearches:[]};await page.locator('#backup-file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await page.locator('#import-confirm').click();assert.equal(await page.locator('.card').count(),1);
    await page.reload();await page.locator('#saved-search').selectOption('QA saved search');assert.equal(await page.locator('#priority-filter').inputValue(),'High');assert.equal(await page.locator('#source-filter').inputValue(),'custom');
    await page.locator('#analytics-open').click();assert.ok((await page.locator('#analytics-summary').textContent()).includes('Completed tasks'));await page.locator('#analytics-close').click();
    await page.locator('#theme').click();await page.reload();assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')),true);await page.locator('#theme').click();await page.locator('#reset-filters').click();
    await page.locator('#layout-toggle').click();assert.equal(await page.locator('#results').evaluate(e=>e.classList.contains('list-view')),true);await page.locator('#layout-toggle').click();
    await page.locator('#more').click();assert.equal(await page.locator('.card').count(),96);
    for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}px`);}
    if(process.env.PYATLAS_QA_SCREENSHOT)await page.screenshot({path:process.env.PYATLAS_QA_SCREENSHOT,fullPage:false});
    assert.deepEqual(errors,[]);console.log('PASS: browser integration, encrypted backup/password failure/restore, calendar export, focus task completion, planner persistence, filters/search, reports, bookmarks, comparison, custom CRUD, bulk updates, undo/redo, board, backups/import migration, saved searches, insights, theme, list view, pagination and responsive overflow checks; zero browser exceptions.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
