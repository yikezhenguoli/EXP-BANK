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

# Persistent gallery metadata
rep("      if (!s.taskSortMode) s.taskSortMode = 'priority';", "      if (!s.taskSortMode) s.taskSortMode = 'priority';\n      if (!Array.isArray(s.galleryEntries)) s.galleryEntries = [];")
rep("      milestoneSortMode: 'deadline', taskSortMode: 'priority',", "      milestoneSortMode: 'deadline', taskSortMode: 'priority', galleryEntries: [],")

# Exclude gallery/reflection UI state from localStorage persistence
old_save = "  save(patch) { this.setState(patch, () => { const { editing, pending, selectedDate, pomoRunning, pomoEndTs, pomoRemaining, pomoTotal, noiseOn, noiseFileName, backupOpen, backupMsg, backupMsgColor, copyLabel, reorderOpen, reorderKind, roMode, batchSel, batchMsg, momentumMsg, tierCfgOpen, dragId, vw, newTaskOpen, newSetOpen, newRewardOpen, newMilestoneOpen, newFundOpen, newCountdownOpen, imgEditId, fundSettingsOpen, notionMsg, notionMsgColor, notionBusy, notionResultOpen, notionResultOk, notionResultMsg, expEditing, newOpexOpen, newStashOpen, updateNoteOpen, prevVersion, ...persist } = this.state; localStorage.setItem('exp-bank-v1', JSON.stringify(persist)); }); }"
new_save = "  save(patch) { this.setState(patch, () => { const { editing, pending, selectedDate, pomoRunning, pomoEndTs, pomoRemaining, pomoTotal, noiseOn, noiseFileName, backupOpen, backupMsg, backupMsgColor, copyLabel, reorderOpen, reorderKind, roMode, batchSel, batchMsg, momentumMsg, tierCfgOpen, dragId, vw, newTaskOpen, newSetOpen, newRewardOpen, newMilestoneOpen, newFundOpen, newCountdownOpen, imgEditId, fundSettingsOpen, notionMsg, notionMsgColor, notionBusy, notionResultOpen, notionResultOk, notionResultMsg, expEditing, newOpexOpen, newStashOpen, updateNoteOpen, prevVersion, reflectionOpen, reflectionTarget, reflectionBlob, reflectionPreview, galleryOpen, galleryImageUrls, backupFullCode, ...persist } = this.state; localStorage.setItem('exp-bank-v1', JSON.stringify(persist)); }); }"
rep(old_save, new_save)

# Gallery buttons in task and milestone modules
rep(
"        <div onClick=\"{{ openNewSet }}\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35),0 4px 14px rgba(0,0,0,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.25);border-radius:8px;padding:7px 14px;\" style-hover=\"filter:brightness(1.12);\">+ 新建任务集</div>\n        <div style=\"flex:1;\"></div>",
"        <div onClick=\"{{ openNewSet }}\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35),0 4px 14px rgba(0,0,0,0.4);text-shadow:0 1px 0 rgba(255,255,255,0.25);border-radius:8px;padding:7px 14px;\" style-hover=\"filter:brightness(1.12);\">+ 新建任务集</div>\n        <div onClick=\"{{ openGallery }}\" title=\"查看任务与里程碑留下的心得和照片\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:7px 12px;\" style-hover=\"border-color:{{ accent }};color:#eef1f7;\">▦ 集锦</div>\n        <div style=\"flex:1;\"></div>"
)
rep(
"<div onClick=\"{{ startReorderMilestones }}\" title=\"排序里程碑\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;\" style-hover=\"border-color:{{ accent }};\">⇅</div><div onClick=\"{{ openNewMilestone }}\"",
"<div onClick=\"{{ openGallery }}\" title=\"查看成长集锦\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;\" style-hover=\"border-color:{{ accent }};\">▦ 集锦</div><div onClick=\"{{ startReorderMilestones }}\" title=\"排序里程碑\" style=\"cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11.5px;font-weight:700;color:#c8cedb;border:1px solid #2a2f3a;border-radius:8px;padding:6px 10px;\" style-hover=\"border-color:{{ accent }};\">⇅</div><div onClick=\"{{ openNewMilestone }}\""
)

# Reflection + gallery modals inserted before image edit modal
anchor = "  <!-- IMAGE EDIT MODAL -->"
if anchor not in s:
    raise SystemExit('image modal anchor missing')
modal = r'''  <!-- REFLECTION MODAL -->
  <sc-if value="{{ reflectionOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ skipReflection }}" style="position:fixed;inset:0;background:rgba(6,7,10,0.72);backdrop-filter:blur(5px);z-index:72;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div onClick="{{ stopClick }}" style="width:390px;max-width:100%;background:linear-gradient(180deg,#14171e,#0f1117);border:1px solid #2a2f3a;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:13px;box-shadow:0 28px 72px rgba(0,0,0,0.72);">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:2px;color:{{ accent }};">完成 · 留下这一刻 // REFLECTION</div>
        <div style="font-size:17px;font-weight:700;color:#eef1f7;line-height:1.5;">{{ reflectionTargetName }}</div>
        <div style="font-size:12px;color:#8b93a4;line-height:1.7;">EXP 已经正常入账。这里完全可选：记两句话，或留一张照片给未来的自己。</div>
        <textarea id="rf-text" placeholder="今天做这件事时，我发现……" style="width:100%;box-sizing:border-box;min-height:104px;background:#0d0f14;border:1px solid #262b36;border-radius:10px;padding:11px 12px;color:#e6e9f0;font-size:13px;line-height:1.65;font-family:inherit;resize:vertical;"></textarea>
        <div onClick="{{ pickReflectionImage }}" style="cursor:pointer;border:1px dashed #343b49;background:#0d0f14;border-radius:10px;min-height:64px;display:flex;align-items:center;justify-content:center;color:#8b93a4;overflow:hidden;" style-hover="border-color:{{ accent }};color:#c8cedb;">
          <sc-if value="{{ reflectionHasImage }}" hint-placeholder-val="{{ false }}"><img src="{{ reflectionPreview }}" alt="集锦照片预览" style="width:100%;max-height:190px;object-fit:cover;display:block;"></sc-if>
          <sc-if value="{{ reflectionNoImage }}" hint-placeholder-val="{{ true }}"><div style="font-family:'JetBrains Mono',monospace;font-size:11.5px;">＋ 添加照片</div></sc-if>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <div onClick="{{ skipReflection }}" style="cursor:pointer;font-size:12.5px;color:#8b93a4;border:1px solid #262b36;border-radius:8px;padding:8px 15px;" style-hover="color:#e6e9f0;">跳过</div>
          <div onClick="{{ saveReflection }}" style="cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35);border-radius:8px;padding:8px 18px;" style-hover="filter:brightness(1.12);">保存到集锦</div>
        </div>
      </div>
    </div>
  </sc-if>

  <!-- GROWTH GALLERY MODAL -->
  <sc-if value="{{ galleryOpen }}" hint-placeholder-val="{{ false }}">
    <div onClick="{{ closeGallery }}" style="position:fixed;inset:0;background:rgba(6,7,10,0.76);backdrop-filter:blur(6px);z-index:71;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div onClick="{{ stopClick }}" style="width:680px;max-width:100%;max-height:86vh;background:linear-gradient(180deg,#14171e,#0e1016);border:1px solid #2a2f3a;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 28px 76px rgba(0,0,0,0.76);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:3px;height:15px;border-radius:2px;background:{{ tierGrad }};"></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:2px;color:#c8cedb;flex:1;">成长集锦 // GROWTH ARCHIVE</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#697084;">{{ galleryCount }} 条</div>
          <div onClick="{{ closeGallery }}" style="cursor:pointer;color:#8b93a4;font-size:20px;line-height:1;">×</div>
        </div>
        <div style="font-size:11.5px;color:#697084;line-height:1.7;">任务与里程碑完成时留下的文字和照片。照片保存在本机 IndexedDB，完整备份会一起打包。</div>
        <div style="overflow:auto;display:flex;flex-direction:column;gap:10px;padding-right:2px;">
          <sc-if value="{{ galleryEmpty }}" hint-placeholder-val="{{ false }}"><div style="text-align:center;padding:36px 0;color:#535a6a;font-family:'JetBrains Mono',monospace;font-size:12px;">· 还没有集锦记录 ·</div></sc-if>
          <sc-for list="{{ galleryEntries }}" as="g" hint-placeholder-count="0">
            <div style="border:1px solid #222833;background:linear-gradient(180deg,#12151c,#0d0f14);border-radius:12px;padding:13px;display:flex;flex-direction:column;gap:9px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:700;letter-spacing:1px;color:{{ g.kindColor }};border:1px solid {{ g.kindColor }};border-radius:99px;padding:2px 7px;">{{ g.kindLabel }}</div>
                <div style="font-size:13.5px;font-weight:700;color:#eef1f7;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ g.targetName }}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#697084;white-space:nowrap;">{{ g.timeStr }}</div>
                <div onClick="{{ g.onDel }}" title="删除这条集锦" style="cursor:pointer;color:#3d4353;font-size:16px;" style-hover="color:#f87171;">×</div>
              </div>
              <sc-if value="{{ g.hasText }}" hint-placeholder-val="{{ false }}"><div style="font-size:12.5px;color:#b5bcc9;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere;">{{ g.text }}</div></sc-if>
              <sc-if value="{{ g.hasImage }}" hint-placeholder-val="{{ false }}"><div style="border-radius:10px;overflow:hidden;border:1px solid #242a35;background:#0a0c11;"><img src="{{ g.imgUrl }}" alt="成长集锦照片" style="width:100%;max-height:360px;object-fit:cover;display:block;"></div></sc-if>
            </div>
          </sc-for>
        </div>
      </div>
    </div>
  </sc-if>

'''
s = s.replace(anchor, modal + anchor, 1)

# IndexedDB helpers + reflection logic inserted before componentDidMount
insert_anchor = "  componentDidMount() {"
if insert_anchor not in s:
    raise SystemExit('componentDidMount anchor missing')
methods = r'''  galleryDB() {
    if (this._galleryDB) return this._galleryDB;
    this._galleryDB = new Promise((resolve, reject) => {
      const req = indexedDB.open('exp-bank-gallery-v1', 1);
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('images')) db.createObjectStore('images'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB 打开失败'));
    });
    return this._galleryDB;
  }
  async galleryPut(id, blob) { const db = await this.galleryDB(); return new Promise((resolve, reject) => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').put(blob, id); tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); }); }
  async galleryGet(id) { const db = await this.galleryDB(); return new Promise((resolve, reject) => { const tx = db.transaction('images', 'readonly'); const q = tx.objectStore('images').get(id); q.onsuccess = () => resolve(q.result || null); q.onerror = () => reject(q.error); }); }
  async galleryDeleteImage(id) { try { const db = await this.galleryDB(); await new Promise((resolve, reject) => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').delete(id); tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); }); } catch (_) {} }
  async galleryClearImages() { try { const db = await this.galleryDB(); await new Promise((resolve, reject) => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').clear(); tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); }); } catch (_) {} }
  blobToDataURL(blob) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); }); }
  dataURLToBlob(data) { const parts = data.split(','), mime = ((parts[0] || '').match(/data:([^;]+)/) || [,'image/jpeg'])[1]; const bin = atob(parts[1] || ''); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); }
  compressGalleryImage(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader(); r.onerror = () => reject(r.error); r.onload = () => {
        const img = new Image(); img.onerror = () => reject(new Error('图片无法解码')); img.onload = () => {
          try {
            const cap = 1280, sc = Math.min(1, cap / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.max(1, Math.round(img.naturalWidth * sc)), h = Math.max(1, Math.round(img.naturalHeight * sc));
            const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
            c.toBlob(b => b ? resolve(b) : reject(new Error('图片压缩失败')), 'image/jpeg', 0.78);
          } catch (e) { reject(e); }
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  pickReflectionImage() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const blob = await this.compressGalleryImage(f);
        if (this.state.reflectionPreview) try { URL.revokeObjectURL(this.state.reflectionPreview); } catch (_) {}
        this.setState({ reflectionBlob: blob, reflectionPreview: URL.createObjectURL(blob) });
      } catch (e) { alert('图片处理失败：' + e.message); }
    };
    inp.click();
  }
  skipReflection() {
    if (this.state.reflectionPreview) try { URL.revokeObjectURL(this.state.reflectionPreview); } catch (_) {}
    this.setState({ reflectionOpen: false, reflectionTarget: null, reflectionBlob: null, reflectionPreview: '' });
  }
  async saveReflection() {
    const target = this.state.reflectionTarget; if (!target) return;
    const text = this.v('rf-text'); const blob = this.state.reflectionBlob || null;
    if (!text && !blob) { this.skipReflection(); return; }
    const id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (blob) { try { await this.galleryPut(id, blob); } catch (e) { alert('照片保存失败，但文字仍会保存：' + e.message); } }
    const entry = { id, kind: target.kind, targetId: target.id, targetName: target.name, ts: target.ts || Date.now(), text, hasImage: !!blob };
    const preview = this.state.reflectionPreview;
    this.save({ galleryEntries: [entry, ...(this.state.galleryEntries || [])].slice(0, 500), reflectionOpen: false, reflectionTarget: null, reflectionBlob: null, reflectionPreview: '' });
    if (preview) try { URL.revokeObjectURL(preview); } catch (_) {}
  }
  async openGallery() {
    this.setState({ galleryOpen: true, galleryImageUrls: {} });
    const urls = {};
    for (const e of (this.state.galleryEntries || [])) {
      if (!e.hasImage) continue;
      try { const b = await this.galleryGet(e.id); if (b) urls[e.id] = URL.createObjectURL(b); } catch (_) {}
    }
    if (this.state.galleryOpen) this.setState({ galleryImageUrls: urls }); else Object.values(urls).forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} });
  }
  closeGallery() {
    Object.values(this.state.galleryImageUrls || {}).forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} });
    this.setState({ galleryOpen: false, galleryImageUrls: {} });
  }
  async delGalleryEntry(id) {
    await this.galleryDeleteImage(id);
    const url = (this.state.galleryImageUrls || {})[id]; if (url) try { URL.revokeObjectURL(url); } catch (_) {}
    const urls = { ...(this.state.galleryImageUrls || {}) }; delete urls[id];
    this.save({ galleryEntries: (this.state.galleryEntries || []).filter(g => g.id !== id), galleryImageUrls: urls });
  }
  async makeFullBackupAsync() {
    const { editing, pending, selectedDate, vw, backupOpen, backupMsg, copyLabel, backupMsgColor, reflectionOpen, reflectionTarget, reflectionBlob, reflectionPreview, galleryOpen, galleryImageUrls, backupFullCode, ...data } = this.state;
    const galleryImages = {};
    for (const e of (data.galleryEntries || [])) if (e.hasImage) {
      try { const b = await this.galleryGet(e.id); if (b) galleryImages[e.id] = await this.blobToDataURL(b); } catch (_) {}
    }
    return btoa(unescape(encodeURIComponent(JSON.stringify({ ...data, galleryImages }))));
  }
  async restoreGalleryImages(images) {
    if (!images || typeof images !== 'object') return;
    await this.galleryClearImages();
    for (const [id, data] of Object.entries(images)) { try { if (data) await this.galleryPut(id, this.dataURLToBlob(data)); } catch (_) {} }
  }
'''
s = s.replace(insert_anchor, methods + insert_anchor, 1)

# Open reflection after task completion and milestone claim
rep(
"    this.save({ tasks, exp: this.state.exp + t.exp, ledger: [{ ts, name: t.name, delta: t.exp }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'complete', id, k, exp: t.exp, ledgerTs: ts, streakChanged, prevStreak, prevPeriod, prevLastDone: t.lastDone || '' } });",
"    this.save({ tasks, exp: this.state.exp + t.exp, ledger: [{ ts, name: t.name, delta: t.exp }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'complete', id, k, exp: t.exp, ledgerTs: ts, streakChanged, prevStreak, prevPeriod, prevLastDone: t.lastDone || '' }, reflectionOpen: true, reflectionTarget: { kind: 'task', id, name: t.name, ts }, reflectionBlob: null, reflectionPreview: '' });"
)
rep(
"    this.save({ milestones: this.state.milestones.map(x => x.id === id ? { ...x, claimed: true } : x), exp: this.state.exp + m.bonus, ledger: [{ ts, name: '里程碑达成 · ' + m.name, delta: m.bonus }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'msClaim', id, bonus: m.bonus, ledgerTs: ts } });",
"    this.save({ milestones: this.state.milestones.map(x => x.id === id ? { ...x, claimed: true } : x), exp: this.state.exp + m.bonus, ledger: [{ ts, name: '里程碑达成 · ' + m.name, delta: m.bonus }, ...this.state.ledger].slice(0, 200), pending: { key, kind: 'msClaim', id, bonus: m.bonus, ledgerTs: ts }, reflectionOpen: true, reflectionTarget: { kind: 'milestone', id, name: m.name, ts }, reflectionBlob: null, reflectionPreview: '' });"
)

# Full backup now includes IndexedDB gallery images on demand
pat_copy = re.compile(r'''  copyFullBackup\(\) \{.*?\n  \}\n  toggleFullView\(\)''', re.S)
m = pat_copy.search(s)
if not m:
    raise SystemExit('copyFullBackup block not found')
copy_block = r'''  async copyFullBackup() {
    this.setState({ backupMsg: '正在打包集锦照片…', backupMsgColor: '#8b93a4' });
    try {
      const code = await this.makeFullBackupAsync();
      const done = () => this.setState({ backupFull: true, backupFullCode: code, backupMsg: '✓ 完整码（含集锦照片）已复制', backupMsgColor: '#4ade80' });
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(() => { this.setState({ backupFull: true, backupFullCode: code }, () => this.selectBackup()); });
      else this.setState({ backupFull: true, backupFullCode: code }, () => this.selectBackup());
    } catch (e) { this.setState({ backupMsg: '完整备份生成失败：' + e.message, backupMsgColor: '#f87171' }); }
  }
  toggleFullView()'''
s = s[:m.start()] + copy_block + s[m.end():]

pat_export = re.compile(r'''  exportDocx\(\) \{.*?\n  \}\n  importDocxFile\(file\)''', re.S)
m = pat_export.search(s)
if not m:
    raise SystemExit('exportDocx block not found')
export_block = r'''  async exportDocx() {
    this.setState({ backupMsg: '正在打包完整备份…', backupMsgColor: '#8b93a4' });
    try {
      const code = await this.makeFullBackupAsync();
      const text = 'EXP BANK 备份码（含集锦照片，导入时整段复制或直接上传本文件）:\r\n' + code;
      const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'EXP-BANK-备份-' + this.todayKey() + '.txt';
      document.body.appendChild(a); a.click(); const u = a.href; a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      this.setState({ backupFull: true, backupFullCode: code, backupMsg: '✓ 已生成完整 .txt 备份（含集锦照片）', backupMsgColor: '#4ade80' });
    } catch (e) { this.setState({ backupMsg: '备份文件生成失败：' + e.message, backupMsgColor: '#f87171' }); }
  }
  importDocxFile(file)'''
s = s[:m.start()] + export_block + s[m.end():]

# Import full backup restores gallery images
old_import_tail = """    if (!data || !Array.isArray(data.tasks)) { this.setState({ backupMsg: '备份码内容无效', backupMsgColor: '#f87171' }); return; }
    this.setState({ ...data, editing: null, pending: null, backupMsg: '✓ 导入成功,数据已恢复', backupMsgColor: '#4ade80' }, () => localStorage.setItem('exp-bank-v1', JSON.stringify(data)));
  }"""
new_import_tail = """    if (!data || !Array.isArray(data.tasks)) { this.setState({ backupMsg: '备份码内容无效', backupMsgColor: '#f87171' }); return; }
    const galleryImages = data.galleryImages || null; delete data.galleryImages;
    this.setState({ ...data, editing: null, pending: null, backupMsg: '✓ 导入成功,数据已恢复', backupMsgColor: '#4ade80' }, () => {
      localStorage.setItem('exp-bank-v1', JSON.stringify(data));
      if (galleryImages) this.restoreGalleryImages(galleryImages).then(() => this.setState({ backupMsg: '✓ 导入成功，集锦照片也已恢复', backupMsgColor: '#4ade80' }));
    });
  }"""
rep(old_import_tail, new_import_tail)

# Render backup code from asynchronously generated full backup when available
rep("      backupOpen: !!st.backupOpen, backupCode: st.backupOpen ? (st.backupFull ? this.makeFullBackup() : this.makeBackupCode()) : '',", "      backupOpen: !!st.backupOpen, backupCode: st.backupOpen ? ((st.backupFull && st.backupFullCode) ? st.backupFullCode : this.makeBackupCode()) : '',")

# Gallery render model and props
render_anchor = "    const fmt = ts => { const d = new Date(ts), p = n => String(n).padStart(2, '0'); return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };"
if render_anchor not in s:
    raise SystemExit('fmt anchor missing')
render_insert = render_anchor + r'''
    const galleryEntries = (st.galleryEntries || []).slice().sort((a, b) => b.ts - a.ts).map(g => {
      const imgUrl = (st.galleryImageUrls || {})[g.id] || '';
      return { ...g, targetName: g.targetName || '已删除项目', timeStr: fmt(g.ts), hasText: !!(g.text || '').trim(),
        hasImage: !!imgUrl, imgUrl, kindLabel: g.kind === 'milestone' ? 'MILESTONE' : 'TASK', kindColor: g.kind === 'milestone' ? '#e6c46a' : '#60a5fa',
        onDel: e => { e.stopPropagation(); this.delGalleryEntry(g.id); } };
    });'''
s = s.replace(render_anchor, render_insert, 1)

rep(
"      rewards, milestones, ledger, showLedger: this.props.showLedger ?? true,",
"      rewards, milestones, ledger, showLedger: this.props.showLedger ?? true,\n      reflectionOpen: !!st.reflectionOpen, reflectionTargetName: st.reflectionTarget ? st.reflectionTarget.name : '', reflectionHasImage: !!st.reflectionPreview, reflectionNoImage: !st.reflectionPreview, reflectionPreview: st.reflectionPreview || '',\n      pickReflectionImage: () => this.pickReflectionImage(), skipReflection: () => this.skipReflection(), saveReflection: () => this.saveReflection(),\n      galleryOpen: !!st.galleryOpen, galleryEntries, galleryEmpty: galleryEntries.length === 0, galleryCount: galleryEntries.length, openGallery: () => this.openGallery(), closeGallery: () => this.closeGallery(),"
)

# Backup UI wording now explicitly includes gallery photos
rep("          <div onClick=\"{{ copyFullBackup }}\" style=\"cursor:pointer;flex:1;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#c3c9d6;border:1px solid #2f3542;background:#161a22;border-radius:8px;padding:9px 0;\" style-hover=\"border-color:{{ accent }};\">复制完整码(含图)</div>", "          <div onClick=\"{{ copyFullBackup }}\" style=\"cursor:pointer;flex:1;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#c3c9d6;border:1px solid #2f3542;background:#161a22;border-radius:8px;padding:9px 0;\" style-hover=\"border-color:{{ accent }};\">复制完整码(含集锦图)</div>")
rep("        <div onClick=\"{{ exportDocx }}\" style=\"cursor:pointer;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35);border-radius:8px;padding:9px 0;\" style-hover=\"filter:brightness(1.12);\">⬇ 生成 .txt 文件保存(含图)</div>", "        <div onClick=\"{{ exportDocx }}\" style=\"cursor:pointer;text-align:center;font-family:'JetBrains Mono',monospace;font-size:12.5px;font-weight:700;color:#14151c;background:{{ btnGrad }};box-shadow:inset 0 1px 0 rgba(255,255,255,0.65),inset 0 -1px 0 rgba(0,0,0,0.35);border-radius:8px;padding:9px 0;\" style-hover=\"filter:brightness(1.12);\">⬇ 生成完整 .txt 备份(含集锦图)</div>")

p.write_text(s, encoding='utf-8')
print('Patch B applied successfully')
