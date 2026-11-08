import assert from 'node:assert/strict';
import Worker from '../worker/index.mjs';

const env = {
  ALLOWED_ORIGINS: 'https://app.example',
  AGENT_ACCESS_TOKEN: 'test-agent-token-123456',
  DEEPSEEK_API_KEY: 'test-deepseek-key',
  DEEPSEEK_MODEL: 'deepseek-flash'
};
function request(method, path, body, headers = {}) {
  return new Request('https://worker.example' + path, {
    method,
    headers: { Origin: 'https://app.example', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}
let calls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  calls++;
  assert.equal(url, 'https://api.deepseek.com/chat/completions');
  const payload = JSON.parse(options.body);
  assert.equal(payload.response_format.type, 'json_object');
  assert.equal(payload.thinking.type, 'disabled');
  return new Response(JSON.stringify({
    model: 'deepseek-flash',
    choices: [{
      finish_reason: 'stop',
      message: { content: JSON.stringify({
        setName: '学习',
        tasks: [{
          name: '阅读专业英语',
          exp: 5,
          cycle: 'daily',
          interval: 1,
          times: 1,
          priority: 'p2',
          setName: '学习',
          lifeType: 'GROWTH',
          review: [],
          warnings: []
        }],
        clarifications: []
      }) }
    }],
    usage: { total_tokens: 123 }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

try {
  const preflight = await Worker.fetch(request('OPTIONS', '/api/agent/plan', null), env);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://app.example');

  const denied = await Worker.fetch(request('POST', '/api/agent/plan', { input: '阅读' }, {
    Authorization: 'Bearer wrong-token'
  }), env);
  assert.equal(denied.status, 401);

  const invalidOrigin = await Worker.fetch(new Request('https://worker.example/api/agent/plan', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', Authorization: 'Bearer test-agent-token-123456', 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '阅读' })
  }), env);
  assert.equal(invalidOrigin.status, 403);

  const success = await Worker.fetch(request('POST', '/api/agent/plan', {
    input: '准备六级，每天阅读专业英语 5 EXP',
    setNames: ['学习']
  }, { Authorization: 'Bearer test-agent-token-123456' }), env);
  assert.equal(success.status, 200);
  const result = await success.json();
  assert.equal(result.tasks[0].name, '阅读专业英语');
  assert.equal(result.tasks[0].exp, 5);
  assert.equal(result.model, 'deepseek-flash');
  assert.equal(result.usage.totalTokens, 123);
  assert.equal(calls, 1);

  const tooLong = await Worker.fetch(request('POST', '/api/agent/plan', {
    input: 'x'.repeat(12001)
  }, { Authorization: 'Bearer test-agent-token-123456' }), env);
  assert.equal(tooLong.status, 400);
  assert.equal(calls, 1);

  const missingSecrets = await Worker.fetch(request('POST', '/api/agent/plan', { input: '阅读' }, {
    Authorization: 'Bearer test-agent-token-123456'
  }), { ALLOWED_ORIGINS: 'https://app.example' });
  assert.equal(missingSecrets.status, 503);

  console.log('Agent Worker checks passed: 6');
} finally {
  globalThis.fetch = originalFetch;
}
