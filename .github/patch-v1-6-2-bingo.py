from pathlib import Path
import subprocess


def replace_one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

path = Path("index.html")
s = path.read_text(encoding="utf-8")

s = replace_one(s, "const APP_VERSION = 'v1.6.1';", "const APP_VERSION = 'v1.6.2';", "app version")
s = replace_one(
    s,
    '<div title="{{ bc.title }}" style="min-height:{{ bingoCellH }};',
    '<div onClick="{{ bc.onClick }}" title="{{ bc.title }}" style="cursor:{{ bc.cursor }};min-height:{{ bingoCellH }};',
    "bingo cell click binding",
)

old_method = """  setBingoView(period) { if (['day','week','month'].includes(period)) this.save({ bingoView: period }); }
  closeBingoCelebration() { clearTimeout(this._bingoCelebrationTimer); this.setState({ bingoCelebration: null }); }
"""
new_method = r"""  setBingoView(period) { if (['day','week','month'].includes(period)) this.save({ bingoView: period }); }
  editBingoCell(period, index) {
    if (!['day','week','month'].includes(period)) return;
    const boards = this.normalizeBingoBoards(this.state.bingoBoards || {});
    const board = boards[period];
    const cell = board && board.cells ? board.cells[index] : null;
    if (!cell) return;
    const periodName = { day: '日', week: '周', month: '月' }[period] || '';
    const msg = 'BINGO ' + periodName + '棋盘 · ' + cell.name + '\n\n删除这条已落盘事件？\n原任务完成记录和已经获得的 EXP 不受影响。';
    if (!window.confirm(msg)) return;
    const cells = [...board.cells];
    cells[index] = null;
    const next = { ...board, cells, draws: Math.max(0, Number(board.draws || 0) - 1) };
    const line = this.bingoWinLine(cells, this.bingoSize(period));
    next.winLine = line || [];
    boards[period] = next;
    this.save({ bingoBoards: boards });
  }
  closeBingoCelebration() { clearTimeout(this._bingoCelebrationTimer); this.setState({ bingoCelebration: null }); }
"""
s = replace_one(s, old_method, new_method, "bingo cell edit method")

old_cells = "const bingoCells = bingoBoard.cells.map((cell, i) => ({ key: bingoView + '-' + i, label: cell ? cell.name : '?', title: cell ? cell.name : '等待下一次随机落位', filled: !!cell,"
new_cells = "const bingoCells = bingoBoard.cells.map((cell, i) => ({ key: bingoView + '-' + i, label: cell ? cell.name : '?', title: cell ? cell.name + ' · 点击管理此 Bingo 记录' : '等待下一次随机落位', onClick: cell ? () => this.editBingoCell(bingoView, i) : () => {}, cursor: cell ? 'pointer' : 'default', filled: !!cell,"
s = replace_one(s, old_cells, new_cells, "bingo cell view model")
path.write_text(s, encoding="utf-8")

sw = Path("sw.js")
w = sw.read_text(encoding="utf-8")
w = replace_one(w, "const CACHE = 'exp-bank-v1.6.1';", "const CACHE = 'exp-bank-v1.6.2';", "service worker cache")
sw.write_text(w, encoding="utf-8")

checks = [
    "const APP_VERSION = 'v1.6.2';",
    "editBingoCell(period, index)",
    'onClick="{{ bc.onClick }}"',
    "cursor: cell ? 'pointer' : 'default'",
    "原任务完成记录和已经获得的 EXP 不受影响。",
]
for marker in checks:
    if marker not in s:
        raise SystemExit("missing marker: " + marker)

start = s.index('<script type="text/x-dc"')
start = s.index('>', start) + 1
end = s.index('</script>', start)
tmp = Path('/tmp/exp-bank-logic.js')
tmp.write_text(s[start:end], encoding='utf-8')
subprocess.run(['node', '--check', str(tmp)], check=True)
