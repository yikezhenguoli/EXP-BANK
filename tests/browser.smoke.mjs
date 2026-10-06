import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright') : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const qa = path.resolve(process.env.EXP_BANK_QA_DIR || path.join(root, '..', 'browser_qa'));
fs.mkdirSync(qa, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const release = { version: null, missing: null };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (release.missing && pathname.endsWith(release.missing)) { res.writeHead(404); res.end('release incomplete'); return; }
  const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  if (release.version && ['.html', '.js'].includes(path.extname(file))) res.end(fs.readFileSync(file, 'utf8').replaceAll('v1.11.0', release.version));
  else res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.EXP_BANK_CHROME || undefined, headless: true, args: ['--no-sandbox'] });
const errors = [], results = [];
const fixture = { appVersion: 'v1.9.2', tasks: [], rewards: [], ledger: [], exp: 10, nextId: 500, welcomed: true, lastInterest: Date.now(), tab: 'opex', stash: [{ id: 41, name: '旅游', target: 1000, saved: 1000, claimed: true }], opex: [] };
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem('exp-bank-v1')));
async function assertNoOverflow(page, name) {
  const widths = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(widths.doc <= widths.viewport + 1, name + ': ' + JSON.stringify(widths));
}
async function contextAt(width, seed = fixture, fallback = false) {
  const context = await browser.newContext({ viewport: { width, height: 840 }, deviceScaleFactor: 1 });
  await context.addInitScript(seed => { if (!localStorage.getItem('exp-bank-v1')) localStorage.setItem('exp-bank-v1', JSON.stringify(seed)); }, seed);
  if (fallback) await context.addInitScript(() => Object.defineProperty(navigator, 'locks', { value: undefined }));
  // External fonts are cosmetic; all code must work without an external request.
  await context.route('https://**', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.goto(origin + '/index.html');
  await page.locator('#stash-in-41').waitFor({ state: 'attached' });
  if (await page.getByText('知道了', { exact: true }).count()) await page.getByText('知道了', { exact: true }).click();
  return { context, page };
}
try {
  for (const width of [360, 390]) {
    const { context, page } = await contextAt(width);
    await assertNoOverflow(page, 'OPEX ' + width);
    await page.locator('#stash-out-41').fill('200'); await page.getByRole('button', { name: '支出', exact: true }).click();
    await page.locator('#no-note').fill('旅行车票'); await page.locator('#no-cat').selectOption('cat-transport');
    assert.match(await page.locator('.money-panel').last().textContent(), /1,000.00 → ¥800.00/);
    await assertNoOverflow(page, 'expense modal ' + width);
    await page.getByRole('button', { name: '+ 自定义类别', exact: true }).click();
    await page.locator('#category-name').fill('学习'); await page.getByRole('button', { name: '+ 新增自定义类别', exact: true }).click();
    await page.locator('#category-name').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#no-amount').inputValue(), '200'); assert.equal(await page.locator('#no-note').inputValue(), '旅行车票');
    const categoryId = await page.locator('#no-cat').inputValue(); assert.ok(categoryId.startsWith('cat-'));
    await page.screenshot({ path: path.join(qa, 'expense-' + width + '.png') });
    await page.getByRole('button', { name: '记下', exact: true }).click(); await page.locator('#no-amount').waitFor({ state: 'detached' });
    let data = await stored(page); assert.equal(data.stash[0].saved, 800); assert.equal(data.opex.length, 1); assert.equal(data.opex[0].cat, '学习');
    await page.getByRole('button', { name: '类别排序', exact: true }).click();
    for (let i = 0; i < 6; i++) { await page.getByRole('button', { name: '上移学习', exact: true }).click(); await page.waitForFunction(([id, index]) => JSON.parse(localStorage.getItem('exp-bank-v1')).opexCategories[index].id === id, [categoryId, 5 - i]); }
    assert.equal((await stored(page)).opexCategories[0].id, categoryId);
    await page.locator('.money-panel').evaluate(e => e.scrollTop = 0); await page.screenshot({ path: path.join(qa, 'categories-' + width + '.png') });
    await page.getByRole('button', { name: '完成', exact: true }).click();
    await page.getByRole('button', { name: '流水 / 取出 / 调整', exact: true }).click(); await page.getByRole('button', { name: '编辑消费', exact: true }).click();
    await page.getByText('编辑', { exact: true }).click(); await page.locator('#ed-opex-amount').fill('250');
    await assertNoOverflow(page, 'edit modal ' + width); await page.getByText('保存', { exact: true }).click(); await page.locator('#ed-opex-amount').waitFor({ state: 'detached' });
    assert.equal((await stored(page)).stash[0].saved, 750);
    await page.getByRole('button', { name: '流水 / 取出 / 调整', exact: true }).click();
    await page.screenshot({ path: path.join(qa, 'ledger-' + width + '.png') });
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    console.log('UI passed at ' + width + ', waiting for SW');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await context.setOffline(true); await page.reload(); await page.locator('#stash-in-41').waitFor();
    assert.equal((await stored(page)).opexCategories[0].id, categoryId); assert.equal((await stored(page)).stash[0].saved, 750);
    await page.locator('#stash-in-41').fill('0.10'); await page.getByRole('button', { name: '存入', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('exp-bank-v1')).stash[0].saved === 750.1);
    await page.screenshot({ path: path.join(qa, 'opex-offline-' + width + '.png'), fullPage: true });
    results.push('移动端 ' + width + '：目标支出、类别创建及全部排序、编辑联动、刷新保留、离线记账');
    await context.close();
  }
  for (const fallback of [false, true]) {
    const { context, page: a } = await contextAt(390, fixture, fallback);
    const b = await context.newPage(); b.on('pageerror', e => errors.push(e.message)); await b.goto(origin + '/index.html'); await b.locator('#stash-out-41').waitFor();
    for (const page of [a, b]) { await page.locator('#stash-out-41').fill('800'); await page.getByRole('button', { name: '支出', exact: true }).click(); }
    await Promise.all([a.getByRole('button', { name: '记下', exact: true }).click(), b.getByRole('button', { name: '记下', exact: true }).click()]);
    await a.waitForFunction(() => JSON.parse(localStorage.getItem('exp-bank-v1')).opex.length === 1);
    assert.equal((await stored(a)).stash[0].saved, 200);
    await context.close(); results.push('真实两标签同时付款：' + (fallback ? 'IndexedDB 互斥回退' : 'Web Locks') + ' 防止丢写及透支');
  }
  {
    const { context, page } = await contextAt(390);
    const legacy = await context.newPage();
    await legacy.addInitScript(() => {
      const add = navigator.serviceWorker.addEventListener.bind(navigator.serviceWorker);
      navigator.serviceWorker.addEventListener = (type, ...rest) => { if (type !== 'message') add(type, ...rest); };
    });
    await legacy.goto(origin + '/index.html'); await legacy.locator('#stash-in-41').waitFor();
    await page.locator('#stash-out-41').fill('200'); await page.getByRole('button', { name: '支出', exact: true }).click(); await page.getByRole('button', { name: '记下', exact: true }).click();
    await page.locator('.money-panel .money-error').getByText(/检测到旧版窗口/).waitFor(); assert.equal((await stored(page)).opex.length, 0);
    await legacy.close(); await page.getByRole('button', { name: '记下', exact: true }).click(); await page.locator('#no-amount').waitFor({ state: 'detached' }); assert.equal((await stored(page)).stash[0].saved, 800);
    results.push('旧版窗口无法响应保存协议时阻止新写入，关闭后可继续提交原草稿'); await context.close();
  }
  {
    const photoSeed = { ...fixture, galleryEntries: [{ id: 77, targetName: '备份照片', kind: 'task', text: 'fixture', hasImage: true, ts: 1 }] };
    const { context, page } = await contextAt(390, photoSeed);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const before = await stored(page);
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => { const q = indexedDB.open('exp-bank-gallery-v1', 1); q.onupgradeneeded = () => q.result.createObjectStore('images'); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
      await new Promise((resolve, reject) => { const t = db.transaction('images', 'readwrite'); t.objectStore('images').put(new Blob(['photo-fixture'], { type: 'image/png' }), 77); t.oncomplete = resolve; t.onerror = () => reject(t.error); }); db.close();
      const other = await caches.open('other-app-cache'); await other.put('/other', new Response('keep'));
    });
    release.version = 'v1.11.1'; release.missing = 'money.js';
    await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await page.waitForFunction(async () => !(await navigator.serviceWorker.getRegistration()).installing);
    assert.ok((await page.evaluate(() => caches.keys())).includes('exp-bank-v1.11.0')); assert.deepEqual(await stored(page), before);
    await context.setOffline(true); await page.reload(); await page.locator('#stash-in-41').waitFor(); assert.equal((await stored(page)).appVersion, 'v1.11.0');
    await context.setOffline(false); release.missing = null;
    await page.getByText('↻ 更新', { exact: true }).click(); await page.waitForFunction(() => document.body.innerText.includes('v1.11.1'));
    await page.locator('#stash-in-41').waitFor({ state: 'attached' });
    const after = await stored(page); assert.equal(after.stash[0].saved, 1000); assert.equal(after.exp, 10); assert.equal(after.galleryEntries[0].id, 77);
    assert.ok((await page.evaluate(() => caches.keys())).includes('other-app-cache'));
    assert.equal(await page.evaluate(async () => { const db = await new Promise(resolve => { const q = indexedDB.open('exp-bank-gallery-v1'); q.onsuccess = () => resolve(q.result); }); const blob = await new Promise(resolve => { const q = db.transaction('images').objectStore('images').get(77); q.onsuccess = () => resolve(q.result); }); db.close(); return blob.text(); }), 'photo-fixture');
    if (await page.getByText('知道了', { exact: true }).count()) await page.getByText('知道了', { exact: true }).click();
    await page.getByText('⤓ 备份', { exact: true }).click(); await page.getByText('复制完整码(含集锦图)', { exact: true }).click();
    await page.waitForFunction(() => { const e = document.getElementById('bk-text'); return e && e.value.length > 100 && JSON.parse(decodeURIComponent(escape(atob(e.value)))).galleryImages?.['77']; });
    const code = await page.locator('#bk-text').inputValue();
    await page.locator('#bk-import').fill(code); await page.getByText('导入并覆盖', { exact: true }).click();
    await page.getByText('✓ 导入成功，集锦照片也已恢复', { exact: true }).waitFor();
    assert.equal(await page.evaluate(async () => { const db = await new Promise(resolve => { const q = indexedDB.open('exp-bank-gallery-v1'); q.onsuccess = () => resolve(q.result); }); const keys = await new Promise(resolve => { const q = db.transaction('images').objectStore('images').getAllKeys(); q.onsuccess = () => resolve(q.result); }); db.close(); return typeof keys.find(k => k === 77); }), 'number');
    results.push('真实更新中断保留旧离线版；完整资源更新保留账本、照片与其他应用缓存；完整码恢复数字照片ID');
    await context.close(); release.version = null;
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(qa, 'browser-results.json'), JSON.stringify({ results, pageErrors: errors }, null, 2));
  console.log(JSON.stringify({ passed: results.length, results, pageErrors: errors }, null, 2));
} catch (e) {
  console.error('Browser errors:', errors); for (const c of browser.contexts()) for (const p of c.pages()) { await p.screenshot({ path: path.join(qa, 'failure.png'), fullPage: true }).catch(() => {}); console.error(await p.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).map(r => ({ scope: r.scope, active: r.active?.state, waiting: r.waiting?.state, installing: r.installing?.state })), caches: await caches.keys() }))); console.error((await p.locator('body').innerText()).slice(-1800)); }
  throw e;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
