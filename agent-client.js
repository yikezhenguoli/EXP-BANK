/* EXP BANK v1.15.5 — browser client for the private AI planning Worker.
 * DeepSeek credentials never belong in this file or the PWA's main data record.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ExpAgentClient = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'exp-bank-agent-config-v1';
  const MAX_INPUT = 12000;
  const LEGACY_WORKER_HOST = 'exp-bank-ai.yikezhenguoli.workers.dev';
  const DEDICATED_WORKER_HOST = 'exp-bank-agent.yikezhenguoli.workers.dev';

  function storageOf(storage) {
    if (storage) return storage;
    if (typeof localStorage !== 'undefined') return localStorage;
    throw new Error('当前环境无法读取本机 Agent 配置。');
  }

  function normalizeEndpoint(value) {
    let url;
    try { url = new URL(String(value || '').trim()); }
    catch (_) { throw new Error('请填写有效的 Worker API 地址。'); }
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
      throw new Error('Worker API 必须使用 HTTPS（本机 localhost 调试除外）。');
    }
    let path = url.pathname.replace(/\/+$/, '');
    if (!path.endsWith('/api/agent/plan')) path += '/api/agent/plan';
    url.pathname = path;
    url.hash = '';
    return url.toString();
  }

  function migrateLegacyEndpoint(endpoint) {
    if (!endpoint) return endpoint;
    try {
      const url = new URL(endpoint);
      if (url.hostname !== LEGACY_WORKER_HOST) return endpoint;
      url.hostname = DEDICATED_WORKER_HOST;
      return url.toString();
    } catch (_) { return endpoint; }
  }

  function loadConfig(storage) {
    try {
      const target = storageOf(storage);
      const raw = target.getItem(STORAGE_KEY);
      const value = raw ? JSON.parse(raw) : {};
      const endpoint = typeof value?.endpoint === 'string' ? value.endpoint : '';
      const migratedEndpoint = migrateLegacyEndpoint(endpoint);
      const token = typeof value?.token === 'string' ? value.token : '';
      if (migratedEndpoint !== endpoint) {
        // Migrate only the known legacy hostname. Preserve the existing token and
        // every other local record; no account data or task data is touched.
        target.setItem(STORAGE_KEY, JSON.stringify({ endpoint: migratedEndpoint, token }));
      }
      return { endpoint: migratedEndpoint, token };
    } catch (_) { return { endpoint: '', token: '' }; }
  }

  function saveConfig(config, storage) {
    const old = loadConfig(storage);
    const endpoint = normalizeEndpoint(config && config.endpoint);
    const token = String((config && config.token) || old.token || '').trim();
    if (token.length < 16) throw new Error('访问令牌至少需要 16 个字符；请使用随机长令牌。');
    const value = { endpoint, token };
    storageOf(storage).setItem(STORAGE_KEY, JSON.stringify(value));
    return { endpoint, configured: true };
  }

  function clearConfig(storage) {
    storageOf(storage).removeItem(STORAGE_KEY);
    return true;
  }

  function statusError(status, message) {
    if (status === 401) return 'Worker 访问令牌不正确。';
    if (status === 403) return '当前网页来源不在 Worker 白名单中，请检查 ALLOWED_ORIGINS。';
    if (status === 429) return '请求过于频繁，请稍后再试。';
    if (status === 503) return 'Agent 服务尚未配置 DeepSeek API Key 或访问令牌。';
    return message || ('Agent 服务请求失败（HTTP ' + status + '）。');
  }

  async function plan(options) {
    const opts = options || {};
    const config = opts.config || { endpoint: opts.endpoint, token: opts.token };
    const endpoint = normalizeEndpoint(config.endpoint);
    const token = String(config.token || '').trim();
    const input = String(opts.input || '').trim();
    if (token.length < 16) throw new Error('尚未配置有效的 Agent 访问令牌。');
    if (!input) throw new Error('先描述你希望规划的目标。');
    if (input.length > MAX_INPUT) throw new Error('描述过长，请拆成几批（每次不超过 12000 字）。');
    const fetcher = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!fetcher) throw new Error('当前浏览器不支持在线请求。');

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), Math.max(1000, Number(opts.timeoutMs) || 35000)) : null;
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          input,
          setNames: Array.isArray(opts.setNames) ? opts.setNames.slice(0, 100) : []
        }),
        ...(controller ? { signal: controller.signal } : {})
      });
      let payload = null;
      try { payload = await response.json(); } catch (_) {}
      if (!response.ok) throw new Error(statusError(response.status, payload && payload.error));
      if (!payload || !Array.isArray(payload.tasks) || !payload.tasks.length || payload.tasks.length > 100) {
        throw new Error('Agent 返回的任务草稿格式不正确；没有创建任何任务。');
      }
      return payload;
    } catch (error) {
      if (error && error.name === 'AbortError') throw new Error('Agent 请求超时；输入已保留，可以使用本地助手。');
      if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
        throw new Error('无法连接 AI Worker。请检查网络、Worker 地址和跨域设置；任务描述已保留。');
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return { STORAGE_KEY, MAX_INPUT, normalizeEndpoint, loadConfig, saveConfig, clearConfig, plan, migrateLegacyEndpoint };
});
