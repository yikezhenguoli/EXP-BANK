/* EXP BANK v1.11.0 — local task language, editable plans, no network requests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpTaskAssistant = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const NUM = '[零〇一二两三四五六七八九十百千\\d]+(?:[.点][零〇一二两三四五六七八九\\d]+)?';
  const CYCLES = ['once', 'daily', 'weekly', 'monthly', 'free'];
  const FIELDS = ['exp', 'cycle', 'interval', 'times', 'priority', 'taskKind', 'setName'];
  const key = s => String(s || '').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  function number(raw) {
    const s = String(raw || '').normalize('NFKC');
    if (/^[+-]/.test(s)) return (s[0] === '-' ? -1 : 1) * number(s.slice(1));
    if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s);
    const digits = { 零:0, 〇:0, 一:1, 二:2, 两:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
    const parts = s.split(/[.点]/);
    if (!parts[0] || [...parts[0]].some(c => !(c in digits) && !'十百千'.includes(c))) return NaN;
    let sum = 0, digit = 0;
    for (const c of parts[0]) {
      if (c in digits) digit = digits[c];
      else { sum += (digit || 1) * ({ 十:10, 百:100, 千:1000 }[c]); digit = 0; }
    }
    let value = sum + digit;
    if (parts[1]) value += Number('0.' + [...parts[1]].map(c => c in digits ? digits[c] : c).join(''));
    return value;
  }
  function cleanQuotes(s) { return String(s || '').trim().replace(/^[「『“"'‘]+|[」』”"'’]+$/g, '').trim(); }
  function splitOutside(s, separators) {
    const out = []; let buffer = '', closing = null;
    const pairs = { '「':'」', '『':'』', '“':'”', '‘':'’', '"':'"', "'":"'" };
    for (const c of s) {
      if (closing) { buffer += c; if (c === closing) closing = null; }
      else if (pairs[c]) { closing = pairs[c]; buffer += c; }
      else if (separators.includes(c)) { if (buffer.trim()) out.push(buffer.trim()); buffer = ''; }
      else buffer += c;
    }
    if (buffer.trim()) out.push(buffer.trim());
    return out;
  }
  function extractSet(source) {
    let text = source, setName = '';
    const patterns = [
      /(?:放在|放入|放进|放到|加入|归入|归到|属于)\s*(?:一个)?(?:叫|名为)?\s*([「『“"'][^」』”"']+[」』”"']|[^,，;；。\n]+?)\s*(?:的)?任务集(?:里|中)?/g,
      /(?:在)\s*([「『“"'][^」』”"']+[」』”"']|[^,，;；。\n]+?)\s*任务集(?:里|中)/g,
      /(?:任务集|分组)\s*[:：]\s*([「『“"'][^」』”"']+[」』”"']|[^,，;；。\n]+)/g
    ];
    for (const re of patterns) text = text.replace(re, (_all, name) => { setName = cleanQuotes(name).replace(/的$/, '').trim(); return ''; });
    return { text, setName };
  }
  function settings(source) {
    let text = String(source || '').replace(/天天/g, '每天'), values = {}, explicit = [], warnings = [], review = [];
    const cycles = [];
    const cycleRe = new RegExp('(每(?:隔)?\\s*(?:(' + NUM + ')\\s*)?(天|日|周|星期|礼拜|个?月))|(?:隔\\s*(' + NUM + ')\\s*(天|日|周|个?月))', 'g');
    let matches = [...text.matchAll(cycleRe)];
    matches.forEach(m => {
      const unit = m[3] || m[5], interval = number(m[2] || m[4] || '1');
      cycles.push({ cycle: /周|星期|礼拜/.test(unit) ? 'weekly' : /月/.test(unit) ? 'monthly' : 'daily', interval });
    });
    if (/每天|每日/.test(text) && !cycles.length) cycles.push({ cycle:'daily', interval:1 });
    if (/单次|一次性|只做一次/.test(text)) cycles.push({ cycle:'once', interval:1 });
    if (/不限次|随时|自由打卡/.test(text)) cycles.push({ cycle:'free', interval:1 });
    if (cycles.length) {
      Object.assign(values, cycles[cycles.length - 1]); explicit.push('cycle', 'interval');
      if (new Set(cycles.map(c => c.cycle + c.interval)).size > 1) { review.push('cycle'); warnings.push('有多个频率，请选择实际周期。'); }
    }
    const counts = [...text.matchAll(new RegExp('(' + NUM + ')\\s*次(?!个)', 'g'))];
    if (counts.length) { values.times = number(counts[counts.length - 1][1]); explicit.push('times'); }
    text = text.replace(cycleRe, '').replace(/每天|每日|单次|一次性|只做一次|不限次|随时|自由打卡/g, '');
    // Quantity in a task name (20 words, 30 minutes, 6 glasses) is never a quota.
    text = text.replace(new RegExp('(?:完成|进行|打卡|做)?\\s*' + NUM + '\\s*次(?!个)', 'g'), '');
    const exps = [];
    const expRe = new RegExp('(?:每项|每个任务|每次|完成一次|做完一次|一次)?\\s*(?:奖励(?:为|是)?|给我|给|得|加|获得)?\\s*([+-]?' + NUM + ')\\s*(?:EXP\\b|积分|分(?=$|[，,。；;\\s]|就好|就行|即可|吧))|(?:EXP|积分)\\s*[:：]?\\s*([+-]?' + NUM + ')', 'gi');
    text = text.replace(expRe, (_all, a, b) => { exps.push(number(a || b)); return ''; });
    if (exps.length) {
      values.exp = exps[exps.length - 1]; explicit.push('exp');
      if (new Set(exps).size > 1) { review.push('exp'); warnings.push('有多个积分值，请确认实际分值。'); }
    }
    const pm = text.match(/P([1-4])\b|不紧急(?:但|且)?重要|重要(?:但|且)?不紧急|紧急(?:且|又)?重要|紧急(?:但|且)?不重要|不重要不紧急/i);
    if (pm) {
      values.priority = pm[1] ? 'p' + pm[1] : /不紧急.*重要|重要.*不紧急/.test(pm[0]) ? 'p3' : /不重要不紧急/.test(pm[0]) ? 'p4' : /不重要/.test(pm[0]) ? 'p2' : 'p1';
      explicit.push('priority'); text = text.replace(pm[0], '');
    }
    if (/普通任务|非维护/.test(text)) { values.taskKind = 'standard'; explicit.push('taskKind'); text = text.replace(/普通任务|非维护/g, ''); }
    else if (/维护(?:类)?(?:任务)?|Maintenance/i.test(text)) { values.taskKind = 'maintenance'; explicit.push('taskKind'); text = text.replace(/(?:生活)?维护(?:类)?(?:任务)?|Maintenance/ig, ''); }
    const set = extractSet(text); text = set.text;
    if (set.setName) { values.setName = set.setName; explicit.push('setName'); }
    text = text.replace(/每项|每个任务|每个|全部|所有任务|统一|都(?:是|给)?|完成后|做完后|完成一次|每次|各自|各|一样|分别/g, '');
    return { text, values, explicit: [...new Set(explicit)], warnings, review: [...new Set(review)] };
  }
  function title(s) {
    return cleanQuotes(s).replace(/^\s*(?:[-•*]\s*|\d+[.)、]\s*)/, '')
      .replace(/^(?:请|麻烦)?(?:帮我|替我)?(?:新建|创建|添加|录入|安排)(?:以下|这些)?(?:一个|一项|\d+[个项])?(?:任务|待办|计划)?\s*[:：]?\s*/, '')
      .replace(/^(?:任务(?:名)?(?:为|是)|我(?:想要|想|要|准备|打算))\s*[:：]?\s*/, '')
      .replace(/^(?:任务|待办|计划)\s*[:：]\s*/, '')
      .replace(/^\s*(?:[:：,，;；。]|(?:和|以及|还有|然后|并且|并|或))\s*|\s*[,，;；。:：]+\s*$/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function valid(task) {
    const errors = [];
    if (!String(task.name || '').trim() || String(task.name).length > 120) errors.push('任务名称须为 1–120 字。');
    if (!Number.isFinite(Number(task.exp)) || task.exp === '' || Number(task.exp) < 0 || Number(task.exp) > 1000000 || round(task.exp) !== Number(task.exp)) errors.push('EXP 须为 0–1000000，最多两位小数。');
    if (!CYCLES.includes(task.cycle)) errors.push('请选择有效周期。');
    for (const f of ['interval','times']) if (!Number.isInteger(Number(task[f])) || Number(task[f]) < 1 || Number(task[f]) > 999) errors.push('跨度和次数须为 1–999 的整数。');
    if (!['p1','p2','p3','p4'].includes(task.priority)) errors.push('请选择有效优先级。');
    if (!['standard','maintenance'].includes(task.taskKind)) errors.push('请选择有效任务类别。');
    if (String(task.setName || '').length > 80) errors.push('任务集名称最多 80 字。');
    if (String(task.note || '').length > 2000) errors.push('备注最多 2000 字。');
    if ((task.review || []).length) errors.push('请确认歧义字段：' + task.review.map(f=>({cycle:'周期',exp:'每次EXP',interval:'周期跨度',times:'每周期次数'}[f] || f)).join(' / '));
    return errors;
  }
  function decorate(name, row, shared, options) {
    const explicit = [...new Set([...shared.explicit, ...row.explicit])];
    const inferredMaintenance = /洗(?:贴身|内衣|衣物)|换(?:床品|床单|干衣)|送洗冬衣|运动后.*换|生活维护/.test(name);
    const base = { cycle:'once', interval:1, times:1, exp:inferredMaintenance ? 3 : 10, priority:'p4', taskKind:inferredMaintenance ? 'maintenance' : 'standard', setName:'', note:'' };
    const remembered = options.preferences && options.preferences[key(name)];
    if (remembered) for (const f of FIELDS) if (!explicit.includes(f) && remembered[f] != null) base[f] = remembered[f];
    const task = { ...base, ...shared.values, ...row.values, name, source:options.source, selected:true, explicit,
      warnings:[...shared.warnings, ...row.warnings], review:[...new Set([...shared.review, ...row.review])] };
    if (!explicit.includes('exp')) task.warnings.push(remembered && remembered.exp != null ? '采用你记住的同名任务积分。' : '未写积分，预填建议 ' + task.exp + ' EXP，可修改。');
    if (!explicit.includes('cycle')) task.warnings.push(remembered && remembered.cycle ? '采用你记住的同名任务周期。' : '未写频率，暂按单次，可修改。');
    if (inferredMaintenance && !explicit.includes('taskKind') && !remembered) task.warnings.push('建议标为生活维护，受每日 15 EXP 上限控制。');
    if (/(明天|后天|下周|[12]\d{3}[-/年]\d)/.test(name)) task.warnings.push('日期保留在名称；本版任务助手不自动设置日程提醒。');
    if ((options.tasks || []).some(t => key(t.name) === key(name))) { task.selected = false; task.warnings.push('已有同名任务，默认不重复创建；如确需新增可勾选。'); }
    task.errors = valid(task); return task;
  }
  function parse(raw, options = {}) {
    const source = String(raw || '').normalize('NFKC').trim();
    const failure = msg => ({ tasks:[], source, error:msg, warnings:[] });
    if (!source) return failure('先描述你想做的事情。');
    if (source.length > 12000) return failure('描述过长，请拆成几批（每次不超过 12000 字）。');
    if (/^(?:请)?(?:帮我)?(?:删除|清空|移除|重置)[\s\S]*(?:任务|任务集|数据|账本|奖励|所有|全部)/.test(source)) return failure('此助手只创建任务；删除或清空请使用页面确认流程。');
    if (source.startsWith('{') || source.startsWith('[')) {
      try {
        const data = JSON.parse(source), arr = Array.isArray(data) ? data : data.tasks;
        if (!Array.isArray(arr) || !arr.length || arr.length > 100) return failure('结构化任务需要 1–100 项。');
        const allowed = ['name','exp','cycle','interval','times','priority','taskKind','setName','note'];
        if (!Array.isArray(data) && Object.keys(data).some(k => !['tasks','setName'].includes(k))) return failure('这里只接受任务草稿，不接受操作命令或整包数据。');
        const tasks = arr.map(item => {
          if (!item || typeof item !== 'object' || Object.keys(item).some(k => !allowed.includes(k))) throw new Error('结构化任务包含不支持的字段。');
          const values = { ...item, setName:item.setName ?? data.setName ?? '' }, explicit = Object.keys(values);
          const task = decorate(String(item.name || ''), { values, explicit, warnings:[], review:[] }, { values:{}, explicit:[], warnings:[], review:[] }, { ...options, source });
          task.errors = valid(task); return task;
        });
        return { tasks, source, warnings:[], error:'' };
      } catch (e) { return failure('结构化内容无效：' + e.message); }
    }
    let body = source, shared = { values:{}, explicit:[], warnings:[], review:[] };
    const sharedParts = [], rows = [];
    const alphabet = /(?:26|二十六)\s*(?:个)?\s*(?:英文)?字母|A\s*[-~～到至]\s*Z/i.test(body);
    // An explicitly quoted batch is a list; quoted punctuation within one ordinary title stays intact.
    body = body.replace(/(?:创建|添加|新建)\s*[“「『"']([^”」』"']+)[”」』"']\s*(?:\d+|[一二三四五六七八九十]+)?\s*[项个]?\s*任务/g, (_m, list) => list);
    const header = body.match(/^([^:：\n]+)[:：]([\s\S]+)$/);
    if (header) {
      const info = settings(header[1]);
      if (!title(info.text)) { sharedParts.push(info); body = header[2]; }
    }
    for (const group of splitOutside(body, '\n;；。')) {
      const local = [];
      for (const clause of splitOutside(group, '，,')) {
        const row = settings(clause), name = title(row.text);
        const metadata = !name || /^(?:任务集|里|中|即可|就行|就好|可以)$/.test(name);
        if (metadata && (/^(?:每项|每个任务|所有|全部|统一|都|各)/.test(clause) || row.values.setName || !local.length)) sharedParts.push(row);
        else if (metadata) {
          for (const f of row.explicit) {
            const targets = local.some(r => r.row.explicit.includes(f)) ? [local[local.length - 1]] : local;
            for (const target of targets) { target.row.values[f] = row.values[f]; target.row.explicit.push(f); }
          }
          local.forEach(r => { r.row.warnings.push(...row.warnings); r.row.review.push(...row.review); });
        } else local.push({ text:clause, row, name });
      }
      rows.push(...local);
    }
    for (const p of sharedParts) {
      Object.assign(shared.values, p.values); shared.explicit.push(...p.explicit); shared.warnings.push(...p.warnings); shared.review.push(...p.review);
    }
    const tasks = [];
    if (alphabet) {
      const common = settings(source);
      shared = { ...common, values:{ ...common.values, ...shared.values } };
      for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') tasks.push(decorate(c, { values:{}, explicit:[], warnings:[], review:[] }, shared, { ...options, source }));
    } else for (const r of rows) {
      const names = splitOutside(r.name, '、').flatMap(x => x.split(/\s+(?:and|&)\s+|以及|还有/));
      for (const name of names) {
        const cleaned = title(name);
        if (cleaned) tasks.push(decorate(cleaned, r.row, shared, { ...options, source:r.text }));
      }
    }
    const seen = new Set(), unique = tasks.filter(t => {
      const k = JSON.stringify([key(t.name), ...FIELDS.map(f=>t[f])]); if (seen.has(k)) return false; seen.add(k); return true;
    });
    if (!unique.length) return failure('没有找到可创建的事项。可以直接写“每天读20页书，每次5积分”。');
    if (unique.length > 100) return failure('识别超过 100 项，请拆批；没有截断或创建任何任务。');
    return { tasks:unique, source, error:'', warnings:[], setName:shared.values.setName || '' };
  }
  function refine(plan, raw) {
    const text = String(raw || '').normalize('NFKC').trim();
    const tasks = (plan.tasks || []).map(t => ({ ...t, warnings:[...t.warnings], review:[...t.review] }));
    if (!text) return { ...plan, error:'先填写补充说明。' };
    const all = /(?:全部|所有|每项|每个任务|都|统一)/.test(text), fragments = splitOutside(text, '\n;；，,。');
    let changed = 0, active = null;
    for (const fragment of fragments) {
      const mentioned = tasks.filter(t => fragment.includes(t.name));
      if (mentioned.length) active = mentioned;
      const targets = all && !mentioned.length ? tasks : mentioned.length ? mentioned : active;
      const parsed = settings(fragment);
      if (!targets || !parsed.explicit.length) continue;
      for (const task of targets) {
        Object.assign(task, parsed.values); task.explicit = [...new Set([...task.explicit, ...parsed.explicit])];
        task.review = [...task.review.filter(f => !parsed.explicit.includes(f)), ...parsed.review];
        task.warnings = ['已按补充说明更新，确认后才创建。', ...parsed.warnings];
        task.errors = valid(task); changed++;
      }
    }
    return { ...plan, tasks, error:changed ? '' : '没有匹配到任务。请提到任务名称，或写“全部每项5积分”。' };
  }
  function remember(preferences, tasks) {
    const out = Object.assign(Object.create(null), preferences || {});
    for (const task of tasks) if (task.selected && !valid(task).length) out[key(task.name)] = Object.fromEntries(FIELDS.map(f => [f, task[f]]));
    return Object.fromEntries(Object.entries(out).slice(-200));
  }
  return { parse, refine, valid, remember, key, number, CYCLES };
});
