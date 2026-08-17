from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

def rep(old, new, count=1):
    global s
    got = s.count(old)
    if got < count:
        raise SystemExit(f'Expected at least {count}, found {got}: {old[:100]!r}')
    s = s.replace(old, new, count)

if s.count('番茗专注') != 2:
    raise SystemExit(f'Expected 2 typo labels, found {s.count("番茗专注")}')
s = s.replace('番茗专注', '番茄专注')

rep("      if (s.noiseVol == null) s.noiseVol = 0.5;\n      this.state = s;", "      if (s.noiseVol == null) s.noiseVol = 0.5;\n      if (!s.milestoneSortMode) s.milestoneSortMode = 'deadline';\n      this.state = s;")
rep("      pomoPreset: '25', pomoCustomMin: 30, noisePreset: '咖啡馆', noiseVol: 0.5,\n", "      pomoPreset: '25', pomoCustomMin: 30, noisePreset: '咖啡馆', noiseVol: 0.5,\n      milestoneSortMode: 'deadline',\n")

rep("  delSet(id) { this.save({ sets: this.state.sets.filter(s => s.id !== id), tasks: this.state.tasks.map(t => t.setId === id ? { ...t, setId: null } : t) }); }\n  startReorder(kind)", "  delSet(id) { this.save({ sets: this.state.sets.filter(s => s.id !== id), tasks: this.state.tasks.map(t => t.setId === id ? { ...t, setId: null } : t) }); }\n  sortMilestonesByDeadline(list) {\n    return [...(list || [])].sort((a, b) => {\n      const ad = a.deadline || '', bd = b.deadline || '';\n      if (!!ad !== !!bd) return ad ? -1 : 1;\n      if (ad && bd && ad !== bd) return ad < bd ? -1 : 1;\n      return 0;\n    });\n  }\n  restoreMilestoneSort() { this.save({ milestoneSortMode: 'deadline' }); }\n  startReorder(kind)")

rep("    const arr = [...this.state[kind]];", "    const arr = (kind === 'milestones' && (this.state.milestoneSortMode || 'deadline') === 'deadline')\n      ? this.sortMilestonesByDeadline(this.state.milestones)\n      : [...this.state[kind]];")
rep("    this.save({ [kind]: arr });\n  }\n  roUp()", "    const patch = { [kind]: arr };\n    if (kind === 'milestones') patch.milestoneSortMode = 'manual';\n    this.save(patch);\n  }\n  roUp()")

rep("      fundSumCols: mob ? '1fr 1fr' : '1fr 1fr 1fr', fundCardSh: mob ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.06),0 12px 30px rgba(0,0,0,0.4)',\n      fundPad: mob ? '12px' : '16px' };", "      fundSumCols: mob ? '1fr 1fr' : '1fr 1fr 1fr', fundCardSh: mob ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.06),0 12px 30px rgba(0,0,0,0.4)',\n      fundPad: mob ? '12px' : '16px', milestoneStatsCols: mob ? '1fr 1fr' : '1.35fr 1fr 1fr 1fr' };")

rep("    const roKind = st.reorderKind || 'tasks';\n    const roSrc = roKind === 'rewards' ? st.rewards.map(r => ({ id: r.id, name: r.name, sub: r.cost + ' EXP' }))\n      : roKind === 'milestones' ? st.milestones.map(m => ({ id: m.id, name: m.name, sub: m.cur + '/' + m.target }))", "    const milestoneBase = (st.milestoneSortMode || 'deadline') === 'manual' ? st.milestones : this.sortMilestonesByDeadline(st.milestones);\n    const roKind = st.reorderKind || 'tasks';\n    const roSrc = roKind === 'rewards' ? st.rewards.map(r => ({ id: r.id, name: r.name, sub: r.cost + ' EXP' }))\n      : roKind === 'milestones' ? milestoneBase.map(m => ({ id: m.id, name: m.name, sub: m.cur + '/' + m.target }))")
rep("    const milestones = st.milestones.map(m => {", "    const milestones = milestoneBase.map(m => {")
rep("        hasDeadline: !!dl,\n        deadlineLabel: dl ? (daysLeft < 0 ? dl + ' 已截止' : dl + ' · 剩 ' + daysLeft + ' 天') : '',\n        deadlineColor: daysLeft !== null && daysLeft <= 3 ? '#f87171' : '#697084',", "        hasDeadline: !!dl,\n        deadlineLabel: dl ? (daysLeft < 0 ? dl + ' · 已截止' : dl + ' · 剩 ' + daysLeft + ' 天') : '未设置',\n        deadlineColor: daysLeft !== null && daysLeft <= 3 ? '#f87171' : '#8b93a4',\n        progressStr: m.cur + ' / ' + m.target, rewardStr: '+' + m.bonus + ' EXP',")

rep("      reorderIsTasks: (st.reorderKind || 'tasks') === 'tasks',", "      reorderIsTasks: (st.reorderKind || 'tasks') === 'tasks',\n      reorderIsMilestones: (st.reorderKind || 'tasks') === 'milestones', milestoneSortLabel: (st.milestoneSortMode || 'deadline') === 'manual' ? '手动排序' : '截止日期优先',\n      restoreMilestoneSort: () => this.restoreMilestoneSort(),")
rep("      fundSumCols: resp.fundSumCols, fundCardSh: resp.fundCardSh, fundPad: resp.fundPad,", "      fundSumCols: resp.fundSumCols, fundCardSh: resp.fundCardSh, fundPad: resp.fundPad, milestoneStatsCols: resp.milestoneStatsCols,")

start = s.index('    <!-- MILESTONES -->')
end = s.index('    <!-- LEDGER -->', start)
new_section = '''    <!-- MILESTONES -->
    <div style="background:linear-gradient(180deg,{{ cardTop }} 0%,{{ cardBot }} 100%) padding-box,linear-gradient(200deg,rgba(255,255,255,0.24),rgba(255,255,255,0.06) 38%,rgba(255,255,255,0.02) 72%,rgba(255,255,255,0.07)) border-box;border:1.5px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 18px 46px rgba(0,0,0,0.42);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;align-items:center;gap:8px;"><div style="width:3px;height:14px;border-radius:2px;background:{{ tierGrad }};"></div><div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">里程碑 // MILESTONE</div><div onClick="{{ startReorderMilestones }}" title="排序里程碑" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;" style-hover="border-color:{{ accent }};">⇅</div><div onClick="{{ openNewMilestone }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.6);border-radius:8px;padding:6px 12px;" style-hover="filter:brightness(1.12);">+ 新建里程碑</div></div>
      <sc-for list="{{ milestones }}" as="m" hint-placeholder-count="1">
        <div onClick="{{ m.onEdit }}" title="点击编辑此里程碑" style="cursor:pointer;border:1px solid transparent;border-radius:12px;background:linear-gradient(180deg,{{ rowTop }} 0%,{{ rowBot }} 100%) padding-box,linear-gradient(200deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04) 45%,rgba(255,255,255,0.02)) border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);padding:14px;display:flex;flex-direction:column;gap:12px;" style-hover="box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),0 0 0 1px {{ accent }},0 10px 26px rgba(0,0,0,0.5);">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="flex:1;min-width:0;font-size:16px;line-height:1.45;font-weight:700;letter-spacing:0.2px;color:#eef1f7;word-break:break-word;">{{ m.name }}</div>
            <div onClick="{{ m.onDel }}" title="删除里程碑" style="cursor:pointer;color:#3d4353;font-size:16px;line-height:1;padding:3px 1px;flex-shrink:0;" style-hover="color:#f87171;">×</div>
          </div>
          <div style="display:grid;grid-template-columns:{{ milestoneStatsCols }};gap:8px;">
            <div style="border:1px solid #202530;border-radius:9px;background:rgba(10,12,17,0.32);padding:8px 10px;min-width:0;">
              <div style="display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;color:#697084;margin-bottom:4px;"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.9 6.9A5.2 5.2 0 1 1 8.9 2.95"/><circle cx="11.75" cy="3.15" r="0.85" fill="currentColor" stroke="none"/></svg>DUE</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;line-height:1.4;color:{{ m.deadlineColor }};overflow-wrap:anywhere;">{{ m.deadlineLabel }}</div>
            </div>
            <div style="border:1px solid #202530;border-radius:9px;background:rgba(10,12,17,0.32);padding:8px 10px;min-width:0;"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;color:#697084;margin-bottom:4px;">PROGRESS</div><div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#c8cedb;">{{ m.progressStr }}</div></div>
            <div style="border:1px solid #202530;border-radius:9px;background:rgba(10,12,17,0.32);padding:8px 10px;min-width:0;"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;color:#697084;margin-bottom:4px;">STEP</div><div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#c8cedb;">{{ m.stepStr }}</div></div>
            <div style="border:1px solid #202530;border-radius:9px;background:rgba(10,12,17,0.32);padding:8px 10px;min-width:0;"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;color:#697084;margin-bottom:4px;">REWARD</div><div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:{{ accent }};">{{ m.rewardStr }}</div></div>
          </div>
          <div style="height:6px;border-radius:99px;background:#1e222b;overflow:hidden;"><div style="height:100%;width:{{ m.barW }};background:{{ accent }};border-radius:99px;transition:width 0.3s;"></div></div>
          <div style="display:flex;align-items:center;gap:8px;min-height:30px;">
            <sc-if value="{{ m.pending }}" hint-placeholder-val="{{ false }}"><div onClick="{{ m.onUndo }}" title="点一下可撤销(几秒后自动确认)" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35),0 4px 14px rgba(0,0,0,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;" style-hover="filter:brightness(1.15);">{{ m.pendingLabel }}</div></sc-if>
            <sc-if value="{{ m.showProgress }}" hint-placeholder-val="{{ true }}"><div onClick="{{ m.onPlus }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35),0 4px 14px rgba(0,0,0,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.25);border-radius:8px;padding:6px 12px;" style-hover="filter:brightness(1.12);">推进 {{ m.stepStr }}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#697084;">剩余 {{ m.remain }}</div></sc-if>
            <sc-if value="{{ m.showReady }}" hint-placeholder-val="{{ false }}"><div onClick="{{ m.onClaim }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35),0 4px 14px rgba(0,0,0,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.25);border-radius:8px;padding:6px 14px;">✦ 领取 {{ m.bonusStr }} EXP</div></sc-if>
            <sc-if value="{{ m.showClaimed }}" hint-placeholder-val="{{ false }}"><div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#4ade80;">✓ 已达成并入账</div></sc-if>
          </div>
        </div>
      </sc-for>
    </div>

'''
s = s[:start] + new_section + s[end:]

marker = "        <div style=\"font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#aeb6c6;\">{{ reorderTitle }}</div>\n"
insert = marker + "        <sc-if value=\"{{ reorderIsMilestones }}\" hint-placeholder-val=\"{{ false }}\">\n          <div style=\"display:flex;align-items:center;gap:8px;border:1px solid #202530;background:#0d0f14;border-radius:9px;padding:9px 10px;\">\n            <div style=\"flex:1;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;\">当前: {{ milestoneSortLabel }}</div>\n            <div onClick=\"{{ restoreMilestoneSort }}\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#c8cedb;border:1px solid #2f3542;border-radius:7px;padding:5px 9px;\" style-hover=\"border-color:{{ accent }};\">按截止日期排序</div>\n          </div>\n        </sc-if>\n"
rep(marker, insert)

p.write_text(s, encoding='utf-8')

sw = Path('sw.js')
t = sw.read_text(encoding='utf-8')
if "const CACHE = 'exp-bank-v27';" not in t:
    raise SystemExit('Unexpected sw.js cache version')
sw.write_text(t.replace("const CACHE = 'exp-bank-v27';", "const CACHE = 'exp-bank-v28';", 1), encoding='utf-8')

out = p.read_text(encoding='utf-8')
for c in ['milestoneSortMode','sortMilestonesByDeadline','milestoneStatsCols','截止日期优先','PROGRESS','STEP','REWARD','番茄专注']:
    if c not in out:
        raise SystemExit(f'Missing marker: {c}')
if '番茗专注' in out or '⏳ {{ m.deadlineLabel }}' in out:
    raise SystemExit('Legacy UI still present')
print('Patch validation passed.')
