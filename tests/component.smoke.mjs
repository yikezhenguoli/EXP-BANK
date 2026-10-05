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
  vm.runInContext(money, context); vm.runInContext(source + '\nglobalThis.TestComponent = Component;', context);
  const c = new context.TestComponent({ goldAt: 300, diamondAt: 900, interestRate: 5, coreQuota: 3 });
  return { c, flags, shared, context, input: (id, value) => { elements[id] = { value: String(value) }; }, stored: () => JSON.parse(shared.map.get('exp-bank-v1')) };
}
const seed = saved => ({ appVersion: 'v1.9.2', tasks: [], rewards: [], ledger: [], exp: 10, nextId: 500, stash: [{ id: 41, name: '旅游', target: 1000, saved, claimed: true }], opex: [] });
async function test(name, fn) { await fn(); results.push(name); console.log('PASS ' + name); }
await test('新用户及旧用户启动完成schema，余额、EXP和达成保持', async () => {
  const t = create(seed(800)); assert.equal(t.c.state.appVersion, 'v1.10.0'); assert.equal(t.c.state.stash[0].saved, 800); assert.equal(t.c.state.exp, 10); assert.equal(t.c.state.moneySchemaVersion, 1);
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
console.log('Component checks passed: ' + results.length);
