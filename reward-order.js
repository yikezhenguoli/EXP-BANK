/* EXP BANK v1.15.0 — stable reward and collection ordering helpers. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ExpRewardOrder = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const key = value => String(value == null ? '' : value);
  const sameCategory = (a, b) => key(a == null ? null : a) === key(b == null ? null : b);

  function move(list, fromId, targetId, after) {
    const source = Array.isArray(list) ? list : [];
    const from = source.findIndex(item => key(item && item.id) === key(fromId));
    if (from < 0 || key(fromId) === key(targetId)) return source.slice();
    const next = source.slice();
    const item = next.splice(from, 1)[0];
    const target = next.findIndex(entry => key(entry && entry.id) === key(targetId));
    if (target < 0) return source.slice();
    next.splice(target + (after ? 1 : 0), 0, item);
    return next;
  }

  function moveReward(list, fromId, targetId, after) {
    const source = Array.isArray(list) ? list : [];
    const from = source.findIndex(item => key(item && item.id) === key(fromId));
    if (from < 0 || key(fromId) === key(targetId)) return source.slice();
    const next = source.slice();
    const item = { ...next.splice(from, 1)[0] };
    const target = next.find(entry => key(entry && entry.id) === key(targetId));
    if (!target) return source.slice();
    item.categoryId = target.categoryId == null ? null : target.categoryId;
    const targetIndex = next.findIndex(entry => key(entry && entry.id) === key(targetId));
    next.splice(targetIndex + (after ? 1 : 0), 0, item);
    return next;
  }

  function moveToCategory(list, fromId, categoryId) {
    const source = Array.isArray(list) ? list : [];
    const from = source.findIndex(item => key(item && item.id) === key(fromId));
    if (from < 0) return source.slice();
    const next = source.slice();
    const item = { ...next.splice(from, 1)[0] };
    item.categoryId = categoryId == null ? null : Number(categoryId);
    let last = -1;
    for (let i = 0; i < next.length; i++) {
      if (sameCategory(next[i].categoryId, item.categoryId)) last = i;
    }
    next.splice(last < 0 ? next.length : last + 1, 0, item);
    return next;
  }

  function sameOrder(a, b, compareCategory) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (key(a[i] && a[i].id) !== key(b[i] && b[i].id)) return false;
      if (compareCategory && !sameCategory(a[i] && a[i].categoryId, b[i] && b[i].categoryId)) return false;
    }
    return true;
  }

  return { move, moveReward, moveToCategory, sameOrder };
});
