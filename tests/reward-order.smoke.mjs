import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../reward-order.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

test('奖励集可独立排序，不改变奖励归属', () => {
  const categories = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
  const next = R.move(categories, 3, 1, false);
  assert.deepEqual(next.map(x => x.id), [3, 1, 2]);
  assert.deepEqual(categories.map(x => x.id), [1, 2, 3]);
});

test('奖励可在同一奖励集内调整顺序', () => {
  const rewards = [
    { id: 10, name: 'A1', categoryId: 1 },
    { id: 20, name: 'A2', categoryId: 1 },
    { id: 30, name: 'B1', categoryId: 2 }
  ];
  const next = R.moveReward(rewards, 20, 10, false);
  assert.deepEqual(next.filter(x => x.categoryId === 1).map(x => x.id), [20, 10]);
  assert.equal(next.find(x => x.id === 20).categoryId, 1);
});

test('奖励拖到其他奖励集后归属和组内位置同步更新', () => {
  const rewards = [
    { id: 10, name: 'A1', categoryId: 1 },
    { id: 20, name: 'B1', categoryId: 2 },
    { id: 30, name: 'A2', categoryId: 1 },
    { id: 40, name: '未分类', categoryId: null }
  ];
  const moved = R.moveReward(rewards, 30, 20, true);
  assert.equal(moved.find(x => x.id === 30).categoryId, 2);
  assert.deepEqual(moved.filter(x => x.categoryId === 2).map(x => x.id), [20, 30]);
  const appended = R.moveToCategory(moved, 40, 1);
  assert.equal(appended.find(x => x.id === 40).categoryId, 1);
  assert.deepEqual(appended.filter(x => x.categoryId === 1).map(x => x.id), [10, 40]);
});

test('拖到未分类和空奖励集也能正确归类', () => {
  const rewards = [{ id: 1, categoryId: 9 }, { id: 2, categoryId: 9 }];
  const uncategorized = R.moveToCategory(rewards, 1, null);
  assert.equal(uncategorized.find(x => x.id === 1).categoryId, null);
  const empty = R.moveToCategory(uncategorized, 2, 12);
  assert.equal(empty.find(x => x.id === 2).categoryId, 12);
  assert.equal(R.sameOrder(rewards, rewards, true), true);
  assert.equal(R.sameOrder(rewards, uncategorized, true), false);
});

console.log('Reward ordering checks passed: ' + count);
