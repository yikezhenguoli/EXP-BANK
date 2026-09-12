from pathlib import Path
import re

IDX = Path('index.html')
SW = Path('sw.js')
text = IDX.read_text(encoding='utf-8')


def rep(old, new, label):
    global text
    if old not in text:
        raise SystemExit(f'MISSING [{label}]')
    text = text.replace(old, new, 1)
    print('OK', label)

# Version
rep("const APP_VERSION = 'v1.3.1';", "const APP_VERSION = 'v1.5.0';", 'app version')

# Global theme background + celebration CSS
rep("input[type=\"date\"]{color-scheme:dark;}\n</style>", """input[type=\"date\"]{color-scheme:dark;}
@keyframes bingoBurst{0%{transform:translate3d(0,-4vh,0) rotate(0deg) scale(.7);opacity:0}12%{opacity:1}100%{transform:translate3d(var(--drift),58vh,0) rotate(var(--rot)) scale(1);opacity:0}}
@keyframes bingoGlow{0%,100%{filter:drop-shadow(0 0 0 rgba(255,255,255,0))}50%{filter:drop-shadow(0 0 18px rgba(255,236,184,.38))}}
.bingo-particle{position:absolute;top:35%;width:7px;height:12px;border-radius:2px;opacity:0;animation:bingoBurst var(--dur) cubic-bezier(.18,.72,.2,1) var(--delay) forwards;pointer-events:none;}
</style>""", 'bingo css')
rep("<div style=\"min-height:100vh;background:radial-gradient(1100px 480px at 75% -8%,rgba(139,92,246,0.10),transparent 62%),radial-gradient(900px 420px at 8% 4%,rgba(96,165,250,0.07),transparent 60%),radial-gradient(1400px 700px at 50% 115%,rgba(139,92,246,0.05),transparent 65%),linear-gradient(180deg,#0d0e14 0%,#0a0b10 55%,#0b0c12 100%);color:#e6e9f0;", "<div style=\"min-height:100vh;background:{{ pageBg }};color:#e6e9f0;", 'theme page background')

# Theme button after params
anchor = """        <div onClick=\"{{ openTierCfg }}\" title=\"调节金星/钻星门槛 · 每日利率\" style=\"cursor:pointer;display:flex;align-items:center;gap:7px;background:linear-gradient(180deg,rgba(255,255,255,0.07),rgba(14,16,22,0.62));border:1px solid rgba(255,255,255,0.12);box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 8px 24px rgba(0,0,0,0.35);border-radius:99px;padding:7px 12px;backdrop-filter:blur(6px);\" style-hover=\"border-color:{{ accent }};\">
          <span style=\"font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;color:#aeb6c6;\">⚙ 参数</span>
        </div>"""
theme_btn = anchor + """
        <div onClick=\"{{ cycleTheme }}\" title=\"切换主题：极简 / 清森\" style=\"cursor:pointer;display:flex;align-items:center;gap:7px;background:linear-gradient(180deg,rgba(255,255,255,0.07),rgba(14,16,22,0.62));border:1px solid rgba(255,255,255,0.12);box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 8px 24px rgba(0,0,0,0.35);border-radius:99px;padding:7px 12px;backdrop-filter:blur(6px);\" style-hover=\"border-color:{{ accent }};\">
          <span style=\"font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;color:#aeb6c6;\">◐ {{ themeLabel }}</span>
        </div>"""
rep(anchor, theme_btn, 'theme toggle button')

# Shopping Mall redeemed status layout
rep("""              <sc-if value=\"{{ r.capped }}\" hint-placeholder-val=\"{{ false }}\">
                <div title=\"已达兑换频次上限\" style=\"text-align:center;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#8a5a5a;border:1px solid #4a2626;background:#1a1315;border-radius:8px;padding:6px 0;\">✓ {{ r.capLabel }}</div>
              </sc-if>""", """              <sc-if value=\"{{ r.capped }}\" hint-placeholder-val=\"{{ false }}\">
                <div title=\"今日已兑换 · 明日恢复\" style=\"text-align:center;font-family:'JetBrains Mono',monospace;font-weight:700;color:#9f6a70;border:1px solid #4a2b30;background:#1a1315;border-radius:8px;padding:7px 0;display:flex;flex-direction:column;gap:2px;\">
                  <div style=\"font-size:11.5px;\">✓ {{ r.capLabelTop }}</div>
                  <div style=\"font-size:9.5px;font-weight:500;color:#765158;letter-spacing:.5px;\">{{ r.capLabelBottom }}</div>
                </div>
              </sc-if>""", 'mall cap layout')

# Insert BINGO module before store
bingo_block = r'''

    <!-- BINGO -->
    <div style="background:linear-gradient(180deg,{{ cardTop }} 0%,{{ cardBot }} 100%) padding-box,linear-gradient(200deg,rgba(255,255,255,0.24),rgba(255,255,255,0.06) 38%,rgba(255,255,255,0.02) 72%,rgba(255,255,255,0.07)) border-box;border:1.5px solid transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),0 18px 46px rgba(0,0,0,0.42);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:11px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:3px;height:14px;border-radius:2px;background:{{ tierGrad }};"></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">BINGO // MOMENTUM DRAW</div>
        <div onClick="{{ openBingoCfg }}" title="设置 DAY / WEEK / MONTH 的 Bingo 奖励" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;" style-hover="border-color:{{ accent }};">⚙ 参数</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;">
        <sc-for list="{{ bingoTabs }}" as="bt" hint-placeholder-count="3">
          <div onClick="{{ bt.onClick }}" style="cursor:pointer;text-align:center;border:1px solid {{ bt.border }};background:{{ bt.bg }};border-radius:9px;padding:7px 4px;box-shadow:{{ bt.shadow }};">
            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:{{ bt.color }};letter-spacing:1px;">{{ bt.label }}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#697084;margin-top:2px;">{{ bt.sub }}</div>
          </div>
        </sc-for>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #202530;background:rgba(9,11,15,.28);border-radius:10px;padding:8px 10px;">
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.4px;color:#697084;">{{ bingoPeriodLabel }}</div><div style="font-size:12.5px;font-weight:700;color:#dfe4ec;margin-top:2px;">{{ bingoSizeLabel }} · {{ bingoDrawCount }} 次行动已落盘</div></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:{{ accent }};white-space:nowrap;">{{ bingoRewardLabel }}</div>
      </div>
      <div style="display:grid;grid-template-columns:{{ bingoGridCols }};gap:6px;">
        <sc-for list="{{ bingoCells }}" as="bc" hint-placeholder-count="9">
          <div title="{{ bc.title }}" style="min-height:{{ bingoCellH }};border:1px solid {{ bc.border }};background:{{ bc.bg }};border-radius:9px;padding:7px 6px;display:flex;align-items:center;justify-content:center;text-align:center;box-shadow:{{ bc.shadow }};overflow:hidden;">
            <div style="font-size:{{ bc.fontSize }};font-weight:700;line-height:1.35;color:{{ bc.color }};overflow-wrap:anywhere;">{{ bc.label }}</div>
          </div>
        </sc-for>
      </div>
      <div style="font-size:10.5px;color:#697084;line-height:1.6;">完成任务后，系统会在撤销窗口结束后随机落下一格。横线 / 竖线 / 对角线任意连成一线即 BINGO；每个周期最多领取一次大奖。</div>
    </div>'''
rep("\n\n    <!-- STORE -->", bingo_block + "\n\n    <!-- STORE -->", 'bingo module')

# Reflection modal generalized for reward redemption too
rep("<div style=\"font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;color:{{ accent }};\">完成 · 留下这一刻 // REFLECTION</div>", "<div style=\"font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;color:{{ accent }};\">{{ reflectionTitle }}</div>", 'reflection title')
rep("<div style=\"font-size:12px;color:#8b93a4;line-height:1.7;\">EXP 已经正常入账。这里完全可选：记两句话，或留一张照片给未来的自己。</div>", "<div style=\"font-size:12px;color:#8b93a4;line-height:1.7;\">{{ reflectionHint }}</div>", 'reflection hint')
rep("placeholder=\"今天做这件事时，我发现……\"", "placeholder=\"记录这一刻……\"", 'reflection placeholder')
rep("任务与里程碑完成时留下的文字和照片。照片保存在本机 IndexedDB，完整备份会一起打包。", "任务、里程碑与奖励兑换留下的文字和照片。照片保存在本机 IndexedDB，完整备份会一起打包。", 'gallery description')
rep("原任务与完成时间不会被改动。", "原关联项目与记录时间不会被改动。", 'gallery edit generic copy')

# Add BINGO config + celebration modal before Welcome
modal_anchor = "\n  <!-- WELCOME -->"
bingo_modals = r'''

  <!-- BINGO CONFIG -->
  <sc-if value="{{ bingoCfgOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ closeBingoCfg }}" style="position:fixed;inset:0;background:rgba(6,7,10,0.74);backdrop-filter:blur(6px);z-index:76;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div onClick="{{ stopClick }}" style="width:380px;max-width:100%;background:linear-gradient(180deg,#14171e,#0f1117);border:1px solid #2a2f3a;border-radius:16px;padding:19px;display:flex;flex-direction:column;gap:13px;box-shadow:0 28px 72px rgba(0,0,0,.76);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;color:{{ accent }};">BINGO // REWARD CONFIG</div>
        <div style="font-size:12px;color:#8b93a4;line-height:1.7;">每个周期第一次连成完整横线 / 竖线 / 对角线时领取一次奖励。默认值刻意偏高，让 Bingo 真正像一次意外分红。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <label style="font-size:10px;color:#697084;">DAY 3×3<input id="bg-day" type="number" min="0" step="1" defaultValue="{{ bingoRewardDay }}" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-family:'JetBrains Mono',monospace;"></label>
          <label style="font-size:10px;color:#697084;">WEEK 4×4<input id="bg-week" type="number" min="0" step="1" defaultValue="{{ bingoRewardWeek }}" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-family:'JetBrains Mono',monospace;"></label>
          <label style="font-size:10px;color:#697084;">MONTH 5×5<input id="bg-month" type="number" min="0" step="1" defaultValue="{{ bingoRewardMonth }}" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-family:'JetBrains Mono',monospace;"></label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;"><div onClick="{{ closeBingoCfg }}" style="cursor:pointer;font-size:12px;color:#8b93a4;border:1px solid #262b36;border-radius:8px;padding:8px 14px;">取消</div><div onClick="{{ saveBingoCfg }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};border-radius:8px;padding:8px 18px;">保存</div></div>
      </div>
    </div>
  </sc-if>

  <!-- BINGO CELEBRATION -->
  <sc-if value="{{ bingoCelebrationOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ closeBingoCelebration }}" style="position:fixed;inset:0;z-index:95;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.06),rgba(5,7,9,.90) 58%,rgba(3,4,6,.97));backdrop-filter:blur(7px);overflow:hidden;display:flex;align-items:center;justify-content:center;padding:18px;">
      <sc-for list="{{ bingoConfetti }}" as="cf" hint-placeholder-count="0"><div class="bingo-particle" style="left:{{ cf.left }};background:{{ cf.color }};--delay:{{ cf.delay }};--dur:{{ cf.duration }};--drift:{{ cf.drift }};--rot:{{ cf.rot }};"></div></sc-for>
      <div onClick="{{ stopClick }}" style="position:relative;z-index:2;width:390px;max-width:100%;text-align:center;background:linear-gradient(180deg,rgba(22,25,31,.94),rgba(10,12,16,.97));border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:26px 20px 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 30px 90px rgba(0,0,0,.78);animation:bingoGlow 1.8s ease-in-out 2;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:4px;color:{{ accent }};">MOMENTUM DRAW</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700;letter-spacing:8px;margin:10px 0 6px;background-image:{{ btnGrad }};-webkit-background-clip:text;background-clip:text;color:transparent;">BINGO</div>
        <div style="font-size:12px;color:#8b93a4;line-height:1.6;margin-bottom:14px;">随机行动连成一线。今天的 Momentum 给你发了一笔意外分红。</div>
        <div style="display:flex;flex-direction:column;gap:7px;margin:0 auto 14px;max-width:270px;"><sc-for list="{{ bingoWinRows }}" as="bw" hint-placeholder-count="1"><div style="display:flex;justify-content:space-between;gap:10px;border:1px solid #242a35;background:#0d0f14;border-radius:9px;padding:8px 10px;font-family:'JetBrains Mono',monospace;font-size:10.5px;"><span style="color:#aeb6c6;">{{ bw.label }}</span><span style="color:{{ accent }};font-weight:700;">{{ bw.reward }}</span></div></sc-for></div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:25px;font-weight:700;color:#eef1f7;">+{{ bingoCelebrationReward }} EXP</div>
        <div onClick="{{ closeBingoCelebration }}" style="cursor:pointer;margin:18px auto 0;max-width:190px;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};border-radius:9px;padding:9px 18px;">收下这份惊喜</div>
      </div>
    </div>
  </sc-if>'''
rep(modal_anchor, bingo_modals + modal_anchor, 'bingo modals')

# Migration fields
rep("      if (!s.uiMode) s.uiMode = 'auto';\n      if (s.welcomed == null) s.welcomed = true;", """      if (!s.uiMode) s.uiMode = 'auto';
      if (!s.uiTheme) s.uiTheme = 'minimal';
      if (!s.bingoView) s.bingoView = 'day';
      if (!s.bingoRewards) s.bingoRewards = { day: 88, week: 288, month: 888 };
      s.bingoBoards = this.normalizeBingoBoards(s.bingoBoards || {});
      if (s.welcomed == null) s.welcomed = true;""", 'migration theme bingo')
rep("      appVersion: APP_VERSION, welcomed: false, uiMode: 'auto',", "      appVersion: APP_VERSION, welcomed: false, uiMode: 'auto', uiTheme: 'minimal', bingoView: 'day', bingoRewards: { day: 88, week: 288, month: 888 }, bingoBoards: this.defaultBingoBoards(),", 'default theme bingo')

# Transient state exclusions
rep("galleryEditRemoveImage, pomoCfgOpen, backupFullCode, ...persist", "galleryEditRemoveImage, pomoCfgOpen, bingoCfgOpen, bingoCelebration, backupFullCode, ...persist", 'save transient bingo')
rep("galleryEditRemoveImage, pomoCfgOpen, backupFullCode, ...data", "galleryEditRemoveImage, pomoCfgOpen, bingoCfgOpen, bingoCelebration, backupFullCode, ...data", 'full backup transient bingo')
rep("galleryEditRemoveImage, pomoCfgOpen, backupFullCode, ...data } = this.state; const lite", "galleryEditRemoveImage, pomoCfgOpen, bingoCfgOpen, bingoCelebration, backupFullCode, ...data } = this.state; const lite", 'lite backup transient bingo')

# Component mount resets Bingo periods; unmount clears timers
rep("    if (this.state.vw == null) this.setState({ vw: window.innerWidth });\n  }\n  componentWillUnmount() { clearInterval(this._intTimer);", "    if (this.state.vw == null) this.setState({ vw: window.innerWidth });\n    this.refreshBingoBoards();\n  }\n  componentWillUnmount() { if (this._bingoTimers) Object.values(this._bingoTimers).forEach(clearTimeout); clearInterval(this._intTimer);", 'bingo lifecycle')

# Reward redemption also opens reflection
rep("""    this.save({ exp: this.state.exp - r.cost, rewards: this.state.rewards.map(x => x.id === id ? { ...x, redeems: [...(x.redeems || []), ts].slice(-50) } : x), ledger: [{ ts, name: '兑换 · ' + r.name, delta: -r.cost }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'redeem', id, cost: r.cost, ledgerTs: ts, rts: ts } });""", """    this.save({ exp: this.state.exp - r.cost, rewards: this.state.rewards.map(x => x.id === id ? { ...x, redeems: [...(x.redeems || []), ts].slice(-50) } : x), ledger: [{ ts, name: '兑换 · ' + r.name, delta: -r.cost }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'redeem', id, cost: r.cost, ledgerTs: ts, rts: ts }, reflectionOpen: true, reflectionTarget: { kind: 'reward', id, name: r.name, ts }, reflectionBlob: null, reflectionPreview: '' });""", 'reward reflection')

# Schedule BINGO after undo window
rep("""    this.armTimer(key);
    const unit = { daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '';""", """    this.armTimer(key);
    const bingoTimerKey = key + ':' + ts; this.scheduleBingoDraw(bingoTimerKey, { id: t.id, name: t.name });
    const unit = { daily: '天', weekly: '周', monthly: '月' }[t.cycle] || '';""", 'schedule bingo')
rep("""pending: { key, kind: 'complete', id, k, exp: t.exp, ledgerTs: ts, streakChanged, prevStreak, prevPeriod, prevLastDone: t.lastDone || '' }, reflectionOpen:""", """pending: { key, kind: 'complete', id, k, exp: t.exp, ledgerTs: ts, streakChanged, prevStreak, prevPeriod, prevLastDone: t.lastDone || '', bingoTimerKey }, reflectionOpen:""", 'pending bingo timer key')
rep("""    if (p.kind === 'complete') this.save({ tasks: this.state.tasks.map(x => x.id === p.id ? { ...x, done: { ...x.done, [p.k]: Math.max(0, (x.done[p.k] || 1) - 1) }, ...(p.streakChanged ? { streak: p.prevStreak, lastPeriod: p.prevPeriod, lastDone: p.prevLastDone } : {}) } : x), exp: this.state.exp - p.exp, ledger: rm(this.state.ledger), pending: null });""", """    if (p.kind === 'complete') { this.cancelBingoDraw(p.bingoTimerKey); this.save({ tasks: this.state.tasks.map(x => x.id === p.id ? { ...x, done: { ...x.done, [p.k]: Math.max(0, (x.done[p.k] || 1) - 1) }, ...(p.streakChanged ? { streak: p.prevStreak, lastPeriod: p.prevPeriod, lastDone: p.prevLastDone } : {}) } : x), exp: this.state.exp - p.exp, ledger: rm(this.state.ledger), pending: null }); }""", 'undo bingo cancel')

# Theme + Bingo methods after cycleUiMode
methods_anchor = "  cycleUiMode() { const list = ['auto', 'phone', 'tablet', 'desktop']; const i = list.indexOf(this.state.uiMode || 'auto'); this.save({ uiMode: list[(i + 1) % list.length] }); }"
methods = methods_anchor + r'''
  cycleTheme() { this.save({ uiTheme: (this.state.uiTheme || 'minimal') === 'minimal' ? 'verdant' : 'minimal' }); }
  bingoPeriodKey(period) { return this.keyFor(period === 'day' ? 'daily' : period === 'week' ? 'weekly' : 'monthly', new Date()); }
  bingoSize(period) { return period === 'day' ? 3 : period === 'week' ? 4 : 5; }
  newBingoBoard(period) { const n = this.bingoSize(period); return { key: this.bingoPeriodKey(period), cells: Array(n * n).fill(null), draws: 0, rewarded: false, winLine: [] }; }
  defaultBingoBoards() { return { day: this.newBingoBoard('day'), week: this.newBingoBoard('week'), month: this.newBingoBoard('month') }; }
  normalizeBingoBoard(period, board) {
    const n = this.bingoSize(period), key = this.bingoPeriodKey(period), total = n * n;
    if (!board || board.key !== key) return this.newBingoBoard(period);
    const cells = Array.isArray(board.cells) ? board.cells.slice(0, total) : [];
    while (cells.length < total) cells.push(null);
    return { ...board, key, cells, draws: Number(board.draws || cells.filter(Boolean).length), rewarded: !!board.rewarded, winLine: Array.isArray(board.winLine) ? board.winLine : [] };
  }
  normalizeBingoBoards(boards) { boards = boards || {}; return { day: this.normalizeBingoBoard('day', boards.day), week: this.normalizeBingoBoard('week', boards.week), month: this.normalizeBingoBoard('month', boards.month) }; }
  refreshBingoBoards() { const next = this.normalizeBingoBoards(this.state.bingoBoards || {}); if (JSON.stringify(next) !== JSON.stringify(this.state.bingoBoards || {})) this.save({ bingoBoards: next }); }
  bingoWinLine(cells, n) {
    const lines = [];
    for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
    for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
    lines.push(Array.from({ length: n }, (_, i) => i * n + i));
    lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
    return lines.find(line => line.every(i => !!cells[i])) || null;
  }
  scheduleBingoDraw(timerKey, task) {
    this._bingoTimers = this._bingoTimers || {}; clearTimeout(this._bingoTimers[timerKey]);
    this._bingoTimers[timerKey] = setTimeout(() => { delete this._bingoTimers[timerKey]; this.bingoDrawTask(task); }, 4700);
  }
  cancelBingoDraw(timerKey) { if (!timerKey || !this._bingoTimers) return; clearTimeout(this._bingoTimers[timerKey]); delete this._bingoTimers[timerKey]; }
  bingoDrawTask(task) {
    if (!task) return;
    const periods = ['day','week','month'], names = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' };
    const cfg = this.state.bingoRewards || { day: 88, week: 288, month: 888 };
    const boards = this.normalizeBingoBoards(this.state.bingoBoards || {}), now = Date.now();
    const wins = []; let totalReward = 0; const ledgerAdds = [];
    periods.forEach((period, pi) => {
      const b = { ...boards[period], cells: [...boards[period].cells], winLine: [...(boards[period].winLine || [])] };
      const empty = b.cells.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      if (empty.length) { const idx = empty[Math.floor(Math.random() * empty.length)]; b.cells[idx] = { taskId: task.id, name: task.name, ts: now }; b.draws = (b.draws || 0) + 1; }
      const line = this.bingoWinLine(b.cells, this.bingoSize(period));
      if (line && !b.rewarded) {
        b.rewarded = true; b.winLine = line;
        const reward = Math.max(0, parseInt(cfg[period]) || 0); totalReward += reward;
        wins.push({ period, label: names[period] + ' BINGO', reward });
        if (reward > 0) ledgerAdds.push({ ts: now + pi, name: 'BINGO · ' + names[period], delta: reward });
      }
      boards[period] = b;
    });
    const patch = { bingoBoards: boards };
    if (wins.length) {
      patch.exp = this.state.exp + totalReward;
      patch.ledger = [...ledgerAdds, ...this.state.ledger].slice(0, 200);
      patch.bingoCelebration = { wins, totalReward };
      patch.momentumMsg = 'BINGO · +' + totalReward + ' EXP · Momentum 分红到账';
      clearTimeout(this._bingoCelebrationTimer); this._bingoCelebrationTimer = setTimeout(() => this.setState({ bingoCelebration: null, momentumMsg: '' }), 7000);
    }
    this.save(patch);
  }
  openBingoCfg() { this.setState({ bingoCfgOpen: true }); }
  closeBingoCfg() { this.setState({ bingoCfgOpen: false }); }
  saveBingoCfg() {
    const read = (id, fb) => { const n = parseInt(this.v(id)); return isNaN(n) ? fb : Math.max(0, n); };
    const old = this.state.bingoRewards || { day: 88, week: 288, month: 888 };
    this.save({ bingoRewards: { day: read('bg-day', old.day), week: read('bg-week', old.week), month: read('bg-month', old.month) }, bingoCfgOpen: false });
  }
  setBingoView(period) { if (['day','week','month'].includes(period)) this.save({ bingoView: period }); }
  closeBingoCelebration() { clearTimeout(this._bingoCelebrationTimer); this.setState({ bingoCelebration: null }); }'''
rep(methods_anchor, methods, 'theme bingo methods')

# Theme skin in render
rep("    const accent = tier.accent;", """    const verdant = (this.state.uiTheme || 'minimal') === 'verdant';
    const skin = verdant ? {
      accent: '#7bd6a2', cardTop: '#142019', cardBot: '#0b1510', rowTop: '#101b15', rowBot: '#0a120e',
      pageBg: 'radial-gradient(1100px 520px at 78% -10%,rgba(107,203,151,0.13),transparent 62%),radial-gradient(900px 500px at 4% 8%,rgba(172,228,196,0.08),transparent 60%),linear-gradient(180deg,#0b120e 0%,#07100c 55%,#09130e 100%)',
      scene: 'radial-gradient(1320px 650px at 84% -14%,rgba(94,191,137,0.22),transparent 58%),radial-gradient(1100px 700px at 2% 112%,rgba(116,180,142,0.16),transparent 62%),linear-gradient(180deg,rgba(14,32,23,.42),rgba(8,20,14,.38))',
      heroBg: 'radial-gradient(145% 168% at 80% -30%,rgba(188,236,207,0.44),transparent 56%),radial-gradient(104% 138% at 8% 120%,rgba(68,139,96,0.36),transparent 60%),radial-gradient(66% 84% at 55% 30%,rgba(225,246,232,0.18),transparent 60%),linear-gradient(122deg,#1c3728 0%,#28513a 46%,#14291e 100%)',
      heroSheen: 'repeating-linear-gradient(110deg,rgba(220,255,232,0.07) 0 1.5px,transparent 1.5px 8px)',
      btnGrad: 'linear-gradient(180deg,#dff6e8 0%,#b9e8ca 22%,#79c99b 55%,#4b996d 82%,#69b989 100%)'
    } : null;
    const accent = skin ? skin.accent : tier.accent;
    const btnGrad = skin ? skin.btnGrad : tier.btnGrad;
    const cardTop = skin ? skin.cardTop : tier.cardTop, cardBot = skin ? skin.cardBot : tier.cardBot;
    const rowTop = skin ? skin.rowTop : tier.rowTop, rowBot = skin ? skin.rowBot : tier.rowBot;
    const pageBg = skin ? skin.pageBg : 'radial-gradient(1100px 480px at 75% -8%,rgba(139,92,246,0.10),transparent 62%),radial-gradient(900px 420px at 8% 4%,rgba(96,165,250,0.07),transparent 60%),radial-gradient(1400px 700px at 50% 115%,rgba(139,92,246,0.05),transparent 65%),linear-gradient(180deg,#0d0e14 0%,#0a0b10 55%,#0b0c12 100%)';""", 'theme skin render')
rep("const chip = a => ({ bg: a ? tier.btnGrad : 'transparent'", "const chip = a => ({ bg: a ? btnGrad : 'transparent'", 'theme chip grad')
rep("roDragBg: (st.roMode || 'drag') === 'drag' ? (tier.btnGrad)", "roDragBg: (st.roMode || 'drag') === 'drag' ? btnGrad", 'theme reorder drag')
rep("roSelBg: (st.roMode || 'drag') === 'select' ? (tier.btnGrad)", "roSelBg: (st.roMode || 'drag') === 'select' ? btnGrad", 'theme reorder select')

# Shopping Mall render labels
rep("      const capLabel = '今日已兑换 · 明日可兑';", "      const capLabelTop = '今日已兑换', capLabelBottom = '明日可兑';", 'cap render labels')
rep("      capped: capped && !rp, capLabel, hasCapHint: !!capHint, capHint,", "      capped: capped && !rp, capLabelTop, capLabelBottom, hasCapHint: !!capHint, capHint,", 'cap props')

# Gallery kind mapping includes rewards
rep("""        hasImage: !!imgUrl, imgUrl, kindLabel: g.kind === 'milestone' ? 'MILESTONE' : 'TASK', kindColor: g.kind === 'milestone' ? '#e6c46a' : '#60a5fa',""", """        hasImage: !!imgUrl, imgUrl, kindLabel: g.kind === 'milestone' ? 'MILESTONE' : g.kind === 'reward' ? 'REWARD' : 'TASK', kindColor: g.kind === 'milestone' ? '#e6c46a' : g.kind === 'reward' ? '#f0a6b4' : '#60a5fa',""", 'gallery reward kind')

# Bingo render model before countdowns
render_anchor = "    const countdowns = (st.countdowns || []).map(c => {"
bingo_render = r'''    const bingoView = ['day','week','month'].includes(st.bingoView) ? st.bingoView : 'day';
    const bingoBoardsNow = this.normalizeBingoBoards(st.bingoBoards || {});
    const bingoBoard = bingoBoardsNow[bingoView], bingoN = this.bingoSize(bingoView);
    const bingoRewards = st.bingoRewards || { day: 88, week: 288, month: 888 };
    const bingoNames = { day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY' };
    const bingoTabs = ['day','week','month'].map(p => { const active = p === bingoView; const b = bingoBoardsNow[p]; return { key: p, label: bingoNames[p], sub: (b.rewarded ? '✓ BINGO' : (b.draws || 0) + ' DRAW'), color: active ? '#14151c' : '#aeb6c6', bg: active ? btnGrad : 'rgba(13,15,20,.45)', border: active ? 'transparent' : '#2a2f3a', shadow: active ? 'inset 0 1px 0 rgba(255,255,255,.58)' : 'none', onClick: () => this.setBingoView(p) }; });
    const winSet = new Set(bingoBoard.winLine || []);
    const bingoCells = bingoBoard.cells.map((cell, i) => ({ key: bingoView + '-' + i, label: cell ? cell.name : '?', title: cell ? cell.name : '等待下一次随机落位', filled: !!cell, border: winSet.has(i) ? accent : (cell ? 'rgba(255,255,255,.16)' : '#222833'), bg: winSet.has(i) ? 'linear-gradient(160deg,rgba(255,255,255,.16),rgba(123,214,162,.12))' : (cell ? 'rgba(18,22,26,.82)' : 'rgba(10,12,16,.38)'), shadow: winSet.has(i) ? '0 0 18px rgba(123,214,162,.18),inset 0 1px 0 rgba(255,255,255,.12)' : 'inset 0 1px 0 rgba(255,255,255,.03)', color: cell ? '#e8ecf2' : '#3f4654', fontSize: bingoN === 3 ? '11.5px' : bingoN === 4 ? '10px' : '9px' }));
    const celebration = st.bingoCelebration || null;
    const confColors = verdant ? ['#dff6e8','#7bd6a2','#c9e8d4','#f1e0ac'] : ['#f8e8bb','#e0c16b','#f4f0e7','#cdb6f2'];
    const bingoConfetti = celebration ? Array.from({ length: 46 }, (_, i) => ({ key: i, left: (4 + (i * 37) % 92) + '%', color: confColors[i % confColors.length], delay: ((i % 11) * .055).toFixed(2) + 's', duration: (1.65 + (i % 6) * .16).toFixed(2) + 's', drift: (((i * 29) % 150) - 75) + 'px', rot: ((i * 53) % 420) + 'deg' })) : [];
''' + render_anchor
rep(render_anchor, bingo_render, 'bingo render model')

# Return props: reflection, themes, bingo, surface colors
rep("""      reflectionOpen: !!st.reflectionOpen, reflectionTargetName: st.reflectionTarget ? st.reflectionTarget.name : '', reflectionHasImage: !!st.reflectionPreview, reflectionNoImage: !st.reflectionPreview, reflectionPreview: st.reflectionPreview || '',""", """      reflectionOpen: !!st.reflectionOpen, reflectionTargetName: st.reflectionTarget ? st.reflectionTarget.name : '', reflectionTitle: st.reflectionTarget && st.reflectionTarget.kind === 'reward' ? '兑换 · 留下这一刻 // REWARD MEMORY' : '完成 · 留下这一刻 // REFLECTION', reflectionHint: st.reflectionTarget && st.reflectionTarget.kind === 'reward' ? '奖励已经兑换，EXP 已正常扣除。这里完全可选：记两句话，或留一张照片给未来的自己。' : 'EXP 已经正常入账。这里完全可选：记两句话，或留一张照片给未来的自己。', reflectionHasImage: !!st.reflectionPreview, reflectionNoImage: !st.reflectionPreview, reflectionPreview: st.reflectionPreview || '',""", 'reflection props')
rep("""      earned, spent, todayEarned: '+' + todayEarned,
      tierName: tier.name, tierIcon: tier.icon, tierBorder: tier.border, tierGrad: tier.grad, btnGrad: tier.btnGrad, tierScene: tier.scene, heroBg: tier.heroBg, heroSheen: tier.heroSheen,
      cardTop: tier.cardTop, cardBot: tier.cardBot, rowTop: tier.rowTop, rowBot: tier.rowBot,""", """      earned, spent, todayEarned: '+' + todayEarned,
      themeLabel: verdant ? '清森' : '极简', cycleTheme: () => this.cycleTheme(), pageBg,
      bingoTabs, bingoCells, bingoGridCols: `repeat(${bingoN},minmax(0,1fr))`, bingoCellH: bingoN === 3 ? '66px' : bingoN === 4 ? '54px' : '44px', bingoPeriodLabel: bingoNames[bingoView] + ' BOARD', bingoSizeLabel: bingoN + ' × ' + bingoN, bingoDrawCount: bingoBoard.draws || 0, bingoRewardLabel: '+' + Math.max(0, parseInt(bingoRewards[bingoView]) || 0) + ' EXP', bingoCfgOpen: !!st.bingoCfgOpen, openBingoCfg: () => this.openBingoCfg(), closeBingoCfg: () => this.closeBingoCfg(), saveBingoCfg: () => this.saveBingoCfg(), bingoRewardDay: bingoRewards.day, bingoRewardWeek: bingoRewards.week, bingoRewardMonth: bingoRewards.month,
      bingoCelebrationOpen: !!celebration, bingoCelebrationReward: celebration ? celebration.totalReward : 0, bingoWinRows: celebration ? celebration.wins.map(w => ({ label: w.label, reward: '+' + w.reward + ' EXP' })) : [], bingoConfetti, closeBingoCelebration: () => this.closeBingoCelebration(),
      tierName: tier.name, tierIcon: tier.icon, tierBorder: tier.border, tierGrad: tier.grad, btnGrad, tierScene: skin ? skin.scene : tier.scene, heroBg: skin ? skin.heroBg : tier.heroBg, heroSheen: skin ? skin.heroSheen : tier.heroSheen,
      cardTop, cardBot, rowTop, rowBot,""", 'return theme bingo props')

# Update note copy for v1.5 major changes
rep("<div style=\"font-size:12.5px;color:#8b93a4;line-height:1.75;\">从 {{ prevVersion }} 升级。你的 EXP、任务、里程碑、账本全部原样保留 —— 更新只替换程序，不会动你的数据。</div>", "<div style=\"font-size:12.5px;color:#8b93a4;line-height:1.75;\">从 {{ prevVersion }} 升级。新增成长奖励集锦、极简 / 清森双主题与随机 BINGO Momentum Draw；你的 EXP、任务、里程碑、账本原样保留。</div>", 'update note copy')

# Guardrails
required = [
    "const APP_VERSION = 'v1.5.0';", "BINGO // MOMENTUM DRAW", "cycleTheme()", "bingoDrawTask(task)",
    "reflectionTarget: { kind: 'reward'", "capLabelBottom", "uiTheme: 'minimal'", "bingoRewards: { day: 88, week: 288, month: 888 }"
]
for marker in required:
    if marker not in text: raise SystemExit('FINAL MARKER MISSING: ' + marker)

IDX.write_text(text, encoding='utf-8')
sw = SW.read_text(encoding='utf-8')
if "const CACHE = 'exp-bank-v1.3.1';" not in sw: raise SystemExit('MISSING sw old cache')
sw = sw.replace("const CACHE = 'exp-bank-v1.3.1';", "const CACHE = 'exp-bank-v1.5.0';", 1)
SW.write_text(sw, encoding='utf-8')
print('PATCH COMPLETE')
