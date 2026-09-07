from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

def rep(old, new, count=1):
    global s
    got = s.count(old)
    if got < count:
        raise SystemExit(f'Expected at least {count}, found {got}: {old[:120]!r}')
    s = s.replace(old, new, count)

# Version
rep("const APP_VERSION = 'v1.0.1';", "const APP_VERSION = 'v1.1.0';")

# Migration / defaults
rep(
"      s.tasks = s.tasks.map(t => ({ ...t, times: t.times || 1, streak: t.streak || 0, lastDone: t.lastDone || '', setId: t.setId ?? null,\n        done: Object.fromEntries(Object.entries(t.done || {}).map(([k, v]) => [k, v === true ? 1 : v])) }));",
"      s.tasks = s.tasks.map(t => ({ ...t, times: t.times || 1, streak: t.streak || 0, lastDone: t.lastDone || '', setId: t.setId ?? null,\n        priority: t.priority || 'p4', note: t.note || '',\n        done: Object.fromEntries(Object.entries(t.done || {}).map(([k, v]) => [k, v === true ? 1 : v])) }));\n      s.rewards = (s.rewards || []).map(r => ({ ...r, capCycle: 'daily', capTimes: 1 }));\n      s.countdowns = (s.countdowns || []).map(c => ({ ...c, time: c.time || '00:00' }));"
)
rep("      if (!s.milestoneSortMode) s.milestoneSortMode = 'deadline';", "      if (!s.milestoneSortMode) s.milestoneSortMode = 'deadline';\n      if (!s.taskSortMode) s.taskSortMode = 'priority';")
rep("      milestoneSortMode: 'deadline',", "      milestoneSortMode: 'deadline', taskSortMode: 'priority',")

# Task priority helpers + reorder integration
rep(
"  restoreMilestoneSort() { this.save({ milestoneSortMode: 'deadline' }); }\n  startReorder(kind)",
"  restoreMilestoneSort() { this.save({ milestoneSortMode: 'deadline' }); }\n  priorityRank(p) { return ({ p1: 1, p2: 2, p3: 3, p4: 4 })[p] || 4; }\n  sortTasksByPriority(list) { return [...(list || [])].sort((a, b) => this.priorityRank(a.priority) - this.priorityRank(b.priority)); }\n  restoreTaskSort() { this.save({ taskSortMode: 'priority' }); }\n  startReorder(kind)"
)
rep(
"    const arr = (kind === 'milestones' && (this.state.milestoneSortMode || 'deadline') === 'deadline')\n      ? this.sortMilestonesByDeadline(this.state.milestones)\n      : [...this.state[kind]];",
"    const arr = (kind === 'milestones' && (this.state.milestoneSortMode || 'deadline') === 'deadline')\n      ? this.sortMilestonesByDeadline(this.state.milestones)\n      : (kind === 'tasks' && (this.state.taskSortMode || 'priority') === 'priority')\n        ? this.sortTasksByPriority(this.state.tasks)\n        : [...this.state[kind]];"
)
rep("    if (kind === 'milestones') patch.milestoneSortMode = 'manual';\n    this.save(patch);", "    if (kind === 'milestones') patch.milestoneSortMode = 'manual';\n    if (kind === 'tasks') patch.taskSortMode = 'manual';\n    this.save(patch);")
rep("    this.save({ tasks: arr });\n  }\n  renderVals()", "    this.save({ tasks: arr, taskSortMode: 'manual' });\n  }\n  renderVals()")

# New task fields
rep(
"        </div>\n        <label style=\"display:flex;align-items:center;gap:6px;font-size:12.5px;color:#8b93a4;cursor:pointer;\"><input id=\"nt-core\" type=\"checkbox\" style=\"accent-color:#4ade80;\">设为核心微习惯(战时模式显示)</label>",
"        </div>\n        <label style=\"display:block;font-size:11px;color:#697084;\">优先级\n          <select id=\"nt-priority\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 8px;color:#aeb6c6;font-size:12px;\">\n            <option value=\"p1\">紧急且重要</option><option value=\"p2\">紧急不重要</option><option value=\"p3\">不紧急重要</option><option value=\"p4\" selected>不重要不紧急</option>\n          </select>\n        </label>\n        <label style=\"display:block;font-size:11px;color:#697084;\">备注(可留空)\n          <textarea id=\"nt-note\" placeholder=\"补充上下文、标准或提醒…\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;min-height:64px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 10px;color:#e6e9f0;font-size:12px;font-family:inherit;resize:vertical;\"></textarea>\n        </label>\n        <label style=\"display:flex;align-items:center;gap:6px;font-size:12.5px;color:#8b93a4;cursor:pointer;\"><input id=\"nt-core\" type=\"checkbox\" style=\"accent-color:#4ade80;\">设为核心微习惯(战时模式显示)</label>"
)

# Add task persistence
rep(
"    const core = document.getElementById('nt-core').checked;\n    const setSel = document.getElementById('nt-set');\n    const setId = setSel && setSel.value ? parseInt(setSel.value) : null;\n    this.save({ tasks: [...this.state.tasks, { id: this.state.nextId, name, exp, cycle, times, core, setId, done: {} }], nextId: this.state.nextId + 1, newTaskOpen: false });\n    this.clear(['nt-name', 'nt-exp', 'nt-times']);",
"    const core = document.getElementById('nt-core').checked;\n    const priorityEl = document.getElementById('nt-priority');\n    const priority = priorityEl ? priorityEl.value : 'p4';\n    const note = this.v('nt-note');\n    const setSel = document.getElementById('nt-set');\n    const setId = setSel && setSel.value ? parseInt(setSel.value) : null;\n    this.save({ tasks: [...this.state.tasks, { id: this.state.nextId, name, exp, cycle, times, core, setId, priority, note, done: {} }], nextId: this.state.nextId + 1, newTaskOpen: false });\n    this.clear(['nt-name', 'nt-exp', 'nt-times', 'nt-note']);"
)

# Edit task UI
rep(
"            <label style=\"display:block;font-size:11px;color:#697084;\">归入任务集\n              <select id=\"ed-set\" defaultValue=\"{{ editSetId }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 6px;color:#aeb6c6;font-size:12px;\">\n                <option value=\"\">无任务集</option>\n                <sc-for list=\"{{ setOptions }}\" as=\"s\" hint-placeholder-count=\"0\"><option value=\"{{ s.idStr }}\">{{ s.name }}</option></sc-for>\n              </select>\n            </label>",
"            <label style=\"display:block;font-size:11px;color:#697084;\">归入任务集\n              <select id=\"ed-set\" defaultValue=\"{{ editSetId }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 6px;color:#aeb6c6;font-size:12px;\">\n                <option value=\"\">无任务集</option>\n                <sc-for list=\"{{ setOptions }}\" as=\"s\" hint-placeholder-count=\"0\"><option value=\"{{ s.idStr }}\">{{ s.name }}</option></sc-for>\n              </select>\n            </label>\n            <label style=\"display:block;font-size:11px;color:#697084;\">优先级\n              <select id=\"ed-priority\" defaultValue=\"{{ editPriority }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 6px;color:#aeb6c6;font-size:12px;\">\n                <option value=\"p1\">紧急且重要</option><option value=\"p2\">紧急不重要</option><option value=\"p3\">不紧急重要</option><option value=\"p4\">不重要不紧急</option>\n              </select>\n            </label>\n            <label style=\"display:block;font-size:11px;color:#697084;\">备注(可留空)\n              <textarea id=\"ed-note\" defaultValue=\"{{ editNote }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;min-height:64px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 10px;color:#e6e9f0;font-size:12px;font-family:inherit;resize:vertical;\"></textarea>\n            </label>"
)
rep(
"        name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),\n        setId, cycle: document.getElementById('ed-cycle').value } : x) });",
"        name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),\n        setId, cycle: document.getElementById('ed-cycle').value,\n        priority: (document.getElementById('ed-priority') || {}).value || x.priority || 'p4', note: this.v('ed-note') } : x) });"
)

# Task visual data and sort source
rep(
"      return { ...t, doneNow, notDone: !doneNow, pending: tp, showDone: showActions, showDoneLabel: doneNow && !tp, expStr: '+' + t.exp,",
"      const pmeta = ({ p1: { label: '紧急且重要', color: '#f87171', bg: 'rgba(248,113,113,0.10)' }, p2: { label: '紧急不重要', color: '#fb923c', bg: 'rgba(251,146,60,0.10)' }, p3: { label: '不紧急重要', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' }, p4: { label: '不重要不紧急', color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' } })[t.priority || 'p4'];\n      return { ...t, doneNow, notDone: !doneNow, pending: tp, showDone: showActions, showDoneLabel: doneNow && !tp, expStr: '+' + t.exp,\n        hasNote: !!(t.note || '').trim(), noteText: t.note || '', priorityLabel: pmeta.label, priorityColor: pmeta.color, priorityBg: pmeta.bg,"
)
rep("    const all = st.tasks.map(dec);", "    const taskBase = (st.taskSortMode || 'priority') === 'manual' ? st.tasks : this.sortTasksByPriority(st.tasks);\n    const all = taskBase.map(dec);")
rep("      : st.tasks.map(dec).map(t => ({ id: t.id, name: t.name, sub: (setsArr.find(s => s.id === t.setId) || {}).name || '' }));", "      : taskBase.map(dec).map(t => ({ id: t.id, name: t.name, sub: (setsArr.find(s => s.id === t.setId) || {}).name || '' }));")
rep("      const decd = st.tasks.map(dec);", "      const decd = taskBase.map(dec);")

# Task card: note + badge within name block
rep(
"          <div style=\"flex:1;min-width:{{ taskNameMin }};\">\n            <div style=\"font-size:{{ taskNameSize }};font-weight:700;letter-spacing:0.2px;line-height:1.35;color:#eef1f7;overflow:hidden;text-overflow:ellipsis;white-space:{{ taskNameWrap }};\">{{ t.name }}</div>\n            <div style=\"font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#697084;letter-spacing:1px;margin-top:2px;\">{{ t.cycleLabel }}</div>\n          </div>",
"          <div style=\"flex:1;min-width:{{ taskNameMin }};position:relative;\">\n            <div style=\"font-size:{{ taskNameSize }};font-weight:700;letter-spacing:0.2px;line-height:1.35;color:#eef1f7;overflow:hidden;text-overflow:ellipsis;white-space:{{ taskNameWrap }};padding-right:96px;\">{{ t.name }}</div>\n            <div style=\"position:absolute;top:0;right:0;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;letter-spacing:0.2px;color:{{ t.priorityColor }};background:{{ t.priorityBg }};border:1px solid {{ t.priorityColor }};border-radius:99px;padding:2px 7px;white-space:nowrap;opacity:0.92;\">{{ t.priorityLabel }}</div>\n            <sc-if value=\"{{ t.hasNote }}\" hint-placeholder-val=\"{{ false }}\"><div style=\"font-size:11px;color:#8b93a4;line-height:1.45;margin-top:4px;white-space:normal;overflow-wrap:anywhere;\">{{ t.noteText }}</div></sc-if>\n            <div style=\"font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#697084;letter-spacing:1px;margin-top:2px;\">{{ t.cycleLabel }}</div>\n          </div>"
)

# Task set name click to edit
rep(
"            <div style=\"font-size:13.5px;font-weight:700;letter-spacing:1px;color:#c8cedb;\">▤ {{ t.name }}</div>",
"            <div onClick=\"{{ t.onEditSet }}\" title=\"点击编辑任务集名称\" style=\"cursor:text;font-size:13.5px;font-weight:700;letter-spacing:1px;color:#c8cedb;\" style-hover=\"color:{{ accent }};\">▤ {{ t.name }}</div>"
)

# Task reorder modal status / restore priority
rep(
"        <sc-if value=\"{{ reorderIsTasks }}\" hint-placeholder-val=\"{{ true }}\">\n          <div style=\"display:flex;gap:8px;\">",
"        <sc-if value=\"{{ reorderIsTasks }}\" hint-placeholder-val=\"{{ true }}\">\n          <div style=\"display:flex;align-items:center;gap:8px;border:1px solid #202530;background:#0d0f14;border-radius:9px;padding:9px 10px;\">\n            <div style=\"flex:1;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;\">当前: {{ taskSortLabel }}</div>\n            <div onClick=\"{{ restoreTaskSort }}\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#c8cedb;border:1px solid #2f3542;border-radius:7px;padding:5px 9px;\" style-hover=\"border-color:{{ accent }};\">按优先级排序</div>\n          </div>\n          <div style=\"display:flex;gap:8px;\">"
)
rep(
"      reorderIsMilestones: (st.reorderKind || 'tasks') === 'milestones', milestoneSortLabel: (st.milestoneSortMode || 'deadline') === 'manual' ? '手动排序' : '截止日期优先',\n      restoreMilestoneSort: () => this.restoreMilestoneSort(),",
"      reorderIsMilestones: (st.reorderKind || 'tasks') === 'milestones', milestoneSortLabel: (st.milestoneSortMode || 'deadline') === 'manual' ? '手动排序' : '截止日期优先',\n      restoreMilestoneSort: () => this.restoreMilestoneSort(),\n      taskSortLabel: (st.taskSortMode || 'priority') === 'manual' ? '手动排序' : '优先级优先', restoreTaskSort: () => this.restoreTaskSort(),"
)

# Edit props
rep("      editCycle: editItem ? (editItem.cycle || 'daily') : 'daily',", "      editCycle: editItem ? (editItem.cycle || 'daily') : 'daily',\n      editPriority: editItem ? (editItem.priority || 'p4') : 'p4', editNote: editItem ? (editItem.note || '') : '',")

# Shopping Mall: show more title text
rep(
"                <div style=\"font-size:14px;font-weight:700;letter-spacing:0.2px;color:#eef1f7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;\">{{ r.name }}</div>",
"                <div style=\"font-size:14px;font-weight:700;letter-spacing:0.2px;line-height:1.45;color:#eef1f7;min-height:61px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;\">{{ r.name }}</div>"
)

# Reward daily-once rule (calendar day), regardless of legacy config
old_redeem = """  redeem(id) {
    const r = this.state.rewards.find(x => x.id === id);
    if (this.state.exp < r.cost) return;
    const win = { daily: 1, weekly: 7, monthly: 30 }[r.capCycle];
    if (win) { const now = Date.now(); const recent = (r.redeems || []).filter(t => now - t < win * 864e5); if (recent.length >= (r.capTimes || 1)) return; }
    const ts = Date.now(), key = 'reward:' + id;"""
new_redeem = """  redeem(id) {
    const r = this.state.rewards.find(x => x.id === id);
    if (this.state.exp < r.cost) return;
    if ((r.redeems || []).some(t => this.sameDay(t))) return;
    const ts = Date.now(), key = 'reward:' + id;"""
rep(old_redeem, new_redeem)

old_rewards_render = """    const rewards = st.rewards.map(r => { const rp = !!pend && pend.key === 'reward:' + r.id;
      const win = { daily: 1, weekly: 7, monthly: 30 }[r.capCycle];
      const capUnit = { daily: '天', weekly: '周', monthly: '月' }[r.capCycle] || '';
      let capped = false, capDaysLeft = 0, capLabel = '';
      if (win) { const now = Date.now(); const recent = (r.redeems || []).filter(t => now - t < win * 864e5).sort((a, b) => a - b);
        if (recent.length >= (r.capTimes || 1)) { capped = true; capDaysLeft = Math.max(1, Math.ceil((recent[0] + win * 864e5 - now) / 864e5)); capLabel = '已兑换 · ' + capDaysLeft + ' 天后可兑'; }
      }
      const capHint = win ? ('每' + capUnit + (r.capTimes || 1) + '次') : '';"""
new_rewards_render = """    const rewards = st.rewards.map(r => { const rp = !!pend && pend.key === 'reward:' + r.id;
      const capped = (r.redeems || []).some(t => this.sameDay(t));
      const capLabel = '今日已兑换 · 明日可兑';
      const capHint = '每日 1 次';"""
rep(old_rewards_render, new_rewards_render)

# New rewards fixed to daily 1x
rep("    this.save({ rewards: [...this.state.rewards, { id: this.state.nextId, name, cost }], nextId: this.state.nextId + 1, newRewardOpen: false });", "    this.save({ rewards: [...this.state.rewards, { id: this.state.nextId, name, cost, capCycle: 'daily', capTimes: 1, redeems: [] }], nextId: this.state.nextId + 1, newRewardOpen: false });")

# Reward edit: fixed daily 1x; remove configurable frequency UI
pattern = re.compile(r'''            <div style="display:flex;gap:8px;">\n              <label style="flex:1\.4;font-size:11px;color:#697084;">兑换频次上限.*?            </div>\n          </sc-if>''', re.S)
m = pattern.search(s)
if not m:
    raise SystemExit('reward cap UI block not found')
replacement = '''            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;border:1px solid #262b36;background:#0d0f14;border-radius:8px;padding:8px 10px;">兑换限制 · 每日 1 次（固定）</div>\n          </sc-if>'''
s = s[:m.start()] + replacement + s[m.end():]
rep(
"    } else if (ed.type === 'reward') {\n      const cc = document.getElementById('ed-capcycle');\n      this.save({ editing: null, rewards: this.state.rewards.map(x => x.id === ed.id ? { ...x,\n        name: name || x.name, cost: Math.max(1, num('ed-cost', x.cost)),\n        capCycle: cc ? cc.value : (x.capCycle || 'none'), capTimes: Math.max(1, num('ed-captimes', x.capTimes || 1)) } : x) });",
"    } else if (ed.type === 'reward') {\n      this.save({ editing: null, rewards: this.state.rewards.map(x => x.id === ed.id ? { ...x,\n        name: name || x.name, cost: Math.max(1, num('ed-cost', x.cost)), capCycle: 'daily', capTimes: 1 } : x) });"
)

# Countdown: new/edit time input + storage + precise rendering
rep(
"        <label style=\"display:block;font-size:11px;color:#697084;\">目标日期\n          <input id=\"nc-date\" type=\"date\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n        </label>",
"        <div style=\"display:flex;gap:8px;\">\n          <label style=\"flex:1.25;font-size:11px;color:#697084;\">目标日期\n            <input id=\"nc-date\" type=\"date\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n          </label>\n          <label style=\"flex:1;font-size:11px;color:#697084;\">时间\n            <input id=\"nc-time\" type=\"time\" value=\"00:00\" step=\"60\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n          </label>\n        </div>"
)
rep(
"          <sc-if value=\"{{ editIsCountdown }}\" hint-placeholder-val=\"{{ false }}\">\n            <label style=\"display:block;font-size:11px;color:#697084;\">目标日期\n              <input id=\"ed-date\" type=\"date\" defaultValue=\"{{ editDate }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n            </label>\n          </sc-if>",
"          <sc-if value=\"{{ editIsCountdown }}\" hint-placeholder-val=\"{{ false }}\">\n            <div style=\"display:flex;gap:8px;\">\n              <label style=\"flex:1.25;font-size:11px;color:#697084;\">目标日期\n                <input id=\"ed-date\" type=\"date\" defaultValue=\"{{ editDate }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n              </label>\n              <label style=\"flex:1;font-size:11px;color:#697084;\">时间\n                <input id=\"ed-time\" type=\"time\" step=\"60\" defaultValue=\"{{ editTime }}\" style=\"display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;\">\n              </label>\n            </div>\n          </sc-if>"
)
rep(
"  addCountdown() { const name = this.v('nc-name'), date = this.v('nc-date'); if (!name || !date) return; this.save({ countdowns: [...this.state.countdowns, { id: this.state.nextId, name, date }], nextId: this.state.nextId + 1, newCountdownOpen: false }); this.clear(['nc-name', 'nc-date']); }",
"  addCountdown() { const name = this.v('nc-name'), date = this.v('nc-date'), time = this.v('nc-time') || '00:00'; if (!name || !date) return; this.save({ countdowns: [...this.state.countdowns, { id: this.state.nextId, name, date, time }], nextId: this.state.nextId + 1, newCountdownOpen: false }); this.clear(['nc-name', 'nc-date']); const te = document.getElementById('nc-time'); if (te) te.value = '00:00'; }"
)
rep(
"        name: name || x.name, date: this.v('ed-date') || x.date } : x) });",
"        name: name || x.name, date: this.v('ed-date') || x.date, time: this.v('ed-time') || x.time || '00:00' } : x) });"
)
old_countdowns = """    const t0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
    const countdowns = (st.countdowns || []).map(c => {
      const [y, m, dd] = c.date.split('-').map(Number);
      const days = Math.round((new Date(y, m - 1, dd).getTime() - t0) / 864e5);
      return { ...c, key: c.id, days, isToday: days === 0, showNum: days !== 0,
        prefix: days < 0 ? '已过' : '还剩', numText: Math.abs(days), numColor: days < 0 ? '#f87171' : accent,
        dueStr: `${y}年${String(m).padStart(2, '0')}月${String(dd).padStart(2, '0')}日`,
        onDel: e => { e.stopPropagation(); this.delCountdown(c.id); }, onEdit: () => this.openEdit('countdown', c.id) };
    }).sort((a, b) => ((a.days < 0) - (b.days < 0)) || a.days - b.days);"""
new_countdowns = """    const countdowns = (st.countdowns || []).map(c => {
      const [y, m, dd] = c.date.split('-').map(Number);
      const [hh, mm2] = (c.time || '00:00').split(':').map(Number);
      const targetTs = new Date(y, m - 1, dd, hh || 0, mm2 || 0, 0, 0).getTime();
      const diff = targetTs - Date.now(), abs = Math.abs(diff);
      const days = Math.floor(abs / 864e5), hours = Math.floor((abs % 864e5) / 36e5), mins = Math.floor((abs % 36e5) / 6e4);
      return { ...c, key: c.id, targetTs, days, isToday: false, showNum: true,
        prefix: diff < 0 ? '已过' : '还剩', numText: days, numColor: diff < 0 ? '#f87171' : accent,
        remainDetail: `${hours}小时 ${mins}分`,
        dueStr: `${y}年${String(m).padStart(2, '0')}月${String(dd).padStart(2, '0')}日 ${String(hh || 0).padStart(2, '0')}:${String(mm2 || 0).padStart(2, '0')}`,
        onDel: e => { e.stopPropagation(); this.delCountdown(c.id); }, onEdit: () => this.openEdit('countdown', c.id) };
    }).sort((a, b) => a.targetTs - b.targetTs);"""
rep(old_countdowns, new_countdowns)
rep("            <div style=\"font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b93a4;margin-top:3px;\">截止 {{ cd.dueStr }} · 以午夜 00:00 为界</div>", "            <div style=\"font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b93a4;margin-top:3px;\">截止 {{ cd.dueStr }}</div>")
rep(
"              <span style=\"font-family:'JetBrains Mono',monospace;font-size:14px;color:#c3c9d6;\">天</span>\n            </div>",
"              <span style=\"font-family:'JetBrains Mono',monospace;font-size:14px;color:#c3c9d6;\">天</span>\n            </div>\n            <div style=\"font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;white-space:nowrap;\">{{ cd.remainDetail }}</div>"
)
rep("      editDate: editItem ? (editItem.date ?? '') : '',", "      editDate: editItem ? (editItem.date ?? '') : '', editTime: editItem ? (editItem.time || '00:00') : '00:00',")

# Persist priority sorting after old manual drag path too
# (onDropTask patched above)

p.write_text(s, encoding='utf-8')
print('Patch A applied successfully')
