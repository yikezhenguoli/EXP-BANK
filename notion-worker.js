export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405, cors);
    let body;
    try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'JSON parse failed' }, 400, cors); }
    const { action, token, rows } = body;
    let databaseId = (body.databaseId || '').trim();
    if (!token) return json({ ok: false, error: 'missing token' }, 400, cors);
    const headers = { 'Authorization': 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' };
    if (databaseId.includes('http') || databaseId.includes('notion.so')) {
      const m = databaseId.replace(/-/g, '').match(/[0-9a-f]{32}/i);
      if (m) databaseId = m[0];
    }
    if (!databaseId) {
      const s = await fetch('https://api.notion.com/v1/search', { method: 'POST', headers, body: JSON.stringify({ filter: { property: 'object', value: 'database' }, page_size: 1 }) });
      const sd = await s.json();
      if (!s.ok) return json({ ok: false, error: 'auth failed: ' + (sd.message || s.status) }, 200, cors);
      if (!sd.results || !sd.results.length) return json({ ok: false, error: 'no database shared to integration' }, 200, cors);
      databaseId = sd.results[0].id;
    }
    if (action === 'test') {
      const r = await fetch('https://api.notion.com/v1/databases/' + databaseId, { headers });
      const d = await r.json();
      if (!r.ok) return json({ ok: false, error: (d.message || 'db read failed, check sharing') }, 200, cors);
      return json({ ok: true, message: 'connected', dbId: databaseId }, 200, cors);
    }
    const results = [];
    for (const row of (rows || [])) {
      const props = {
        '名称': { title: [{ text: { content: String(row.name || '') } }] },
        '代码': { rich_text: [{ text: { content: String(row.code || '') } }] },
        '收盘价': { number: row.close == null ? null : Number(row.close) },
        '基准价': { number: row.base == null ? null : Number(row.base) },
        '成本价': { number: row.cost == null ? null : Number(row.cost) },
        '信号': { rich_text: [{ text: { content: String(row.signal || '') } }] },
        '日期': { rich_text: [{ text: { content: String(row.date || '') } }] },
      };
      const r = await fetch('https://api.notion.com/v1/pages', { method: 'POST', headers, body: JSON.stringify({ parent: { database_id: databaseId }, properties: props }) });
      const d = await r.json();
      results.push({ name: row.name, ok: r.ok, error: r.ok ? null : (d.message || '') });
    }
    const failed = results.filter(x => !x.ok);
    if (failed.length) return json({ ok: false, error: 'partial fail: ' + failed.map(f => f.name + '(' + f.error + ')').join('; '), results }, 200, cors);
    return json({ ok: true, message: 'wrote ' + results.length, results }, 200, cors);
  },
};
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}
