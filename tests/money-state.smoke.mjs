import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), M = require('../money.js');
const env = { today: '2026-10-05', now: 1791187200000 };
let serial = 0, passed = 0;
const command = (s, type, fields = {}) => M.mutate(s, { type, commandId: 'test-' + ++serial, ...fields }, env);
const seed = (saved = 1000) => ({ tasks: [], exp: 12, ledger: [], nextId: 500, opex: [], stash: [{ id: 41, name: '旅游', target: 1000, saved, claimed: true }, { id: 42, name: '自由基金', target: 2000, saved: 1000, claimed: false }] });
const expense = (overrides = {}) => ({ amountMinor: 20000, categoryId: 'cat-transport', note: '旅行车票', date: env.today, currencyCode: 'CNY', stashId: 41, ...overrides });
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
test('旧余额不因旧开销重复扣减，迁移幂等且不重发积分', () => {
  const old = seed(800); old.opex = [{ id: 50, amount: 200, cat: '交通', note: '旧车票', date: '2026-09-20', ts: 1 }];
  const s = M.normalize(old), again = M.normalize(s);
  assert.equal(M.balance(s, 41), 80000); assert.equal(s.opex[0].stashId, null); assert.equal(s.exp, 12); assert.equal(s.stash[0].claimed, true);
  assert.deepEqual(again, s); assert.equal(s.stashMovements.filter(m => m.id === 'opening:41').length, 1);
  const absent = { ...s }; delete absent.moneySchemaVersion; assert.equal(M.normalize(absent).stashMovements.length, s.stashMovements.length);
});
test('1000 → 支出200 → 改250 → 删除，余额800 / 750 / 1000', () => {
  let s = command(seed(), 'addExpense', expense()); const id = s.opex[0].id;
  assert.equal(s.opex.length, 1); assert.equal(M.balance(s, 41), 80000); assert.equal(s.exp, 17);
  assert.equal(M.timeline(s, 41).filter(r => r.expenseId === id).length, 1);
  s = command(s, 'editExpense', { ...expense({ amountMinor: 25000 }), id }); assert.equal(M.balance(s, 41), 75000);
  s = command(s, 'deleteExpense', { id }); assert.equal(M.balance(s, 41), 100000); assert.equal(s.exp, 17);
});
test('修改付款目标在一次状态中返还A并扣B，分类和日期不动余额', () => {
  let s = command(seed(), 'addExpense', expense()), id = s.opex[0].id;
  s = command(s, 'editExpense', { ...expense({ stashId: 42, categoryId: 'cat-fun', date: '2026-10-01' }), id });
  assert.equal(M.balance(s, 41), 100000); assert.equal(M.balance(s, 42), 80000);
  s = command(s, 'editExpense', { ...expense({ stashId: 42, categoryId: 'cat-food' }), id }); assert.equal(M.balance(s, 42), 80000); assert.equal(s.exp, 17);
});
test('超额消费和取出拒绝；失败不修改原状态', () => {
  const s = M.normalize(seed(50)), before = JSON.stringify(s);
  assert.throws(() => command(s, 'addExpense', expense()), /余额不足/);
  assert.throws(() => command(s, 'withdraw', { id: 41, amountMinor: 6000 }), /余额不足/); assert.equal(JSON.stringify(s), before);
  let t = command(seed(), 'addExpense', expense()); t = command(t, 'withdraw', { id: 42, amountMinor: 99000 }); const snap = JSON.stringify(t);
  assert.throws(() => command(t, 'editExpense', { ...expense({ stashId: 42 }), id: t.opex[0].id }), /余额不足/); assert.equal(JSON.stringify(t), snap);
});
test('金额拒绝负数、零、Infinity、指数、超精度和溢出；0.1 + 0.2 精确为0.30', () => {
  for (const v of ['-1', '0', 'Infinity', 'NaN', '1e2', '1.001', '', '90071992547410']) assert.throws(() => M.parseMinor(v));
  assert.equal(M.parseMinor('000.10'), 10); assert.equal(M.parseMinor('0', true), 0);
  let s = M.normalize(seed(0)); s = command(s, 'deposit', { id: 41, amountMinor: M.parseMinor('0.1') }); s = command(s, 'deposit', { id: 41, amountMinor: M.parseMinor('0.2') });
  assert.equal(M.balance(s, 41), 30); assert.equal(M.format(M.balance(s, 41), 'CNY'), '¥0.30');
});
test('调整余额填写原因、不记消费、不发EXP，取出记录负向流水', () => {
  let s = M.normalize(seed()); assert.throws(() => command(s, 'adjustBalance', { id: 41, amountMinor: 90000 }), /原因/);
  s = command(s, 'adjustBalance', { id: 41, amountMinor: 90000, note: '核对余额' }); s = command(s, 'withdraw', { id: 41, amountMinor: 10000 });
  assert.equal(M.balance(s, 41), 80000); assert.equal(s.opex.length, 0); assert.equal(s.exp, 12); assert.equal(s.stashMovements.at(-1).type, 'withdrawal');
});
test('每日消费+5和首次达成+100只结算一次；编辑、删除、恢复不重发', () => {
  let s = M.normalize(seed(0)); s.stash = s.stash.map(g => ({ ...g, claimed: false }));
  s = command(s, 'deposit', { id: 41, amountMinor: 100000 }); assert.equal(s.exp, 112);
  s = command(s, 'withdraw', { id: 41, amountMinor: 10000 }); s = command(s, 'deposit', { id: 41, amountMinor: 10000 }); assert.equal(s.exp, 112);
  s = command(s, 'addExpense', expense()); s = command(s, 'addExpense', expense()); assert.equal(s.exp, 117);
  s = command(s, 'deleteExpense', { id: s.opex[0].id }); s = command(s, 'archiveGoal', { id: 41 }); s = command(s, 'restoreGoal', { id: 41 }); assert.equal(s.exp, 117);
});
test('归档不丢历史，拒绝新付款；原关联支出仍能纠错，恢复保留达成', () => {
  let s = command(seed(), 'addExpense', expense()), id = s.opex[0].id;
  s = command(s, 'archiveGoal', { id: 41 }); assert.equal(M.balance(s, 41), 80000); assert.equal(M.timeline(s, 41).length, 2);
  assert.throws(() => command(s, 'addExpense', expense()), /归档/);
  s = command(s, 'editExpense', { ...expense({ amountMinor: 25000 }), id }); assert.equal(M.balance(s, 41), 75000);
  s = command(s, 'restoreGoal', { id: 41 }); assert.equal(s.stash[0].claimed, true); assert.equal(s.exp, 17);
});
test('逐笔币种固定，切换默认币种不改旧账，跨币种扣款拒绝', () => {
  let s = command(seed(), 'addExpense', expense()); s = command(s, 'setCurrency', { currencyCode: 'MYR' });
  assert.equal(s.opex[0].currencyCode, 'CNY'); assert.equal(s.stash[0].currencyCode, 'CNY'); assert.equal(s.defaultCurrencyCode, 'MYR');
  assert.throws(() => command(s, 'addExpense', expense({ currencyCode: 'MYR' })), /币种不同/);
  s = command(s, 'addExpense', expense({ stashId: null, currencyCode: 'MYR' })); assert.equal(s.opex[0].currencyCode, 'MYR');
});
test('自定义类别追加，拒绝空白和重复；所有内置与自定义类别可排序', () => {
  let s = command(seed(), 'addCategory', { name: '学习' }); const custom = s.opexCategories.at(-1);
  assert.throws(() => command(s, 'addCategory', { name: ' 学习 ' }), /同名/); assert.throws(() => command(s, 'addCategory', { name: ' ' }), /名称/);
  const ids = [custom.id, 'cat-other', ...s.opexCategories.map(c => c.id).filter(id => id !== custom.id && id !== 'cat-other')];
  s = command(s, 'reorderCategories', { ids }); assert.deepEqual(M.normalize(s).opexCategories.map(c => c.id), ids);
  s = command(s, 'addExpense', expense({ categoryId: custom.id })); assert.equal(s.opex[0].cat, '学习');
  assert.throws(() => command(s, 'reorderCategories', { ids: ids.slice(1) }), /排序不完整/);
});
test('迁移保留未识别的历史类别；新增ID跳过所有已用数字ID', () => {
  const old = seed(); old.nextId = 2; old.tasks = [{ id: 950 }]; old.opex = [{ id: 960, amount: 1, cat: '历史类别', date: '2026-10-01' }];
  let s = M.normalize(old); assert.equal(s.nextId, 961); assert.equal(s.opex[0].cat, '历史类别'); assert.equal(s.opexCategories.at(-1).name, '历史类别');
  s = command(s, 'addExpense', expense()); assert.equal(s.opex[0].id, 961);
});
test('801笔以上历史保留，最早记录仍可修改和删除', () => {
  const old = seed(); old.opex = Array.from({ length: 800 }, (_, i) => ({ id: 1000 + i, amount: 1, cat: '其他', date: '2026-10-01' }));
  let s = command(old, 'addExpense', expense({ stashId: null })); assert.equal(s.opex.length, 801);
  s = command(s, 'editExpense', { ...expense({ stashId: null, amountMinor: 250 }), id: 1000 }); assert.equal(s.opex.find(o => o.id === 1000).amountMinor, 250);
  s = command(s, 'deleteExpense', { id: 1000 }); assert.equal(s.opex.length, 800);
});
test('稳定提交ID防止重复消费，包括超过短期去重窗口后的重放', () => {
  const c = { type: 'addExpense', commandId: 'stable', ...expense() }; let s = M.mutate(seed(), c, env); const once = JSON.stringify(s);
  assert.equal(JSON.stringify(M.mutate(s, c, env)), once);
  for (let i = 0; i < 260; i++) s = command(s, 'setCurrency', { currencyCode: i % 2 ? 'CNY' : 'MYR' });
  const before = JSON.stringify(s); assert.equal(JSON.stringify(M.mutate(s, c, env)), before);
});
test('未知schema、缺失流水、重复ID和悬空引用拒绝导入', () => {
  const s = M.normalize(seed());
  assert.throws(() => M.normalize({ ...s, moneySchemaVersion: 2 }), /版本/);
  assert.throws(() => M.normalize({ ...s, stashMovements: undefined }), /不完整/);
  assert.throws(() => M.normalize({ ...s, stash: [s.stash[0], s.stash[0]] }), /重复/);
  const t = command(s, 'addExpense', expense()); assert.throws(() => M.normalize({ ...t, stash: [] }), /关联/);
});
test('备份包含所有资金和类别字段，移除草稿及错误状态', () => {
  let s = command(seed(), 'addCategory', { name: '房租' }); s = command(s, 'addExpense', expense()); s.moneyError = 'test'; s.expenseDraft = { amount: '9' }; s.moneyBusy = true;
  const data = JSON.parse(JSON.stringify(M.persistent(s))); assert.equal(data.moneySchemaVersion, 1); assert.equal(data.opex[0].stashId, 41); assert.ok(data.stashMovements.length); assert.equal(data.opexCategories.at(-1).name, '房租');
  assert.equal(data.expenseDraft, undefined); assert.equal(data.moneyError, undefined); assert.equal(data.moneyBusy, undefined); assert.equal(M.balance(M.normalize(data), 41), 80000);
});
test('200次随机存入和支出符合独立整数余额模型', () => {
  let s = M.normalize(seed(0)), expected = 0, rng = 73;
  for (let i = 0; i < 200; i++) {
    rng = (rng * 1664525 + 1013904223) >>> 0; const amount = rng % 1000 + 1;
    if (i % 3 || amount > expected) { s = command(s, 'deposit', { id: 41, amountMinor: amount }); expected += amount; }
    else { s = command(s, 'addExpense', expense({ amountMinor: amount })); expected -= amount; }
    assert.equal(M.balance(s, 41), expected); assert.equal(s.stash[0].saved, expected / 100);
  }
});
console.log('Money checks passed: ' + passed);
