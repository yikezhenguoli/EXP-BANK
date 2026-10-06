import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), A = require('../task-assistant.js'), P = require('../progression.js');
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS ' + name); };
const parse = s => { const p=A.parse(s); assert.equal(p.error,''); return p.tasks; };
test('普通口语无任务关键字也能识别，数量保留在名称',()=>{
 const [t]=parse('我想每天背二十个单词，完成一次给我五分，放在英语学习任务集');
 assert.deepEqual([t.name,t.exp,t.cycle,t.times,t.setName],['背二十个单词',5,'daily',1,'英语学习']);
});
test('分号和换行各项规则独立，不拿第一项或最后一项覆盖全体',()=>{
 for(const separator of ['；','\n','，']) {
  const t=parse('每天阅读20页书5EXP'+separator+'每周跑步三次8EXP');
  assert.deepEqual(t.map(x=>[x.name,x.exp,x.cycle,x.times]),[['阅读20页书',5,'daily',1],['跑步',8,'weekly',3]]);
 }
 const t=parse('每天阅读20页书，每次5积分；每周跑步三次，每次8EXP');
 assert.deepEqual(t.map(x=>x.exp),[5,8]);
});
test('中文数字、两周跨度、每次小数积分',()=>{
 const [t]=parse('每两周跑步三次，每次零点五EXP'); assert.deepEqual([t.exp,t.interval,t.times,t.cycle],[0.5,2,3,'weekly']);
 assert.equal(A.number('二百三十五'),235);
});
test('明确共同规则与各项覆盖，任务集统一复用',()=>{
 const t=parse('每天阅读2EXP；每周跑步8EXP；每项5EXP；放在健康任务集');
 assert.deepEqual(t.map(x=>[x.exp,x.setName]),[[2,'健康'],[8,'健康']]);
 const list=parse('背单词，听力，阅读，每项五积分，每周三次');
 assert.equal(list.length,3); assert.ok(list.every(t=>t.exp===5&&t.cycle==='weekly'&&t.times===3));
});
test('旧版带引号批量描述及 A–Z 仍可用',()=>{
 const t=parse('创建“背单词、听力、阅读”3项任务，放在六级任务集，每周完成3次，每项5 EXP');
 assert.deepEqual(t.map(x=>x.name),['背单词','听力','阅读']); assert.ok(t.every(x=>x.setName==='六级'));
 const az=parse('把26个英文字母列为26项任务，放在一个叫1的任务集里，每项0.5 EXP');
 assert.equal(az.length,26); assert.equal(az[25].name,'Z'); assert.ok(az.every(t=>t.exp===0.5&&t.setName==='1'));
});
test('带标点的单项名称、编号清单、名称开头数字不丢失',()=>{
 assert.equal(parse('任务：“阅读,写摘要”，每项5EXP')[0].name,'阅读,写摘要');
 assert.deepEqual(parse('1. 阅读5EXP\n2. 跑步8EXP').map(t=>t.name),['阅读','跑步']);
 assert.equal(parse('20分钟阅读，每次5积分')[0].name,'20分钟阅读');
});
test('缺省建议明确标记，0EXP有效',()=>{
 const [t]=parse('跑步'); assert.equal(t.exp,10); assert.ok(t.warnings.some(x=>x.includes('未写积分'))); assert.ok(t.warnings.some(x=>x.includes('单次')));
 assert.equal(parse('单次整理照片，0EXP')[0].exp,0);
});
test('冲突周期和积分需人工确认，非法值不能生成',()=>{
 const [t]=parse('跑步每天或每周，5EXP或8EXP'); assert.ok(t.review.includes('cycle')); assert.ok(t.review.includes('exp')); assert.ok(A.valid(t).length);
 for(const raw of ['跑步 -5EXP','跑步 1.234EXP','跑步 1000001EXP']) assert.ok(A.valid(parse(raw)[0]).length,raw);
});
test('优先级、维护推断可由明确规则覆盖',()=>{
 assert.equal(parse('重要但不紧急阅读，每天5EXP')[0].priority,'p3');
 assert.equal(parse('每天洗贴身衣物，3EXP')[0].taskKind,'maintenance');
 assert.equal(parse('每天洗贴身衣物，普通任务，3EXP')[0].taskKind,'standard');
});
test('补充说明按任务定向修正，也可明确共同修改',()=>{
 const original=A.parse('每天阅读5EXP；每周跑步三次8EXP');
 const revised=A.refine(original,'跑步改成每周两次；全部每项6积分'); assert.equal(revised.error,'');
 assert.deepEqual(revised.tasks.map(t=>[t.exp,t.cycle,t.times]),[[6,'daily',1],[6,'weekly',2]]);
 assert.ok(A.refine(original,'改成好一点').error);
});
test('用户记住的缺省设置不覆盖明确新描述，特殊名称也安全存储',()=>{
 const t=parse('每周跑步三次8EXP'); const prefs=A.remember({},t);
 const implicit=A.parse('跑步',{preferences:prefs}).tasks[0]; assert.deepEqual([implicit.exp,implicit.cycle,implicit.times],[8,'weekly',3]);
 const explicit=A.parse('每天跑步5EXP',{preferences:prefs}).tasks[0]; assert.equal(explicit.exp,5); assert.equal(explicit.cycle,'daily');
 const special=A.remember({},parse('__proto__ 5EXP')); assert.ok(Object.hasOwn(special,'__proto__'));
});
test('已有同名任务默认跳过；完全相同草稿去重',()=>{
 const p=A.parse('跑步5EXP',{tasks:[{name:'跑步'}]}); assert.equal(p.tasks[0].selected,false);
 assert.equal(parse('跑步5EXP；跑步5EXP').length,1);
});
test('破坏性命令不执行，作为任务内容的清理动作可创建',()=>{
 assert.ok(A.parse('清空所有任务').error); assert.ok(A.parse('删除我的账本数据').error);
 assert.equal(parse('创建任务：清空邮箱，5EXP')[0].name,'清空邮箱');
 assert.ok(A.parse('{"action":"delete","tasks":[]}').error);
});
test('结构化草稿严格校验白名单，不能注入状态或操作',()=>{
 assert.equal(parse('{"tasks":[{"name":"阅读","exp":5,"cycle":"daily","times":1,"interval":1,"priority":"p3","taskKind":"standard"}],"setName":"学习"}')[0].setName,'学习');
 assert.ok(A.parse('{"tasks":[{"name":"阅读","id":999,"exp":100}]}').error);
 assert.ok(A.valid(parse('[{"name":"阅读","exp":"NaN"}]')[0]).length);
});
test('长描述和超批次明确拒绝，不静默截断',()=>{
 assert.ok(A.parse('读'.repeat(12001)).error);
 assert.ok(A.parse(Array.from({length:101},(_,i)=>'第'+i+'项 5EXP').join('\n')).error);
});
test('旧价格和积分不重算；新规则归一化幂等',()=>{
 const s={tasks:[],rewards:[{id:1,cost:123.45,redeems:[1]}],exp:999};
 const n=P.normalize(s); assert.equal(n.rewards[0].cost,123.45); assert.equal(n.exp,999); assert.deepEqual(P.normalize(n),n);
 assert.throws(()=>P.normalize({...s,progressionSchemaVersion:99}));
});
test('1元10EXP，顾虑1/1.2/1.5，Red不出售',()=>{
 for(const f of [1,1.2,1.5]) assert.equal(P.rewardRule({baseMoney:20,baseCost:100,frictionFactor:f}).cost,200*f);
 assert.throws(()=>P.rewardRule({frictionFactor:2})); assert.throws(()=>P.rewardRule({baseMoney:-1})); assert.throws(()=>P.rewardRule({cooldownDays:1.5}));
 const r=P.rewardRule({riskBand:'red'}); assert.equal(P.blocked(r),'已下架'); assert.throws(()=>P.redeemed(r,Date.now()));
});
test('Amber默认7天冷却，期满恢复；已有兑换历史不截断',()=>{
 const ts=1000000000, rule=P.rewardRule({riskBand:'amber'}), r=P.redeemed({...rule,redeems:Array.from({length:600},(_,i)=>i)},ts);
 assert.equal(r.redeems.length,601); assert.equal(r.cooldownUntil,ts+7*864e5); assert.ok(P.blocked(r,ts+1)); assert.equal(P.blocked(r,r.cooldownUntil),'');
});
test('维护15封顶，部分发放和0发放可审计；普通周期任务另算',()=>{
 let s=P.normalize({tasks:[],rewards:[]}), result;
 for(const [i,expect] of [[1,10],[2,5],[3,0]]) { result=P.award(s,{id:i,exp:10,taskKind:'maintenance'},'c'+i,'2026-10-06',i); assert.equal(result.actual,expect); s=result.state; }
 assert.equal(P.maintenanceUsed(s,'2026-10-06'),15); assert.equal(s.maintenanceDays['2026-10-06'].entries.length,3);
 assert.equal(P.award(s,{exp:100,taskKind:'standard'},'normal','2026-10-06',4).actual,100);
 assert.equal(P.award(s,{exp:10,taskKind:'maintenance'},'tomorrow','2026-10-07',5).actual,10);
});
test('维护撤销只回退实际发放额；不依赖EXP账本，可再发剩余额度',()=>{
 let s=P.normalize({tasks:[],rewards:[]});
 s=P.award(s,{id:1,exp:10,taskKind:'maintenance'},'one','2026-10-06',1).state;
 s=P.award(s,{id:2,exp:10,taskKind:'maintenance'},'two','2026-10-06',2).state;
 s={...s,ledger:[]}; s=P.reverse(s,'2026-10-06','two'); assert.equal(P.maintenanceUsed(s,'2026-10-06'),10);
 assert.throws(()=>P.reverse(s,'2026-10-06','two')); assert.throws(()=>P.award(s,{exp:10,taskKind:'maintenance'},'one','2026-10-06',3));
 assert.equal(P.award(s,{exp:10,taskKind:'maintenance'},'three','2026-10-06',3).actual,5);
});
console.log('Assistant and progression checks passed: '+count);
