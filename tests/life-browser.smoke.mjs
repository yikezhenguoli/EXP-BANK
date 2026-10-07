import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),qa=path.resolve(process.env.EXP_BANK_QA_DIR || path.join(root,'..','qa_v112_life'));fs.mkdirSync(qa,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'})[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(fs.readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.EXP_BANK_CHROME||undefined,headless:true,args:['--no-sandbox']});
const results=[],errors=[];
const seed={appVersion:'v1.11.0',welcomed:true,lastInterest:Date.now(),cfgRate:0,tab:'lists',exp:1000,nextId:500,sets:[],rewards:[],ledger:[{ts:1,name:'历史记录',delta:100}],opex:[],stash:[],tasks:[
 {id:1,name:'23:00前睡觉',category:'微习惯',exp:15,cycle:'daily',times:1,done:{}},
 {id:2,name:'吃饭',exp:10,cycle:'daily',times:1,done:{}},
 {id:3,name:'六级单词',exp:8,cycle:'daily',times:1,core:true,done:{}},
 {id:4,name:'Python刷题',exp:10,cycle:'daily',times:1,done:{}},
 {id:5,name:'整理电脑文件',exp:50,cycle:'weekly',times:1,done:{}},
 {id:6,name:'看电影',exp:20,cycle:'once',times:1,done:{}},
 {id:7,name:'旅行老任务',exp:20,cycle:'once',times:1,done:{once:1},lastDone:'2026-09-01',completionLog:{'2026-09-01':1}}
]};
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('exp-bank-v1')));
async function open(width,initial=seed){
 const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Shanghai'});if(initial)await context.addInitScript(s=>{if(!localStorage.getItem('exp-bank-v1'))localStorage.setItem('exp-bank-v1',JSON.stringify(s));},initial);
 await context.route('https://**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/index.html');await page.getByText('+ 新建任务',{exact:true}).waitFor();
 if(initial&&await page.getByText('知道了',{exact:true}).count())await page.getByText('知道了',{exact:true}).click();
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);return {page,context};
}
async function overview(page){await page.getByText('⌗ 四象限',{exact:true}).click();const panel=page.getByRole('dialog',{name:'Life Architecture Overview'});await panel.waitFor();return panel;}
async function noOverflow(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const panel=page.locator('.life-panel');if(await panel.count())assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));}
const ids=loc=>loc.evaluateAll(nodes=>nodes.map(x=>Number(x.getAttribute('data-life-task')||x.getAttribute('data-task-id'))));
try{
 for(const width of [360,390,1024]){
  const{page,context}=await open(width);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('exp-bank-v1')).lifeSchemaVersion===1);
  let data=await stored(page);assert.equal(data.tasks.length,7);assert.equal(data.exp,1000);assert.deepEqual(data.ledger,seed.ledger);assert.equal(data.tasks[0].category,'微习惯');assert.deepEqual(data.tasks[6].completionLog,seed.tasks[6].completionLog);
  assert.deepEqual(data.tasks.map(t=>t.lifeType),['CORE','CORE','GROWTH','GROWTH','MAINTENANCE','EXPLORATION','EXPLORATION']);assert.equal(data.tasks[4].taskKind,'standard');
  let panel=await overview(page);assert.equal(await panel.locator('.life-group').count(),4);await noOverflow(page);await page.screenshot({path:path.join(qa,'life-'+width+'.png')});
  await panel.getByRole('button',{name:'调整顺序',exact:true}).click();await panel.getByRole('button',{name:'吃饭 上移',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('exp-bank-v1')).tasks.find(t=>t.id===2).lifeOrder===0);
  assert.deepEqual(await ids(panel.locator('[data-life-type="CORE"] .life-task')),[2,1]);assert.equal((await stored(page)).tasks[2].lifeOrder,0);
  await page.reload();await page.getByText('⌗ 四象限',{exact:true}).waitFor();panel=await overview(page);assert.deepEqual(await ids(panel.locator('[data-life-type="CORE"] .life-task')),[2,1]);
  await panel.getByRole('button',{name:'关闭人生总览',exact:true}).click();await page.getByRole('group',{name:'人生分类筛选'}).getByRole('button',{name:'系统维护',exact:true}).click();assert.deepEqual(await ids(page.locator('[data-task-id]')),[5]);
  await page.getByRole('group',{name:'人生分类筛选'}).getByRole('button',{name:'全部',exact:true}).click();panel=await overview(page);
  await panel.getByRole('button',{name:'整理电脑文件',exact:true}).click();await page.getByText('编辑',{exact:true}).click();
  await page.locator('#ed-life-type').selectOption('GROWTH');await page.locator('#ed-war-important').check();await page.getByText('保存',{exact:true}).click();await page.locator('#ed-life-type').waitFor({state:'detached'});
  data=await stored(page);assert.equal(data.tasks[4].lifeType,'GROWTH');assert.equal(data.tasks[4].warImportant,true);assert.equal(data.tasks[4].lifeOrder,2);assert.equal(data.tasks[4].exp,50);assert.equal(data.tasks[4].cycle,'weekly');
  await page.getByText('WAR MODE',{exact:true}).click();await page.getByText('WAR MODE ACTIVE',{exact:true}).waitFor();assert.deepEqual(await ids(page.locator('[data-task-id]')),[2,1,3,5]);await noOverflow(page);
  await page.screenshot({path:path.join(qa,'war-'+width+'.png'),fullPage:true});panel=await overview(page);assert.equal(await panel.locator('.life-group').count(),2);assert.equal(await panel.locator('[data-life-type="EXPLORATION"]').count(),0);
  await panel.getByRole('button',{name:'关闭人生总览'}).click();await page.getByText('WAR MODE',{exact:true}).click();await page.getByText('+ 新建任务',{exact:true}).waitFor();assert.equal(await page.locator('[data-task-id]').count(),7);
  await context.setOffline(true);await page.reload();await page.getByText('⌗ 四象限',{exact:true}).waitFor();panel=await overview(page);assert.deepEqual(await ids(panel.locator('[data-life-type="CORE"] .life-task')),[2,1]);assert.equal((await stored(page)).exp,1000);await context.close();
  results.push(width+'px：迁移、完整历史、四层排序、刷新与离线、分类编辑、WAR筛选和退出恢复');
 }
 {
  const{page,context}=await open(390,null);await page.getByText('开始',{exact:true}).click();let panel=await overview(page);assert.equal(await panel.locator('.life-group').count(),4);await panel.getByRole('button',{name:'关闭人生总览'}).click();
  await page.getByText('+ 新建任务',{exact:true}).click();await page.locator('#nt-name').fill('整理文件');await page.locator('#nt-exp').fill('50');await page.locator('#nt-life-type').selectOption('MAINTENANCE');await page.getByText('添加任务',{exact:true}).click();await page.locator('#nt-name').waitFor({state:'detached'});
  const data=await stored(page);assert.equal(data.tasks.at(-1).lifeType,'MAINTENANCE');assert.equal(data.tasks.at(-1).taskKind,'standard');assert.equal(data.exp,0);await context.close();results.push('真正空存储新用户：欢迎、默认四层及手动创建，人生分类不改积分规则');
 }
 {
  const{page,context}=await open(390);const panel=await overview(page);await panel.getByRole('button',{name:'调整顺序'}).click();const before=await stored(page);
  await page.evaluate(()=>{window.originalWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='exp-bank-v1')throw new DOMException('quota','QuotaExceededError');return window.originalWrite.call(this,k,v);};});
  await panel.getByRole('button',{name:'吃饭 上移'}).click();await panel.getByRole('alert').getByText(/本机存储空间不足/).waitFor();assert.deepEqual((await stored(page)).tasks,before.tasks);assert.deepEqual(await ids(panel.locator('[data-life-type="CORE"] .life-task')),[1,2]);
  await page.evaluate(()=>Storage.prototype.setItem=window.originalWrite);await panel.getByRole('button',{name:'吃饭 上移'}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('exp-bank-v1')).tasks.find(t=>t.id===2).lifeOrder===0);await context.close();results.push('排序保存失败保留旧顺序，原窗口重试成功');
 }
 {
  const{page,context}=await open(390);const panel=await overview(page);const legacy=await context.newPage();await legacy.addInitScript(()=>navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='EXP_BANK_CLIENT_PROTOCOL'){e.stopImmediatePropagation();e.ports[0].postMessage({protocol:2});}}));await legacy.goto(origin+'/index.html');await legacy.getByText('⌗ 四象限',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'调整顺序'}).click();await panel.getByRole('button',{name:'吃饭 上移'}).click();await panel.getByRole('alert').getByText(/检测到旧版窗口/).waitFor();assert.equal((await stored(page)).tasks[0].lifeOrder,0);
  await legacy.close();await panel.getByRole('button',{name:'吃饭 上移'}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('exp-bank-v1')).tasks.find(t=>t.id===2).lifeOrder===0);await context.close();results.push('v1.11协议2旧窗口阻止新写入，关闭后可继续原排序');
 }
 {
  const only={...seed,tasks:[seed.tasks[1]]};const{page,context}=await open(390,only);await page.locator('[data-task-id="2"]').getByText('完成',{exact:true}).click();await page.getByText('直接完成',{exact:true}).click();await page.getByText('跳过',{exact:true}).click();
  let panel=await overview(page);await panel.getByText('今日完成 1/1',{exact:true}).waitFor();await panel.getByText('本周完成率 100%',{exact:true}).waitFor();await panel.getByRole('button',{name:'撤销',exact:true}).click();await panel.getByText('今日完成 0/1',{exact:true}).waitFor();assert.equal((await stored(page)).exp,1000);await context.close();results.push('实际完成与撤销同步刷新当日达标和周完成率，EXP完整回退');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(qa,'life-browser-results.json'),JSON.stringify({passed:results.length,results,pageErrors:errors},null,2));console.log(JSON.stringify({passed:results.length,results,pageErrors:errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
