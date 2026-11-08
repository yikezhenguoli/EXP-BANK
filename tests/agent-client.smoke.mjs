import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const A = require('../agent-client.js');
const map = new Map();
const storage = {
  getItem: key => map.get(key) ?? null,
  setItem: (key, value) => map.set(key, value),
  removeItem: key => map.delete(key)
};
let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

await test('Worker endpoint 自动补全路由并强制 HTTPS', async () => {
  assert.equal(A.normalizeEndpoint('https://example.workers.dev'), 'https://example.workers.dev/api/agent/plan');
  assert.throws(() => A.normalizeEndpoint('http://example.com'));
  assert.throws(() => A.normalizeEndpoint('not-a-url'));
});

await test('访问令牌保存在独立配置键，不进入主数据', async () => {
  A.saveConfig({ endpoint: 'https://example.workers.dev', token: 'agent-token-1234567890' }, storage);
  assert.deepEqual(A.loadConfig(storage), {
    endpoint: 'https://example.workers.dev/api/agent/plan',
    token: 'agent-token-1234567890'
  });
  assert.ok(map.has(A.STORAGE_KEY));
  A.saveConfig({ endpoint: 'https://new.workers.dev', token: '' }, storage);
  assert.equal(A.loadConfig(storage).token, 'agent-token-1234567890');
  A.clearConfig(storage);
  assert.deepEqual(A.loadConfig(storage), { endpoint: '', token: '' });
});

await test('在线规划发送最小请求并校验响应', async () => {
  let request;
  const result = await A.plan({
    endpoint: 'https://example.workers.dev',
    token: 'agent-token-1234567890',
    input: '每天阅读 5 EXP',
    setNames: ['学习'],
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ tasks: [{ name: '阅读' }], model: 'deepseek-flash' }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }
  });
  assert.equal(request.url, 'https://example.workers.dev/api/agent/plan');
  assert.equal(request.options.headers.Authorization, 'Bearer agent-token-1234567890');
  assert.deepEqual(JSON.parse(request.options.body), { input: '每天阅读 5 EXP', setNames: ['学习'] });
  assert.equal(result.tasks[0].name, '阅读');
});

await test('鉴权、限流与超长描述返回可理解错误', async () => {
  await assert.rejects(() => A.plan({
    endpoint: 'https://example.workers.dev', token: 'agent-token-1234567890', input: 'x',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Invalid access token.' }), { status: 401 })
  }), /访问令牌/);
  await assert.rejects(() => A.plan({
    endpoint: 'https://example.workers.dev', token: 'agent-token-1234567890', input: 'x',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'Too many requests.' }), { status: 429 })
  }), /过于频繁/);
  await assert.rejects(() => A.plan({
    endpoint: 'https://example.workers.dev', token: 'agent-token-1234567890', input: 'x'.repeat(12001),
    fetchImpl: async () => { throw new Error('should not fetch'); }
  }), /12000/);
});

console.log('Agent client checks passed: ' + count);
