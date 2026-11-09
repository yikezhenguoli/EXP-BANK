import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
  '.css':'text/css', '.webmanifest':'application/manifest+json',
  '.woff2':'font/woff2', '.ico':'image/x-icon'
};
const seed = {
  appVersion:'v1.15.4', welcomed:true, tab:'lists', exp:1000, nextId:600,
  tasks:[], sets:[], milestones:[], milestoneSets:[], funds:[], countdowns:[],
  ledger:[], stash:[], opex:[], galleryEntries:[], dayline:[],
  rewardFold:{},
  rewardCategories:[{id:500,name:'体验'},{id:501,name:'学习'}],
  rewards:[
    {id:503,name:'学习卡',cost:20,categoryId:501,redeems:[],img:'',capCycle:'daily',capInterval:1,capTimes:1},
    {id:504,name:'咖啡',cost:30,categoryId:500,redeems:[1760000000000],img:'',capCycle:'daily',capInterval:1,capTimes:1},
    {id:505,name:'课程',cost:40,categoryId:501,redeems:[],img:'',capCycle:'daily',capInterval:1,capTimes:1}
  ]
};

const server = http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname); }
  catch (_) { res.writeHead(400); res.end('bad request'); return; }
  const relative = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const file = path.resolve(root,'.' + relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const errors = [], results = [];

async function stored(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('exp-bank-v1')));
}
async function waitForStored(page, predicate, message) {
  await page.waitForFunction(predicate, null, {timeout:10000}).catch(async error => {
    const current = await stored(page);
    throw new Error(message + '; actual=' + JSON.stringify(current) + '; ' + error.message);
  });
}
async function assertNoHorizontalOverflow(page,width) {
  const result = await page.evaluate(() => ({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(result.doc <= result.viewport + 1, width + 'px horizontal overflow: ' + JSON.stringify(result));
}

try {
  for (const width of [360,390,768]) {
    const context = await browser.newContext({
      viewport:{width,height:900}, deviceScaleFactor:2, isMobile:true, hasTouch:true
    });
    await context.addInitScript(data => {
      if (!localStorage.getItem('exp-bank-v1')) localStorage.setItem('exp-bank-v1',JSON.stringify(data));
    },seed);
    const page = await context.newPage();
    page.on('pageerror',error => errors.push(width + 'px: ' + error.message));
    await page.route('https://**',route => route.abort());
    await page.goto(origin + '/index.html');
    await page.getByText('SHOPPING MALL // REDEEM',{exact:true}).waitFor({timeout:30000});
    await assertNoHorizontalOverflow(page,width);

    // Open sorting and verify the reward-category controls are genuinely tappable.
    await page.locator('[title="拖动排序奖励，或切换排序奖励集"]').tap();
    const categoryTab = page.getByRole('button',{name:'切换到奖励集排序'});
    await categoryTab.waitFor();
    await categoryTab.tap();
    const categoryUp = page.getByRole('button',{name:'将学习上移一位'});
    const categoryBox = await categoryUp.boundingBox();
    assert.ok(categoryBox && categoryBox.width >= 44 && categoryBox.height >= 44,
      width + 'px category up target must be at least 44x44');
    await categoryUp.tap();
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewardCategories.map(x=>x.id).join(',') === '501,500',
      'category order was not persisted');
    await page.waitForFunction(() => document.querySelectorAll('[data-reward-category]').length === 2);

    // Switch to rewards and reorder within the selected category.
    await page.getByRole('button',{name:'切换到奖励排序'}).tap();
    const rewardUp = page.getByRole('button',{name:'将课程上移一位'});
    const rewardBox = await rewardUp.boundingBox();
    assert.ok(rewardBox && rewardBox.width >= 44 && rewardBox.height >= 44,
      width + 'px reward up target must be at least 44x44');
    await rewardUp.tap();
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewards.filter(x=>x.categoryId===501).map(x=>x.id).join(',') === '505,503',
      'within-category reward order was not persisted');

    // Move between categories, into unclassified, and back without dragging.
    await page.locator('#ro-move-504').selectOption('501');
    await page.getByRole('button',{name:'将咖啡移动到所选奖励集'}).tap();
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewards.find(x=>x.id===504).categoryId === 501,
      'cross-category move was not persisted');
    await page.locator('#ro-move-504').selectOption('none');
    await page.getByRole('button',{name:'将咖啡移动到所选奖励集'}).tap();
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewards.find(x=>x.id===504).categoryId === null,
      'move to unclassified was not persisted');
    await page.locator('#ro-move-504').selectOption('501');
    await page.getByRole('button',{name:'将咖啡移动到所选奖励集'}).tap();
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewards.find(x=>x.id===504).categoryId === 501,
      'move back from unclassified was not persisted');
    await waitForStored(page,() => JSON.parse(localStorage.getItem('exp-bank-v1')).rewards.filter(x=>x.categoryId===501).map(x=>x.id).join(',') === '505,503,504',
      'final category display order was not preserved');

    // The real Shopping Mall view must use the same category and reward order.
    const mallCategoryOrder = await page.locator('[data-reward-category]').evaluateAll(nodes => nodes.map(node=>node.getAttribute('data-reward-category')));
    assert.deepEqual(mallCategoryOrder,['501','500'],width + 'px mall category order');
    const mallRewardOrder = await page.locator('[data-reward-category="501"] [data-reward-id]').evaluateAll(nodes => nodes.map(node=>node.getAttribute('data-reward-id')));
    assert.deepEqual(mallRewardOrder,['505','503','504'],width + 'px mall reward order');
    await assertNoHorizontalOverflow(page,width);

    // Close, reload and verify the saved order remains visible and intact.
    await page.getByRole('button',{name:'完成排序'}).tap();
    await page.reload();
    await page.getByText('SHOPPING MALL // REDEEM',{exact:true}).waitFor({timeout:30000});
    const afterReload = await stored(page);
    assert.deepEqual(afterReload.rewardCategories.map(x=>x.id),[501,500]);
    assert.deepEqual(afterReload.rewards.filter(x=>x.categoryId===501).map(x=>x.id),[505,503,504]);
    const reopenedMallOrder = await page.locator('[data-reward-category]').evaluateAll(nodes => nodes.map(node=>node.getAttribute('data-reward-category')));
    assert.deepEqual(reopenedMallOrder,['501','500'],width + 'px mall order after reload');
    await assertNoHorizontalOverflow(page,width);

    results.push(width + 'px touch: category sort, reward sort, cross-group move, unclassified round-trip, save and reload');
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:results.length,results,pageErrors:errors},null,2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
