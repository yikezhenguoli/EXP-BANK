import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),L=require('../life-architecture.js'),A=require('../task-assistant.js'),P=require('../progression.js');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const today='2026-10-07',now=new Date(today+'T12:00:00');
// Fixture calendar: real calendar keys supplied by the application are tested in component checks.
const key=(t,d)=>t.cycle==='daily' ? L.dateKey(d) : '2026-W41';
const norm=tasks=>L.normalize({tasks,sets:[],exp:125,ledger:[{name:'历史',delta:5}],opex:[{amount:10}]},today);
test('健康、学习、具体维护、探索与未知任务分类',()=>{
 const names=['23:00前睡觉','跑步1km','完成当天课程','吃药','Python刷题','六级单词','EXP BANK开发','低空经济研究','整理宿舍','洗床单','整理电脑文件','汇总OPEX','看电影','探索咖啡店','认识新朋友','旅行','未命名事项'];
 const expected=['CORE','CORE','CORE','CORE','GROWTH','GROWTH','GROWTH','GROWTH','MAINTENANCE','MAINTENANCE','MAINTENANCE','MAINTENANCE','EXPLORATION','EXPLORATION','EXPLORATION','EXPLORATION','EXPLORATION'];
 assert.deepEqual(names.map(name=>L.infer({name})),expected);
 assert.equal(L.infer({name:'运动后换干衣'}),'MAINTENANCE');
});
test('保留原category和全部业务记录，仅追加人生字段',()=>{
 const old={id:1,name:'事项',category:'健康',exp:50,cycle:'weekly',times:3,interval:2,anchorDate:'2026-09-01',core:true,priority:'p1',done:{'2026-W40':3},completionLog:{'2026-10-01':3},photo:'data:x'};
 const before=structuredClone(old),s=norm([old]);for(const[k,v]of Object.entries(old))assert.deepEqual(s.tasks[0][k],v);
 assert.deepEqual(old,before);assert.equal(s.tasks[0].lifeType,'CORE');assert.equal(s.exp,125);assert.equal(s.ledger.length,1);assert.equal(s.opex[0].amount,10);
});
test('已有分类优先于关键词及任务集，不反复迁移',()=>{
 const s=norm([{id:1,name:'六级单词',lifeType:'CORE',lifeOrder:8,warImportant:false,lifeStatsFrom:'2026-10-01'}]);
 assert.deepEqual(L.normalize(s,'2026-10-08'),s);assert.equal(s.tasks[0].lifeType,'CORE');
 assert.equal(L.infer({name:'阅读',setId:11},[{id:11,name:'基础学习'}]),'CORE');
 assert.equal(L.infer({name:'阅读',category:'学习'}),'GROWTH');
});
test('未知schema或非法显式分类拒绝，不静默覆盖',()=>{
 assert.throws(()=>L.normalize({tasks:[],lifeSchemaVersion:2},today));assert.throws(()=>norm([{name:'跑步',lifeType:'OTHER'}]));
 assert.throws(()=>norm([{name:'刷题',warImportant:'false'}]));
});
test('WAR MODE只保留CORE；旧关键成长字段不再影响筛选',()=>{
 const s=norm([{name:'编程',core:true},{name:'备考',priority:'p1'},{name:'跑步',core:false},{name:'旅行',core:true},{name:'听力'}]);
 assert.deepEqual(s.tasks.filter(P.inWarMode).map(t=>t.name),['跑步']);
 assert.equal(P.inWarMode({lifeType:'GROWTH',warImportant:true}),false);
});
test('四类独立顺序、越界移动和重复序号都稳定',()=>{
 let s=norm([{id:1,name:'吃饭'},{id:2,name:'学习'},{id:3,name:'睡觉'},{id:4,name:'跑步',lifeOrder:0}]);
 s=L.move(s,4,-1);assert.deepEqual(L.sorted(s.tasks,'CORE').map(t=>t.id),[4,1,3]);
 assert.equal(s.tasks.find(t=>t.id===2).lifeOrder,0);assert.deepEqual(L.move(s,4,-1),s);
 assert.deepEqual(L.normalize(s,today),s);assert.throws(()=>L.move(s,99,1));
});
test('转分类追加到目标层末尾，原周期历史不改',()=>{
 const s=norm([{id:1,name:'跑步',done:{x:1}},{id:2,name:'睡觉'}]);
 const changed=L.changed(s.tasks[0],'EXPLORATION',s.tasks);assert.equal(changed.lifeOrder,0);assert.deepEqual(changed.done,{x:1});
 const back=L.changed(changed,'CORE',s.tasks);assert.ok(back.lifeOrder>s.tasks[1].lifeOrder);
});
test('人生MAINTENANCE不会自动改变旧EXP限额规则',()=>{
 const s=P.normalize(norm([{id:1,name:'整理文件',exp:50,taskKind:'standard'}]));
 assert.equal(s.tasks[0].lifeType,'MAINTENANCE');assert.equal(s.tasks[0].taskKind,'standard');assert.equal(P.award(s,s.tasks[0],'one',today,1).actual,50);
});
test('今天3/5按任务达标，本周不计算未来四天',()=>{
 const tasks=Array.from({length:5},(_,i)=>({name:'任务'+i,cycle:'daily',times:1,lifeStatsFrom:'2026-10-05',done:{'2026-10-05':1,'2026-10-06':1,'2026-10-07':i<3?1:0}}));
 const stats=L.stats(tasks,now,key);assert.deepEqual(stats,{todayDone:3,todayTotal:5,weekDone:13,weekTotal:15,weekRate:87});
});
test('每日多次按达标计今日，本周按次数精确累计',()=>{
 const s=L.stats([{cycle:'daily',times:3,lifeStatsFrom:today,done:{[today]:2}}],now,key);
 assert.equal(s.todayDone,0);assert.equal(s.todayTotal,1);assert.equal(s.weekRate,67);
});
test('周任务仅算一个周期，月度单次不限次不混入分母',()=>{
 const tasks=['weekly','monthly','once','free'].map(cycle=>({cycle,times:5,lifeStatsFrom:'2026-10-05',done:{'2026-W41':4}}));
 assert.deepEqual(L.stats(tasks,now,key),{todayDone:0,todayTotal:0,weekDone:4,weekTotal:5,weekRate:80});
});
test('新建和升级当日起算，不补造过去的未完成',()=>{
 assert.equal(L.stats([{cycle:'daily',times:1,lifeStatsFrom:today,done:{}}],now,key).weekTotal,1);
 assert.equal(L.stats([{cycle:'daily',times:1,lifeStatsFrom:'2026-10-08',done:{}}],now,key).weekTotal,0);
 assert.equal(L.stats([],now,key).weekRate,null);
});
test('跨度周期去重，不把同一个多日周期重复记为多个目标',()=>{
 const t={cycle:'daily',interval:2,times:1,lifeStatsFrom:'2026-10-05',done:{p1:1}};
 const s=L.stats([t],now,(_t,d)=>L.dateKey(d)<today?'p1':'p2');assert.equal(s.todayTotal,0);assert.equal(s.weekTotal,2);assert.equal(s.weekRate,50);
});
test('AI本地推荐分类、不编造时间或积分，显式分类可覆盖',()=>{
 assert.equal(A.parse('每天跑步1km，每次50EXP').tasks[0].lifeType,'CORE');
 assert.equal(A.parse('准备六级考试').tasks[0].lifeType,'GROWTH');
 const sleep=A.parse('早点睡').tasks[0];assert.equal(sleep.lifeType,'CORE');assert.equal(sleep.exp,10);assert.ok(sleep.warnings.some(x=>x.includes('未写积分')));assert.ok(!sleep.name.includes('23:00'));
 assert.equal(A.parse('每天阅读5EXP，类型CORE').tasks[0].lifeType,'CORE');
});
test('AI预览分类可补充修改、记住且明确新描述优先',()=>{
 const plan=A.parse('每天阅读5EXP');const next=A.refine(plan,'阅读改为成长推进');assert.equal(next.tasks[0].lifeType,'GROWTH');
 const prefs=A.remember({},next.tasks);assert.equal(A.parse('阅读',{preferences:prefs}).tasks[0].lifeType,'GROWTH');
 assert.equal(A.parse('CORE 阅读',{preferences:prefs}).tasks[0].lifeType,'CORE');
});
test('AI结构化草稿支持lifeType但拒绝非法类型及排序注入',()=>{
 const task={name:'复习',exp:5,lifeType:'GROWTH'};let p=A.parse(JSON.stringify({tasks:[task]}));assert.equal(p.error,'');assert.equal(p.tasks[0].lifeType,'GROWTH');
 p=A.parse(JSON.stringify({tasks:[{...task,lifeType:'UNKNOWN'}]}));assert.ok(A.valid(p.tasks[0]).length);
 assert.ok(A.parse(JSON.stringify({tasks:[{...task,lifeOrder:0}]})).error);
});
console.log('Life Architecture checks passed: '+count);
