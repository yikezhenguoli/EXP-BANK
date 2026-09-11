from pathlib import Path

IDX = Path('index.html')
SW = Path('sw.js')
s = IDX.read_text(encoding='utf-8')


def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)


def at_least(old, new, label, minimum=1):
    global s
    n = s.count(old)
    if n < minimum:
        raise SystemExit(f'{label}: expected at least {minimum} matches, got {n}')
    s = s.replace(old, new)


# Version
one("const APP_VERSION = 'v1.2.0';", "const APP_VERSION = 'v1.3.0';", 'app version')

# Backward-compatible state migration.
one("      if (!s.pomoPreset) s.pomoPreset = '25';\n      if (s.pomoCustomMin == null) s.pomoCustomMin = 30;",
    "      if (!s.pomoPreset) s.pomoPreset = '25';\n      if (s.pomoCustomMin == null) s.pomoCustomMin = 30;\n      if (s.pomoTaskName == null) s.pomoTaskName = '番茄专注';\n      if (s.pomoRewardExp == null) s.pomoRewardExp = 0;",
    'pomo migration')
one("      if (!Array.isArray(s.opex)) s.opex = [];\n      if (!Array.isArray(s.stash)) s.stash = [];",
    "      if (!Array.isArray(s.opex)) s.opex = [];\n      if (!s.opexSortMode) s.opexSortMode = 'date';\n      if (!Array.isArray(s.stash)) s.stash = [];",
    'opex migration')
one("      opex: [], opexCurrency: '\\\\u00a5', opexLastLogDay: '',",
    "      opex: [], opexCurrency: '\\\\u00a5', opexLastLogDay: '', opexSortMode: 'date',",
    'opex defaults')
one("      pomoPreset: '25', pomoCustomMin: 30, noisePreset: '咖啡馆', noiseVol: 0.5,",
    "      pomoPreset: '25', pomoCustomMin: 30, pomoTaskName: '番茄专注', pomoRewardExp: 0, noisePreset: '咖啡馆', noiseVol: 0.5,",
    'pomo defaults')

# Keep new UI-only state out of localStorage / backup payloads.
at_least("galleryOpen, galleryImageUrls, backupFullCode",
         "galleryOpen, galleryImageUrls, galleryEdit, galleryEditBlob, galleryEditPreview, galleryEditRemoveImage, pomoCfgOpen, backupFullCode",
         'transient state exclusion', 2)

# Countdown: replace locale-dependent native time picker with explicit 24-hour fields.
one('''          <label style="flex:1;font-size:11px;color:#697084;">时间
            <input id="nc-time" type="time" value="00:00" step="60" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#aeb6c6;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
          </label>''', '''          <div style="flex:1.15;font-size:11px;color:#697084;">时间（24 小时制）
            <div style="display:flex;align-items:center;gap:5px;margin-top:4px;">
              <input id="nc-hour" type="number" min="0" max="23" step="1" value="0" inputmode="numeric" aria-label="小时 0 到 23" style="width:48%;box-sizing:border-box;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 6px;color:#e6e9f0;text-align:center;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
              <span style="font-family:\'JetBrains Mono\',monospace;color:#697084;">:</span>
              <input id="nc-minute" type="number" min="0" max="59" step="1" value="0" inputmode="numeric" aria-label="分钟 0 到 59" style="width:48%;box-sizing:border-box;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 6px;color:#e6e9f0;text-align:center;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
            </div>
            <div style="font-family:\'JetBrains Mono\',monospace;font-size:9.5px;color:#535a6a;margin-top:4px;">00 = 零点 · 12 = 中午</div>
          </div>''', 'new countdown 24h input')
one('''              <label style="flex:1;font-size:11px;color:#697084;">时间
                <input id="ed-time" type="time" step="60" defaultValue="{{ editTime }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#aeb6c6;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
              </label>''', '''              <div style="flex:1.15;font-size:11px;color:#697084;">时间（24 小时制）
                <div style="display:flex;align-items:center;gap:5px;margin-top:4px;">
                  <input id="ed-hour" type="number" min="0" max="23" step="1" defaultValue="{{ editHour }}" inputmode="numeric" aria-label="小时 0 到 23" style="width:48%;box-sizing:border-box;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 6px;color:#e6e9f0;text-align:center;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
                  <span style="font-family:\'JetBrains Mono\',monospace;color:#697084;">:</span>
                  <input id="ed-minute" type="number" min="0" max="59" step="1" defaultValue="{{ editMinute }}" inputmode="numeric" aria-label="分钟 0 到 59" style="width:48%;box-sizing:border-box;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 6px;color:#e6e9f0;text-align:center;font-size:13px;font-family:\'JetBrains Mono\',monospace;">
                </div>
                <div style="font-family:\'JetBrains Mono\',monospace;font-size:9.5px;color:#535a6a;margin-top:4px;">00 = 零点 · 12 = 中午</div>
              </div>''', 'edit countdown 24h input')
one('''            <div style="font-size:16px;font-weight:700;letter-spacing:0.2px;color:#eef1f7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ cd.name }}</div>''', '''            <div style="font-size:16px;font-weight:700;letter-spacing:0.2px;line-height:1.45;color:#eef1f7;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">{{ cd.name }}</div>''', 'countdown long title')

# Pomodoro header, current task summary, and config modal.
one('''      <div style="display:flex;align-items:center;gap:8px;"><div style="width:3px;height:14px;border-radius:2px;background:{{ tierGrad }};"></div><div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;">番茄专注 // FOCUS</div></div>''', '''      <div style="display:flex;align-items:center;gap:8px;"><div style="width:3px;height:14px;border-radius:2px;background:{{ tierGrad }};"></div><div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">番茄专注 // FOCUS</div><div onClick="{{ openPomoCfg }}" title="设置本轮任务名称与完成奖励" style="cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 11px;" style-hover="border-color:{{ accent }};">⚙ 参数</div></div>''', 'pomo config button')
one('''      <div style="display:flex;justify-content:center;gap:8px;">
        <div onClick="{{ setP25 }}"''', '''      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #202530;background:rgba(10,12,17,0.32);border-radius:10px;padding:9px 11px;">
        <div style="min-width:0;"><div style="font-family:\'JetBrains Mono\',monospace;font-size:9.5px;letter-spacing:1px;color:#697084;">CURRENT TASK</div><div style="font-size:13px;font-weight:700;color:#eef1f7;overflow-wrap:anywhere;">{{ pomoTaskName }}</div></div>
        <div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;color:{{ accent }};white-space:nowrap;">{{ pomoRewardLabel }}</div>
      </div>
      <div style="display:flex;justify-content:center;gap:8px;">
        <div onClick="{{ setP25 }}"''', 'pomo current task summary')
one('''  <!-- FOUR QUADRANTS MODAL -->''', '''  <!-- POMODORO CONFIG MODAL -->
  <sc-if value="{{ pomoCfgOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ closePomoCfg }}" style="position:fixed;inset:0;background:rgba(6,7,10,0.72);backdrop-filter:blur(5px);z-index:70;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div onClick="{{ stopClick }}" style="width:360px;max-width:100%;background:#101218;border:1px solid #2a2f3a;border-radius:16px;padding:19px;display:flex;flex-direction:column;gap:13px;box-shadow:0 26px 70px rgba(0,0,0,0.72);">
        <div style="font-family:\'JetBrains Mono\',monospace;font-size:12px;letter-spacing:2px;color:#aeb6c6;">番茄参数 // FOCUS CONFIG</div>
        <label style="display:block;font-size:11px;color:#697084;">当前计时任务名称
          <input id="pc-task" defaultValue="{{ pomoTaskName }}" placeholder="例如：计算机二级操作题" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:10px;color:#e6e9f0;font-size:14px;font-family:inherit;">
        </label>
        <label style="display:block;font-size:11px;color:#697084;">自然完成后奖励 EXP
          <input id="pc-exp" type="number" min="0" step="1" defaultValue="{{ pomoRewardExp }}" placeholder="0" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:10px;color:#e6e9f0;font-size:14px;font-family:\'JetBrains Mono\',monospace;">
        </label>
        <div style="font-size:11px;color:#697084;line-height:1.7;">只在倒计时自然走到 00:00 时入账；暂停、重置不会获得 EXP。设置为 0 即不奖励。</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <div onClick="{{ closePomoCfg }}" style="cursor:pointer;font-size:12.5px;color:#8b93a4;border:1px solid #262b36;border-radius:8px;padding:8px 14px;">取消</div>
          <div onClick="{{ savePomoCfg }}" style="cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35);border-radius:8px;padding:8px 18px;">保存</div>
        </div>
      </div>
    </div>
  </sc-if>

  <!-- FOUR QUADRANTS MODAL -->''', 'pomo config modal')

# OPEX and stash controls.
one('''        <div onClick="{{ cycleCurrency }}" title="切换货币符号" style="cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 11px;" style-hover="border-color:{{ accent }};">{{ opexCurrency }}</div>
        <div onClick="{{ openNewOpex }}"''', '''        <div onClick="{{ cycleCurrency }}" title="切换货币符号" style="cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 11px;" style-hover="border-color:{{ accent }};">{{ opexCurrency }}</div>
        <div onClick="{{ startReorderOpex }}" title="长按拖动排序开销记录" style="cursor:pointer;font-family:\'JetBrains Mono\',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;" style-hover="border-color:{{ accent }};">⇅</div>
        <div onClick="{{ openNewOpex }}"''', 'opex sort button')
one('''          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid transparent;border-radius:11px;background:linear-gradient(180deg,{{ rowTop }} 0%,{{ rowBot }} 100%) padding-box,linear-gradient(200deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04) 45%,rgba(255,255,255,0.02)) border-box;">''', '''          <div onClick="{{ o.onEdit }}" title="点击编辑开销记录" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid transparent;border-radius:11px;background:linear-gradient(180deg,{{ rowTop }} 0%,{{ rowBot }} 100%) padding-box,linear-gradient(200deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04) 45%,rgba(255,255,255,0.02)) border-box;">''', 'opex row editable')
one('''        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">存钱罐 // STASH</div>
        <div onClick="{{ openNewStash }}"''', '''        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">存钱罐 // STASH</div>
        <div onClick="{{ startReorderStash }}" title="长按拖动排序存钱目标" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;" style-hover="border-color:{{ accent }};">⇅</div>
        <div onClick="{{ openNewStash }}"''', 'stash sort button')
one('''            <sc-if value="{{ s.reached }}" hint-placeholder-val="{{ false }}"><div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#4ade80;">✦ 已达成</div></sc-if>
            <div onClick="{{ s.onDel }}"''', '''            <sc-if value="{{ s.reached }}" hint-placeholder-val="{{ false }}"><div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#4ade80;">✦ 已达成</div></sc-if>
            <div onClick="{{ s.onEdit }}" title="编辑存钱目标" style="cursor:pointer;color:#5a6172;font-size:13px;" style-hover="color:#c8cedb;">✎</div>
            <div onClick="{{ s.onDel }}"''', 'stash edit icon')
one('''          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b93a4;">{{ s.savedStr }} / {{ s.targetStr }} · {{ s.pct }}</div>
            <input id="stash-{{ s.id }}" type="number" placeholder="存入金额" style="width:96px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:7px 9px;color:#e6e9f0;font-size:13px;font-family:'JetBrains Mono',monospace;">
            <div onClick="{{ s.onSave }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.6);border-radius:8px;padding:7px 13px;white-space:nowrap;" style-hover="filter:brightness(1.12);">存入</div>
          </div>''', '''          <div style="display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap;">
            <div style="flex:1;min-width:150px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#8b93a4;">{{ s.savedStr }} / {{ s.targetStr }} · {{ s.pct }}</div>
            <input id="stash-{{ s.id }}" type="number" min="0" step="0.01" placeholder="金额" style="width:104px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:7px 9px;color:#e6e9f0;font-size:13px;font-family:'JetBrains Mono',monospace;">
            <div style="display:flex;flex-direction:column;gap:5px;">
              <div onClick="{{ s.onSave }}" style="cursor:pointer;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.6);border-radius:8px;padding:6px 13px;white-space:nowrap;" style-hover="filter:brightness(1.12);">存入</div>
              <div onClick="{{ s.onWithdraw }}" style="cursor:pointer;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#f0b6b6;border:1px solid #4a2a2e;background:#1b1215;border-radius:8px;padding:5px 13px;white-space:nowrap;" style-hover="border-color:#f87171;color:#fecaca;">支出</div>
            </div>
          </div>''', 'stash deposit withdraw controls')

# Gallery card is clickable, and gallery edit modal is added.
one('''            <div style="border:1px solid #222833;background:linear-gradient(180deg,#12151c,#0d0f14);border-radius:12px;padding:13px;display:flex;flex-direction:column;gap:9px;">''', '''            <div onClick="{{ g.onEdit }}" title="点击编辑 / 补录" style="cursor:pointer;border:1px solid #222833;background:linear-gradient(180deg,#12151c,#0d0f14);border-radius:12px;padding:13px;display:flex;flex-direction:column;gap:9px;" style-hover="border-color:{{ accent }};">''', 'gallery card edit click')
one('''  <!-- IMAGE EDIT MODAL -->''', '''  <!-- GALLERY EDIT MODAL -->
  <sc-if value="{{ galleryEditOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ closeGalleryEdit }}" style="position:fixed;inset:0;background:rgba(6,7,10,0.78);backdrop-filter:blur(6px);z-index:74;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div onClick="{{ stopClick }}" style="width:400px;max-width:100%;background:linear-gradient(180deg,#14171e,#0f1117);border:1px solid #2a2f3a;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:13px;box-shadow:0 28px 72px rgba(0,0,0,0.76);">
        <sc-if value="{{ galleryEditAsk }}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;color:{{ accent }};">成长集锦 // EDIT</div>
          <div style="font-size:16px;font-weight:700;color:#eef1f7;line-height:1.5;">是否要编辑「{{ galleryEditName }}」这条集锦？</div>
          <div style="font-size:12px;color:#8b93a4;line-height:1.7;">可以补录或修改文字，也可以补一张照片 / 更换原照片。原任务与完成时间不会被改动。</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <div onClick="{{ closeGalleryEdit }}" style="cursor:pointer;font-size:12.5px;color:#8b93a4;border:1px solid #262b36;border-radius:8px;padding:8px 14px;">取消</div>
            <div onClick="{{ confirmGalleryEdit }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65);border-radius:8px;padding:8px 18px;">编辑</div>
          </div>
        </sc-if>
        <sc-if value="{{ galleryEditFormOn }}" hint-placeholder-val="{{ false }}">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;color:{{ accent }};">补录内容 // ARCHIVE EDIT</div>
          <div style="font-size:15px;font-weight:700;color:#eef1f7;line-height:1.45;">{{ galleryEditName }}</div>
          <label style="display:block;font-size:11px;color:#697084;">文字记录（可补录 / 修改）
            <textarea id="ge-text" defaultValue="{{ galleryEditText }}" placeholder="补上当时没来得及写下的内容……" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;min-height:112px;background:#0d0f14;border:1px solid #262b36;border-radius:10px;padding:11px 12px;color:#e6e9f0;font-size:13px;line-height:1.65;font-family:inherit;resize:vertical;"></textarea>
          </label>
          <sc-if value="{{ galleryEditHasImage }}" hint-placeholder-val="{{ false }}"><div style="border-radius:10px;overflow:hidden;border:1px solid #242a35;background:#0a0c11;"><img src="{{ galleryEditImageUrl }}" alt="集锦照片预览" style="width:100%;max-height:220px;object-fit:cover;display:block;"></div></sc-if>
          <div style="display:flex;gap:8px;">
            <div onClick="{{ pickGalleryEditImage }}" style="cursor:pointer;flex:1;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#c8cedb;border:1px dashed #343b49;background:#0d0f14;border-radius:9px;padding:9px 8px;" style-hover="border-color:{{ accent }};">＋ 补录 / 更换照片</div>
            <sc-if value="{{ galleryEditHasImage }}" hint-placeholder-val="{{ false }}"><div onClick="{{ removeGalleryEditImage }}" style="cursor:pointer;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#f87171;border:1px solid #3a2226;background:#1a1214;border-radius:9px;padding:9px 12px;">移除照片</div></sc-if>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <div onClick="{{ closeGalleryEdit }}" style="cursor:pointer;font-size:12.5px;color:#8b93a4;border:1px solid #262b36;border-radius:8px;padding:8px 14px;">取消</div>
            <div onClick="{{ saveGalleryEdit }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65);border-radius:8px;padding:8px 18px;">保存补录</div>
          </div>
        </sc-if>
      </div>
    </div>
  </sc-if>

  <!-- IMAGE EDIT MODAL -->''', 'gallery edit modal')

# Reorder modal gets an OPEX default-sort status / reset action.
one('''        <sc-if value="{{ reorderIsTasks }}" hint-placeholder-val="{{ true }}">
          <div style="display:flex;align-items:center;gap:8px;border:1px solid #202530;background:#0d0f14;border-radius:9px;padding:9px 10px;">
            <div style="flex:1;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;">当前: {{ taskSortLabel }}</div>
            <div onClick="{{ restoreTaskSort }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#c8cedb;border:1px solid #2f3542;border-radius:7px;padding:5px 9px;" style-hover="border-color:{{ accent }};">按优先级排序</div>
          </div>
        </sc-if>''', '''        <sc-if value="{{ reorderIsTasks }}" hint-placeholder-val="{{ true }}">
          <div style="display:flex;align-items:center;gap:8px;border:1px solid #202530;background:#0d0f14;border-radius:9px;padding:9px 10px;">
            <div style="flex:1;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;">当前: {{ taskSortLabel }}</div>
            <div onClick="{{ restoreTaskSort }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#c8cedb;border:1px solid #2f3542;border-radius:7px;padding:5px 9px;" style-hover="border-color:{{ accent }};">按优先级排序</div>
          </div>
        </sc-if>
        <sc-if value="{{ reorderIsOpex }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:8px;border:1px solid #202530;background:#0d0f14;border-radius:9px;padding:9px 10px;">
            <div style="flex:1;font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#8b93a4;">当前: {{ opexSortLabel }}</div>
            <div onClick="{{ restoreOpexSort }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#c8cedb;border:1px solid #2f3542;border-radius:7px;padding:5px 9px;" style-hover="border-color:{{ accent }};">按日期排序</div>
          </div>
        </sc-if>''', 'opex reorder sort status')

# Generic edit modal: type-aware prompt, OPEX/stash forms, 24h countdown edit.
one('''          <div style="font-size:12px;color:#8b93a4;line-height:1.6;">可修改名称、分值、循环/截止日期等信息。照片不用进编辑:直接把新图片拖到卡片的图上即可更换。</div>''', '''          <div style="font-size:12px;color:#8b93a4;line-height:1.6;">{{ editAskHint }}</div>''', 'edit ask hint')
one('''          <label style="display:block;font-size:11px;color:#697084;">名称
            <input id="ed-name" defaultValue="{{ editName }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 10px;color:#e6e9f0;font-size:13px;font-family:inherit;">
          </label>''', '''          <sc-if value="{{ editHasName }}" hint-placeholder-val="{{ true }}">
            <label style="display:block;font-size:11px;color:#697084;">名称
              <input id="ed-name" defaultValue="{{ editName }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px 10px;color:#e6e9f0;font-size:13px;font-family:inherit;">
            </label>
          </sc-if>''', 'conditional edit name')
one('''          <sc-if value="{{ editIsCountdown }}" hint-placeholder-val="{{ false }}">''', '''          <sc-if value="{{ editIsOpex }}" hint-placeholder-val="{{ false }}">
            <label style="display:block;font-size:11px;color:#697084;">金额（{{ opexCurrency }}）
              <input id="ed-opex-amount" type="number" min="0.01" step="0.01" defaultValue="{{ editOpexAmount }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-size:14px;font-family:'JetBrains Mono',monospace;">
            </label>
            <label style="display:block;font-size:11px;color:#697084;">分类
              <select id="ed-opex-cat" defaultValue="{{ editOpexCat }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 6px;color:#aeb6c6;font-size:13px;">
                <option value="吃饭">吃饭</option><option value="交通">交通</option><option value="购物">购物</option><option value="人情">人情</option><option value="娱乐">娱乐</option><option value="其他">其他</option>
              </select>
            </label>
            <label style="display:block;font-size:11px;color:#697084;">备注
              <input id="ed-opex-note" defaultValue="{{ editOpexNote }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px 10px;color:#e6e9f0;font-size:13px;font-family:inherit;">
            </label>
            <label style="display:block;font-size:11px;color:#697084;">日期
              <input id="ed-opex-date" type="date" defaultValue="{{ editOpexDate }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:8px;color:#aeb6c6;font-size:13px;font-family:'JetBrains Mono',monospace;">
            </label>
          </sc-if>
          <sc-if value="{{ editIsStash }}" hint-placeholder-val="{{ false }}">
            <label style="display:block;font-size:11px;color:#697084;">目标金额（{{ opexCurrency }}）
              <input id="ed-stash-target" type="number" min="0.01" step="0.01" defaultValue="{{ editStashTarget }}" style="display:block;width:100%;box-sizing:border-box;margin-top:4px;background:#0d0f14;border:1px solid #262b36;border-radius:8px;padding:9px;color:#e6e9f0;font-size:14px;font-family:'JetBrains Mono',monospace;">
            </label>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#697084;border:1px solid #202530;background:#0d0f14;border-radius:8px;padding:8px 10px;">当前已存 {{ editStashSaved }} · 余额请使用卡片上的「存入 / 支出」调整</div>
          </sc-if>
          <sc-if value="{{ editIsCountdown }}" hint-placeholder-val="{{ false }}">''', 'opex stash edit forms')

# Logic helpers and 24h countdown creation.
one("  restoreTaskSort() { this.save({ taskSortMode: 'priority' }); }\n  startReorder(kind)", "  restoreTaskSort() { this.save({ taskSortMode: 'priority' }); }\n  sortOpexByDate(list) { return [...(list || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0))); }\n  restoreOpexSort() { this.save({ opexSortMode: 'date' }); }\n  startReorder(kind)", 'opex sort helper')
one('''    const arr = (kind === 'milestones' && (this.state.milestoneSortMode || 'deadline') === 'deadline')
      ? this.sortMilestonesByDeadline(this.state.milestones)
      : (kind === 'tasks' && (this.state.taskSortMode || 'priority') === 'priority')
        ? this.sortTasksByPriority(this.state.tasks)
        : [...this.state[kind]];''', '''    const arr = (kind === 'milestones' && (this.state.milestoneSortMode || 'deadline') === 'deadline')
      ? this.sortMilestonesByDeadline(this.state.milestones)
      : (kind === 'tasks' && (this.state.taskSortMode || 'priority') === 'priority')
        ? this.sortTasksByPriority(this.state.tasks)
        : (kind === 'opex' && (this.state.opexSortMode || 'date') === 'date')
          ? this.sortOpexByDate(this.state.opex)
          : [...this.state[kind]];''', 'reorder source modes')
one("    if (kind === 'tasks') patch.taskSortMode = 'manual';\n    this.save(patch);", "    if (kind === 'tasks') patch.taskSortMode = 'manual';\n    if (kind === 'opex') patch.opexSortMode = 'manual';\n    this.save(patch);", 'opex manual mode')
one('''  setTab(t) { this.setState({ tab: t }); }
  addCountdown() { const name = this.v('nc-name'), date = this.v('nc-date'), time = this.v('nc-time') || '00:00'; if (!name || !date) return; this.save({ countdowns: [...this.state.countdowns, { id: this.state.nextId, name, date, time }], nextId: this.state.nextId + 1, newCountdownOpen: false }); this.clear(['nc-name', 'nc-date']); const te = document.getElementById('nc-time'); if (te) te.value = '00:00'; }''', '''  setTab(t) { this.setState({ tab: t }); }
  read24h(hourId, minuteId, fallback) {
    const hEl = document.getElementById(hourId), mEl = document.getElementById(minuteId);
    if (!hEl || !mEl) return fallback || '00:00';
    let h = parseInt(hEl.value), m = parseInt(mEl.value);
    h = isNaN(h) ? 0 : Math.max(0, Math.min(23, h));
    m = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  addCountdown() {
    const name = this.v('nc-name'), date = this.v('nc-date'), time = this.read24h('nc-hour', 'nc-minute', '00:00');
    if (!name || !date) return;
    this.save({ countdowns: [...this.state.countdowns, { id: this.state.nextId, name, date, time }], nextId: this.state.nextId + 1, newCountdownOpen: false });
    this.clear(['nc-name', 'nc-date']); const h = document.getElementById('nc-hour'), m = document.getElementById('nc-minute'); if (h) h.value = '0'; if (m) m.value = '0';
  }''', 'countdown read 24h')

# Pomodoro parameter methods and completion reward.
one("  delCountdown(id) { this.save({ countdowns: this.state.countdowns.filter(c => c.id !== id) }); }\n  pomoBase()", "  delCountdown(id) { this.save({ countdowns: this.state.countdowns.filter(c => c.id !== id) }); }\n  openPomoCfg() { this.setState({ pomoCfgOpen: true }); }\n  closePomoCfg() { this.setState({ pomoCfgOpen: false }); }\n  savePomoCfg() { const task = this.v('pc-task') || '番茄专注'; const n = parseInt(this.v('pc-exp')); const reward = isNaN(n) ? 0 : Math.max(0, n); this.save({ pomoTaskName: task, pomoRewardExp: reward, pomoCfgOpen: false }); }\n  pomoBase()", 'pomo config methods')
one('''  pomoTick() { clearInterval(this._pomoTimer); this._pomoTimer = setInterval(() => { const s = this.state; if (!s.pomoRunning || !s.pomoEndTs) { clearInterval(this._pomoTimer); return; } if (Date.now() >= s.pomoEndTs) { clearInterval(this._pomoTimer); this.setState({ pomoRunning: false, pomoRemaining: 0, pomoEndTs: null }); this.pomoDing(); } else this.forceUpdate(); }, 500); }
  pomoDing()''', '''  pomoTick() { clearInterval(this._pomoTimer); this._pomoTimer = setInterval(() => { const s = this.state; if (!s.pomoRunning || !s.pomoEndTs) { clearInterval(this._pomoTimer); return; } if (Date.now() >= s.pomoEndTs) { clearInterval(this._pomoTimer); this.finishPomo(); } else this.forceUpdate(); }, 500); }
  finishPomo() {
    const reward = Math.max(0, parseInt(this.state.pomoRewardExp) || 0);
    const task = (this.state.pomoTaskName || '番茄专注').trim() || '番茄专注';
    const patch = { pomoRunning: false, pomoRemaining: 0, pomoEndTs: null };
    if (reward > 0) {
      const ts = Date.now(); patch.exp = this.state.exp + reward; patch.ledger = [{ ts, name: '番茄专注 · ' + task, delta: reward }, ...this.state.ledger].slice(0, 200); patch.momentumMsg = '「' + task + '」专注完成 · +' + reward + ' EXP';
      setTimeout(() => this.setState({ momentumMsg: '' }), 3200);
    }
    this.save(patch); this.pomoDing();
  }
  pomoDing()''', 'pomo completion reward')

# Gallery edit logic.
one('''  async delGalleryEntry(id) {
    await this.galleryDeleteImage(id);
    const url = (this.state.galleryImageUrls || {})[id]; if (url) try { URL.revokeObjectURL(url); } catch (_) {}
    const urls = { ...(this.state.galleryImageUrls || {}) }; delete urls[id];
    this.save({ galleryEntries: (this.state.galleryEntries || []).filter(g => g.id !== id), galleryImageUrls: urls });
  }''', '''  async delGalleryEntry(id) {
    await this.galleryDeleteImage(id);
    const url = (this.state.galleryImageUrls || {})[id]; if (url) try { URL.revokeObjectURL(url); } catch (_) {}
    const urls = { ...(this.state.galleryImageUrls || {}) }; delete urls[id];
    this.save({ galleryEntries: (this.state.galleryEntries || []).filter(g => g.id !== id), galleryImageUrls: urls });
  }
  openGalleryEdit(id) {
    if (!(this.state.galleryEntries || []).some(g => g.id === id)) return;
    this.setState({ galleryEdit: { id, confirmed: false }, galleryEditBlob: null, galleryEditPreview: '', galleryEditRemoveImage: false });
  }
  confirmGalleryEdit() { if (this.state.galleryEdit) this.setState({ galleryEdit: { ...this.state.galleryEdit, confirmed: true } }); }
  closeGalleryEdit() {
    if (this.state.galleryEditPreview) try { URL.revokeObjectURL(this.state.galleryEditPreview); } catch (_) {}
    this.setState({ galleryEdit: null, galleryEditBlob: null, galleryEditPreview: '', galleryEditRemoveImage: false });
  }
  pickGalleryEditImage() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const blob = await this.compressGalleryImage(f);
        if (this.state.galleryEditPreview) try { URL.revokeObjectURL(this.state.galleryEditPreview); } catch (_) {}
        this.setState({ galleryEditBlob: blob, galleryEditPreview: URL.createObjectURL(blob), galleryEditRemoveImage: false });
      } catch (e) { alert('图片处理失败：' + e.message); }
    };
    inp.click();
  }
  removeGalleryEditImage() {
    if (this.state.galleryEditPreview) try { URL.revokeObjectURL(this.state.galleryEditPreview); } catch (_) {}
    this.setState({ galleryEditBlob: null, galleryEditPreview: '', galleryEditRemoveImage: true });
  }
  async saveGalleryEdit() {
    const ed = this.state.galleryEdit; if (!ed) return;
    const entry = (this.state.galleryEntries || []).find(g => g.id === ed.id); if (!entry) { this.closeGalleryEdit(); return; }
    const text = this.v('ge-text'); let hasImage = !!entry.hasImage;
    if (this.state.galleryEditRemoveImage) { await this.galleryDeleteImage(entry.id); hasImage = false; }
    if (this.state.galleryEditBlob) { try { await this.galleryPut(entry.id, this.state.galleryEditBlob); hasImage = true; } catch (e) { alert('照片保存失败：' + e.message); } }
    const entries = (this.state.galleryEntries || []).map(g => g.id === entry.id ? { ...g, text, hasImage } : g);
    const urls = { ...(this.state.galleryImageUrls || {}) }; const old = urls[entry.id]; if (old) try { URL.revokeObjectURL(old); } catch (_) {} delete urls[entry.id];
    if (hasImage) { try { const b = await this.galleryGet(entry.id); if (b) urls[entry.id] = URL.createObjectURL(b); } catch (_) {} }
    if (this.state.galleryEditPreview) try { URL.revokeObjectURL(this.state.galleryEditPreview); } catch (_) {}
    this.save({ galleryEntries: entries, galleryImageUrls: urls, galleryEdit: null, galleryEditBlob: null, galleryEditPreview: '', galleryEditRemoveImage: false });
  }''', 'gallery edit methods')

# Edit save branches: OPEX, stash, and 24h countdown.
one('''    } else if (ed.type === 'countdown') {
      this.save({ editing: null, countdowns: this.state.countdowns.map(x => x.id === ed.id ? { ...x,
        name: name || x.name, date: this.v('ed-date') || x.date, time: this.v('ed-time') || x.time || '00:00' } : x) });
    } else if (ed.type === 'fund') {''', '''    } else if (ed.type === 'countdown') {
      const old = this.state.countdowns.find(x => x.id === ed.id); const time = this.read24h('ed-hour', 'ed-minute', old ? (old.time || '00:00') : '00:00');
      this.save({ editing: null, countdowns: this.state.countdowns.map(x => x.id === ed.id ? { ...x,
        name: name || x.name, date: this.v('ed-date') || x.date, time } : x) });
    } else if (ed.type === 'opex') {
      const catEl = document.getElementById('ed-opex-cat'); const amount = parseFloat(this.v('ed-opex-amount'));
      this.save({ editing: null, opex: (this.state.opex || []).map(x => x.id === ed.id ? { ...x,
        amount: isNaN(amount) || amount <= 0 ? x.amount : Math.round(amount * 100) / 100,
        cat: catEl ? catEl.value : x.cat, note: this.v('ed-opex-note') || (catEl ? catEl.value : x.cat), date: this.v('ed-opex-date') || x.date } : x) });
    } else if (ed.type === 'stash') {
      const target = parseFloat(this.v('ed-stash-target'));
      this.save({ editing: null, stash: (this.state.stash || []).map(x => x.id === ed.id ? { ...x,
        name: name || x.name, target: isNaN(target) || target <= 0 ? x.target : Math.round(target * 100) / 100 } : x) });
    } else if (ed.type === 'fund') {''', 'edit save opex stash countdown')
one('''    } else {
      const msSetSel = document.getElementById('ed-ms-set');''', '''    } else if (ed.type === 'milestone') {
      const msSetSel = document.getElementById('ed-ms-set');''', 'milestone explicit branch')

# Stash withdrawal.
one('''  delStash(id) { this.save({ stash: (this.state.stash || []).filter(s => s.id !== id) }); }
  stashDeposit(id) {''', '''  delStash(id) { this.save({ stash: (this.state.stash || []).filter(s => s.id !== id) }); }
  stashWithdraw(id) {
    const el = document.getElementById('stash-' + id); if (!el) return;
    const amount = parseFloat(el.value); if (isNaN(amount) || amount <= 0) return;
    this.save({ stash: (this.state.stash || []).map(s => s.id === id ? { ...s, saved: Math.max(0, Math.round((s.saved - amount) * 100) / 100) } : s) });
    el.value = '';
  }
  stashDeposit(id) {''', 'stash withdraw logic')

# Render bases and reorder sources/titles.
one("    const milestoneBase = (st.milestoneSortMode || 'deadline') === 'manual' ? st.milestones : this.sortMilestonesByDeadline(st.milestones);\n    const roKind = st.reorderKind || 'tasks';",
    "    const milestoneBase = (st.milestoneSortMode || 'deadline') === 'manual' ? st.milestones : this.sortMilestonesByDeadline(st.milestones);\n    const opexBase = (st.opexSortMode || 'date') === 'manual' ? (st.opex || []) : this.sortOpexByDate(st.opex || []);\n    const stashBase = st.stash || [];\n    const roKind = st.reorderKind || 'tasks';",
    'render opex stash bases')
one('''    const roSrc = roKind === 'rewards' ? st.rewards.map(r => ({ id: r.id, name: r.name, sub: r.cost + ' EXP' }))
      : roKind === 'milestones' ? milestoneBase.map(m => ({ id: m.id, name: m.name, sub: m.cur + '/' + m.target }))
      : roKind === 'funds' ? st.funds.map(f => ({ id: f.id, name: f.name, sub: f.code || '' }))
      : taskBase.map(dec).map(t => ({ id: t.id, name: t.name, sub: (setsArr.find(s => s.id === t.setId) || {}).name || '' }));''', '''    const roSrc = roKind === 'rewards' ? st.rewards.map(r => ({ id: r.id, name: r.name, sub: r.cost + ' EXP' }))
      : roKind === 'milestones' ? milestoneBase.map(m => ({ id: m.id, name: m.name, sub: m.cur + '/' + m.target }))
      : roKind === 'funds' ? st.funds.map(f => ({ id: f.id, name: f.name, sub: f.code || '' }))
      : roKind === 'opex' ? opexBase.map(o => ({ id: o.id, name: o.note || o.cat || '开销记录', sub: (o.date || '') + ' · ' + o.amount }))
      : roKind === 'stash' ? stashBase.map(x => ({ id: x.id, name: x.name, sub: x.saved + '/' + x.target }))
      : taskBase.map(dec).map(t => ({ id: t.id, name: t.name, sub: (setsArr.find(s => s.id === t.setId) || {}).name || '' }));''', 'reorder opex stash sources')
one("    const reorderTitle = roKind === 'rewards' ? '奖励排序 // REORDER' : roKind === 'milestones' ? '里程碑排序 // REORDER' : roKind === 'funds' ? '标的排序 // REORDER' : '任务排序 // REORDER';",
    "    const reorderTitle = roKind === 'rewards' ? '奖励排序 // REORDER' : roKind === 'milestones' ? '里程碑排序 // REORDER' : roKind === 'funds' ? '标的排序 // REORDER' : roKind === 'opex' ? '开销排序 // REORDER' : roKind === 'stash' ? '存钱罐排序 // REORDER' : '任务排序 // REORDER';",
    'reorder titles')

# Gallery render edit handler and edit-model props.
one('''        hasImage: !!imgUrl, imgUrl, kindLabel: g.kind === 'milestone' ? 'MILESTONE' : 'TASK', kindColor: g.kind === 'milestone' ? '#e6c46a' : '#60a5fa',
        onDel: e => { e.stopPropagation(); this.delGalleryEntry(g.id); } };''', '''        hasImage: !!imgUrl, imgUrl, kindLabel: g.kind === 'milestone' ? 'MILESTONE' : 'TASK', kindColor: g.kind === 'milestone' ? '#e6c46a' : '#60a5fa',
        onEdit: () => this.openGalleryEdit(g.id), onDel: e => { e.stopPropagation(); this.delGalleryEntry(g.id); } };''', 'gallery render edit handler')
one('''    const ledger = st.ledger.slice(0, 30).map((e, i) => ({ ...e, key: e.ts + '-' + i, time: fmt(e.ts),''', '''    const galleryEditEntry = st.galleryEdit ? (st.galleryEntries || []).find(g => g.id === st.galleryEdit.id) : null;
    const galleryEditImageUrl = st.galleryEditRemoveImage ? '' : (st.galleryEditPreview || (galleryEditEntry ? ((st.galleryImageUrls || {})[galleryEditEntry.id] || '') : ''));
    const ledger = st.ledger.slice(0, 30).map((e, i) => ({ ...e, key: e.ts + '-' + i, time: fmt(e.ts),''', 'gallery edit computed item')

# OPEX render uses selected ordering and exposes editing; stash exposes edit/withdraw.
one("      const list = (st.opex || []).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0)));",
    "      const list = opexBase;",
    'opex render ordering')
one('''        dateStr: (o.date || '').replace(/^\\d{4}-/, '').replace('-', '/'),
        onDel: () => this.delOpex(o.id),''', '''        dateStr: (o.date || '').replace(/^\\d{4}-/, '').replace('-', '/'),
        onEdit: () => this.openEdit('opex', o.id), onDel: e => { if (e && e.stopPropagation) e.stopPropagation(); this.delOpex(o.id); },''', 'opex row actions')
one('''      const stashRows = (st.stash || []).map(s => {''', '''      const stashRows = stashBase.map(s => {''', 'stash render ordering')
one('''          savedStr: money(s.saved), targetStr: money(s.target),
          onSave: () => this.stashDeposit(s.id), onDel: () => this.delStash(s.id) };''', '''          savedStr: money(s.saved), targetStr: money(s.target),
          onSave: () => this.stashDeposit(s.id), onWithdraw: () => this.stashWithdraw(s.id), onEdit: () => this.openEdit('stash', s.id), onDel: () => this.delStash(s.id) };''', 'stash row actions')

# Edit model includes opex/stash.
one("    const lists = { task: st.tasks, reward: st.rewards, milestone: st.milestones, set: st.sets, milestoneSet: st.milestoneSets || [], fund: st.funds, countdown: st.countdowns };",
    "    const lists = { task: st.tasks, reward: st.rewards, milestone: st.milestones, set: st.sets, milestoneSet: st.milestoneSets || [], fund: st.funds, countdown: st.countdowns, opex: st.opex || [], stash: st.stash || [] };",
    'editable list types')

# Return props: sorting, gallery edit, pomo config, edit fields.
one("      reorderIsTasks: (st.reorderKind || 'tasks') === 'tasks',\n      reorderIsMilestones:", "      reorderIsTasks: (st.reorderKind || 'tasks') === 'tasks',\n      reorderIsOpex: (st.reorderKind || 'tasks') === 'opex', opexSortLabel: (st.opexSortMode || 'date') === 'manual' ? '手动排序' : '日期优先', restoreOpexSort: () => this.restoreOpexSort(),\n      reorderIsMilestones:", 'opex reorder props')
one("      reorderItemName: (st.reorderKind || 'tasks') === 'milestones' ? '里程碑' : '任务', reorderSetName:", "      reorderItemName: (st.reorderKind || 'tasks') === 'milestones' ? '里程碑' : (st.reorderKind || 'tasks') === 'opex' ? '开销记录' : (st.reorderKind || 'tasks') === 'stash' ? '存钱目标' : '任务', reorderSetName:", 'reorder item names')
one("      startReorder: () => this.startReorder('tasks'), startReorderRewards: () => this.startReorder('rewards'), startReorderMilestones: () => this.startReorder('milestones'), startReorderFunds: () => this.startReorder('funds'), closeReorder: () => this.closeReorder(),",
    "      startReorder: () => this.startReorder('tasks'), startReorderRewards: () => this.startReorder('rewards'), startReorderMilestones: () => this.startReorder('milestones'), startReorderFunds: () => this.startReorder('funds'), startReorderOpex: () => this.startReorder('opex'), startReorderStash: () => this.startReorder('stash'), closeReorder: () => this.closeReorder(),",
    'start reorder props')
one('''      galleryOpen: !!st.galleryOpen, galleryEntries, galleryEmpty: galleryEntries.length === 0, galleryCount: galleryEntries.length, openGallery: () => this.openGallery(), closeGallery: () => this.closeGallery(),''', '''      galleryOpen: !!st.galleryOpen, galleryEntries, galleryEmpty: galleryEntries.length === 0, galleryCount: galleryEntries.length, openGallery: () => this.openGallery(), closeGallery: () => this.closeGallery(),
      galleryEditOpen: !!galleryEditEntry, galleryEditAsk: !!galleryEditEntry && !st.galleryEdit.confirmed, galleryEditFormOn: !!galleryEditEntry && !!st.galleryEdit.confirmed,
      galleryEditName: galleryEditEntry ? (galleryEditEntry.targetName || '已删除项目') : '', galleryEditText: galleryEditEntry ? (galleryEditEntry.text || '') : '', galleryEditImageUrl, galleryEditHasImage: !!galleryEditImageUrl,
      confirmGalleryEdit: () => this.confirmGalleryEdit(), closeGalleryEdit: () => this.closeGalleryEdit(), pickGalleryEditImage: () => this.pickGalleryEditImage(), removeGalleryEditImage: () => this.removeGalleryEditImage(), saveGalleryEdit: () => this.saveGalleryEdit(),''', 'gallery edit return props')
one('''      pomoTime: mm + ':' + ss, pomoRingBg: `conic-gradient(${accent} ${pPct}%, #232833 0)`,''', '''      pomoTime: mm + ':' + ss, pomoRingBg: `conic-gradient(${accent} ${pPct}%, #232833 0)`,
      pomoTaskName: st.pomoTaskName || '番茄专注', pomoRewardExp: Math.max(0, parseInt(st.pomoRewardExp) || 0), pomoRewardLabel: '+' + Math.max(0, parseInt(st.pomoRewardExp) || 0) + ' EXP',
      pomoCfgOpen: !!st.pomoCfgOpen, openPomoCfg: () => this.openPomoCfg(), closePomoCfg: () => this.closePomoCfg(), savePomoCfg: () => this.savePomoCfg(),''', 'pomo return props')
one('''      editIsFund: editOpen && ed.confirmed && ed.type === 'fund',
      editIsCountdown: editOpen && ed.confirmed && ed.type === 'countdown',
      editDate: editItem ? (editItem.date ?? '') : '', editTime: editItem ? (editItem.time || '00:00') : '00:00',''', '''      editIsFund: editOpen && ed.confirmed && ed.type === 'fund',
      editIsOpex: editOpen && ed.confirmed && ed.type === 'opex', editIsStash: editOpen && ed.confirmed && ed.type === 'stash',
      editIsCountdown: editOpen && ed.confirmed && ed.type === 'countdown',
      editDate: editItem ? (editItem.date ?? '') : '', editTime: editItem ? (editItem.time || '00:00') : '00:00',
      editHour: editItem && editItem.time ? parseInt(editItem.time.split(':')[0]) || 0 : 0, editMinute: editItem && editItem.time ? parseInt(editItem.time.split(':')[1]) || 0 : 0,''', 'edit countdown hour minute props')
one("      editItemName: editItem ? editItem.name : '',\n      editTypeName: ed ? ({ task: '任务', reward: '奖励', milestone: '里程碑', set: '任务集', milestoneSet: '里程碑集', fund: '标的', countdown: '倒计时' }[ed.type]) : '',",
    "      editItemName: editItem ? (editItem.name || editItem.note || editItem.cat || '记录') : '',\n      editTypeName: ed ? ({ task: '任务', reward: '奖励', milestone: '里程碑', set: '任务集', milestoneSet: '里程碑集', fund: '标的', countdown: '倒计时', opex: '开销', stash: '存钱目标' }[ed.type]) : '',\n      editHasName: !ed || ed.type !== 'opex', editAskHint: ed && ed.type === 'opex' ? '可修改金额、分类、备注和日期。' : ed && ed.type === 'stash' ? '可修改目标名称和目标金额；当前余额请用卡片上的「存入 / 支出」调整。' : '可修改名称、分值、循环 / 截止日期等信息。',",
    'edit type props')
one('''      editTarget: editItem ? (editItem.target ?? '') : '', editStep: editItem ? (editItem.step ?? '') : '',
      editBonus: editItem ? (editItem.bonus ?? '') : '', editDeadline: editItem ? (editItem.deadline || '') : '', ''', '''      editTarget: editItem ? (editItem.target ?? '') : '', editStep: editItem ? (editItem.step ?? '') : '',
      editBonus: editItem ? (editItem.bonus ?? '') : '', editDeadline: editItem ? (editItem.deadline || '') : '',
      editOpexAmount: editItem && ed && ed.type === 'opex' ? editItem.amount : '', editOpexCat: editItem && ed && ed.type === 'opex' ? editItem.cat : '其他', editOpexNote: editItem && ed && ed.type === 'opex' ? editItem.note : '', editOpexDate: editItem && ed && ed.type === 'opex' ? editItem.date : '',
      editStashTarget: editItem && ed && ed.type === 'stash' ? editItem.target : '', editStashSaved: editItem && ed && ed.type === 'stash' ? editItem.saved : '', ''', 'edit financial fields')

# Service worker cache bump.
IDX.write_text(s, encoding='utf-8')
sw = SW.read_text(encoding='utf-8')
if "const CACHE = 'exp-bank-v1.2.0';" not in sw:
    raise SystemExit('service worker cache marker missing')
sw = sw.replace("const CACHE = 'exp-bank-v1.2.0';", "const CACHE = 'exp-bank-v1.3.0';", 1)
SW.write_text(sw, encoding='utf-8')
print('EXP BANK v1.3 patch applied')
