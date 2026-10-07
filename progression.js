/* EXP BANK v1.12.0 — reward rules and durable Maintenance EXP settlement. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCHEMA = 1, MAINTENANCE_CAP = 15, FACTORS = [1, 1.2, 1.5];
  const fail = message => { throw new Error(message); };
  const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  function minor(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1000000 || round(n) !== n) fail('EXP 或金额须为非负数，最多两位小数。');
    return Math.round(n * 100);
  }
  function rewardRule(input, old = null) {
    const riskBand = input.riskBand ?? (old && old.riskBand) ?? 'green';
    if (!['green','amber','red'].includes(riskBand)) fail('奖励分级无效。');
    const frictionFactor = Number(input.frictionFactor ?? (old && old.frictionFactor) ?? 1);
    if (!FACTORS.includes(frictionFactor)) fail('顾虑系数只能选择 1.0 / 1.2 / 1.5。');
    const baseMoney = input.baseMoney === '' || input.baseMoney == null ? null : Number(input.baseMoney);
    if (baseMoney != null && minor(baseMoney) <= 0) fail('参考金额须大于零。');
    const baseCost = Number(input.baseCost ?? input.cost ?? (old && (old.baseCost ?? old.cost)) ?? 100);
    if (minor(baseCost) <= 0) fail('基础兑换价格须大于零。');
    const cost = round((baseMoney == null ? baseCost : baseMoney * 10) * frictionFactor);
    if (!Number.isSafeInteger(Math.round(cost * 100)) || cost < 0.01 || cost > 1000000) fail('兑换价格超出有效范围。');
    const cooldownDays = Number(input.cooldownDays ?? (riskBand === 'amber' ? 7 : 0));
    if (!Number.isInteger(cooldownDays) || cooldownDays < 0 || cooldownDays > 3650) fail('冷却天数须为 0–3650 的整数。');
    return { riskBand, frictionFactor, baseMoney, baseCost, cost, cooldownDays,
      cooldownUntil:Number(old && old.cooldownUntil || input.cooldownUntil || 0),
      archivedAt:riskBand === 'red' ? (old && old.archivedAt || Date.now()) : null };
  }
  function normalize(state) {
    if (state.progressionSchemaVersion != null && state.progressionSchemaVersion !== SCHEMA) fail('无法识别未来的积分规则版本；原始数据已保留。');
    const rewards = (state.rewards || []).map(r => {
      // Legacy EXP price stays byte-for-byte numeric until the user edits its rule.
      const legacy = r.riskBand == null;
      if (legacy) return { ...r, riskBand:'green', frictionFactor:1, baseMoney:null, baseCost:Number(r.cost), cooldownDays:0, cooldownUntil:0, archivedAt:null };
      return { ...r, ...rewardRule(r, r), redeems:Array.isArray(r.redeems) ? r.redeems : [] };
    });
    const days = {};
    for (const [date, day] of Object.entries(state.maintenanceDays || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || !Array.isArray(day.entries)) fail('维护积分日结记录无效。');
      const seen = new Set();
      const entries = day.entries.map(e => {
        if (!e.commandId || seen.has(e.commandId)) fail('维护积分交易编号重复或缺失。');
        seen.add(e.commandId);
        if (!Number.isSafeInteger(e.awardedMinor) || e.awardedMinor < 0 || e.awardedMinor > MAINTENANCE_CAP * 100) fail('维护积分实际发放额无效。');
        return { ...e, reversed:!!e.reversed };
      });
      const awardedMinor = entries.filter(e => !e.reversed).reduce((sum, e) => sum + e.awardedMinor, 0);
      if (awardedMinor > MAINTENANCE_CAP * 100) fail('维护积分日结超出上限，请核对备份。');
      days[date] = { awardedMinor, entries };
    }
    const preferences = state.taskAssistantPrefs && typeof state.taskAssistantPrefs === 'object' && !Array.isArray(state.taskAssistantPrefs) ? state.taskAssistantPrefs : {};
    return { ...state, progressionSchemaVersion:SCHEMA, maintenanceDays:days,
      taskAssistantPrefs:Object.fromEntries(Object.entries(preferences).slice(-200)),
      tasks:(state.tasks || []).map(t => ({ ...t, taskKind:t.taskKind === 'maintenance' ? 'maintenance' : 'standard' })), rewards };
  }
  function maintenanceUsed(state, date) { return (state.maintenanceDays && state.maintenanceDays[date] && state.maintenanceDays[date].awardedMinor || 0) / 100; }
  function award(state, task, commandId, date, ts) {
    const requestedMinor = minor(task.exp);
    if (task.taskKind !== 'maintenance') return { state, actual:requestedMinor / 100, remaining:MAINTENANCE_CAP - maintenanceUsed(state, date) };
    const days = { ...(state.maintenanceDays || {}) }, day = days[date] || { awardedMinor:0, entries:[] };
    if (day.entries.some(e => e.commandId === commandId)) fail('这笔完成记录已结算，请勿重复提交。');
    const awardedMinor = Math.min(requestedMinor, Math.max(0, MAINTENANCE_CAP * 100 - day.awardedMinor));
    const record = { commandId, taskId:task.id, requestedMinor, awardedMinor, ts, reversed:false };
    days[date] = { awardedMinor:day.awardedMinor + awardedMinor, entries:[...day.entries, record] };
    return { state:{ ...state, maintenanceDays:days }, actual:awardedMinor / 100, remaining:(MAINTENANCE_CAP * 100 - days[date].awardedMinor) / 100 };
  }
  function reverse(state, date, commandId) {
    const day = state.maintenanceDays && state.maintenanceDays[date];
    const record = day && day.entries.find(e => e.commandId === commandId);
    if (!record || record.reversed) fail('维护积分交易不存在或已撤销。');
    const entries = day.entries.map(e => e.commandId === commandId ? { ...e, reversed:true } : e);
    return { ...state, maintenanceDays:{ ...state.maintenanceDays, [date]:{ awardedMinor:day.awardedMinor - record.awardedMinor, entries } } };
  }
  function blocked(r, now = Date.now()) {
    if (r.riskBand === 'red' || r.archivedAt) return '已下架';
    if (Number(r.cooldownUntil || 0) > now) return '冷却至 ' + new Date(r.cooldownUntil).toLocaleString();
    return '';
  }
  function redeemed(r, ts) {
    if (blocked(r, ts)) fail(blocked(r, ts));
    return { ...r, redeems:[...(r.redeems || []), ts], cooldownUntil:ts + Number(r.cooldownDays || 0) * 86400000 };
  }
  function inWarMode(task) { return task.lifeType === 'CORE' || (task.lifeType === 'GROWTH' && task.warImportant === true); }
  return { inWarMode, normalize, rewardRule, award, reverse, maintenanceUsed, blocked, redeemed, MAINTENANCE_CAP, FACTORS, round };
});
