/* EXP BANK v1.10.0 — integer money, migrations and atomic business commands. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpMoney = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCHEMA = 1;
  const CURRENCIES = [
    { code: 'CNY', symbol: '¥', label: '人民币 · CNY' },
    { code: 'MYR', symbol: 'RM', label: '马币 · MYR' },
    { code: 'USD', symbol: '$', label: '美元 · USD' },
    { code: 'TWD', symbol: 'NT$', label: '新台币 · TWD' },
    { code: 'EUR', symbol: '€', label: '欧元 · EUR' }
  ];
  const BUILTINS = [
    ['cat-food', '吃饭', '#f59e0b'], ['cat-transport', '交通', '#60a5fa'],
    ['cat-shopping', '购物', '#a78bfa'], ['cat-social', '人情', '#f472b6'],
    ['cat-fun', '娱乐', '#34d399'], ['cat-other', '其他', '#94a3b8']
  ].map(([id, name, color]) => ({ id, name, color, builtin: true }));
  const COLORS = ['#22d3ee', '#fb923c', '#c084fc', '#a3e635', '#facc15', '#fda4af'];
  function fail(message) { throw new Error(message); }
  function safe(n, label = '金额') { if (!Number.isSafeInteger(n)) fail(label + '超出支持范围或格式无效'); return n; }
  function add(a, b) { return safe(a + b); }
  function currency(code) { const c = CURRENCIES.find(c => c.code === code); if (!c) fail('不支持的币种：' + code); return c; }
  function format(minor, code) { return currency(code).symbol + (minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // Parse decimal text without floating-point multiplication; never silently round a new input.
  function parseMinor(value, allowZero = false) {
    const text = String(value == null ? '' : value).trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) fail('请输入有效金额，最多两位小数');
    const [whole, fraction = ''] = text.split('.');
    const n = Number(BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
    safe(n);
    if (n < 0 || (!allowZero && n === 0)) fail('金额必须大于 0');
    return n;
  }
  function legacyMinor(n, label, allowZero) {
    n = Number(n);
    if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) fail(label + '无效，原始数据已保留');
    return safe(Math.round((n + Number.EPSILON) * 100), label);
  }
  function validId(id) { return (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0) || (typeof id === 'string' && id.length > 0 && id.length <= 160); }
  function unique(rows, label) {
    const ids = new Set();
    rows.forEach(r => { if (!r || !validId(r.id) || ids.has(String(r.id))) fail(label + ' ID 缺失或重复'); ids.add(String(r.id)); });
  }
  function dateValid(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const d = new Date(text + 'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
  }
  function readDate(value, today) { const d = value || today; if (!dateValid(d)) fail('请选择有效日期'); return d; }
  function nameKey(name) { return name.trim().toLocaleLowerCase(); }
  function categoryName(name) {
    const n = String(name || '').trim();
    if (!n || n.length > 24) fail('类别名称需为 1–24 个字');
    return n;
  }
  function categories(input, expenses) {
    const rows = Array.isArray(input) ? input.map(c => ({ ...c, name: categoryName(c.name) })) : BUILTINS.map(c => ({ ...c }));
    unique(rows, '类别');
    const names = new Set();
    rows.forEach(c => {
      const key = nameKey(c.name); if (names.has(key)) fail('类别名称重复：' + c.name); names.add(key);
      c.color = /^#[0-9a-f]{6}$/i.test(c.color || '') ? c.color : '#94a3b8';
    });
    BUILTINS.forEach(c => { if (!names.has(nameKey(c.name))) { rows.push({ ...c }); names.add(nameKey(c.name)); } });
    expenses.forEach(e => {
      if (e.categoryId != null && rows.some(c => c.id === e.categoryId)) return;
      const name = String(e.cat || '其他').trim() || '其他';
      if (!names.has(nameKey(name))) {
        rows.push({ id: 'cat-legacy:' + encodeURIComponent(name), name, color: COLORS[rows.length % COLORS.length], builtin: false });
        names.add(nameKey(name));
      }
    });
    unique(rows, '类别');
    return rows;
  }
  function balance(state, id) {
    const goal = state.stash.find(s => s.id === id); if (!goal) fail('找不到付款目标');
    let total = 0;
    state.stashMovements.filter(m => m.stashId === id).forEach(m => { total = add(total, m.deltaMinor); });
    state.opex.filter(o => o.stashId === id).forEach(o => { total = add(total, -o.amountMinor); });
    return total;
  }
  function normalize(input) {
    if (!input || typeof input !== 'object') fail('数据内容无效');
    const version = input.moneySchemaVersion == null ? 0 : input.moneySchemaVersion;
    if (version !== 0 && version !== SCHEMA) fail('此资金数据版本需要更新的 EXP BANK，已保留原始数据');
    const legacyCode = (CURRENCIES.find(c => c.symbol === input.opexCurrency) || CURRENCIES[0]).code;
    const code = input.defaultCurrencyCode || legacyCode; currency(code);
    const legacy = version === 0;
    if (!legacy && (!Array.isArray(input.stashMovements) || !Array.isArray(input.stash) || !Array.isArray(input.opex))) fail('资金流水不完整，不能覆盖当前数据');
    const rawOpex = Array.isArray(input.opex) ? input.opex : [];
    const opexCategories = categories(input.opexCategories, rawOpex);
    const stash = (input.stash || []).map(s => {
      const targetMinor = legacy ? legacyMinor(s.target, '目标金额', false) : safe(s.targetMinor, '目标金额');
      if (targetMinor <= 0) fail('目标金额必须大于 0');
      currency(s.currencyCode || code);
      return { ...s, targetMinor, target: targetMinor / 100, currencyCode: s.currencyCode || code, archivedAt: s.archivedAt || null, claimed: !!s.claimed };
    });
    unique(stash, '目标'); unique(rawOpex, '开销');
    const opex = rawOpex.map(o => {
      const amountMinor = legacy ? legacyMinor(o.amount, '开销金额', false) : safe(o.amountMinor, '开销金额');
      if (amountMinor <= 0) fail('开销金额必须大于 0');
      const c = opexCategories.find(c => c.id === o.categoryId) || opexCategories.find(c => nameKey(c.name) === nameKey(String(o.cat || '其他')));
      const stashId = legacy ? null : (o.stashId == null ? null : o.stashId);
      const goal = stash.find(s => s.id === stashId);
      const currencyCode = o.currencyCode || code; currency(currencyCode);
      if (stashId != null && (!goal || goal.currencyCode !== currencyCode)) fail('开销目标关联或币种无效');
      return { ...o, amountMinor, amount: amountMinor / 100, currencyCode, categoryId: c.id, cat: c.name,
        stashId, stashNameSnapshot: stashId == null ? '' : (o.stashNameSnapshot || goal.name), currencyInferred: o.currencyInferred == null ? legacy : !!o.currencyInferred };
    });
    let stashMovements = (Array.isArray(input.stashMovements) ? input.stashMovements : []).map(m => ({ ...m }));
    if (legacy) stash.forEach(s => {
      const id = 'opening:' + s.id;
      if (!stashMovements.some(m => m.id === id)) stashMovements.push({ id, stashId: s.id, type: 'opening', deltaMinor: legacyMinor(s.saved || 0, '目标余额', true), currencyCode: s.currencyCode, date: '', ts: 0, note: '升级前余额（不推断历史）' });
    });
    unique(stashMovements, '目标流水');
    stashMovements.forEach(m => {
      const goal = stash.find(s => s.id === m.stashId);
      if (!goal || goal.currencyCode !== m.currencyCode) fail('目标流水关联或币种无效');
      safe(m.deltaMinor);
      if (!['opening', 'deposit', 'withdrawal', 'adjustment'].includes(m.type)) fail('未知的资金流水类型');
      if ((m.type === 'opening' && m.deltaMinor < 0) || (m.type === 'deposit' && m.deltaMinor <= 0) || (m.type === 'withdrawal' && m.deltaMinor >= 0)) fail('目标流水方向无效');
    });
    const state = { ...input, moneySchemaVersion: SCHEMA, defaultCurrencyCode: code, opexCurrency: currency(code).symbol, stash, opex, stashMovements, opexCategories,
      moneyCommandIds: Array.isArray(input.moneyCommandIds) ? input.moneyCommandIds.slice(-256) : [],
      moneyMigrationNotice: input.moneyMigrationNotice || (legacy && (rawOpex.length || stash.some(s => s.saved > 0)) ? '旧记录币种按升级前符号初始化，请核对；旧开销未自动关联目标。' : '') };
    stash.forEach(s => { const n = balance(state, s.id); if (n < 0) fail('目标余额不能为负：' + s.name); s.saved = n / 100; });
    let maxId = 499;
    ['tasks', 'sets', 'rewards', 'milestones', 'milestoneSets', 'countdowns', 'dayline', 'funds', 'stash', 'opex', 'stashMovements', 'galleryEntries'].forEach(key => {
      (Array.isArray(state[key]) ? state[key] : []).forEach(row => { if (typeof row.id === 'number') maxId = Math.max(maxId, safe(row.id, 'ID')); });
    });
    state.nextId = Math.max(Number.isSafeInteger(input.nextId) ? input.nextId : 500, add(maxId, 1));
    return state;
  }
  function goalById(state, id, active = true) { const s = state.stash.find(s => s.id === id); if (!s || (active && s.archivedAt)) fail('目标已归档或不存在'); return s; }
  function expenseFields(state, command, old, today) {
    const amountMinor = safe(command.amountMinor);
    if (amountMinor <= 0) fail('金额必须大于 0');
    const c = state.opexCategories.find(c => c.id === command.categoryId); if (!c) fail('请选择类别');
    const currencyCode = command.currencyCode || (old && old.currencyCode) || state.defaultCurrencyCode; currency(currencyCode);
    const stashId = command.stashId == null || command.stashId === '' ? null : command.stashId;
    const goal = stashId == null ? null : goalById(state, stashId, !(old && old.stashId === stashId));
    if (goal && goal.currencyCode !== currencyCode) fail('付款目标与开销币种不同，请选择同币种目标');
    if (goal) {
      const available = add(balance(state, goal.id), old && old.stashId === goal.id ? old.amountMinor : 0);
      if (amountMinor > available) fail(goal.name + '余额不足，还差 ' + format(amountMinor - available, currencyCode));
    }
    return { amountMinor, amount: amountMinor / 100, currencyCode, categoryId: c.id, cat: c.name, note: String(command.note || '').trim() || c.name,
      date: readDate(command.date, today), stashId, stashNameSnapshot: goal ? goal.name : '' };
  }
  function mutate(input, command, env) {
    let state = normalize(input);
    const { today, now = Date.now() } = env;
    if (!dateValid(today)) fail('当前日期无效');
    if (!command || !command.commandId) fail('缺少提交编号');
    if (state.moneyCommandIds.includes(command.commandId) || state.opex.some(o => o.commandId === command.commandId) || state.stashMovements.some(m => m.commandId === command.commandId)) return state;
    const type = command.type;
    function allocate() { const id = state.nextId; state.nextId = add(id, 1); return id; }
    function movement(goal, kind, deltaMinor, note) {
      state.stashMovements = [...state.stashMovements, { id: allocate(), commandId: command.commandId, stashId: goal.id, type: kind, deltaMinor, currencyCode: goal.currencyCode, date: readDate(command.date, today), ts: now, note }];
    }
    function award(delta, name) { state.exp = (Number(state.exp) || 0) + delta; state.ledger = [{ ts: now, commandId: command.commandId, name, delta }, ...(state.ledger || [])].slice(0, 200); }
    if (type === 'addExpense') {
      const entry = { id: allocate(), commandId: command.commandId, ts: now, currencyInferred: false, ...expenseFields(state, command, null, today) };
      state.opex = [entry, ...state.opex];
      if (state.opexLastLogDay !== today) { state.opexLastLogDay = today; award(5, '记账打卡 · OPEX'); }
    } else if (type === 'editExpense') {
      const old = state.opex.find(o => o.id === command.id); if (!old) fail('这笔开销已不存在');
      state.opex = state.opex.map(o => o.id === old.id ? { ...o, ...expenseFields(state, command, old, today), currencyInferred: command.confirmCurrency ? false : o.currencyInferred } : o);
    } else if (type === 'deleteExpense') {
      state.opex = state.opex.filter(o => o.id !== command.id);
    } else if (type === 'addGoal') {
      const targetMinor = safe(command.targetMinor); if (targetMinor <= 0) fail('目标金额必须大于 0');
      const name = String(command.name || '').trim(); if (!name) fail('请填写目标名称');
      const currencyCode = command.currencyCode || state.defaultCurrencyCode; currency(currencyCode);
      state.stash = [...state.stash, { id: allocate(), name, targetMinor, target: targetMinor / 100, saved: 0, claimed: false, currencyCode, archivedAt: null }];
    } else if (type === 'editGoal') {
      const goal = goalById(state, command.id, false), targetMinor = safe(command.targetMinor);
      if (targetMinor <= 0) fail('目标金额必须大于 0');
      state.stash = state.stash.map(s => s.id === goal.id ? { ...s, name: String(command.name || '').trim() || s.name, targetMinor, target: targetMinor / 100 } : s);
    } else if (type === 'archiveGoal' || type === 'restoreGoal') {
      goalById(state, command.id, false);
      state.stash = state.stash.map(s => s.id === command.id ? { ...s, archivedAt: type === 'archiveGoal' ? now : null } : s);
    } else if (['deposit', 'withdraw', 'adjustBalance'].includes(type)) {
      const goal = goalById(state, command.id), before = balance(state, goal.id);
      const n = safe(command.amountMinor); if (n < 0 || (type !== 'adjustBalance' && n === 0)) fail('金额必须大于 0');
      const reason = String(command.note || '').trim();
      if (type === 'adjustBalance' && !reason) fail('调整余额需填写原因');
      const delta = type === 'withdraw' ? -n : type === 'adjustBalance' ? n - before : n;
      if (add(before, delta) < 0) fail('余额不足，还差 ' + format(-before - delta, goal.currencyCode));
      if (delta === 0) fail('余额没有变化');
      movement(goal, type === 'deposit' ? 'deposit' : type === 'withdraw' ? 'withdrawal' : 'adjustment', delta, reason || (type === 'deposit' ? '存入目标' : '取出分配（非消费）'));
      if (type === 'deposit' && !goal.claimed && balance(state, goal.id) >= goal.targetMinor) {
        state.stash = state.stash.map(s => s.id === goal.id ? { ...s, claimed: true } : s);
        award(100, '存钱罐达成 · ' + goal.name);
      }
    } else if (type === 'addCategory') {
      const name = categoryName(command.name);
      if (state.opexCategories.some(c => nameKey(c.name) === nameKey(name))) fail('已有同名类别');
      state.opexCategories = [...state.opexCategories, { id: 'cat-' + allocate(), name, color: COLORS[state.opexCategories.length % COLORS.length], builtin: false }];
    } else if (type === 'reorderCategories') {
      const ids = command.ids;
      if (!Array.isArray(ids) || ids.length !== state.opexCategories.length || new Set(ids).size !== ids.length || ids.some(id => !state.opexCategories.some(c => c.id === id))) fail('类别排序不完整，请重试');
      state.opexCategories = ids.map(id => state.opexCategories.find(c => c.id === id));
    } else if (type === 'setCurrency') {
      currency(command.currencyCode); state.defaultCurrencyCode = command.currencyCode;
    } else if (type === 'confirmLegacyCurrency') {
      state.moneyMigrationNotice = ''; state.opex = state.opex.map(o => ({ ...o, currencyInferred: false }));
    } else fail('未知的资金操作');
    state.moneyCommandIds = [...state.moneyCommandIds, command.commandId].slice(-256);
    return normalize(state);
  }
  function timeline(state, id) {
    const names = { opening: '期初', deposit: '存入', withdrawal: '取出', adjustment: '调整' };
    const goal = goalById(state, id, false);
    const rows = state.stashMovements.filter(m => m.stashId === id).map(m => ({ ...m, kindLabel: names[m.type], expenseId: null }));
    state.opex.filter(o => o.stashId === id).forEach(o => rows.push({ id: 'expense:' + o.id, stashId: id, type: 'expense', kindLabel: '消费 · ' + o.cat, deltaMinor: -o.amountMinor, currencyCode: goal.currencyCode, date: o.date, ts: o.ts, note: o.note, expenseId: o.id }));
    rows.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || Number(a.ts || 0) - Number(b.ts || 0) || String(a.id).localeCompare(String(b.id)));
    let remaining = 0;
    rows.forEach(r => { remaining = add(remaining, r.deltaMinor); r.balanceMinor = remaining; });
    return rows.reverse();
  }
  const TRANSIENT = new Set(('editing pending selectedDate pomoRunning pomoEndTs pomoRemaining pomoTotal noiseOn noiseFileName backupOpen backupMsg backupMsgColor copyLabel reorderOpen reorderKind roMode batchSel batchMsg momentumMsg tierCfgOpen dragId vw newTaskOpen newSetOpen newRewardOpen newMilestoneOpen newMilestoneSetOpen newFundOpen newCountdownOpen quadrantOpen imgEditId fundSettingsOpen notionMsg notionMsgColor notionBusy notionResultOpen notionResultOk notionResultMsg expEditing newOpexOpen newStashOpen updateNoteOpen prevVersion reflectionOpen reflectionTarget reflectionBlob reflectionPreview galleryOpen galleryImageUrls galleryEdit galleryEditBlob galleryEditPreview galleryEditRemoveImage gallerySearch aiHelpOpen aiHelpMsg aiHelpMsgColor newTaskAiMsg newTaskAiMsgColor taskFocusId taskFocusMin pomoLinkedTaskId pomoCfgOpen bingoCfgOpen bingoCelebration calendarTaskId calendarMonthOffset newDaylineOpen editingDaylineId daylineMsg backupFullCode taskCalendarOpen moneyError storageError moneyBusy categoryOpen categoryReturn categoryNameDraft expenseDraft expenseEditDraft expenseCommandId categoryCommandId stashDetailId stashTxnType stashTxnAmount stashTxnNote stashTxnCommandId moneyConflict updateBusy updateMessage').split(' '));
  function persistent(state) { return Object.fromEntries(Object.entries(state).filter(([k]) => !TRANSIENT.has(k))); }
  // Both backends serialize every writer across tabs. IDB's readwrite transaction is the fallback mutex.
  async function withWriteLock(work, globals) {
    const g = globals || globalThis;
    if (g.navigator && g.navigator.locks && g.navigator.locks.request) return g.navigator.locks.request('exp-bank-state-write', { mode: 'exclusive' }, work);
    if (!g.indexedDB) fail('此浏览器无法安全协调多页保存，请使用支持本地存储的浏览器');
    return new Promise((resolve, reject) => {
      const open = g.indexedDB.open('exp-bank-state-lock', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('mutex');
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error('另一页正在准备保存，请关闭旧页后重试'));
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction('mutex', 'readwrite'); let result;
        tx.objectStore('mutex').get('state').onsuccess = () => { try { result = work(); } catch (error) { tx.abort(); reject(error); } };
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || new Error('保存协调失败')); };
      };
    });
  }
  return { SCHEMA, CURRENCIES, BUILTINS, format, parseMinor, normalize, mutate, balance, timeline, persistent, withWriteLock, dateValid };
});
