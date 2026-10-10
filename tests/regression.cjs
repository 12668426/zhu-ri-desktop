const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
const prefix=script.split('// 真实的逐秒倒计时。')[0];
const clockHelpers=script.slice(script.indexOf('function segmentClock('),script.indexOf('function refreshCountdown('));
const KEY='zhuri-anhui-study-v1';
function boot(db={},fail=false){
 const ctx=vm.createContext({localStorage:{getItem:k=>db[k]??null,setItem:(k,v)=>{if(fail===true||(typeof fail==='function'&&fail(k)))throw Error('full');db[k]=v}},document:{getElementById:()=>({classList:{add(){},remove(){}}})},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(prefix+clockHelpers+';globalThis.inspect={state,defaultSchedule,mathLessons,mathStages,diff,tod,currentTimeline,todayTasks,dailyPlan,dailyCard,orderedScheduleRows,movedScheduleRows,scheduleMoveProposal,saveScheduleProposal,saveSchedulePreference,scheduleCard,createEndReminder,segmentClock};',ctx);
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
assert.deepEqual(JSON.parse(db[KEY+'-before-2026-10-10-rounded-hours']),original);
assert.equal(r.defaultSchedule.reduce((n,t)=>n+r.diff(t),0),1440);
const coreSlots=r.defaultSchedule.filter(t=>['高数','英语','模拟电子技术','电路'].includes(t.subject)&&r.diff(t)===120);
assert.equal(coreSlots.length,4);
assert.deepEqual(Array.from(coreSlots,x=>[x.subject,x.start,x.end]),[['高数','10:00','12:00'],['英语','13:00','15:00'],['模拟电子技术','15:00','17:00'],['电路','21:00','23:00']]);
const card=r.dailyCard();assert.ok(card.includes('四科均分'));
assert.equal((card.match(/净学习90分钟＋休息30分钟/g)||[]).length,4);
assert.ok(!card.includes('今日目标1项'));assert.ok(!card.includes('目标最多2节'));
assert.ok(card.includes('不加新课，也不只复习高数'));
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
console.log('PASS: syntax, catalogs, four equal study blocks, time-based daily plan, migration backup, prior records, one-time migration, storage failure, 1440-minute coverage, daily stability, carryover, Sunday review, summer-to-autumn order');
console.log('PASS: removed daily entry, fixed overview, three course entries, valid unique progress counts and percentages');
console.log('PASS: bottom capsule drag, keyboard, reset, single-pointer alternative, save-once, viewport clamp, preferred size recovery, additive persistence and unchanged learning records');
console.log('PASS: downward drag through default to zero, panels fill chosen height, 96px downward expansion, upward shrink and mobile alignment reset');
// Reordering is independent of completion data and cannot silently mutate time.
const plain=x=>JSON.parse(JSON.stringify(x));
const fixture={...plain(r.state),schedule:plain(r.defaultSchedule),scheduleRevision:'2026-10-10-rounded-hours',checkedMath:['summer-01'],checkedVideos:[1,2],checkedCircuit:[0],dailyChecks:{'2026-10-10':['r20261010-1']},taskNotes:{'r20261010-1':'保留备注'},tableOrder:[],syncScheduleDrag:false,customPreference:'keep'};
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
assert.equal((order.scheduleCard().body.match(/class="row-grip"/g)||[]).length,12);
assert.ok(order.scheduleCard().head.includes('aria-checked="false"'));
assert.equal(order.movedScheduleRows(chronological,'missing',0),null);
assert.equal(order.movedScheduleRows(chronological,gym.id,-1),null);
assert.equal(order.movedScheduleRows(chronological,gym.id,12),null);
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
const weekday=new Date().getDay(),mixed=custom([{id:'a',start:'10:00',end:'11:00',days},{id:'b',start:'11:00',end:'12:00',days:[weekday]}]);
assert.ok(mixed.scheduleMoveProposal(mixed.todayTasks()).error);
console.log('PASS: both reorder modes, unchanged countdown in display-only mode, preview isolation, fixed durations, complete-day coverage, gym warning, automatic backup, record preservation, reload persistence, stale preview and failed storage protection, gaps, midnight and invalid schedules');
const soundBoot=boot({[KEY]:JSON.stringify(fixture)});
assert.equal(soundBoot.state.soundReminder,false);
const midnight=new Date(2026,9,11,0,0).getTime();
const end=soundBoot.segmentClock(new Date(midnight-1000));assert.equal(end.endsAt,midnight);
const segment={id:end.cur.id,title:end.cur.title,endsAt:end.endsAt},nextSegment={id:'next',endsAt:midnight+3600000};
const reminder=soundBoot.createEndReminder();
assert.equal(reminder.tick(new Date(midnight-1000),segment,'original',true),null);
assert.equal(reminder.tick(new Date(midnight),nextSegment,'original',true).id,segment.id);
assert.equal(reminder.tick(new Date(midnight+1000),nextSegment,'original',true),null);
reminder.reset(); // resetting/reloading never rings immediately
assert.equal(reminder.tick(new Date(midnight+1000),nextSegment,'original',true),null);
for(const [enabled,schedule,elapsed] of [[false,'original',1000],[true,'edited',1000],[true,'original',60000],[true,'original',-1000]]){
 const check=soundBoot.createEndReminder();check.tick(new Date(midnight-500),segment,'original',true);
 assert.equal(check.tick(new Date(midnight-500+elapsed),nextSegment,schedule,enabled),null);
}
const gapReminder=soundBoot.createEndReminder();gapReminder.tick(new Date(midnight-1000),segment,'original',true);
assert.equal(gapReminder.tick(new Date(midnight+2000),null,'original',true).id,segment.id);
const repeated=soundBoot.createEndReminder();repeated.tick(new Date(midnight-1000),segment,'original',true);repeated.tick(new Date(midnight),segment,'original',true);
assert.equal(repeated.tick(new Date(midnight+1000),segment,'original',true),null);
console.log('PASS: sound defaults off, exact midnight boundary, one alert at segment transition or gap, no repeat, no reload/sleep/clock-edit/schedule-edit catch-up');
async function testReminderAudio(){
 const audioDb={[KEY]:JSON.stringify({...fixture,soundReminder:true})},audioNodes={},oscillators=[];let created=0;
 const audioNode=id=>audioNodes[id]??={attrs:{},style:{},listeners:{},classList:{add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,f){this.listeners[k]=f}};
 const param=()=>({calls:[],setValueAtTime(v,t){this.calls.push([v,t])},linearRampToValueAtTime(v,t){this.calls.push([v,t])},exponentialRampToValueAtTime(v,t){this.calls.push([v,t])}});
 class MockAudio{
  constructor(){created++;this.state='running';this.currentTime=10;this.destination={}}
  addEventListener(){}resume(){this.state='running';return Promise.resolve()}
  createOscillator(){const o={frequency:param(),type:'',starts:[],stops:[],connect(){},disconnect(){},addEventListener(){},start(t){this.starts.push(t)},stop(t){this.stops.push(t)}};oscillators.push(o);return o}
  createGain(){return {gain:param(),connect(){},disconnect(){}}}
 }
 const ctx=vm.createContext({window:{AudioContext:MockAudio},localStorage:{getItem:k=>audioDb[k]??null,setItem:(k,v)=>{audioDb[k]=v}},document:{getElementById:audioNode},setTimeout,clearTimeout});
 const audioSource=script.slice(script.indexOf('const reminderClock=createEndReminder();'),script.indexOf('function refreshAll('));
 vm.runInContext(prefix+audioSource+';globalThis.audioTest={state,playReminderChime,activateReminderAudio,renderSoundControls,get voices(){return reminderVoices.size},get ctx(){return reminderAudio}};',ctx);
 const a=ctx.audioTest,originalAudioState=plain(a.state);
 a.renderSoundControls();assert.equal(created,0);assert.equal(audioNode('sound-activate').textContent,'启用');
 assert.equal(a.playReminderChime(),false);await a.activateReminderAudio();
 assert.equal(created,1);assert.equal(a.voices,2);assert.equal(audioNode('sound-activate').textContent,'试听');
 assert.deepEqual(oscillators.map(o=>o.frequency.calls[0][0]),[660,880]);
 assert.equal(a.playReminderChime(),true);assert.equal(a.voices,2); // stops preceding short chime
 audioNode('sound-toggle').listeners.click();assert.equal(a.state.soundReminder,false);assert.equal(a.voices,0);
 assert.equal(audioNode('sound-toggle').attrs['aria-checked'],'false');assert.equal(audioNode('sound-activate').hidden,true);
 assert.equal(a.playReminderChime(),false);assert.equal(JSON.parse(audioDb[KEY]).soundReminder,false);
 const unchanged={...plain(a.state),soundReminder:true};assert.deepEqual(unchanged,originalAudioState);
 audioNode('sound-toggle').listeners.click();assert.equal(a.state.soundReminder,true);assert.equal(created,1);
 a.ctx.state='interrupted';a.renderSoundControls();assert.equal(audioNode('sound-activate').textContent,'启用');assert.equal(a.playReminderChime(),false);
 await a.activateReminderAudio();assert.equal(a.ctx.state,'running');assert.equal(a.voices,2);
 audioNode('sound-toggle').listeners.click();
 ctx.window.AudioContext=undefined;vm.runInContext('reminderAudio=null;state.soundReminder=true;',ctx);
 await a.activateReminderAudio();assert.equal(audioNode('sound-activate').disabled,false);assert.equal(audioNode('sound-activate').textContent,'启用');
 assert.ok(audioNode('toast').textContent.includes('暂未启用声音'));
 console.log('PASS: no autoplay on load, gesture-activated two-note chime, sound switch and persistent setting, immediate mute, stopped overlapping voices, interrupted-context recovery, unsupported-browser feedback and untouched learning records');
}
testReminderAudio().catch(error=>{console.error(error);process.exitCode=1});
