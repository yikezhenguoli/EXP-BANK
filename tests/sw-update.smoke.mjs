import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const money = fs.readFileSync(new URL('../money.js', import.meta.url), 'utf8');
const scope = 'https://example.test/EXP-BANK/';
function worker(options = {}) {
  const listeners = {}, maps = new Map([['exp-bank-v1.9.2', new Map([['old', new Response('old')]])], ['other-app-cache', new Map([['other', new Response('other')]])]]);
  const key = r => typeof r === 'string' ? new URL(r, scope).href : r instanceof URL ? r.href : r.url;
  let claims = 0, skips = 0, fetched = 0;
  const caches = {
    keys: async () => [...maps.keys()], delete: async k => maps.delete(k),
    open: async name => { if (!maps.has(name)) maps.set(name, new Map()); const rows = maps.get(name); return {
      put: async (req, res) => { if (options.failPut) throw new Error('quota'); rows.set(key(req), res.clone()); },
      match: async (req, opts) => { const exact = rows.get(key(req)); if (exact) return exact.clone(); if (opts && opts.ignoreSearch) { const u = new URL(key(req)); return [...rows].find(([k]) => new URL(k).pathname === u.pathname)?.[1].clone(); } }
    }; }
  };
  const context = vm.createContext({ URL, Request, Response, Promise, Set, caches,
    self: { registration: { scope }, addEventListener: (name, fn) => listeners[name] = fn, skipWaiting: async () => { skips++; }, clients: { claim: async () => { claims++; } } },
    fetch: async req => {
      fetched++; if (options.offline || options.missing && new URL(req.url).pathname.endsWith(options.missing)) throw new Error('offline');
      const p = new URL(req.url).pathname;
      if (options.status404 && p.endsWith(options.status404)) return new Response('not found', { status: 404 });
      if (p.endsWith('index.html') || p.endsWith('/')) return new Response(options.oldHtml ? html.replace("APP_VERSION = 'v1.12.0'", "APP_VERSION = 'v1.9.2'") : html, { headers: { 'Content-Type': 'text/html' } });
      if (['money.js','progression.js','life-architecture.js','task-assistant.js'].some(name=>p.endsWith(name))) {
        const name = p.split('/').at(-1), source = fs.readFileSync(new URL('../'+name, import.meta.url), 'utf8');
        return new Response(source, { headers: { 'Content-Type': options.htmlForJs ? 'text/html' : 'text/javascript' } });
      }
      return new Response('fixture', { headers: { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'image/png' } });
    }
  });
  vm.runInContext(source, context);
  const dispatch = (name, data = {}) => { let task; listeners[name]({ ...data, waitUntil: p => task = p, respondWith: p => task = p }); return task; };
  return { dispatch, caches, maps, options, claims: () => claims, skips: () => skips, fetched: () => fetched };
}
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await test('完整预缓存后才可激活，仅删除本应用旧缓存', async () => {
  const w = worker(); await w.dispatch('install'); assert.equal(w.skips(), 0); assert.equal(w.maps.get('exp-bank-v1.12.0').size, 14);
  await w.dispatch('activate'); assert.equal(w.maps.has('exp-bank-v1.9.2'), false); assert.equal(w.maps.has('other-app-cache'), true); assert.equal(w.claims(), 1);
});
await test('缺文件、404、HTML误作JS、版本不一致、写入失败均拒绝安装，旧缓存保留', async () => {
  for (const opts of [{ missing: 'money.js' }, { missing:'progression.js' }, { missing:'task-assistant.js' }, { missing:'life-architecture.js' }, { status404: 'support.js' }, { htmlForJs: true }, { oldHtml: true }, { failPut: true }]) {
    const w = worker(opts); await assert.rejects(w.dispatch('install')); assert.equal(w.maps.has('exp-bank-v1.9.2'), true); assert.equal(w.skips(), 0); assert.equal(w.claims(), 0);
  }
});
await test('导航和脚本离线从同版本资源读取，不发起混版网络请求', async () => {
  const w = worker(); await w.dispatch('install'); await w.dispatch('activate'); w.options.offline = true; const before = w.fetched();
  const nav = await w.dispatch('fetch', { request: { method: 'GET', url: scope, mode: 'navigate' } }); assert.match(await nav.text(), /APP_VERSION = 'v1.12.0'/);
  const js = await w.dispatch('fetch', { request: new Request(scope + 'money.js') }); assert.match(await js.text(), /integer money/); assert.equal(w.fetched(), before);
});
await test('缺JS离线返回错误，联网404仍返回404，不能回退HTML', async () => {
  const w = worker(); await w.dispatch('install'); w.maps.get('exp-bank-v1.12.0').delete(scope + 'money.js'); w.options.offline = true;
  const error = await w.dispatch('fetch', { request: new Request(scope + 'money.js') }); assert.equal(error.type, 'error'); assert.equal(await error.text(), '');
  w.options.offline = false; w.options.status404 = 'money.js'; const res = await w.dispatch('fetch', { request: new Request(scope + 'money.js') }); assert.equal(res.status, 404);
});
await test('等待用户明确更新再切换；外部及非GET请求保持原请求行为', async () => {
  const w = worker(); await w.dispatch('install'); assert.equal(w.skips(), 0); await w.dispatch('message', { data: { type: 'SKIP_WAITING' } }); assert.equal(w.skips(), 1);
  assert.equal(w.dispatch('fetch', { request: new Request('https://fonts.example.test/font.woff') }), undefined);
  assert.equal(w.dispatch('fetch', { request: new Request(scope, { method: 'POST' }) }), undefined);
});
console.log('Service worker checks passed: ' + count);
