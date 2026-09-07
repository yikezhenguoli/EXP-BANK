from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

def rep(old,new):
    global s
    if old not in s: raise SystemExit('missing: '+old[:120])
    s=s.replace(old,new,1)

rep("  makeBackupCode() { const { editing, pending, selectedDate, vw, backupOpen, backupMsg, copyLabel, backupMsgColor, ...data } = this.state; const lite = { ...data, rewards: (data.rewards || []).map(r => { const { img, ...rest } = r; return rest; }) }; return btoa(unescape(encodeURIComponent(JSON.stringify(lite)))); }",
"  makeBackupCode() { const { editing, pending, selectedDate, vw, backupOpen, backupMsg, copyLabel, backupMsgColor, reflectionOpen, reflectionTarget, reflectionBlob, reflectionPreview, galleryOpen, galleryImageUrls, backupFullCode, ...data } = this.state; const lite = { ...data, rewards: (data.rewards || []).map(r => { const { img, ...rest } = r; return rest; }) }; return btoa(unescape(encodeURIComponent(JSON.stringify(lite)))); }")

old="""    const id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (blob) { try { await this.galleryPut(id, blob); } catch (e) { alert('照片保存失败，但文字仍会保存：' + e.message); } }
    const entry = { id, kind: target.kind, targetId: target.id, targetName: target.name, ts: target.ts || Date.now(), text, hasImage: !!blob };"""
new="""    const id = 'g-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    let imageSaved = false;
    if (blob) { try { await this.galleryPut(id, blob); imageSaved = true; } catch (e) { alert('照片保存失败，但文字仍会保存：' + e.message); } }
    const entry = { id, kind: target.kind, targetId: target.id, targetName: target.name, ts: target.ts || Date.now(), text, hasImage: imageSaved };"""
rep(old,new)
p.write_text(s,encoding='utf-8')
print('gallery hardening applied')