const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
const prefix=script.split('// 真实的逐秒倒计时。')[0];
const KEY='zhuri-anhui-study-v1';
function boot(db={},fail=false){
 const ctx=vm.createContext({localStorage:{getItem:k=>db[k]??null,setItem:(k,v)=>{if(fail)throw Error('full');db[k]=v}},document:{getElementById:()=>({classList:{add(){},remove(){}}})},setTimeout:()=>0,clearTimeout(){}});
 vm.runInContext(prefix+';globalThis.inspect={state,defaultSchedule,mathLessons,mathStages,diff,tod,currentTimeline,dailyPlan,dailyCard};',ctx);
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
console.log('PASS: syntax, catalogs, migration backup, prior records, one-time migration, storage failure, 1440-minute coverage, daily stability, carryover, Sunday review, summer-to-autumn order');
