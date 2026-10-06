/* EXP BANK service worker — coherent versioned assets; user data is never cleared. */
const VERSION = 'v1.11.0';
const CACHE = 'exp-bank-' + VERSION;
const ASSETS = [
  './', './index.html', './support.js', './money.js', './progression.js', './task-assistant.js', './image-slot.js',
  './vendor/react.production.min.js', './vendor/react-dom.production.min.js',
  './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];
const scope = self.registration.scope;
const assetPaths = new Set(ASSETS.map(path => new URL(path, scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Fetch and validate the complete release before writing any replacement resource.
    const fetched = await Promise.all(ASSETS.map(async path => {
      const request = new Request(new URL(path, scope), { cache: 'reload' });
      const received = await fetch(request);
      if (!received.ok) throw new Error('Resource unavailable: ' + path);
      // Drain each download immediately. Waiting for all headers before reading bodies
      // can exhaust HTTP/1 connection slots and leave installation pending forever.
      const response = new Response(await received.arrayBuffer(), { status: received.status, statusText: received.statusText, headers: received.headers });
      const type = response.headers.get('content-type') || '';
      if (path.endsWith('.js') && /text\/html/i.test(type)) throw new Error('HTML returned for script: ' + path);
      if (path === './' || path === './index.html') {
        const html = await response.clone().text();
        if (!html.includes("const APP_VERSION = '" + VERSION + "'")) throw new Error('Page and worker versions differ');
      }
      if (['./money.js','./progression.js','./task-assistant.js'].includes(path) && !(await response.clone().text()).includes('EXP BANK ' + VERSION)) throw new Error('Money module version differs');
      return [request, response];
    }));
    const cache = await caches.open(CACHE);
    for (const [request, response] of fetched) await cache.put(request, response);
    // Waiting workers activate only after the user requests an update or old tabs close.
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data && event.data.type === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
  if (event.data && event.data.type === 'CHECK_MONEY_CLIENTS' && event.ports[0]) event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const peers = clients.filter(client => client.id !== (event.source && event.source.id) && client.url.startsWith(scope));
    const protocols = await Promise.all(peers.map(client => new Promise(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(0); }, 600);
      channel.port1.onmessage = e => { clearTimeout(timer); channel.port1.close(); resolve(e.data && e.data.protocol || 0); };
      try { client.postMessage({ type: 'EXP_BANK_CLIENT_PROTOCOL' }, [channel.port2]); }
      catch (_) { clearTimeout(timer); channel.port1.close(); resolve(0); }
    })));
    event.ports[0].postMessage({ protocol: 2, legacyCount: protocols.filter(p => p !== 2).length });
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const path of ASSETS) if (!(await cache.match(new URL(path, scope)))) throw new Error('Incomplete release cache');
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('exp-bank-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url), base = new URL(scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  if (request.mode === 'navigate' || assetPaths.has(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = request.mode === 'navigate' ? await cache.match(new URL('./index.html', scope)) : await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      // Missing JS returns its own network response or an error, never the HTML shell.
      try { return await fetch(request); } catch (_) { return Response.error(); }
    })());
  }
});
