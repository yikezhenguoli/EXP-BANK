/* EXP BANK v1.12.0 — additive life classification, independent ordering and period-aware summaries. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ExpLife = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCHEMA = 1;
  const TYPES = ['CORE','GROWTH','MAINTENANCE','EXPLORATION'];
  const META = {
    CORE:{ label:'核心维持', color:'#79aaf5', bg:'rgba(121,170,245,.09)', description:'睡眠、饮食、健康与必须责任' },
    GROWTH:{ label:'成长推进', color:'#b99ae5', bg:'rgba(185,154,229,.09)', description:'学习、技能、项目与职业发展' },
    MAINTENANCE:{ label:'系统维护', color:'#b6ab8d', bg:'rgba(182,171,141,.09)', description:'整理、清洁、财务与设备维护' },
    EXPLORATION:{ label:'探索体验', color:'#86b99b', bg:'rgba(134,185,155,.09)', description:'兴趣、阅读、社交与新体验' }
  };
  const isType = value => TYPES.includes(value);
  const dateKey = d => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  function validDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T12:00:00'); return !Number.isNaN(d.getTime()) && dateKey(d) === s;
  }
  function textType(raw) {
    const text = String(raw || '').normalize('NFKC');
    // Concrete maintenance actions outrank incidental words such as “运动后”.
    if (/吃药|服药|用药|就医|复诊|伤口|看医生|必须责任|必要责任|基础学习|当天课程|上课|出勤|课程作业|交作业|课程任务/.test(text)) return 'CORE';
    if (/整理|清洁|清扫|打扫|收拾|洗衣|洗贴身|洗床单|洗被|换床|换干衣|换衣|送洗|洗碗|洗餐具|文件管理|备份文件|设备维护|系统维护|财务管理|记账|对账|账单|汇总.*OPEX|OPEX.*汇总|维护|报销|报税|还款/i.test(text)) return 'MAINTENANCE';
    if (/睡眠|睡觉|睡前|早睡|早点睡|按时睡|起床|饮食|吃饭|吃.*饭|早餐|午餐|晚餐|早饭|午饭|晚饭|喝.*水|饮水|健康|运动|跑步|体测|健身|拉伸|康复|刷牙|洗澡/.test(text)) return 'CORE';
    if (/学习|刷题|复习|预习|背.*单词|单词|六级|四级|英语|听力|考试|备考|Python|编程|技能|研究|开发|项目|职业|实习|简历|求职|投资研究|基金研究|ETF研究|低空经济/i.test(text)) return 'GROWTH';
    if (/娱乐|电影|社交|朋友|家人|笔友|旅行|旅游|咖啡|兴趣|新体验|探索|音乐|新歌/.test(text)) return 'EXPLORATION';
    return null;
  }
  function infer(task, sets = []) {
    if (isType(task.lifeType)) return task.lifeType;
    if (task.taskKind === 'maintenance') return 'MAINTENANCE';
    const byName = textType(task.name || task.taskName);
    if (byName) return byName;
    const category = typeof task.category === 'string' ? task.category : Array.isArray(task.category) ? task.category.join(' ') : '';
    return textType(category) || textType(task.setName || (sets.find(s=>s.id===task.setId) || {}).name) || 'EXPLORATION';
  }
  function normalize(state, today = dateKey(new Date())) {
    if (state.lifeSchemaVersion != null && state.lifeSchemaVersion !== SCHEMA) throw new Error('无法识别未来的人生分类版本；原始数据已保留。');
    if (!validDate(today)) throw new Error('人生分类日期无效。');
    const rows = (state.tasks || []).map(t => {
      if (t.lifeType != null && t.lifeType !== '' && !isType(t.lifeType)) throw new Error('任务的人生分类无效；原始数据已保留，请核对备份。');
      const lifeType = infer(t, state.sets || []);
      if (t.warImportant != null && typeof t.warImportant !== 'boolean') throw new Error('关键成长标记无效。');
      return { ...t, lifeType,
        warImportant:t.warImportant ?? (lifeType === 'GROWTH' && (t.core === true || t.priority === 'p1')),
        lifeStatsFrom:validDate(t.lifeStatsFrom) ? t.lifeStatsFrom : today };
    });
    const max = Object.fromEntries(TYPES.map(type=>[type, rows.filter(t=>t.lifeType===type && Number.isSafeInteger(t.lifeOrder) && t.lifeOrder>=0).reduce((m,t)=>Math.max(m,t.lifeOrder),-1)]));
    const tasks = rows.map(t => ({ ...t, lifeOrder:Number.isSafeInteger(t.lifeOrder) && t.lifeOrder>=0 ? t.lifeOrder : ++max[t.lifeType] }));
    return { ...state, lifeSchemaVersion:SCHEMA, tasks,
      taskSortMode:state.taskSortMode === 'manual' ? 'manual' : 'life' };
  }
  function sorted(tasks, type = null) {
    return (tasks || []).filter(t=>!type || t.lifeType===type).map((t,i)=>({t,i})).sort((a,b)=>
      TYPES.indexOf(a.t.lifeType)-TYPES.indexOf(b.t.lifeType) || (a.t.lifeOrder || 0)-(b.t.lifeOrder || 0) || a.i-b.i).map(x=>x.t);
  }
  function move(state, id, direction) {
    if (direction !== -1 && direction !== 1) throw new Error('排序方向无效。');
    const task = state.tasks.find(t=>t.id===id); if (!task) throw new Error('任务已不存在，请同步后重试。');
    const group = sorted(state.tasks, task.lifeType), index = group.findIndex(t=>t.id===id), target = index+direction;
    if (target < 0 || target >= group.length) return state;
    [group[index],group[target]]=[group[target],group[index]];
    const order = new Map(group.map((t,i)=>[t.id,i]));
    return { ...state, tasks:state.tasks.map(t=>order.has(t.id) ? { ...t, lifeOrder:order.get(t.id) } : t) };
  }
  function changed(task, lifeType, tasks) {
    if (!isType(lifeType)) throw new Error('请选择有效人生分类。');
    if (lifeType === task.lifeType) return task;
    const next = tasks.filter(t=>t.id!==task.id && t.lifeType===lifeType).reduce((m,t)=>Math.max(m,t.lifeOrder || 0),-1)+1;
    return { ...task, lifeType, lifeOrder:next };
  }
  function stats(tasks, now, periodKey) {
    const today = dateKey(now), monday = new Date(now); monday.setHours(12,0,0,0); monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
    let todayDone=0,todayTotal=0,weekDone=0,weekTotal=0;
    for (const t of tasks) {
      const start = validDate(t.lifeStatsFrom) ? t.lifeStatsFrom : today;
      if (start > today) continue;
      const times = Math.max(1,Number(t.times) || 1);
      const count = key => Math.min(times,Math.max(0,Number((t.done || {})[key]) || 0));
      if (t.cycle === 'daily' && Number(t.interval || 1) === 1) {
        todayTotal++; if (count(periodKey(t,now)) >= times) todayDone++;
      }
      if (!['daily','weekly'].includes(t.cycle)) continue;
      const seen = new Set();
      for (let day = new Date(monday); dateKey(day) <= today; day.setDate(day.getDate()+1)) {
        if (dateKey(day) < start) continue;
        const key = periodKey(t,day); if (key == null || seen.has(key)) continue;
        seen.add(key); weekTotal += times; weekDone += count(key);
      }
    }
    return { todayDone,todayTotal,weekDone,weekTotal,weekRate:weekTotal ? Math.round(weekDone/weekTotal*100) : null };
  }
  return { SCHEMA,TYPES,META,isType,infer,normalize,sorted,move,changed,stats,dateKey };
});
