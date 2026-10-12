const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
const prefix=script.split('// 真实的逐秒倒计时。')[0];
const clockHelpers=script.slice(script.indexOf('function segmentClock('),script.indexOf('function refreshCountdown('));
const KEY='zhuri-anhui-study-v1';
const revision='2026-10-12-course-practice';
// Keep dated fixtures independent of the actual day this suite runs.
const fixtureTime=new Date(2026,9,10,15).getTime();
class FixtureDate extends Date{
 constructor(...args){super(...(args.length?args:[fixtureTime]))}
 static now(){return fixtureTime}
}
function boot(db={},fail=false){
 const ctx=vm.createContext({Date:FixtureDate,localStorage:{getItem:k=>db[k]??null,setItem:(k,v)=>{if(fail===true||(typeof fail==='function'&&fail(k)))throw Error('full');db[k]=v}},document:{getElementById:()=>({classList:{add(){},remove(){}}})},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(prefix+clockHelpers+';globalThis.inspect={state,defaultSchedule,mathLessons,mathStages,diff,tod,currentTimeline,todayTasks,dailyPlan,dailyCard,orderedScheduleRows,movedScheduleRows,scheduleMoveProposal,saveScheduleProposal,saveSchedulePreference,scheduleCard,createBoundaryReminder,scheduleBoundaries,segmentClock};',ctx);
 return ctx.inspect;
}
const original={schedule:[{id:'x1',start:'07:00',end:'08:00',days:[0,1,2,3,4,5,6]}],checkedVideos:[1,2],checkedCircuit:[0],dailyChecks:{'2026-10-09':['x1']},taskNotes:{x1:'kept'},videoTitles:{1:'custom title'},blankPercent:24};
const db={[KEY]:JSON.stringify(original)};
let r=boot(db);
assert.equal(r.mathStages[0].titles.length,44);assert.equal(r.mathStages[1].titles.length,12);
assert.equal(new Set(r.mathLessons.map(x=>x.id)).size,56);
assert.deepEqual(JSON.parse(JSON.stringify(r.state.checkedVideos)),[1,2]);
assert.equal(r.state.taskNotes.x1,'kept');assert.equal(r.state.videoTitles[1],'custom title');assert.equal(r.state.blankPercent,24);
assert.equal(r.state.scheduleArchive[0].schedule[0].id,'x1');
assert.deepEqual(JSON.parse(db[KEY+'-before-'+revision]),original);
assert.equal(r.defaultSchedule.reduce((n,t)=>n+r.diff(t),0),1440);
const coreSlots=r.defaultSchedule.filter(t=>['高数','英语','模拟电子技术','电路'].includes(t.subject)&&r.diff(t)===120);
assert.equal(coreSlots.length,3);
assert.deepEqual(Array.from(coreSlots,x=>[x.subject,x.start,x.end]),[['英语','14:00','16:00'],['模拟电子技术','19:30','21:30'],['电路','22:30','00:30']]);
const mathSlots=r.defaultSchedule.filter(t=>t.subject==='高数'&&!t.title.includes('做题'));
assert.deepEqual(Array.from(mathSlots,x=>[x.start,x.end,r.diff(x)]),[['09:15','10:55',100],['11:05','12:15',70]]);
const mathBreak=r.defaultSchedule.find(t=>t.title==='高数课间休息');
assert.deepEqual([mathBreak.start,mathBreak.end,r.diff(mathBreak)],['10:55','11:05',10]);
const practices=r.defaultSchedule.filter(t=>t.title.includes('课后做题'));
assert.deepEqual(Array.from(practices,t=>[t.subject,t.start,t.end,r.diff(t)]),[
 ['高数','12:15','13:15',60],['英语','16:00','17:00',60],['模拟电子技术','21:30','22:30',60],['电路','00:30','01:30',60]]);
for(const t of practices){const lessons=r.defaultSchedule.filter(s=>s.subject===t.subject&&!s.title.includes('做题'));assert.equal(lessons[lessons.length-1].end,t.start)}
const exerciseGym=r.defaultSchedule.find(t=>t.subject==='运动'),lunch=r.defaultSchedule.find(t=>t.title==='午饭、休息'),sleepBlock=r.defaultSchedule.find(t=>t.subject==='睡眠');
assert.deepEqual([exerciseGym.start,exerciseGym.end,exerciseGym.title],['17:00','19:30','健身、往返、洗澡、晚饭']);
assert.deepEqual([lunch.start,lunch.end],['13:15','14:00']);
assert.deepEqual([sleepBlock.start,sleepBlock.end,r.diff(sleepBlock)],['01:30','09:00',450]);
assert.equal(r.defaultSchedule.length,14);assert.equal(new Set(r.defaultSchedule.map(t=>t.id)).size,14);
assert.ok(!r.defaultSchedule.some(t=>/准备健身|健身前准备|晚餐|机动时间/.test(t.title)));
const card=r.dailyCard();assert.ok(card.includes('四科课程＋课后练习'));
assert.ok(!card.includes('净学习90分钟＋休息30分钟'));assert.ok(!card.includes('四科均分'));
assert.ok(!card.includes('今日目标1项'));assert.ok(!card.includes('目标最多2节'));
assert.ok(card.includes('每个学科上完当天的课后留1小时做题'));
for(let minute=0;minute<1440;minute++){
 const now=new Date(2026,9,10,Math.floor(minute/60),minute%60);
 assert.ok(r.currentTimeline(now).cur,`missing minute ${minute}`);
 const hits=r.defaultSchedule.filter(t=>r.tod(t.end)>r.tod(t.start)?r.tod(t.start)<=minute&&minute<r.tod(t.end):minute>=r.tod(t.start)||minute<r.tod(t.end));
 assert.equal(hits.length,1,`overlap ${minute}`);
}
let edited=JSON.parse(db[KEY]);edited.schedule[0].title='user changed';db[KEY]=JSON.stringify(edited);
r=boot(db);assert.equal(r.state.schedule[0].title,'user changed');assert.equal(r.state.scheduleArchive.length,1);
const failedDb={[KEY]:JSON.stringify(original)},failed=boot(failedDb,true);
assert.equal(failed.state.schedule[0].id,'x1');assert.equal(failedDb[KEY],JSON.stringify(original));
const oldDesktop={...original,scheduleRevision:'2026-10-10-rounded-hours',checkedMath:['summer-04'],checkedCircuit:[0,2],dailyPlans:{'2026-10-12':{math:['summer-05'],mock:[3],circuit:1}},bottomInset:140,soundReminder:true,soundVolume:73,syncScheduleDrag:false,tableOrder:['x1'],customPreference:'preserve'};
const upgradeDb={[KEY]:JSON.stringify(oldDesktop)},upgraded=boot(upgradeDb);
assert.deepEqual(JSON.parse(upgradeDb[KEY+'-before-'+revision]),oldDesktop);
assert.equal(upgraded.state.scheduleRevision,revision);assert.equal(upgraded.state.schedule.length,14);
assert.deepEqual(Array.from(upgraded.state.tableOrder),[]);
for(const field of ['checkedMath','checkedVideos','checkedCircuit','dailyChecks','taskNotes','videoTitles','dailyPlans','blankPercent','bottomInset','soundReminder','soundVolume','syncScheduleDrag','customPreference'])assert.deepEqual(JSON.parse(JSON.stringify(upgraded.state[field])),oldDesktop[field]);
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.state.scheduleArchive[0].schedule)),oldDesktop.schedule);
boot(upgradeDb);assert.equal(JSON.parse(upgradeDb[KEY]).scheduleArchive.length,1);
for(const failKey of [KEY,KEY+'-before-'+revision]){
 const failedUpgrade={[KEY]:JSON.stringify(oldDesktop)},retained=boot(failedUpgrade,k=>k===failKey);
 assert.equal(failedUpgrade[KEY],JSON.stringify(oldDesktop));assert.equal(retained.state.scheduleRevision,oldDesktop.scheduleRevision);
 assert.deepEqual(JSON.parse(JSON.stringify(retained.state.schedule)),oldDesktop.schedule);
}
const first=r.dailyPlan(new Date(2026,9,10));assert.equal(first.math[0],'summer-01');assert.equal(first.mock[0],3);
r.state.checkedMath.push('summer-01');r.state.checkedVideos.push(3);
assert.equal(r.dailyPlan(new Date(2026,9,10)).math[0],'summer-01');
assert.equal(r.dailyPlan(new Date(2026,9,11)).math[0],'summer-02');
assert.equal(r.dailyPlan(new Date(2026,9,11)).review,true);
r.state.checkedMath=r.mathLessons.filter(x=>x.stage===0).map(x=>x.id);
assert.equal(r.dailyPlan(new Date(2026,9,12)).math[0],'autumn-01');
assert.ok(!html.includes('专升本'));
assert.ok(!html.includes('daily-launch'));
assert.ok(!html.includes('查看今日具体任务'));
assert.ok(!/\.overview\s*\{[^}]*overflow-y\s*:\s*auto/.test(html));
assert.ok(html.includes('.overview{overflow:clip;overscroll-behavior:none}'));
assert.ok(html.includes('--dock-clearance:96px'));
assert.ok(html.includes('padding-bottom:calc(12px + var(--dock-clearance))'));
assert.ok(html.includes('container:overview / size'));
assert.ok(html.includes('@container overview (max-height:480px)'));
const overview=html.split('<section class="overview"')[1].split('</section>')[0];
assert.equal((overview.match(/data-subject=/g)||[]).length,3);
const nodes={};
const progressContext=vm.createContext({localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:id=>nodes[id]??=( {style:{},classList:{add(){},remove(){}}})},setTimeout:()=>0,clearTimeout(){}});
const refresh=script.slice(script.indexOf('function refreshAll('),script.indexOf('function exportBackup('));
vm.runInContext(prefix+'\nfunction refreshCountdown(){}\nfunction renderCard(){}\n'+refresh+`;state.checkedVideos=[1,1,70,-1];state.checkedCircuit=[0,0,6,-1];state.checkedMath=['summer-01','summer-01','unknown'];refreshAll();`,progressContext);
assert.equal(nodes.mocknum.textContent,'1 / 69 视频');
assert.equal(nodes.circuitnum.textContent,'1 / 6 模块');
assert.equal(nodes.mathnum.textContent,'1 / 56 项');
assert.equal(nodes.mathpercent.textContent,'2%');
assert.equal(nodes.mockpercent.textContent,'1%');
assert.equal(nodes.circuitpercent.textContent,'17%');
assert.equal(r.state.bottomInset,96);
const persisted=JSON.parse(db[KEY]);persisted.bottomInset=160;
assert.equal(boot({[KEY]:JSON.stringify(persisted)}).state.bottomInset,160);
const bottomScript=script.slice(script.indexOf('// Bottom clearance is an additive preference'),script.indexOf('// 时间表底边随底部胶囊伸缩'));
const bottomNodes={},writes=[];
function bottomNode(id){return bottomNodes[id]??={listeners:{},attrs:{},hidden:true,classList:{add(){},remove(){}},addEventListener(k,f){this.listeners[k]=f},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},focus(){},setPointerCapture(){}}}
const beforeProgress=JSON.stringify(persisted);
const bottomCtx=vm.createContext({state:persisted,desk:{style:{setProperty(){}},classList:{add(){},remove(){}}},window:{innerWidth:1408,innerHeight:881,addEventListener(){}},document:{getElementById:bottomNode,addEventListener(){}},save(){writes.push(JSON.stringify(persisted))},toast(){}});
vm.runInContext(bottomScript+';globalThis.bottomTest={applyBottomInset,bottomMax};',bottomCtx);
const bt=bottomCtx.bottomTest,bg=bottomNode('bottom-resizer');
assert.equal(bg.attrs['aria-valuenow'],'160');
bt.applyBottomInset(NaN);assert.equal(bg.attrs['aria-valuenow'],'96');
bt.applyBottomInset(-1,true);assert.equal(persisted.bottomInset,0);
bt.applyBottomInset(9999,true);assert.equal(persisted.bottomInset,bt.bottomMax());
bt.applyBottomInset(160);bottomCtx.window.innerHeight=580;bt.applyBottomInset(160);
assert.equal(bg.attrs['aria-valuenow'],'97');assert.equal(persisted.bottomInset,160);
bottomCtx.window.innerHeight=881;bt.applyBottomInset(persisted.bottomInset);
assert.equal(bg.attrs['aria-valuenow'],'160');
const ev={button:0,pointerId:1,clientY:700,preventDefault(){}};
bg.listeners.pointerdown(ev);bg.listeners.pointermove({...ev,clientY:660});
assert.equal(bg.attrs['aria-valuenow'],'200');
const writeCount=writes.length;bg.listeners.pointerup(ev);bg.listeners.lostpointercapture(ev);
assert.equal(writes.length,writeCount+1);assert.equal(persisted.bottomInset,200);
bg.listeners.click();assert.equal(bottomNode('bottom-options').hidden,true);
bg.listeners.pointerdown({...ev,clientY:660});bg.listeners.pointermove({...ev,clientY:760});
bg.listeners.pointerup(ev);assert.equal(persisted.bottomInset,100);
bg.listeners.pointerdown({...ev,clientY:760});bg.listeners.pointermove({...ev,clientY:900});
bg.listeners.pointerup(ev);assert.equal(persisted.bottomInset,0);
bg.listeners.click();bt.applyBottomInset(200,true);
bg.listeners.click();assert.equal(bottomNode('bottom-options').hidden,false);
bg.listeners.click();assert.equal(bottomNode('bottom-options').hidden,true);
bg.listeners.keydown({key:'ArrowDown',shiftKey:true,preventDefault(){}});assert.equal(persisted.bottomInset,190);
bg.listeners.dblclick();assert.equal(persisted.bottomInset,96);
const range=bottomNode('bottom-range');range.value='145';range.listeners.input();range.listeners.change();
assert.equal(persisted.bottomInset,145);
const finalProgress={...persisted,bottomInset:JSON.parse(beforeProgress).bottomInset};
assert.equal(JSON.stringify(finalProgress),beforeProgress);
assert.ok(html.includes("'blankPercent','bottomInset','scheduleArchive'"));
assert.ok(html.includes('flex:1;display:flex;flex-direction:column'));
assert.ok(html.includes('flex:1 0 auto;align-items:center'));
assert.ok(html.includes('.grid{grid-template-rows:minmax(0,1fr)}'));
const alignmentScript=script.slice(script.indexOf('function alignSchedulePanel(){'),script.indexOf("if('ResizeObserver' in window)"));
let gridBottom=747;const panelVars={};
const alignmentCtx=vm.createContext({window:{innerWidth:1408},scheduleGrid:{getBoundingClientRect:()=>({top:65,height:gridBottom-65})},subjectCards:{getBoundingClientRect:()=>({bottom:gridBottom})},schedulePanel:{style:{setProperty:(k,v)=>panelVars[k]=v,removeProperty:k=>delete panelVars[k]},getBoundingClientRect:()=>({bottom:65+parseFloat(panelVars['--schedule-panel-height'])+parseFloat(panelVars['--schedule-panel-shift'])})}});
vm.runInContext(alignmentScript+';alignSchedulePanel()',alignmentCtx);
assert.equal(panelVars['--schedule-panel-height'],'682px');
gridBottom=843;vm.runInContext('alignSchedulePanel()',alignmentCtx);
assert.equal(panelVars['--schedule-panel-height'],'778px');assert.equal(panelVars['--schedule-panel-shift'],'0px');
gridBottom=595;vm.runInContext('alignSchedulePanel()',alignmentCtx);
assert.equal(panelVars['--schedule-panel-height'],'530px');
alignmentCtx.window.innerWidth=375;vm.runInContext('alignSchedulePanel()',alignmentCtx);
assert.equal(panelVars['--schedule-panel-height'],undefined);
console.log('PASS: confirmed 14-row timetable, math 100/10/70 minutes, four separate 60-minute practice blocks, other lectures 120 minutes, combined gym/dinner, no prep slot, 7.5-hour sleep, 1440-minute coverage and catalog/daily-plan integrity');
console.log('PASS: one-time old-revision upgrade with full backup, unchanged checks/notes/daily plans/audio/layout settings, chronological display reset, archive preserved, failed backup or primary save leaves old schedule intact');
console.log('PASS: removed daily entry, fixed overview, three course entries, valid unique progress counts and percentages');
console.log('PASS: bottom capsule drag, keyboard, reset, single-pointer alternative, save-once, viewport clamp, preferred size recovery, additive persistence and unchanged learning records');
console.log('PASS: downward drag through default to zero, panels fill chosen height, 96px downward expansion, upward shrink and mobile alignment reset');
// Reordering is independent of completion data and cannot silently mutate time.
const plain=x=>JSON.parse(JSON.stringify(x));
const fixture={...plain(r.state),schedule:plain(r.defaultSchedule),scheduleRevision:revision,checkedMath:['summer-01'],checkedVideos:[1,2],checkedCircuit:[0],dailyChecks:{'2026-10-10':['r20261010-1']},taskNotes:{'r20261010-1':'保留备注'},tableOrder:[],syncScheduleDrag:false,customPreference:'keep'};
const orderDb={[KEY]:JSON.stringify(fixture)},order=boot(orderDb);
const beforeSchedule=JSON.stringify(order.state.schedule),chronological=order.todayTasks();
const gym=chronological.find(t=>t.subject==='运动');
const display=order.movedScheduleRows(chronological,gym.id,2);
assert.ok(order.saveSchedulePreference({tableOrder:display.map(t=>t.id)}));
assert.deepEqual(Array.from(order.orderedScheduleRows(order.todayTasks()),t=>t.id),Array.from(display,t=>t.id));
assert.equal(JSON.stringify(order.state.schedule),beforeSchedule);
assert.equal(order.currentTimeline(new Date(2026,9,10,17,30)).cur.id,gym.id);
assert.equal(boot(orderDb).state.syncScheduleDrag,false);
assert.deepEqual(plain(boot(orderDb).state.tableOrder),plain(order.state.tableOrder));
assert.equal((order.scheduleCard().body.match(/class="row-grip"/g)||[]).length,14);
assert.ok(order.scheduleCard().head.includes('aria-checked="false"'));
assert.equal(order.movedScheduleRows(chronological,'missing',0),null);
assert.equal(order.movedScheduleRows(chronological,gym.id,-1),null);
assert.equal(order.movedScheduleRows(chronological,gym.id,chronological.length),null);
const beforePreview=JSON.stringify(order.state),proposal=order.scheduleMoveProposal(display);
assert.ok(!proposal.error);assert.equal(JSON.stringify(order.state),beforePreview);
assert.ok(proposal.warnings.some(t=>t.includes('健身')));
for(const t of proposal.schedule){const old=order.state.schedule.find(o=>o.id===t.id);assert.equal(order.diff(t),order.diff(old));assert.deepEqual(plain(t.days),plain(old.days));assert.equal(t.desc,old.desc)}
assert.equal(proposal.schedule.reduce((sum,t)=>sum+order.diff(t),0),1440);
assert.ok(order.saveScheduleProposal(proposal));
assert.deepEqual(JSON.parse(Object.entries(orderDb).find(([k])=>k.includes('-before-reorder-'))[1]),JSON.parse(beforePreview));
for(const field of ['checkedMath','checkedVideos','checkedCircuit','dailyChecks','taskNotes','videoTitles','customPreference'])assert.deepEqual(plain(order.state[field]),plain(fixture[field]));
for(let minute=0;minute<1440;minute++){
 const hits=order.state.schedule.filter(t=>order.tod(t.end)>order.tod(t.start)?order.tod(t.start)<=minute&&minute<order.tod(t.end):minute>=order.tod(t.start)||minute<order.tod(t.end));
 assert.equal(hits.length,1,`reordered day overlap or gap ${minute}`);
}
assert.equal(order.saveScheduleProposal(proposal),false); // stale preview cannot overwrite newer schedule
assert.deepEqual(plain(boot(orderDb).state.schedule),plain(order.state.schedule));
assert.ok(order.scheduleMoveProposal([...chronological.slice(1),chronological[1]]).error);
const failOrder=boot({[KEY]:JSON.stringify(fixture)},true),failBefore=JSON.stringify(failOrder.state);
const failProposal=failOrder.scheduleMoveProposal(failOrder.movedScheduleRows(failOrder.todayTasks(),gym.id,2));
assert.equal(failOrder.saveScheduleProposal(failProposal),false);assert.equal(JSON.stringify(failOrder.state),failBefore);
const primaryFailDb={[KEY]:JSON.stringify(fixture)},primaryFail=boot(primaryFailDb,k=>k===KEY),primaryBefore=JSON.stringify(primaryFail.state);
const primaryProposal=primaryFail.scheduleMoveProposal(primaryFail.movedScheduleRows(primaryFail.todayTasks(),gym.id,2));
assert.equal(primaryFail.saveScheduleProposal(primaryProposal),false);assert.equal(JSON.stringify(primaryFail.state),primaryBefore);
assert.equal(primaryFailDb[KEY],JSON.stringify(fixture));assert.ok(Object.keys(primaryFailDb).some(k=>k.includes('-before-reorder-')));
const sleeping=boot({[KEY]:JSON.stringify(fixture)}),sleep=sleeping.todayTasks().find(t=>t.subject==='睡眠');
assert.ok(sleeping.scheduleMoveProposal(sleeping.movedScheduleRows(sleeping.todayTasks(),sleep.id,0)).warnings.some(x=>x.includes('睡眠')));
const days=[0,1,2,3,4,5,6],custom=(schedule)=>boot({[KEY]:JSON.stringify({...fixture,schedule,tableOrder:[]})});
const withGaps=custom([{id:'a',start:'10:00',end:'11:00',days},{id:'b',start:'11:30',end:'13:30',days},{id:'c',start:'14:00',end:'15:00',days}]);
const gapProposal=withGaps.scheduleMoveProposal(withGaps.movedScheduleRows(withGaps.todayTasks(),'b',0));
assert.deepEqual(Array.from(gapProposal.ids,id=>{const t=gapProposal.schedule.find(x=>x.id===id);return [id,t.start,t.end]}),[['b','10:00','12:00'],['a','12:30','13:30'],['c','14:00','15:00']]);
const overnight=custom([{id:'a',start:'21:00',end:'23:00',days},{id:'b',start:'23:00',end:'01:00',days}]);
assert.ok(!overnight.scheduleMoveProposal(overnight.movedScheduleRows(overnight.todayTasks(),'b',0)).error);
const overlap=custom([{id:'a',start:'10:00',end:'12:00',days},{id:'b',start:'11:00',end:'13:00',days}]);
assert.ok(overlap.scheduleMoveProposal(overlap.todayTasks()).error);
const weekday=new FixtureDate().getDay(),mixed=custom([{id:'a',start:'10:00',end:'11:00',days},{id:'b',start:'11:00',end:'12:00',days:[weekday]}]);
assert.ok(mixed.scheduleMoveProposal(mixed.todayTasks()).error);
console.log('PASS: both reorder modes, unchanged countdown in display-only mode, preview isolation, fixed durations, complete-day coverage, gym warning, automatic backup, record preservation, reload persistence, stale preview and failed storage protection, gaps, midnight and invalid schedules');
function testRowDragReleaseClick(){
 const listeners={};let now=1000,moves=0,activations=0,onRelease=()=>{},onReorder=()=>{};
 const document={addEventListener(type,callback,capture){listeners[type]={callback,capture}}};
 const handle={hasPointerCapture:()=>true,releasePointerCapture(){onRelease()}};
 const ctx=vm.createContext({Date:{now:()=>now},document,cancelAnimationFrame(){},
  reorderBody:{querySelectorAll:()=>[{classList:{remove(){}}}]},
  requestScheduleMove(){moves++;onReorder()},handle});
 const source=script.slice(script.indexOf('function suppressRowDragClick('),script.indexOf("reorderBody.addEventListener('pointerdown'"));
 vm.runInContext('let rowDrag=null,rowDragFrame=0,pendingRowDragClick=null;'+source,ctx);
 assert.equal(listeners.click.capture,true);assert.equal(listeners.pointerdown.capture,true);
 const click=(target='row',detail=1,pointerId=7)=>{
  const e={target,detail,pointerId,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};
  if(pointerId===null)delete e.pointerId;
  listeners.click.callback(e);if(!e.stopped)activations++;return e;
 };
 const finish=(moved=true,cancel=false)=>vm.runInContext(`rowDrag={moved:${moved},pointerId:7,id:'math',to:5,handle};finishRowDrag(${cancel});`,ctx);
 for(const target of ['grip','row','panel ancestor','new preview save button']){
  finish();const e=click(target);assert.equal(e.stopped,true);assert.equal(e.prevented,true);
 }
 assert.equal(activations,0);assert.equal(moves,4);
 onRelease=()=>assert.equal(click('retargeted during capture release').stopped,true);
 finish();onRelease=()=>{}; // Must arm BEFORE releasing pointer capture.
 onReorder=()=>assert.equal(click('retargeted during re-render').stopped,true);
 finish();onReorder=()=>{}; // Must arm BEFORE replacing the table with a preview.
 finish();assert.equal(click('keyboard row',0).stopped,false);assert.equal(click().stopped,true);
 finish();assert.equal(click('another pointer',1,8).stopped,false);assert.equal(click().stopped,true);
 finish();assert.equal(click('Safari legacy mouse event',1,null).stopped,true);
 finish();listeners.pointerdown.callback();assert.equal(click('intentional next click').stopped,false);
 finish();assert.equal(click().stopped,true);assert.equal(click('later click').stopped,false);
 const beforeCancel=moves;finish(true,true);assert.equal(moves,beforeCancel);assert.equal(click().stopped,true);
 finish(false);assert.equal(moves,beforeCancel);assert.equal(click('stationary handle tap').stopped,false);
 finish();now+=1001;assert.equal(click('expired guard').stopped,false);
 console.log('PASS: release clicks suppressed at document capture on grip/row/ancestor/new preview, armed before capture release and re-render, both drag modes protected, keyboard and next deliberate click preserved, pointer identity, one-shot expiry, cancellation and stationary taps');
}
testRowDragReleaseClick();
const soundBoot=boot({[KEY]:JSON.stringify(fixture)});
assert.equal(soundBoot.state.soundReminder,false);
assert.equal(soundBoot.state.soundVolume,60);
for(const [value,expected] of [[0,0],[100,100],[-5,0],[150,100],[26.7,27],[null,60],['bad',60],['',60]])assert.equal(boot({[KEY]:JSON.stringify({...fixture,soundVolume:value})}).state.soundVolume,expected);
const soundMarkup=html.split('<div class="sound-controls">')[1].split('</div>')[0];
assert.ok(!soundMarkup.includes('<span>音效提醒</span>'));
assert.ok(!soundMarkup.includes('>试听<'));assert.ok(soundMarkup.includes('aria-label="试听提示音"'));
assert.ok(html.includes('.sound-activate:after'));
const midnight=new Date(2026,9,11,0,0).getTime();
const end=soundBoot.segmentClock(new Date(midnight-1000));assert.equal(end.endsAt,midnight+30*60000);
const allDays=[0,1,2,3,4,5,6],boundarySchedule=[
 {id:'a',title:'A',start:'10:00',end:'13:00',days:allDays},
 {id:'b',title:'B',start:'13:00',end:'15:00',days:allDays}];
const at=(h,m=0,s=0)=>new Date(2026,9,10,h,m,s);
const edge=(time,schedule=boundarySchedule,delay=1000)=>{
 const r=soundBoot.createBoundaryReminder();assert.equal(r.tick(new Date(time.getTime()-1000),schedule,true),null);
 return {reminder:r,event:r.tick(new Date(time.getTime()+delay-1000),schedule,true)};
};
assert.ok(soundMarkup.includes('时段开始和结束时响一声，同一时刻合并'));
const startEdge=edge(at(10));assert.equal(startEdge.event.starting[0].id,'a');assert.equal(startEdge.event.ending.length,0);
const handoff=edge(at(13));assert.equal(handoff.event.starting[0].id,'b');assert.equal(handoff.event.ending[0].id,'a');
assert.equal(handoff.reminder.tick(at(13,0,1),boundarySchedule,true),null);
assert.equal(edge(at(15)).event.ending[0].id,'b');
const gaps=[boundarySchedule[0],{...boundarySchedule[1],start:'14:00'}];
assert.equal(edge(at(13),gaps).event.starting.length,0);
assert.equal(edge(at(14),gaps).event.starting[0].id,'b');
assert.equal(edge(at(10),boundarySchedule,3000).event.starting[0].id,'a'); // Small timer delay is allowed.
const overlapEdges=[...boundarySchedule,{...boundarySchedule[0],id:'c',start:'11:00'}, {...boundarySchedule[1],id:'d',end:'14:00'}];
const grouped=edge(at(13),overlapEdges).event;
assert.equal(grouped.starting.length,2);assert.equal(grouped.ending.length,2);
assert.equal(soundBoot.scheduleBoundaries(at(12,59,59).getTime(),at(13).getTime(),overlapEdges).length,1);
const night=[{id:'night',title:'night',start:'23:00',end:'01:00',days:[6]}, {id:'sun',title:'sun',start:'01:00',end:'02:00',days:[0]}];
const overnightEdge=edge(new Date(2026,9,11,1),night).event;
assert.equal(overnightEdge.ending[0].id,'night');assert.equal(overnightEdge.starting[0].id,'sun');
assert.equal(edge(new Date(midnight),soundBoot.state.schedule).event,null); // Crossing midnight alone is not a schedule edge.
const midnightEdge=edge(new Date(midnight+30*60000),soundBoot.state.schedule).event;
assert.equal(midnightEdge.ending[0].id,end.cur.id);assert.equal(midnightEdge.starting.length,1);
assert.equal(midnightEdge.starting[0].id,'r20261012-practice-circuit');
const sleepEdge=edge(new Date(midnight+90*60000),soundBoot.state.schedule).event;
assert.equal(sleepEdge.ending[0].id,'r20261012-practice-circuit');assert.equal(sleepEdge.starting[0].subject,'睡眠');
assert.equal(edge(new Date(2026,9,12,1),night).event,null); // Saturday-only start must not end on Monday.
for(const [enabled,schedule,elapsed] of [[false,boundarySchedule,1000],[true,gaps,1000],[true,boundarySchedule,60000],[true,boundarySchedule,-1000]]){
 const check=soundBoot.createBoundaryReminder();check.tick(at(12,59,59),boundarySchedule,true);
 assert.equal(check.tick(new Date(at(12,59,59).getTime()+elapsed),schedule,enabled),null);
}
handoff.reminder.reset();assert.equal(handoff.reminder.tick(at(13),boundarySchedule,true),null);
const once=edge(at(13)).reminder;
once.tick(at(12,59,59),boundarySchedule,true);assert.equal(once.tick(at(13),boundarySchedule,true),null);
const invalid=[{...boundarySchedule[0],start:'10:99'},{...boundarySchedule[0],end:'25:00'},{...boundarySchedule[0],end:'10:00'}];
assert.equal(soundBoot.scheduleBoundaries(at(0).getTime(),at(23,59,59).getTime(),invalid).length,0);
console.log('PASS: start and end alerts, starts after gaps, single grouped handoff, simultaneous overlapping edges, midnight/weekday overnight boundaries, delayed tick, no repeat or reload/sleep/clock-edit/schedule-edit catch-up, invalid times ignored');
async function testReminderAudio(){
 const audioDb={[KEY]:JSON.stringify({...fixture,soundReminder:true})},audioNodes={},oscillators=[],gains=[];let created=0,storageFull=false;
 const audioNode=id=>audioNodes[id]??={attrs:{},style:{},dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.listeners[k]=f}};
 const param=()=>({calls:[],setValueAtTime(v,t){this.calls.push([v,t])},linearRampToValueAtTime(v,t){this.calls.push([v,t])},exponentialRampToValueAtTime(v,t){this.calls.push([v,t])}});
 class MockAudio{
  constructor(){created++;this.state='running';this.currentTime=10;this.destination={}}
  addEventListener(){}resume(){this.state='running';return Promise.resolve()}
  createOscillator(){const o={frequency:param(),type:'',starts:[],stops:[],connect(){},disconnect(){},addEventListener(){},start(t){this.starts.push(t)},stop(t){this.stops.push(t)}};oscillators.push(o);return o}
  createGain(){const node={gain:param(),connect(){},disconnect(){}};gains.push(node);return node}
 }
 const ctx=vm.createContext({window:{AudioContext:MockAudio},localStorage:{getItem:k=>audioDb[k]??null,setItem:(k,v)=>{if(storageFull)throw Error('full');audioDb[k]=v}},document:{getElementById:audioNode},setTimeout,clearTimeout});
 const audioSource=script.slice(script.indexOf('function refreshCountdown('),script.indexOf('function refreshAll('));
 vm.runInContext(prefix+clockHelpers+audioSource+';globalThis.audioTest={state,refreshCountdown,playReminderChime,activateReminderAudio,renderSoundControls,get voices(){return reminderVoices.size},get ctx(){return reminderAudio}};',ctx);
 const a=ctx.audioTest,originalAudioState=plain(a.state);
 a.renderSoundControls();assert.equal(created,0);assert.equal(audioNode('sound-activate').dataset.audioState,'pending');
 assert.equal(audioNode('sound-volume').value,'60');
 assert.equal(a.playReminderChime(),false);await a.activateReminderAudio();
 assert.equal(created,1);assert.equal(a.voices,2);assert.equal(audioNode('sound-activate').dataset.audioState,'ready');
 assert.equal(audioNode('sound-activate').textContent,undefined); // SVG is not replaced by status text.
 assert.equal(gains[0].gain.calls[1][0],.5*Math.pow(.6,1.5));
 assert.deepEqual(oscillators.map(o=>o.frequency.calls[0][0]),[660,880]);
 const beforeHandoff=oscillators.length;
 a.refreshCountdown(at(13,14,59));a.refreshCountdown(at(13,15));
 assert.equal(oscillators.length,beforeHandoff+2);assert.ok(audioNode('toast').textContent.includes('时段交接：'));
 a.refreshCountdown(at(13,15,1));assert.equal(oscillators.length,beforeHandoff+2);
 assert.equal(a.playReminderChime(),true);assert.equal(a.voices,2); // stops preceding short chime
 const input=volume=>audioNode('sound-volume').listeners.input({target:{value:String(volume)}});
 input(100);assert.equal(a.state.soundVolume,100);assert.equal(JSON.parse(audioDb[KEY]).soundVolume,100);
 assert.equal(a.playReminderChime(),true);assert.equal(gains[gains.length-1].gain.calls[1][0],.5);
 input(0);assert.equal(a.voices,0);const countBefore=oscillators.length;
 assert.equal(a.playReminderChime(),true);assert.equal(oscillators.length,countBefore);assert.equal(audioNode('sound-volume-value').textContent,'0%');
 input(27);assert.equal(a.playReminderChime(),true);assert.equal(gains[gains.length-1].gain.calls[1][0],.5*Math.pow(.27,1.5));
 assert.equal(boot(audioDb).state.soundVolume,27);input(60);
 storageFull=true;input(95);assert.equal(a.state.soundVolume,60);assert.equal(audioNode('sound-volume').value,'60');storageFull=false;
 audioNode('sound-toggle').listeners.click();assert.equal(a.state.soundReminder,false);assert.equal(a.voices,0);
 assert.equal(audioNode('sound-toggle').attrs['aria-checked'],'false');assert.notEqual(audioNode('sound-activate').hidden,true);
 assert.equal(a.playReminderChime(),false);assert.equal(JSON.parse(audioDb[KEY]).soundReminder,false);
 const unchanged={...plain(a.state),soundReminder:true};assert.deepEqual(unchanged,originalAudioState);
 await a.activateReminderAudio(true);assert.equal(a.voices,2);assert.equal(a.state.soundReminder,false);assert.equal(JSON.parse(audioDb[KEY]).soundReminder,false);
 audioNode('sound-toggle').listeners.click();assert.equal(a.state.soundReminder,true);assert.equal(created,1);
 a.ctx.state='interrupted';a.renderSoundControls();assert.equal(audioNode('sound-activate').dataset.audioState,'pending');assert.equal(a.playReminderChime(),false);
 await a.activateReminderAudio();assert.equal(a.ctx.state,'running');assert.equal(a.voices,2);
 audioNode('sound-toggle').listeners.click();
 ctx.window.AudioContext=undefined;vm.runInContext('reminderAudio=null;state.soundReminder=true;',ctx);
 await a.activateReminderAudio();assert.equal(audioNode('sound-activate').disabled,false);assert.equal(audioNode('sound-activate').dataset.audioState,'pending');
 assert.ok(audioNode('toast').textContent.includes('暂未启用声音'));
 console.log('PASS: no autoplay on load, gesture-activated two-note chime, sound switch and persistent setting, immediate mute, stopped overlapping voices, interrupted-context recovery, unsupported-browser feedback and untouched learning records');
 console.log('PASS: icon-only preview without enabling reminders, 0–100 volume, silent zero, safe peak gain, louder default, volume reload persistence and storage failure protection');
 console.log('PASS: real countdown integration plays exactly one two-note chime for an end/start handoff, announces both tasks once, no duplicate on next tick');
}
function testVolumePopover(){
 const timers=new Map(),docListeners={},windowListeners={};let nextTimer=0;
 const document={activeElement:null,addEventListener(k,f){docListeners[k]=f},getElementById:id=>nodes[id]};
 const makeNode=()=>({hidden:false,attrs:{},listeners:{},offsetWidth:154,offsetHeight:46,style:{setProperty(k,v){this[k]=v}},
  setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.listeners[k]=f},contains(node){return node===this},
  getBoundingClientRect(){return {left:300,top:170,width:40}},focus(){document.activeElement=this;this.listeners.focusin?.()}});
 const nodes={'sound-volume-value':makeNode(),'sound-volume-popover':makeNode(),'sound-volume':makeNode()};
 const trigger=nodes['sound-volume-value'],popover=nodes['sound-volume-popover'],range=nodes['sound-volume'];
 popover.hidden=true;popover.contains=node=>node===popover||node===range;
 const ctx=vm.createContext({document,window:{innerWidth:960,addEventListener(k,f){windowListeners[k]=f}},
  setTimeout:f=>{timers.set(++nextTimer,f);return nextTimer},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(script.slice(script.indexOf('// Volume lives above its percentage')),ctx);
 const flush=()=>{for(const [id,f] of [...timers]){timers.delete(id);f()}};
 assert.ok(popover.hidden);
 trigger.listeners.pointerenter({pointerType:'mouse'});
 assert.equal(popover.hidden,false);assert.equal(trigger.attrs['aria-expanded'],'true');
 assert.equal(popover.style.left,'243px');assert.equal(popover.style.top,'118px');
 trigger.listeners.pointerleave();popover.listeners.pointerenter({pointerType:'mouse'});flush();
 assert.equal(popover.hidden,false); // crossing the gap must not close the slider
 popover.listeners.pointerleave();flush();assert.equal(popover.hidden,true);
 trigger.listeners.pointerenter({pointerType:'touch'});assert.equal(popover.hidden,true);
 trigger.listeners.click();trigger.listeners.pointerleave();flush();assert.equal(popover.hidden,false);
 trigger.listeners.click();assert.equal(popover.hidden,true);
 trigger.listeners.click();docListeners.pointerdown({target:{}});assert.equal(popover.hidden,true);
 trigger.listeners.keydown({key:'ArrowUp',preventDefault(){}});assert.equal(document.activeElement,range);
 docListeners.keydown({key:'Escape',preventDefault(){}});assert.equal(popover.hidden,true);
 assert.equal(document.activeElement,trigger);assert.equal(trigger.attrs['aria-expanded'],'false');
 trigger.listeners.click();assert.equal(popover.hidden,false); // Escape does not prevent reopening
 trigger.getBoundingClientRect=()=>({left:0,top:10,width:40});windowListeners.resize();
 assert.equal(popover.style.left,'8px');assert.equal(popover.style.top,'8px');
 docListeners.pointerdown({target:{}});document.activeElement=null;
 trigger.listeners.focusin();assert.equal(popover.hidden,false);
 trigger.listeners.focusout();flush();assert.equal(popover.hidden,true);
 assert.ok(html.includes('#sound-volume-popover[hidden]'));assert.ok(!soundMarkup.includes('type="range"'));
 console.log('PASS: volume hidden by default, hover above percentage, pointer bridge, click pin/toggle, touch alternative, outside dismissal, keyboard slider focus, Escape without reopening, focus dismissal and viewport clamping');
}
testVolumePopover();
testReminderAudio().catch(error=>{console.error(error);process.exitCode=1});
