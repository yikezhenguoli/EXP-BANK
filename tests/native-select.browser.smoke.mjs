import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright') : 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png' };
const version = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/const APP_VERSION = '([^']+)'/)[1];
const seed = {
  appVersion:version, welcomed:true, tab:'lists', exp:1234, nextId:600,
  tasks:[{id:1,name:'下拉框回归测试',exp:10,cycle:'weekly',times:3,interval:2,
    anchorDate:'2026-11-01',done:{},completionLog:{},setId:null}],
  sets:Array.from({length:12}, (_, i) => ({id:100+i,name:i === 11 ? '专业英语 · "长标题" & <复习>' : '任务集 '+(i+1)})),
  rewards:[], rewardCategories:[], milestones:[], milestoneSets:[], ledger:[],
  stash:[], opex:[], galleryEntries:[], countdowns:[], dayline:[]
};
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname+'index.html' : pathname));
  if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
  res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const errors = [];
try {
  browser = await chromium.launch({executablePath:process.env.EXP_BANK_CHROME || undefined,headless:true,args:['--no-sandbox']});
  for (const [width, theme, scheme] of [[360,'minimal','light'],[390,'verdant','dark']]) {
    const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,colorScheme:scheme});
    await context.addInitScript(data => {
      if (!localStorage.getItem('exp-bank-v1')) localStorage.setItem('exp-bank-v1', JSON.stringify(data));
    }, {...seed, uiTheme:theme});
    await context.route('https://**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.locator('[data-task-id="1"]').tap();
    await page.getByText('编辑', {exact:true}).tap();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('exp-bank-v1')));
    const options = await page.locator('#ed-set option').evaluateAll(nodes => nodes.map(node => ({
      label:node.label, explicit:node.getAttribute('label'), text:node.textContent, value:node.value
    })));
    assert.equal(options.length, 13, 'all 12 task sets plus unclassified must be present');
    for (const option of options) {
      assert.ok(option.label.trim(), 'native option label cannot be blank: '+JSON.stringify(option));
      if (option.value) assert.equal(option.explicit, option.text, 'dynamic native label must match the visible name');
    }
    assert.ok(options.at(-1).label.includes(seed.sets.at(-1).name), 'special characters must remain plain text');
    const palette = await page.locator('#ed-set').evaluate(node => ({
      scheme:getComputedStyle(node).colorScheme,
      color:getComputedStyle(node.options[1]).color,
      background:getComputedStyle(node.options[1]).backgroundColor
    }));
    assert.equal(palette.scheme, 'dark');
    assert.equal(palette.color, 'rgb(230, 233, 240)');
    assert.equal(palette.background, 'rgb(13, 15, 20)');
    await page.locator('#ed-set').selectOption('111');
    await page.getByText('保存', {exact:true}).tap();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('exp-bank-v1')).tasks[0].setId === 111);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('exp-bank-v1')));
    for (const [key, value] of Object.entries(before.tasks[0])) {
      assert.deepEqual(saved.tasks[0][key], key === 'setId' ? 111 : value,
        'editing the set must preserve task field '+key);
    }
    for (const key of ['exp','ledger','sets','galleryEntries','rewards','stash','opex']) assert.deepEqual(saved[key],before[key],key+' must be preserved');
    await page.reload();
    await page.locator('[data-task-id="1"]').tap();
    await page.getByText('编辑', {exact:true}).tap();
    assert.equal(await page.locator('#ed-set').inputValue(),'111');
    assert.ok((await page.locator('#ed-set').evaluate(node => node.selectedOptions[0].label)).includes(seed.sets.at(-1).name));
    console.log('PASS '+width+'px '+theme+'/'+scheme+': native labels, palette, selection, save, reload and data preservation');
    await context.close();
  }
  assert.deepEqual(errors,[]);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
