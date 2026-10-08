import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url), {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)), qa=path.resolve(process.env.EXP_BANK_QA_DIR || path.join(root,'..','browser_qa_v111'));
fs.mkdirSync(qa,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'), file=path.resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'text/plain','Cache-Control':'no-store'});res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port, browser=await chromium.launch({executablePath:process.env.EXP_BANK_CHROME||undefined,headless:true,args:['--no-sandbox']});
const results=[], errors=[];
const base={appVersion:'v1.10.0',tasks:[],sets:[{id:11,name:'学习',collapsed:false}],rewards:[],exp:1000,nextId:500,ledger:[],opex:[],stash:[],welcomed:true,lastInterest:Date.now(),tab:'lists'};
const stored=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('exp-bank-v1')));
async function open(width,seed=base){
 const context=await browser.newContext({viewport:{width,height:840}});
 await context.addInitScript(seed=>{if(!localStorage.getItem('exp-bank-v1'))localStorage.setItem('exp-bank-v1',JSON.stringify(seed));},seed);
 await context.route('https://**',route=>route.abort());
 const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
 await page.goto(origin+'/index.html'); await page.getByText('+ 新建任务',{exact:true}).waitFor();
 if(await page.getByText('知道了',{exact:true}).count())await page.getByText('知道了',{exact:true}).click();
 return {context,page};
}
async function noOverflow(page){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const panel=page.getByRole('dialog',{name:'确认任务草稿'}); if(await panel.count()) assert.ok(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
}
async function help(page,description){
 await page.getByText('✦ AI HELP',{exact:true}).click(); await page.locator('#ai-help-input').fill(description);
 await page.getByText('识别并预览',{exact:true}).click(); await page.getByRole('dialog',{name:'确认任务草稿'}).waitFor();
}
try {
 for(const width of [360,390]){
  const {context,page}=await open(width);
  await help(page,'每天阅读20页书，每次5积分；每周跑步三次，每次8积分；放在学习任务集');
  let rows=page.locator('.assistant-row'); assert.equal(await rows.count(),2);
  assert.equal(await rows.nth(0).getByLabel('每次 EXP',{exact:true}).inputValue(),'5');
  assert.equal(await rows.nth(1).getByLabel('每次 EXP',{exact:true}).inputValue(),'8');
  assert.equal(await rows.nth(1).getByLabel('周期',{exact:true}).inputValue(),'weekly');
  await page.getByLabel('补充一句话',{exact:true}).fill('跑步改成每周两次；全部每项6积分');
  await page.getByRole('button',{name:'应用补充',exact:true}).click();
  assert.equal(await rows.nth(0).getByLabel('每次 EXP',{exact:true}).inputValue(),'6');
  assert.equal(await rows.nth(1).getByLabel('每周期次数',{exact:true}).inputValue(),'2');
  await page.getByLabel(/记住本次设置/).check(); await noOverflow(page);
  await page.getByRole('dialog',{name:'确认任务草稿'}).evaluate(e=>e.scrollTop=0);
  await page.screenshot({path:path.join(qa,'assistant-'+width+'.png')});
  await page.getByRole('button',{name:'确认创建 2 项任务',exact:true}).click();
  await page.getByRole('dialog',{name:'确认任务草稿'}).waitFor({state:'detached'});
  let data=await stored(page); assert.equal(data.tasks.length,2); assert.ok(data.tasks.every(t=>t.setId===11&&t.exp===6)); assert.equal(data.tasks[1].times,2); assert.equal(data.exp,1000);
  await page.getByText('关闭',{exact:true}).click(); await page.getByText('+ 新建任务',{exact:true}).click();
  await page.locator('#nt-name').fill('手动表单未提交的草稿');
  await page.locator('#nt-ai-desc').fill('每两周听力三次，每次0.5EXP；阅读20页书');
  await page.getByText('识别并预览',{exact:true}).click(); rows=page.locator('.assistant-row');
  assert.equal(await rows.nth(0).getByLabel('周期跨度',{exact:true}).inputValue(),'2');
  assert.equal(await rows.nth(1).getByLabel('每次 EXP',{exact:true}).inputValue(),'6');
  assert.equal(await rows.nth(1).getByRole('checkbox',{name:/^创建第/}).isChecked(),false);
  await page.getByRole('button',{name:'返回修改描述',exact:true}).click();
  assert.equal(await page.locator('#nt-name').inputValue(),'手动表单未提交的草稿');
  await page.getByText('识别并预览',{exact:true}).click();
  await page.evaluate(()=>{window.__expOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='exp-bank-v1')throw new DOMException('quota','QuotaExceededError');return window.__expOriginalSet.call(this,k,v);};});
  await page.getByRole('button',{name:'确认创建 1 项任务',exact:true}).click();
  await page.getByRole('dialog',{name:'确认任务草稿'}).getByText(/本机存储空间不足/).first().waitFor();
  assert.equal((await stored(page)).tasks.length,2);
  assert.equal(await page.locator('.assistant-row').first().getByLabel('每次 EXP',{exact:true}).inputValue(),'0.5');
  await page.evaluate(()=>Storage.prototype.setItem=window.__expOriginalSet);
  await page.getByRole('button',{name:'确认创建 1 项任务',exact:true}).click();
  await page.getByRole('dialog',{name:'确认任务草稿'}).waitFor({state:'detached'}); assert.equal((await stored(page)).tasks.length,3);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true); await page.reload(); await page.getByText('+ 新建任务',{exact:true}).waitFor();
  await help(page,'每天散步5EXP'); await page.getByRole('button',{name:'确认创建 1 项任务',exact:true}).click();
  await page.getByRole('dialog',{name:'确认任务草稿'}).waitFor({state:'detached'}); data=await stored(page);
  assert.equal(data.tasks.length,4); assert.equal(data.taskAssistantPrefs['跑步'].exp,6); assert.equal(data.tasks.at(-1).cycle,'daily');
  await context.close(); results.push(width+' px：自由描述、逐项规则、补充修正、同名偏好、重复跳过、容量失败重试、离线创建');
 }
 {
  const seed={...base,tasks:[1,2,3].map(id=>({id,name:'维护测试'+id,exp:10,taskKind:'maintenance',cycle:'daily',times:1,done:{}}))};
  const {context,page}=await open(390,seed);
  for(const exp of [1010,1020,1030]){
   await page.getByText('完成',{exact:true}).first().click(); await page.getByText('直接完成',{exact:true}).click();
   await page.getByText('跳过',{exact:true}).click(); await page.waitForFunction(n=>JSON.parse(localStorage.getItem('exp-bank-v1')).exp===n,exp);
  }
  assert.deepEqual((await stored(page)).maintenanceDays,{});
  assert.equal(await page.getByText(/生活维护 · 今日/).count(),0);
  assert.equal(await page.getByText('+ 维护任务',{exact:true}).count(),0);
  await page.reload(); assert.equal((await stored(page)).exp,1030); await context.close();
  results.push('旧maintenance标记按普通EXP结算，维护额度入口已移除');
 }
 {
  const {context,page}=await open(390);
  await page.getByText('+ 新建奖励',{exact:true}).click(); await page.locator('#nr-name').fill('Amber 测试');
  await page.locator('#nr-risk').selectOption('amber'); assert.equal(await page.locator('#nr-cooldown').inputValue(),'7');
  await page.locator('#nr-money').fill('20'); await page.locator('#nr-friction').selectOption('1.2');
  await page.getByText(/实际兑换 240 EXP/).waitFor(); await page.getByText('添加奖励',{exact:true}).click(); await page.locator('#nr-name').waitFor({state:'detached'});
  assert.equal((await stored(page)).rewards[0].cost,240);
  await page.getByText('兑换',{exact:true}).click(); await page.getByText('跳过',{exact:true}).click();
  assert.equal((await stored(page)).exp,760); assert.ok((await stored(page)).rewards[0].cooldownUntil>Date.now());
  await page.getByText(/✓ 冷却至/).waitFor({timeout:8000}); await page.screenshot({path:path.join(qa,'reward-cooldown-390.png')});
  await page.getByText('Amber 测试',{exact:true}).click(); await page.getByText('编辑',{exact:true}).click();
  assert.equal(await page.locator('#ed-money').inputValue(),'20'); assert.equal(await page.locator('#ed-friction').inputValue(),'1.2');
  await page.locator('#ed-risk').selectOption('red'); await page.getByText('保存',{exact:true}).click(); await page.locator('#ed-risk').waitFor({state:'detached'});
  assert.equal((await stored(page)).rewards[0].riskBand,'red'); assert.equal((await stored(page)).exp,760); assert.equal(await page.getByText('兑换',{exact:true}).count(),0);
  await page.getByText('Red · 已下架',{exact:true}).waitFor(); await context.close();
  results.push('奖励真实新建与编辑：20元×10×1.2=240EXP、Amber七天冷却、Red下架');
 }
 {
  const {context,page}=await open(390); await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const legacy=await context.newPage(); await legacy.addInitScript(()=>navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='EXP_BANK_CLIENT_PROTOCOL'){e.stopImmediatePropagation();e.ports[0].postMessage({protocol:1});}}));
  await legacy.goto(origin+'/index.html'); await legacy.getByText('+ 新建任务',{exact:true}).waitFor();
  await help(page,'每日阅读5EXP'); await page.getByRole('button',{name:'确认创建 1 项任务',exact:true}).click();
  await page.getByRole('dialog',{name:'确认任务草稿'}).getByText(/检测到旧版窗口/).first().waitFor(); assert.equal((await stored(page)).tasks.length,0);
  await legacy.close(); await page.getByRole('button',{name:'确认创建 1 项任务',exact:true}).click(); await page.getByRole('dialog',{name:'确认任务草稿'}).waitFor({state:'detached'});
  assert.equal((await stored(page)).tasks.length,1); await context.close();
  results.push('旧v1.10协议窗口阻止新版写入，关闭后原草稿可成功创建');
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(qa,'assistant-browser-results.json'),JSON.stringify({passed:results.length,results,pageErrors:errors},null,2));
 console.log(JSON.stringify({passed:results.length,results,pageErrors:errors},null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
