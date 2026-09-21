from pathlib import Path
import re

path = Path('index.html')
s = path.read_text(encoding='utf-8')

def replace_one(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    s = s.replace(old, new, 1)

def replace_pattern(pattern, new, label):
    global s
    s, count = re.subn(pattern, lambda m: new(m) if callable(new) else new, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: pattern missing')

replace_one("const APP_VERSION = 'v1.6.3';", "const APP_VERSION = 'v1.7.0';", 'app version')
replace_one('      s.tasks = s.tasks.map(t => ({ ...t, times: t.times || 1, streak: t.streak || 0, lastDone: t.lastDone || \'\', setId: t.setId ?? null,', "      s.tasks = s.tasks.map(t => ({ ...t, times: t.times || 1, interval: Math.max(1, Math.min(999, parseInt(t.interval, 10) || 1)), anchorDate: t.anchorDate || this.todayKey(), streak: t.streak || 0, lastDone: t.lastDone || '', setId: t.setId ?? null,", 'task migration')

# New and edited tasks: keep legacy cycle choices and expose a separate interval number.
new_interval_html = '''        <label style="display:block;font-size:11px;color:#697084;">循环跨度 · 每 N 天／周／月
          <input id="nt-interval" type="number" min="1" max="999" step="1" value="1" inputmode="numeric" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-size:13px;font-family:'JetBrains Mono',monospace;">
          <span style="display:block;margin-top:4px;font-size:10px;line-height:1.55;color:#697084;">例如：选“每周”、跨度 2、次数 3 = 每 2 周完成 3 次。单次／不限次忽略跨度。</span>
        </label>
'''
replace_pattern(r'(<!-- NEW TASK MODAL -->.*?<select id="nt-cycle".*?</select>\s*</label>\s*</div>)(\s*<label[^>]*>优先级)', lambda m: m.group(1) + '\n' + new_interval_html + m.group(2), 'new-task interval input')
edit_interval_html = '''            <label style="display:block;font-size:11px;color:#697084;">循环跨度 · 每 N 天／周／月
              <input id="ed-interval" type="number" min="1" max="999" step="1" defaultValue="{{ editInterval }}" inputmode="numeric" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#e6e9f0;font-size:13px;font-family:'JetBrains Mono',monospace;">
              <span style="display:block;margin-top:4px;font-size:10px;color:#697084;line-height:1.5;">仅日／周／月循环有效；更改循环类型或跨度会从今天所在的新周期重新计算连续期数，历史存根保留。</span>
            </label>
'''
replace_pattern(r'(<select id="ed-cycle".*?</select>\s*</label>\s*</div>)(\s*<label[^>]*>归入任务集)', lambda m: m.group(1) + '\n' + edit_interval_html + m.group(2), 'edit-task interval input')
# The new input must remain accessible on compact phones.
replace_pattern(r'(<!-- NEW TASK MODAL -->.*?<div onClick="\{\{ stopClick \}\}" style="width:360px;max-width:100%;)(background:)', lambda m: m.group(1) + 'max-height:90vh;overflow-y:auto;' + m.group(2), 'task modal scroll')
replace_pattern(r'(<!-- EDIT MODAL -->.*?<div onClick="\{\{ stopClick \}\}" style="width:340px;)(background:)', lambda m: m.group(1) + 'max-width:100%;max-height:90vh;overflow-y:auto;' + m.group(2), 'edit modal scroll')

replace_one("    const times = Math.max(1, parseInt(this.v('nt-times')) || 1);", "    const times = Math.max(1, parseInt(this.v('nt-times')) || 1);\n    const interval = ['daily','weekly','monthly'].includes(cycle) ? this.readTaskInterval('nt-interval') : 1;", 'new interval capture')
replace_one("{ id: this.state.nextId, name, exp, cycle, times, core, setId, priority, note, done: {}, completionLog: {} }", "{ id: this.state.nextId, name, exp, cycle, times, interval, anchorDate: this.todayKey(), core, setId, priority, note, done: {}, completionLog: {} }", 'new interval storage')
replace_one("this.clear(['nt-name', 'nt-exp', 'nt-times', 'nt-note']);", "this.clear(['nt-name', 'nt-exp', 'nt-times', 'nt-note']); const it = document.getElementById('nt-interval'); if (it) it.value = '1';", 'new interval reset')

# Editing the recurrence changes future period keys only; old completionLog stays as a factual calendar receipt.
old_edit = """    } else if (ed.type === 'task') {
      const setSel = document.getElementById('ed-set');
      const setId = setSel && setSel.value ? parseInt(setSel.value) : null;
      this.save({ editing: null, tasks: this.state.tasks.map(x => x.id === ed.id ? { ...x,
        name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),
        setId, cycle: document.getElementById('ed-cycle').value,
        priority: (document.getElementById('ed-priority') || {}).value || x.priority || 'p4', note: this.v('ed-note') } : x) });
"""
new_edit = """    } else if (ed.type === 'task') {
      const setSel = document.getElementById('ed-set');
      const setId = setSel && setSel.value ? parseInt(setSel.value) : null;
      const newCycle = document.getElementById('ed-cycle').value;
      const newInterval = ['daily','weekly','monthly'].includes(newCycle) ? this.readTaskInterval('ed-interval') : 1;
      const anchor = this.todayKey();
      this.save({ editing: null, tasks: this.state.tasks.map(x => {
        if (x.id !== ed.id) return x;
        const ruleChanged = x.cycle !== newCycle || this.taskInterval(x) !== newInterval;
        return { ...x, name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),
          setId, cycle: newCycle, interval: newInterval, anchorDate: ruleChanged ? anchor : (x.anchorDate || anchor),
          ...(ruleChanged ? { streak: 0, lastPeriod: '' } : {}),
          priority: (document.getElementById('ed-priority') || {}).value || x.priority || 'p4', note: this.v('ed-note') };
      }) });
"""
replace_one(old_edit, new_edit, 'edit task rule')

# Preserve exact historical period keys for interval=1; use stable anchor-based non-overlapping periods for interval>1.
interval_methods = """  taskInterval(t) { const n = Number(t && t.interval); return Number.isInteger(n) && n > 0 ? Math.min(n, 999) : 1; }
  readTaskInterval(id) { const n = parseInt(this.v(id), 10); return Number.isFinite(n) ? Math.max(1, Math.min(999, n)) : 1; }
  periodKey(t, d = new Date()) {
    if (!t) return null;
    const cycle = t.cycle, interval = this.taskInterval(t);
    if (interval === 1 || !['daily','weekly','monthly'].includes(cycle)) return this.keyFor(cycle, d);
    const anchor = t.anchorDate || this.todayKey();
    const [ay, am, ad] = anchor.split('-').map(Number);
    const start = Date.UTC(ay, am - 1, ad), day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    let distance;
    if (cycle === 'daily') distance = Math.floor((day - start) / 86400000);
    else if (cycle === 'weekly') {
      const monday = utc => utc - ((new Date(utc).getUTCDay() + 6) % 7) * 86400000;
      distance = Math.round((monday(day) - monday(start)) / (7 * 86400000));
    } else distance = (d.getFullYear() - ay) * 12 + d.getMonth() - (am - 1);
    return 'interval:' + cycle + ':' + interval + ':' + anchor + ':' + Math.floor(distance / interval);
  }
  previousPeriodKey(t) {
    if (!t || !['daily','weekly','monthly'].includes(t.cycle)) return null;
    const interval = this.taskInterval(t);
    if (interval === 1) return this.prevKey(t.cycle);
    const d = new Date();
    if (t.cycle === 'daily') d.setDate(d.getDate() - interval);
    else if (t.cycle === 'weekly') d.setDate(d.getDate() - interval * 7);
    else { d.setDate(1); d.setMonth(d.getMonth() - interval); }
    return this.periodKey(t, d);
  }
"""
replace_one("  log(name, delta) { return [{ ts: Date.now(), name, delta }, ...this.state.ledger].slice(0, 200); }", interval_methods + "  log(name, delta) { return [{ ts: Date.now(), name, delta }, ...this.state.ledger].slice(0, 200); }", 'period methods')
if s.count('this.key(t.cycle)') != 3 or s.count('this.prevKey(t.cycle)') != 3:
    # prevKey count includes new previousPeriodKey fallback, hence three expected.
    raise SystemExit(f'period call count unexpected: key={s.count("this.key(t.cycle)")} prev={s.count("this.prevKey(t.cycle)")}')
s = s.replace('this.key(t.cycle)', 'this.periodKey(t)')
# Do not replace the fallback inside previousPeriodKey itself.
s = s.replace('this.prevKey(t.cycle)', 'this.previousPeriodKey(t)', 2)
replace_one("    const unit = { daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '';", "    const unit = this.taskInterval(t) > 1 ? '轮' : ({ daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '');", 'momentum unit')

# Lists: add a clear section boundary only when grouped and ungrouped tasks coexist.
replace_one("      ungrouped.forEach(m => taskRows.push({ ...m, rowKey: 't-' + m.id, inSet: false }));", "      if (setsArr.length && ungrouped.length) taskRows.push({ rowKey: 'ungrouped-divider', isDivider: true, isHeader: false, isTask: false, countLabel: ungrouped.length + ' 项' });\n      ungrouped.forEach(m => taskRows.push({ ...m, rowKey: 't-' + m.id, inSet: false }));", 'ungrouped rows')
divider = '''        <sc-if value="{{ t.isDivider }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:10px;margin:13px 2px 5px;min-height:22px;">
            <div style="height:1px;flex:1;background:linear-gradient(90deg,transparent,{{ accent }});opacity:.56;"></div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:1.1px;color:{{ accent }};white-space:nowrap;">未分组任务 / INBOX · {{ t.countLabel }}</div>
            <div style="height:1px;flex:1;background:linear-gradient(90deg,{{ accent }},transparent);opacity:.56;"></div>
          </div>
        </sc-if>
'''
replace_one('      <sc-for list="{{ taskRows }}" as="t" hint-placeholder-count="4">\n', '      <sc-for list="{{ taskRows }}" as="t" hint-placeholder-count="4">\n' + divider, 'ungrouped divider markup')

# Task label/streak in normal list and four-quadrant view reflect interval rules.
replace_one("      const k = this.periodKey(t), times = t.times || 1;", "      const k = this.periodKey(t), times = t.times || 1, interval = this.taskInterval(t);", 'task render interval')
replace_one("      const _curK = k, _prevK = this.previousPeriodKey(t);", "      const _curK = k, _prevK = this.previousPeriodKey(t);", 'current previous marker') if False else None
replace_one("      const _unit = { daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '';", "      const _unit = interval > 1 && ['daily','weekly','monthly'].includes(t.cycle) ? '轮' : ({ daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '');", 'task streak unit')
replace_one("        isFormed, hasStreak: liveStreak > 0 && !isFormed && !!_unit, streakLabel: '连 ' + liveStreak + ' ' + _unit, formedLabel: 'MOMENTUM · ' + liveStreak + ' 连' + _unit,", "        isFormed, hasStreak: liveStreak > 0 && !isFormed && !!_unit, streakLabel: interval > 1 ? '连 ' + liveStreak + ' 轮' : '连 ' + liveStreak + ' ' + _unit, formedLabel: interval > 1 ? 'MOMENTUM · 连 ' + liveStreak + ' 轮' : 'MOMENTUM · ' + liveStreak + ' 连' + _unit,", 'streak labels')
replace_one("        cycleLabel: k ? `${cyc[t.cycle]} ${cnt}/${times} 次` : cyc[t.cycle],", "        cycleLabel: k ? `${interval > 1 ? ('每 ' + interval + ({ daily: '天', weekly: '周', monthly: '月' }[t.cycle])) : cyc[t.cycle]} ${cnt}/${times} 次` : cyc[t.cycle],", 'cycle label')
replace_one("      editExp: editItem ? (editItem.exp ?? '') : '', editTimes: editItem ? (editItem.times || 1) : '',", "      editExp: editItem ? (editItem.exp ?? '') : '', editTimes: editItem ? (editItem.times || 1) : '', editInterval: editItem ? this.taskInterval(editItem) : 1,", 'edit field binding')

# The reminder board shows countdown deadlines from its own selected day, read-only and never duplicates their data.
replace_one("    const daylineRows = (st.dayline || []).filter(x => x.date === daylineDate).slice().sort((a,b) => (a.time || '').localeCompare(b.time || '')).map(x => ({ ...x, onEdit: () => this.openEditDayline(x.id), onDel: e => { e.stopPropagation(); this.delDayline(x.id); }, onExport: e => { e.stopPropagation(); this.exportDaylineIcs(x.id); } }));", "    const daylineRows = (st.dayline || []).filter(x => x.date === daylineDate).slice().sort((a,b) => (a.time || '').localeCompare(b.time || '')).map(x => ({ ...x, onEdit: () => this.openEditDayline(x.id), onDel: e => { e.stopPropagation(); this.delDayline(x.id); }, onExport: e => { e.stopPropagation(); this.exportDaylineIcs(x.id); } }));\n    const daylineCountdowns = (st.countdowns || []).filter(c => c.date === daylineDate).slice().sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00')).map(c => ({ id: c.id, name: c.name, time: c.time || '00:00' }));", 'countdown derived reminder model')
replace_one("      daylineRows, daylineEmpty: daylineRows.length === 0, daylineDateLabel:", "      daylineRows, daylineCountdowns, daylineHasCountdowns: daylineCountdowns.length > 0, daylineCountdownCount: daylineCountdowns.length, daylineEmpty: daylineRows.length === 0 && daylineCountdowns.length === 0, daylineDateLabel:", 'reminder values')
countdown_section = '''      <sc-if value="{{ daylineHasCountdowns }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:9px;border-top:1px solid #29303b;padding-top:12px;margin-top:2px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;letter-spacing:1px;color:{{ accent }};">⧗ 当日到期 · 未来倒计时</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8b93a4;">{{ daylineCountdownCount }} 项</div>
        </div>
        <sc-for list="{{ daylineCountdowns }}" as="cd" hint-placeholder-count="0">
          <div style="display:flex;align-items:center;gap:10px;border:1px solid #35402f;background:linear-gradient(180deg,rgba(179,154,93,.10),rgba(12,16,18,.42));border-radius:10px;padding:10px 11px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:{{ accent }};width:52px;flex-shrink:0;">{{ cd.time }}</div>
            <div style="flex:1;min-width:0;font-size:12.5px;font-weight:700;color:#eef1f7;overflow-wrap:anywhere;">{{ cd.name }}</div>
            <div style="font-size:9px;color:#c9b783;border:1px solid #51462f;border-radius:99px;padding:3px 6px;white-space:nowrap;">COUNTDOWN</div>
          </div>
        </sc-for>
        <div style="font-size:10px;color:#697084;line-height:1.55;">自动同步未来倒计时的日期和时间；修改或删除倒计时，这里随之更新。此区域仅展示，不会自动创建闹钟。</div>
      </sc-if>
'''
replace_one('      <sc-if value="{{ daylineEmpty }}" hint-placeholder-val="{{ false }}">', countdown_section + '      <sc-if value="{{ daylineEmpty }}" hint-placeholder-val="{{ false }}">', 'reminder countdown markup')

# Mandatory confirmation covers every entry point for these destructive operations.
confirm_method = """  confirmRemoval(kind, name, detail = '') {
    return window.confirm('确定删除' + kind + '「' + (name || '未命名') + '」？' + (detail ? '\\n\\n' + detail : '') + '\\n\\n删除后无法直接撤销。');
  }
"""
replace_one("  toggleSet(id) { this.save({ sets: this.state.sets.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s) }); }", confirm_method + "  toggleSet(id) { this.save({ sets: this.state.sets.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s) }); }", 'confirm helper')
replace_one("  delSet(id) { this.save({ sets: this.state.sets.filter(s => s.id !== id), tasks: this.state.tasks.map(t => t.setId === id ? { ...t, setId: null } : t) }); }", "  delSet(id) { const item = (this.state.sets || []).find(s => s.id === id); if (!item || !this.confirmRemoval('任务集', item.name, '组内任务不会删除，将移到未分组任务区。')) return; this.save({ sets: this.state.sets.filter(s => s.id !== id), tasks: this.state.tasks.map(t => t.setId === id ? { ...t, setId: null } : t) }); }", 'delete task set')
replace_one("  delMilestoneSet(id) { this.save({ milestoneSets: (this.state.milestoneSets || []).filter(s => s.id !== id), milestones: this.state.milestones.map(m => m.setId === id ? { ...m, setId: null } : m) }); }", "  delMilestoneSet(id) { const item = (this.state.milestoneSets || []).find(s => s.id === id); if (!item || !this.confirmRemoval('里程碑集', item.name, '组内里程碑不会删除，将移到未分组区。')) return; this.save({ milestoneSets: (this.state.milestoneSets || []).filter(s => s.id !== id), milestones: this.state.milestones.map(m => m.setId === id ? { ...m, setId: null } : m) }); }", 'delete milestone set')
replace_one("  delTask(id) { this.save({ tasks: this.state.tasks.filter(x => x.id !== id) }); }", "  delTask(id) { const item = this.state.tasks.find(x => x.id === id); if (!item || !this.confirmRemoval('任务', item.name, '任务本身及其完成存根会移除；已入账的 EXP 与账本不会倒扣。')) return; this.save({ tasks: this.state.tasks.filter(x => x.id !== id) }); }", 'delete task')
replace_one("  delReward(id) { this.save({ rewards: this.state.rewards.filter(x => x.id !== id) }); }", "  delReward(id) { const item = this.state.rewards.find(x => x.id === id); if (!item || !this.confirmRemoval('Shopping Mall 奖励', item.name, '奖励卡片及其图片会移除；过去的兑换账本不受影响。')) return; this.save({ rewards: this.state.rewards.filter(x => x.id !== id) }); }", 'delete reward')
replace_one("  delMilestone(id) { this.save({ milestones: this.state.milestones.filter(x => x.id !== id) }); }", "  delMilestone(id) { const item = this.state.milestones.find(x => x.id === id); if (!item || !this.confirmRemoval('里程碑', item.name, '里程碑进度会移除；已领取的 EXP 不自动扣回。')) return; this.save({ milestones: this.state.milestones.filter(x => x.id !== id) }); }", 'delete milestone')
replace_one("  delCountdown(id) { this.save({ countdowns: this.state.countdowns.filter(c => c.id !== id) }); }", "  delCountdown(id) { const item = this.state.countdowns.find(c => c.id === id); if (!item || !this.confirmRemoval('未来倒计时', item.name, '提醒区关联显示的该事件也将同步消失。')) return; this.save({ countdowns: this.state.countdowns.filter(c => c.id !== id) }); }", 'delete countdown')

replace_one('从 {{ prevVersion }} 升级。提醒到点后会保持横向提醒条，直到你手动关闭；「一天时间轴」更名为「提醒」，存根 / 集锦升级为金属操作按钮，MOMENTUM 任务卡改为更清楚的两行布局。你的原有数据继续保留。','从 {{ prevVersion }} 升级。Lists 把未分组任务独立成区；任务支持每 N 天／周／月完成 M 次；提醒自动显示所选日期到期的未来倒计时；删除任务、任务集、里程碑、奖励和倒计时前均需确认。原有 EXP、任务历史与集锦继续保留。','update notice')

# Data compatibility: no key rename or bulk rewrite of old done/completionLog; only new metadata on tasks.
assert "const APP_VERSION = 'v1.7.0';" in s
assert 'daylineCountdowns' in s and 'ungrouped-divider' in s
assert s.count('this.periodKey(t)') >= 3
assert s.count('this.previousPeriodKey(t)') >= 2
assert all(marker in s for marker in ('nt-interval','ed-interval','confirmRemoval','daylineCountdownCount'))
path.write_text(s, encoding='utf-8')

sw = Path('sw.js')
w = sw.read_text(encoding='utf-8')
old = "const CACHE = 'exp-bank-v1.6.3';"
assert w.count(old) == 1
sw.write_text(w.replace(old, "const CACHE = 'exp-bank-v1.7.0';", 1), encoding='utf-8')
print('v1.7 patch complete: index.html and sw.js')
