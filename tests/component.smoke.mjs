import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
const money = fs.readFileSync(new URL('../money.js', import.meta.url), 'utf8');
const results = [];
function sharedStorage(seed) {
  const map = new Map(seed ? [['exp-bank-v1', JSON.stringify(seed)]] : []); let queue = Promise.resolve();
  return { map, request: (_name, _options, work) => { const task = queue.then(work); queue = task.catch(() => {}); return task; } };
}
function create(seed = null, shared = sharedStorage(seed)) {
  const elements = {}, flags = { failWrite: false }, session = new Map();
  class Logic { constructor(props) { this.props = props || {}; this.state = {}; } setState(p, cb) { this.state = { ...this.state, ...(typeof p === 'function' ? p(this.state) : p) }; if (cb) cb(); } forceUpdate() {} }
  const context = vm.createContext({ DCLogic: Logic, Date, Math, JSON, Object, Array, Number, String, BigInt, Set, Map, Promise, parseFloat, parseInt, isNaN, console, URL, Blob, TextEncoder,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    window: { innerWidth: 390, confirm: () => true, addEventListener() {}, removeEventListener() {} },
    navigator: { locks: { request: shared.request } }, crypto: { randomUUID: () => 'cmd-' + Math.random().toString(36).slice(2) },
    document: { getElementById: id => elements[id] || null },
    localStorage: { getItem: k => shared.map.get(k) ?? null, setItem: (k, v) => { if (flags.failWrite) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } shared.map.set(k, v); } },
    sessionStorage: { getItem: k => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: k => session.delete(k) },
    btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent });
  vm.runInContext(money, context); for (const name of ['progression.js','life-architecture.js','task-assistant.js']) vm.runInContext(fs.readFileSync(new URL('../'+name, import.meta.url),'utf8'), context); vm.runInContext(source + '\nglobalThis.TestComponent = Component;', context);
  const c = new context.TestComponent({ goldAt: 300, diamondAt: 900, interestRate: 5, coreQuota: 3 });
  return { c, flags, shared, context, check:(id,checked)=>{ elements[id]={checked}; }, input: (id, value) => { elements[id] = { value: String(value) }; }, stored: () => JSON.parse(shared.map.get('exp-bank-v1')) };
}
const seed = saved => ({ appVersion: 'v1.9.2', tasks: [], rewards: [], ledger: [], exp: 10, nextId: 500, stash: [{ id: 41, name: '旅游', target: 1000, saved, claimed: true }], opex: [] });
async function test(name, fn) { await fn(); results.push(name); console.log('PASS ' + name); }
await test('新用户及旧用户启动完成schema，余额、EXP和达成保持', async () => {
  const t = create(seed(800)); assert.equal(t.c.state.appVersion, 'v1.12.0'); assert.equal(t.c.state.stash[0].saved, 800); assert.equal(t.c.state.exp, 10); assert.equal(t.c.state.moneySchemaVersion, 1);
  await t.c.save({}); assert.equal(t.stored().stash[0].saved, 800); assert.equal(t.stored().updateNoteOpen, undefined);
  assert.equal(create().c.state.opexCategories.length, 6);
});
await test('STASH入口和OPEX入口写同一条消费；双击仅一次提交', async () => {
  const t = create(seed(1000)); t.input('stash-out-41', 200); t.c.stashWithdraw(41);
  assert.equal(t.c.state.stash[0].saved, 1000); assert.equal(t.c.state.newOpexOpen, true); assert.equal(t.c.state.expenseDraft.stashId, '41');
  t.c.updateExpenseDraft('categoryId', 'cat-transport'); t.c.updateExpenseDraft('note', '车票');
  await Promise.all([t.c.addOpex(), t.c.addOpex()]); assert.equal(t.stored().opex.length, 1); assert.equal(t.stored().stash[0].saved, 800); assert.equal(t.stored().exp, 15);
  const id = t.c.state.opex[0].id; t.c.openEdit('opex', id); t.c.confirmEdit(); t.c.updateExpenseDraft('amount', '250', true);
  await t.c.saveEdit(); assert.equal(t.stored().stash[0].saved, 750); await t.c.delOpex(id); assert.equal(t.stored().stash[0].saved, 1000);
});
await test('保存容量失败不扣款、不发EXP、不关闭草稿；重试只入账一次', async () => {
  const t = create(seed(1000)); t.c.openNewOpex(41, '200'); t.flags.failWrite = true; const original = t.shared.map.get('exp-bank-v1');
  assert.equal(await t.c.addOpex(), false); assert.equal(t.c.state.stash[0].saved, 1000); assert.equal(t.c.state.exp, 10); assert.equal(t.c.state.newOpexOpen, true); assert.equal(t.c.state.expenseDraft.amount, '200'); assert.equal(t.shared.map.get('exp-bank-v1'), original);
  t.flags.failWrite = false; assert.equal(await t.c.addOpex(), true); assert.equal(t.stored().opex.length, 1);
});
await test('类别新增自动选中，保留金额备注；排序和备份一致', async () => {
  const t = create(seed(1000)); t.c.openNewOpex(41, '200'); t.c.updateExpenseDraft('note', '旅行'); t.c.openCategories('new'); t.c.setState({ categoryNameDraft: '学习' });
  assert.equal(await t.c.addOpexCategory(), true); const id = t.c.state.opexCategories.at(-1).id;
  assert.equal(t.c.state.expenseDraft.categoryId, id); assert.equal(t.c.state.expenseDraft.amount, '200'); assert.equal(t.c.state.expenseDraft.note, '旅行');
  for (let i = 0; i < 6; i++) await t.c.moveOpexCategory(id, -1);
  assert.equal(t.stored().opexCategories[0].id, id); const backup = JSON.parse(Buffer.from(t.c.makeBackupCode(), 'base64').toString('utf8')); assert.equal(backup.opexCategories[0].id, id); assert.equal(backup.expenseDraft, undefined);
});
await test('旧备份缺少资金字段时完整替换，不混入当前目标', async () => {
  const t = create(seed(1000)); t.input('bk-import', JSON.stringify({ tasks: [], exp: 7, nextId: 2 }));
  assert.equal(await t.c.importBackup(), true); assert.equal(t.c.state.stash.length, 0); assert.equal(t.stored().stash.length, 0); assert.equal(t.stored().exp, 7); assert.equal(t.stored().moneySchemaVersion, 1);
});
await test('新短码导入恢复金额、类别顺序和关联；未来schema不覆盖', async () => {
  const a = create(seed(1000)); a.c.openNewOpex(41, '200'); await a.c.addOpex(); const backup = a.c.makeBackupCode();
  const b = create(); b.input('bk-import', backup); assert.equal(await b.c.importBackup(), true); assert.equal(b.stored().stash[0].saved, 800); assert.equal(b.stored().opex[0].stashId, 41);
  const original = b.shared.map.get('exp-bank-v1'); b.input('bk-import', JSON.stringify({ ...b.stored(), moneySchemaVersion: 99 })); assert.equal(await b.c.importBackup(), false); assert.equal(b.shared.map.get('exp-bank-v1'), original);
});
await test('两页同时支出拒绝旧快照；同步后重新校验余额', async () => {
  const shared = sharedStorage(seed(1000)), a = create(null, shared), b = create(null, shared);
  a.c.openNewOpex(41, '800'); b.c.openNewOpex(41, '800'); const values = await Promise.all([a.c.addOpex(), b.c.addOpex()]);
  assert.equal(values.filter(Boolean).length, 1); assert.equal(a.stored().opex.length, 1); assert.equal(a.stored().stash[0].saved, 200); assert.equal(b.c.state.moneyConflict, true);
  await b.c.syncLatestMoney(); assert.equal(b.c.state.stash[0].saved, 200); assert.equal(b.c.state.expenseDraft.amount, '800'); assert.equal(await b.c.addOpex(), false); assert.equal(a.stored().opex.length, 1);
});
await test('照片恢复失败单独提示，账本恢复不回退也不伪报完整成功', async () => {
  const t = create(); t.c.galleryPut = async () => { throw new Error('photo storage unavailable'); }; t.c.dataURLToBlob = () => new Blob(['fixture']);
  t.input('bk-import', JSON.stringify({ ...seed(800), galleryImages: { 77: 'data:image/png;base64,AA==' } }));
  assert.equal(await t.c.importBackup(), true); assert.equal(t.stored().stash[0].saved, 800); assert.match(t.c.state.backupMsg, /照片恢复失败/);
});
await test('资金奖励与任务同时保存保留两边EXP，双击完成与撤销不会重复结算', async () => {
  const data = seed(0); data.stash[0].claimed = false; data.tasks = [{ id: 1, name: '测试任务', exp: 10, cycle: 'daily', times: 1, done: {} }];
  const t = create(data); t.input('stash-in-41', 1000);
  await Promise.all([t.c.stashDeposit(41), t.c.complete(1), t.c.complete(1)]);
  assert.equal(t.stored().exp, 120); assert.equal(t.stored().tasks[0].done[t.c.todayKey()], 1); assert.equal(t.stored().ledger.length, 2);
  t.c.openNewOpex(41, '200'); await t.c.addOpex(); assert.equal(t.stored().exp, 125);
  await Promise.all([t.c.undo(), t.c.undo()]); assert.equal(t.stored().exp, 115); assert.equal(t.stored().stash[0].saved, 800); assert.equal(t.stored().ledger.length, 2);
});
await test('任务保存失败不启动Bingo抽奖，不发EXP或打开心得窗口', async () => {
  const data = seed(0); data.tasks = [{ id: 1, name: '测试任务', exp: 100, cycle: 'daily', times: 1, done: {} }]; const t = create(data); t.flags.failWrite = true;
  assert.equal(await t.c.complete(1), false); assert.equal(t.c.state.exp, 10); assert.equal(t.c.state.reflectionOpen, undefined); assert.equal(t.c._bingoTimers, undefined);
});
await test('并行资金操作和旧排序不会丢刚新增的开销', async () => {
  const t = create(seed(1000)); t.c.openNewOpex(41, '200');
  await Promise.all([t.c.addOpex(), t.c.save({ opex: [], opexSortMode: 'manual' })]);
  assert.equal(t.stored().opex.length, 1); assert.equal(t.stored().stash[0].saved, 800); assert.equal(t.stored().exp, 15);
});
await test('排队创建任务避开资金操作刚占用的ID', async () => {
  const t = create(seed(1000)); const id = t.c.state.nextId;
  await Promise.all([t.c.runMoney({ type: 'addGoal', commandId: 'new-goal', name: '新目标', targetMinor: 10000, currencyCode: 'CNY' }), t.c.save({ tasks: [{ id, name: '新任务', exp: 10, cycle: 'daily', done: {} }], nextId: id + 1 })]);
  assert.notEqual(t.stored().tasks[0].id, t.stored().stash.at(-1).id); assert.equal(t.stored().nextId, id + 2);
});
await test('未来schema启动只保留原文，不能写入默认数据，短码可忠实导出', async () => {
  const raw = { ...seed(800), moneySchemaVersion: 99 }; const t = create(raw), before = t.shared.map.get('exp-bank-v1');
  assert.equal(await t.c.save({ exp: 999 }), false); assert.equal(t.shared.map.get('exp-bank-v1'), before); assert.equal(Buffer.from(t.c.makeBackupCode(), 'base64').toString('utf8'), before);
});
await test('维护积分实际发放10/5/0；撤销部分积分、免费打卡及Bingo按实际额', async()=>{
 const data=seed(0); data.tasks=[1,2,3].map(id=>({id,name:'维护'+id,taskKind:'maintenance',exp:10,cycle:'daily',times:1,done:{}}));
 const t=create(data), draws=[]; t.c.scheduleBingoDraw=(_key,task)=>draws.push(task.exp);
 await t.c.complete(1); assert.equal(t.stored().exp,20);
 await t.c.complete(2); assert.equal(t.stored().exp,25); assert.equal(t.c.state.pending.exp,5);
 await t.c.undo(); assert.equal(t.stored().exp,20); assert.equal(t.stored().maintenanceDays[t.c.todayKey()].awardedMinor,1000);
 await t.c.complete(2); await t.c.complete(3); assert.equal(t.stored().exp,25); assert.equal(t.c.state.pending.exp,0); assert.equal(t.stored().tasks[2].completionLog[t.c.todayKey()],1);
 assert.deepEqual(draws,[10,5,5]); await t.c.undo(); assert.equal(t.stored().exp,25); assert.equal(t.stored().tasks[2].done[t.c.todayKey()],0);
 await t.c.save({ledger:[]}); await t.c.complete(3); assert.equal(t.stored().exp,25); assert.equal(t.stored().maintenanceDays[t.c.todayKey()].awardedMinor,1500);
});
await test('维护与资金奖励共用保存队列，维护记录不能因EXP账本截断失效', async()=>{
 const data=seed(0); data.stash[0].claimed=false; data.tasks=[{id:1,name:'维护',taskKind:'maintenance',exp:10,cycle:'free',done:{}}];
 const t=create(data); t.input('stash-in-41',1000); await Promise.all([t.c.stashDeposit(41),t.c.complete(1)]);
 assert.equal(t.stored().exp,120); assert.equal(t.stored().maintenanceDays[t.c.todayKey()].awardedMinor,1000);
 await t.c.save({ledger:[]}); await t.c.complete(1); assert.equal(t.stored().exp,125); assert.equal(t.stored().tasks[0].completionLog[t.c.todayKey()],2);
 t.flags.failWrite=true; const before=t.shared.map.get('exp-bank-v1'); assert.equal(await t.c.complete(1),false); assert.equal(t.shared.map.get('exp-bank-v1'),before); assert.equal(t.c.state.exp,125);
});
await test('奖励冷却/下架在提交时检查，撤销退回原价及之前的冷却状态', async()=>{
 const data=seed(0); data.exp=1000; data.rewards=[{id:21,name:'Amber',cost:200,baseCost:200,baseMoney:20,frictionFactor:1.2,riskBand:'amber',cooldownDays:7,cooldownUntil:1,capTimes:10,capCycle:'daily',redeems:[]}];
 const t=create(data); assert.equal(t.c.state.rewards[0].cost,240); await t.c.redeem(21); assert.equal(t.stored().exp,760); assert.ok(t.stored().rewards[0].cooldownUntil>Date.now());
 assert.equal(await t.c.redeem(21),false); assert.equal(t.stored().rewards[0].redeems.length,1);
 await t.c.undo(); assert.equal(t.stored().exp,1000); assert.equal(t.stored().rewards[0].redeems.length,0); assert.equal(t.stored().rewards[0].cooldownUntil,1);
 await t.c.save({rewards:t.c.state.rewards.map(r=>({...r,riskBand:'red'}))}); assert.equal(await t.c.redeem(21),false); assert.equal(t.stored().exp,1000);
});
await test('两处解析共用预览，确认仅创建一次，任务集复用且不发EXP', async()=>{
 const data=seed(0); data.sets=[{id:11,name:'学习'}]; const t=create(data); const plan=t.c.parseTaskDescription('每天阅读5EXP；每周听力三次8EXP；放在学习任务集');
 t.c.openTaskPlan(plan,'new'); t.c.setState({assistantRemember:true}); await Promise.all([t.c.applyTaskPlan(),t.c.applyTaskPlan()]);
 assert.equal(t.stored().tasks.length,2); assert.equal(t.stored().sets.length,1); assert.ok(t.stored().tasks.every(x=>x.setId===11)); assert.equal(t.stored().exp,10); assert.equal(t.stored().ledger.length,0);
 assert.equal(t.stored().tasks[1].exp,8); assert.equal(t.stored().taskAssistantPrefs['阅读'].exp,5); assert.equal(t.stored().assistantPlan,undefined);
});
await test('解析歧义需要编辑确认；保存失败保留草稿并允许重试', async()=>{
 const t=create(seed(0)), plan=t.c.parseTaskDescription('跑步每天或每周5EXP');
 t.c.openTaskPlan(plan,'help'); assert.equal(await t.c.applyTaskPlan(),false); t.c.updateAssistantTask(0,'cycle','weekly');
 t.flags.failWrite=true; assert.equal(await t.c.applyTaskPlan(),false); assert.equal(t.c.state.assistantOpen,true); assert.equal(t.c.state.assistantPlan.tasks[0].cycle,'weekly'); assert.equal(t.stored().tasks.length,0);
 t.flags.failWrite=false; assert.equal(await t.c.applyTaskPlan(),true); assert.equal(t.stored().tasks.length,1); assert.equal(t.stored().tasks[0].cycle,'weekly');
});
await test('新备份恢复维护日结与任务偏好，旧备份清空新字段，未来积分schema保留原文', async()=>{
 const data=seed(0); data.tasks=[{id:1,name:'维护',taskKind:'maintenance',exp:10,cycle:'free',done:{}}]; const a=create(data); await a.c.complete(1);
 const b=create(); b.input('bk-import',a.c.makeBackupCode()); assert.equal(await b.c.importBackup(),true); assert.equal(b.stored().maintenanceDays[b.c.todayKey()].awardedMinor,1000);
 b.input('bk-import',JSON.stringify({tasks:[],exp:7,nextId:2})); await b.c.importBackup(); assert.deepEqual(b.stored().maintenanceDays,{});
 const raw={...data,progressionSchemaVersion:99}, future=create(raw); assert.equal(await future.c.save({exp:100}),false); assert.equal(Buffer.from(future.c.makeBackupCode(),'base64').toString('utf8'),JSON.stringify(raw));
});
await test('奖励图片与维护/资金并行保存不绕过写入队列，失败保留旧图片',async()=>{
 const data=seed(0); data.tasks=[{id:1,name:'维护',taskKind:'maintenance',exp:10,cycle:'daily',done:{}}]; data.rewards=[{id:21,name:'图片奖励',cost:100,img:'old-image',redeems:[]}];
 const t=create(data); await Promise.all([t.c.complete(1),t.c.saveRewardImage(21,'new-image')]);
 assert.equal(t.stored().exp,20); assert.equal(t.stored().maintenanceDays[t.c.todayKey()].awardedMinor,1000); assert.equal(t.stored().rewards[0].img,'new-image');
 t.flags.failWrite=true; assert.equal(await t.c.saveRewardImage(21,'failed-image'),false); assert.equal(t.stored().rewards[0].img,'new-image');
});
await test('Life新用户四层完整、手动创建推荐分类且不改变积分',async()=>{
 const t=create();const v=t.c.renderVals();assert.equal(v.lifeGroups.length,4);assert.equal(v.lifeGroups.reduce((n,g)=>n+g.count,0),t.c.state.tasks.length);
 t.input('nt-name','跑步1km');t.input('nt-exp',50);t.input('nt-cycle','daily');t.input('nt-times',1);t.input('nt-interval',1);
 const before=t.c.state.exp;await t.c.addTask();const x=t.stored().tasks.at(-1);assert.equal(x.lifeType,'CORE');assert.equal(x.exp,50);assert.equal(x.taskKind,'standard');assert.equal(t.stored().exp,before);
});
await test('Life老用户迁移完整保留category、EXP、周期、完成记录和已完成单次任务',async()=>{
 const data=seed(800);data.appVersion='v1.11.0';data.tasks=[{id:1,name:'六级单词',category:'微习惯',exp:50,cycle:'weekly',times:3,interval:2,anchorDate:'2026-08-01',priority:'p1',core:true,done:{x:3},completionLog:{'2026-10-01':3}},{id:2,name:'电影',cycle:'once',times:1,exp:20,done:{once:1},lastDone:'2026-09-01'}];
 const t=create(data);t.c.pruneOnce();await t.c.save({});assert.equal(t.stored().tasks.length,2);
 for(const [i,old]of data.tasks.entries())for(const[k,value]of Object.entries(old))assert.deepEqual(t.stored().tasks[i][k],value);
 assert.equal(t.stored().exp,10);assert.equal(t.stored().tasks[0].lifeType,'GROWTH');assert.equal(t.stored().tasks[0].warImportant,true);
 assert.equal(t.stored().tasks[1].lifeType,'EXPLORATION');assert.equal(create(t.stored()).c.state.tasks.length,2);
});
await test('Life逐层排序并行完成不丢记录，保存失败维持原顺序',async()=>{
 const data=seed(0);data.tasks=[1,2,3].map(id=>({id,name:'跑步'+id,exp:10,cycle:'daily',done:{}}));const t=create(data);
 await Promise.all([t.c.moveLifeTask(3,-1),t.c.complete(1)]);let v=t.c.renderVals();assert.deepEqual(Array.from(v.lifeGroups[0].tasks,x=>x.id),[1,3,2]);assert.equal(t.stored().exp,20);assert.equal(t.stored().tasks[0].done[t.c.todayKey()],1);
 const before=t.shared.map.get('exp-bank-v1');t.flags.failWrite=true;assert.equal(await t.c.moveLifeTask(3,-1),false);assert.equal(t.shared.map.get('exp-bank-v1'),before);
});
await test('Life修改分类与关键标记保留原周期和分类字段，重载继续生效',async()=>{
 const data=seed(0);data.tasks=[{id:1,name:'阅读',category:'自定义旧分类',exp:10,cycle:'weekly',times:2,interval:1,anchorDate:'2026-10-01',done:{'2026-W40':2},priority:'p3',core:true}];const t=create(data);
 t.c.openEdit('task',1);t.input('ed-name','阅读');t.input('ed-cycle','weekly');t.input('ed-times',2);t.input('ed-interval',1);t.input('ed-exp',10);t.input('ed-life-type','GROWTH');t.check('ed-war-important',true);
 await t.c.saveEdit();const x=t.stored().tasks[0];assert.equal(x.lifeType,'GROWTH');assert.equal(x.warImportant,true);assert.deepEqual(x.done,{'2026-W40':2});assert.equal(x.category,'自定义旧分类');assert.equal(x.core,true);assert.equal(x.priority,'p3');assert.equal(x.lifeOrder,0);assert.equal(create(t.stored()).c.state.tasks[0].warImportant,true);
});
await test('WAR 2.0保留全部CORE及关键GROWTH，无旧三项截断，其他层隐藏且不删除',async()=>{
 const types=['CORE','CORE','CORE','CORE','GROWTH','GROWTH','MAINTENANCE','EXPLORATION'];const data=seed(0);data.tasks=types.map((lifeType,i)=>({id:i+1,name:'项目'+i,lifeType,warImportant:i===4,core:true,exp:1,cycle:'daily',done:{}}));const t=create(data);
 await t.c.save({warMode:true});let v=t.c.renderVals();assert.deepEqual(Array.from(v.taskRows,x=>x.id),[1,2,3,4,5]);assert.equal(v.coreTotal,5);assert.equal(v.lifeGroups.length,2);assert.equal(t.stored().tasks.length,8);
 await t.c.toggleCore(6);assert.equal(t.c.renderVals().taskRows.length,6);assert.equal(t.stored().tasks[5].core,true);
 await t.c.save({warMode:false});assert.equal(t.c.renderVals().tasks.length,8);assert.equal(t.c.renderVals().lifeGroups.length,4);
});
await test('Life今日与周统计在完成、撤销、周期跨年后正确更新',async()=>{
 const data=seed(0);data.tasks=[{id:1,name:'吃饭',exp:10,cycle:'daily',times:2,done:{}}];const t=create(data);
 await t.c.complete(1);assert.equal(t.c.renderVals().lifeGroups[0].todayLabel,'今日完成 0/1');assert.equal(t.c.renderVals().lifeGroups[0].weekLabel,'本周完成率 50%');
 await t.c.complete(1);assert.equal(t.c.renderVals().lifeGroups[0].todayLabel,'今日完成 1/1');await t.c.undo();assert.equal(t.c.renderVals().lifeGroups[0].weekLabel,'本周完成率 50%');
 const x={cycle:'weekly',interval:1,times:2,lifeStatsFrom:'2026-12-28',done:{'2026-W53':1}};
 const st=t.context.ExpLife.stats([x],new Date('2027-01-01T12:00:00'),(a,d)=>t.c.periodKey(a,d));assert.equal(st.weekTotal,2);assert.equal(st.weekDone,1);
});
await test('Life备份往返保留分类排序，旧备份自动迁移且不混入旧任务',async()=>{
 const data=seed(0);data.tasks=[{id:1,name:'跑步',exp:10,cycle:'daily',done:{}},{id:2,name:'吃饭',exp:10,cycle:'daily',done:{}}];const a=create(data);await a.c.moveLifeTask(2,-1);
 const code=a.c.makeBackupCode(),b=create();b.input('bk-import',code);await b.c.importBackup();assert.deepEqual(b.stored().tasks,a.stored().tasks);assert.equal(b.stored().lifeSchemaVersion,1);
 b.input('bk-import',JSON.stringify({tasks:[{id:30,name:'测试',cycle:'once',done:{}}],exp:77,nextId:100}));await b.c.importBackup();assert.equal(b.stored().tasks.length,1);assert.equal(b.stored().tasks[0].lifeType,'EXPLORATION');assert.equal(b.stored().exp,77);
});
await test('未来Life schema启动和导入都保留原文，不覆盖默认状态',async()=>{
 const raw={...seed(800),lifeSchemaVersion:99};const t=create(raw),before=t.shared.map.get('exp-bank-v1');assert.equal(await t.c.save({}),false);assert.equal(t.shared.map.get('exp-bank-v1'),before);assert.equal(Buffer.from(t.c.makeBackupCode(),'base64').toString('utf8'),before);
 const good=create(seed(800));await good.c.save({});const old=good.shared.map.get('exp-bank-v1');good.input('bk-import',JSON.stringify(raw));assert.equal(await good.c.importBackup(),false);assert.equal(good.shared.map.get('exp-bank-v1'),old);
});
await test('Life两页排序与完成冲突拒绝旧快照，同步后保持两边数据',async()=>{
 const data=seed(0);data.tasks=[1,2].map(id=>({id,name:'跑步'+id,exp:10,cycle:'daily',done:{}}));const shared=sharedStorage(data),a=create(null,shared),b=create(null,shared);await a.c.moveLifeTask(2,-1);assert.equal(await b.c.complete(1),false);
 await b.c.syncLatestMoney();await b.c.complete(1);assert.equal(b.stored().exp,20);assert.deepEqual(Array.from(b.c.renderVals().lifeGroups[0].tasks,t=>t.id),[2,1]);
});
await test('Life AI候选人工调整后的分类与关键GROWTH随确认保存',async()=>{
 const t=create(seed(0));const plan=t.c.parseTaskDescription('每天阅读5EXP');t.c.openTaskPlan(plan,'help');t.c.updateAssistantTask(0,'lifeType','GROWTH');t.c.updateAssistantTask(0,'warImportant',true);await t.c.applyTaskPlan();
 assert.equal(t.stored().tasks[0].lifeType,'GROWTH');assert.equal(t.stored().tasks[0].warImportant,true);assert.equal(t.stored().tasks[0].taskKind,'standard');assert.equal(t.stored().exp,10);
});

console.log('Component checks passed: ' + results.length);
