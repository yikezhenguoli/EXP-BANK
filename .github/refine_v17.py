from pathlib import Path
p = Path('index.html')
s = p.read_text(encoding='utf-8')
old = """        return { ...x, name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),
          setId, cycle: newCycle, interval: newInterval, anchorDate: ruleChanged ? anchor : (x.anchorDate || anchor),
          ...(ruleChanged ? { streak: 0, lastPeriod: '' } : {}),
          priority: (document.getElementById('ed-priority') || {}).value || x.priority || 'p4', note: this.v('ed-note') };
"""
new = """        const updated = { ...x, name: name || x.name, exp: num('ed-exp', x.exp), times: Math.max(1, num('ed-times', x.times || 1)),
          setId, cycle: newCycle, interval: newInterval, anchorDate: ruleChanged ? anchor : (x.anchorDate || anchor),
          ...(ruleChanged ? { streak: 0, lastPeriod: '' } : {}),
          priority: (document.getElementById('ed-priority') || {}).value || x.priority || 'p4', note: this.v('ed-note') };
        if (ruleChanged) {
          const currentKey = this.periodKey(updated);
          if (currentKey) {
            const done = { ...(x.done || {}) }, abandoned = { ...(x.abandoned || {}) };
            delete done[currentKey]; delete abandoned[currentKey];
            updated.done = done; updated.abandoned = abandoned;
          }
        }
        return updated;
"""
assert s.count(old) == 1, 'old edit task rule not found uniquely'
s = s.replace(old, new, 1)
assert 'const currentKey = this.periodKey(updated);' in s
assert "const APP_VERSION = 'v1.7.0';" in s
p.write_text(s, encoding='utf-8')
a = s.index('<script type="text/x-dc" data-dc-script')
a = s.index('>', a) + 1
b = s.index('</script>', a)
Path('/tmp/exp-v17-logic.js').write_text(s[a:b], encoding='utf-8')
print('PASS: recurrence edit now clears stale active rule counts only; receipt data remains untouched')
