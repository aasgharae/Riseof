import{TROOPS,BUILD_DEFS,BATCH_OPTIONS,EXTRA_NAMES,FACTIONS,MAX_LEVEL,buildingProd,upgradeCost,upgradeTime,speedCost,expeditionCap,maxMarches,marchSpeed,factionAt,tribeLevelAt,WORLD_W,WORLD_H,CASTLE_COUNT}from'./config.js';
import{SAVE_KEY,freshState,load,save,storageCap,addLog}from'./state.js';
import{armyPower,armyCount,resolveAttack,genGarrison}from'./combat.js';
import{Renderer}from'./js/renderer.js';
import{placeCastles,findHome}from'./js/worldgen.js';
import{makeRng}from'./js/noise.js';
import{rankBoard,factionBoard,npcKillsInit,npcTick}from'./leaderboard.js';
let S=load();const $=id=>document.getElementById(id);
const cv=$('cv'),R=new Renderer(cv);R.setState(S);

// ---- world population: 300 castles, 5 factions, levels by distance ----
(function populate(){
  const terr=R.terr;
  const home=findHome(terr);
  const spots=placeCastles(terr,CASTLE_COUNT+12,555).filter(p=>Math.hypot(p.x-home.x,p.y-home.y)>11).slice(0,CASTLE_COUNT);
  if(!S.tribes.length){
    S.homePos=home;
    const rng=makeRng(20240907);
    const maxDist=Math.hypot(WORLD_W,WORLD_H)/2;
    S.tribes=spots.map((sp,i)=>{
      const dRatio=Math.hypot(sp.x-home.x,sp.y-home.y)/maxDist;
      const level=Math.max(1,Math.min(30,tribeLevelAt(dRatio)+Math.floor(rng()*5)-2));
      const f=factionAt(sp.x,sp.y);
      const garrison=genGarrison(level,rng);
      const wall=Math.floor(level/4);
      const power=Math.floor(armyPower(garrison)*(1+f.idx*0.07));
      const kills=npcKillsInit(garrison,rng);
      return{id:'t'+i,
        name:'قلعه '+EXTRA_NAMES[i%EXTRA_NAMES.length]+' '+(Math.floor(i/EXTRA_NAMES.length)+1),
        faction:f.id,factionName:f.icon+' '+f.name,color:f.color,
        x:sp.x,y:sp.y,level,wall,garrison,power,kills,
        loot:{food:Math.floor(3000*level*(0.8+rng()*0.5)),wood:Math.floor(2500*level*(0.8+rng()*0.5)),
          stone:Math.floor(2000*level*(0.8+rng()*0.5)),iron:Math.floor(1200*level*(0.8+rng()*0.5)),
          gold:Math.floor(35*level*(0.8+rng()*0.6))}};});
    addLog(S,'info','🌍 جهان جدید ساخته شد: '+S.tribes.length+' قلعه در '+FACTIONS.length+' قلمرو');
  }
  R.setState(S);save(S);
})();
R.setView('world'); // ورود: دوربین روی قلعه خودت، زوم نزدیک


const toast=m=>{const t=$('toast');if(!t)return;t.innerHTML=m;clearTimeout(t._h);t._h=setTimeout(()=>t.textContent='',2600);};
function fmt(n){n=Math.floor(n);if(n>=1e12)return(n/1e12).toFixed(1)+'T';if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n;}
function dist(t){return Math.hypot(t.x-S.homePos.x,t.y-S.homePos.y);}
function eta(t){return Math.ceil(dist(t)/marchSpeed());}
function updTop(){const cap=storageCap(S);for(const k in S.resources)S.resources[k]=Math.min(S.resources[k],cap);
if($('res-food')){$('res-food').textContent='🌾 '+fmt(S.resources.food);$('res-wood').textContent='🪵 '+fmt(S.resources.wood);$('res-stone').textContent='🪨 '+fmt(S.resources.stone);$('res-iron').textContent='⛓️ '+fmt(S.resources.iron);$('res-gold').textContent='🪙 '+fmt(S.resources.gold);
const keepLv=S.buildings.find(b=>b.type==='keep')?.level||1;
$('dayLabel').textContent='🏰Lv'+keepLv+' • ⚔'+fmt(armyPower(S.troops))+' • 👥'+fmt(armyCount(S.troops));}}

function canPay(c){for(const k in c)if((S.resources[k]||0)<c[k])return false;return true;}
function pay(c){for(const k in c)S.resources[k]-=c[k];}

// ================= UPGRADES =================
window.upg=(id)=>{const b=S.buildings.find(x=>x.id===id);if(!b)return;
  if(b.level>=MAX_LEVEL)return toast('به بیشینه سطح رسید');
  const c=upgradeCost(b.type,b.level);if(!canPay(c))return toast('منابع کافی نیست');
  if(S.upgrades.find(u=>u.id===id))return toast('این ساختمان در حال ارتقاست');
  pay(c);S.upgrades.push({id,type:b.type,left:upgradeTime(b.type,b.level),total:upgradeTime(b.type,b.level)});
  save(S);renderSheet();toast('⚒ ارتقای '+BUILD_DEFS[b.type].name+' شروع شد');};
window.speedUp=(id)=>{const u=S.upgrades.find(x=>x.id===id);if(!u)return;
  const cost=speedCost(u.left);if(S.resources.gold<cost)return toast('🪙 سکه کافی نیست ('+cost+' لازم)');
  S.resources.gold-=cost;S.upgrades=S.upgrades.filter(x=>x.id!==id);
  const b=S.buildings.find(x=>x.id===id);if(b)b.level++;
  save(S);renderSheet();updTop();toast('⚡ ارتقا فوری تکمیل شد! (-'+cost+'🪙)');};
window.speedAll=()=>{if(!S.upgrades.length)return toast('ارتقایی در جریان نیست');
  let total=0;for(const u of S.upgrades)total+=speedCost(u.left);
  if(S.resources.gold<total)return toast('🪙 سکه کافی نیست ('+total+' لازم)');
  S.resources.gold-=total;
  for(const u of S.upgrades){const b=S.buildings.find(x=>x.id===u.id);if(b)b.level++;}
  S.upgrades=[];save(S);renderSheet();updTop();toast('⚡ همه ارتقاها فوری شد (-'+total+'🪙)');};

// ================= TRAINING =================
window.train=(barId,tid,count)=>{const T=TROOPS[tid];if(!T)return;
  const cost={};for(const k in T.cost)cost[k]=T.cost[k]*count;
  if(!canPay(cost))return toast('منابع کافی نیست');
  pay(cost);const lvl=(S.buildings.find(b=>b.id===barId)?.level||1);
  const total=T.time*Math.pow(count,0.7)/(1+lvl*0.22);
  S.training[barId].push({tid,count,left:total,total});save(S);renderSheet();
  toast('⚔ '+count+'× '+T.name+' به صف رفت');};
window.instantTrain=(barId,tid,count)=>{const T=TROOPS[tid];if(!T)return;
  const cost={};for(const k in T.cost)cost[k]=T.cost[k]*count;
  if(!canPay(cost))return toast('منابع کافی نیست');
  const lvl=(S.buildings.find(b=>b.id===barId)?.level||1);
  const t=T.time*Math.pow(count,0.7)/(1+lvl*0.22);
  const gc=speedCost(t);if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;pay(cost);S.troops[tid]=(S.troops[tid]||0)+count;
  save(S);renderSheet();updTop();toast('⚡ '+count+'× '+T.name+' لحظه‌ای آماده شد (-'+gc+'🪙)');};
window.cancelQ=(barId,i)=>{const q=S.training[barId]?.[i];if(!q)return;const T=TROOPS[q.tid];
  for(const k in T.cost)S.resources[k]+=Math.floor(T.cost[k]*q.count*0.7);S.training[barId].splice(i,1);save(S);renderSheet();};
window.finishQ=(barId)=>{const q=S.training[barId];if(!q||!q.length)return;
  let tLeft=0;for(const j of q)tLeft+=j.left;const gc=speedCost(tLeft);
  if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;
  for(const j of q)S.troops[j.tid]=(S.troops[j.tid]||0)+j.count;
  S.training[barId]=[];save(S);renderSheet();updTop();toast('⚡ کل صف فوری تحویل شد (-'+gc+'🪙)');};

// ================= EXPEDITIONS =================
let selTroops={},detailId=null;
window.setSel=(tid,n)=>{n=Math.max(0,Math.min(S.troops[tid]||0,parseInt(n||0)||0));selTroops[tid]=n;updateDetailTotals();};
window.selMax=(tid)=>{selTroops[tid]=S.troops[tid]||0;renderSheet();};
window.selAll=()=>{const cap=expeditionCap(S);let room=cap;
  for(const tid of Object.keys(TROOPS)){const take=Math.min(S.troops[tid]||0,room);if(take>0)selTroops[tid]=take;room-=take;}
  renderSheet();};
window.selClear=()=>{selTroops={};renderSheet();};
window.openDetail=(id)=>{detailId=id;selTroops={};openSheet('detail');};
window.backToAttack=()=>{detailId=null;openSheet('attack');};
window.launch=(tribeId)=>{const tr=S.tribes.find(t=>t.id===tribeId);if(!tr)return;
  const cap=expeditionCap(S);const marches=maxMarches(S);
  if(S.marches.length>=marches)return toast('همه صف‌های لشکر پر است (سطح لشکر را بالا ببرید)');
  const army={};let count=0;
  for(const tid in selTroops){const n=parseInt(selTroops[tid]||0);if(n>0){army[tid]=Math.min(n,S.troops[tid]||0);count+=army[tid];}}
  if(!count)return toast('سربازی انتخاب نشده');
  if(count>cap)return toast('ظرفیت لشکر: '+cap+' سرباز');
  for(const tid in army)S.troops[tid]-=army[tid];
  const travel=dist(tr)/marchSpeed();
  S.marches.push({army,target:tribeId,tx:tr.x,ty:tr.y,hx:S.homePos.x,hy:S.homePos.y,travelLeft:travel,travelTotal:travel});
  addLog(S,'info','🚩 لشکر به سمت '+tr.name+' حرکت کرد ('+armyCount(army)+' نفر)');
  selTroops={};save(S);openSheet('attack');toast('🚩 لشکر به سمت '+tr.name+' حرکت کرد — '+Math.ceil(travel)+'ث');};
window.speedMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  const gc=speedCost(m.travelLeft);if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;m.travelLeft=0;save(S);toast('⚡ لشکر فوری رسید (-'+gc+'🪙)');};
window.cancelMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];
  S.marches.splice(idx,1);save(S);renderSheet();toast('لشکر فراخوانده شد');};

function resolveMarch(m){
  const tr=S.tribes.find(t=>t.id===m.target);
  if(!tr){for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];return;}
  const r=resolveAttack(m.army,tr,tr.wall||0);
  const gcount=armyCount(tr.garrison||{});
  const distHome=Math.hypot(S.homePos.x-tr.x,S.homePos.y-tr.y);
  if(r.win){
    for(const k in r.loot)S.resources[k]=(S.resources[k]||0)+r.loot[k];
    const killed=gcount;S.kills=(S.kills||0)+killed;
    S.tribes=S.tribes.filter(t=>t.id!==tr.id);S.conquered++;
    S.factionKills=S.factionKills||{};S.factionKills[tr.faction]=(S.factionKills[tr.faction]||0)+1;
    const lostRatio=Math.min(0.4,r.def/Math.max(1,r.atk)*0.35);
    const home={};for(const tid in m.army){home[tid]=Math.max(1,Math.floor(m.army[tid]*(1-lostRatio)));}
    S.marches.push({army:home,target:null,returning:true,tx:S.homePos.x,ty:S.homePos.y,hx:tr.x,hy:tr.y,travelLeft:distHome/marchSpeed(),travelTotal:distHome/marchSpeed()});
    addLog(S,'win','🏰 پیروزی! '+tr.name+' (Lv'+tr.level+') فتح شد — ☠'+fmt(killed)+' کشته — غنیمت: '+fmt(r.loot.gold||0)+'🪙 '+fmt(r.loot.food||0)+'🌾');
    toast('🏰 <b>پیروزی!</b> '+tr.name+' فتح شد — غنیمت: +'+fmt(r.loot.gold||0)+'🪙');
  }else{
    const killedL=Math.floor(gcount*Math.min(0.5,r.atk/Math.max(1,r.def)*0.3));S.kills=(S.kills||0)+killedL;
    addLog(S,'lose','❌ شکست از '+tr.name+' — قدرت ما '+fmt(r.atk)+' در برابر '+fmt(r.def));
    toast('❌ شکست از '+tr.name+' — قدرت ما '+fmt(r.atk)+' در برابر '+fmt(r.def));
    const lostRatio=Math.min(0.85,r.def/Math.max(1,r.atk)*0.5);
    const home={};for(const tid in m.army){home[tid]=Math.max(0,Math.floor(m.army[tid]*(1-lostRatio)));}
    S.marches.push({army:home,target:null,returning:true,tx:S.homePos.x,ty:S.homePos.y,hx:tr.x,hy:tr.y,travelLeft:distHome/marchSpeed(),travelTotal:distHome/marchSpeed()});
  }
}

// ================= UI =================
let cur='build',atkSort='near',searchQ='',boardTab='power';
function costStr(c){return Object.entries(c).map(([k,v])=>({food:'🌾',wood:'🪵',stone:'🪨',iron:'⛓️',gold:'🪙'})[k]+' '+fmt(v)).join('  ');}
function prodStr(t,l){const p=buildingProd(t,l);const e=Object.entries(p);if(!e.length)return'—';
  return e.map(([k,v])=>({food:'🌾',wood:'🪵',stone:'🪨',iron:'⛓️',gold:'🪙'})[k]+'+'+fmt(v*60)+'/د').join('  ');}
function sortedTribes(){
  let list=[...S.tribes];
  if(atkSort==='near')list.sort((a,b)=>dist(a)-dist(b));
  else if(atkSort==='weak')list.sort((a,b)=>a.power-b.power);
  else if(atkSort==='strong')list.sort((a,b)=>b.power-a.power);
  else if(atkSort==='level')list.sort((a,b)=>a.level-b.level);
  return list;}
function tribeRow(t,onclick){return '<div class="res" onclick="'+onclick+'"><span class="fdot" style="background:'+(t.color||'#e5484d')+'"></span>'
  +'<div><b>'+t.name+'</b><br><span style="color:var(--dim);font-size:12px">'+(t.factionName||'')+'</span></div>'
  +'<div class="meta">Lv'+t.level+' • ⚔'+fmt(t.power)+'<br>📏'+Math.round(dist(t))+' • ⏱'+eta(t)+'ث</div></div>';}

function renderSheet(){const B=$('sheetBody');if(!B||$('sheet').hidden)return;
if(cur==='build'){
  B.innerHTML=S.buildings.map(b=>{const u=S.upgrades.find(x=>x.id===b.id);
    const c=upgradeCost(b.type,b.level);
    let st='<div class="q">هزینه: '+costStr(c)+' • زمان: '+Math.ceil(upgradeTime(b.type,b.level)/60)+'د • تولید: '+prodStr(b.type,b.level)+'</div>';
    if(u){const pct=Math.floor((1-u.left/u.total)*100);
      st='<div class="q">⏳ ارتقا در جریان — '+Math.ceil(u.left)+'ث باقی <button class="btn sm" onclick="speedUp(\''+b.id+'\')">⚡ '+speedCost(u.left)+'🪙</button></div><div class="bar"><i style="width:'+pct+'%"></i></div>';}
    else st+='<div class="q"><button class="btn" onclick="upg(\''+b.id+'\')">ارتقا به Lv'+(b.level+1)+'</button></div>';
    return '<div class="card"><div class="bhead">'+BUILD_DEFS[b.type].icon+' <b>'+BUILD_DEFS[b.type].name+'</b> <span class="lvl">Lv'+b.level+'/'+MAX_LEVEL+'</span></div>'+st+'</div>';}).join('')
    +(S.upgrades.length>1?'<button class="btn wide" onclick="speedAll()">⚡ تسریع همه ارتقاها ('+S.upgrades.reduce((a,u)=>a+speedCost(u.left),0)+'🪙)</button>':'');}
if(cur==='train'){
  B.innerHTML=Object.keys(S.training).map(barId=>{const lvl=S.buildings.find(b=>b.id===barId)?.level||1;
    const qs=S.training[barId].map((q,i)=>{const pct=Math.floor((1-q.left/q.total)*100);
      return '<div class="q">⏳ '+TROOPS[q.tid].icon+' '+TROOPS[q.tid].name+' ×'+q.count+' — '+Math.ceil(q.left)+'ث <button class="btn sm" onclick="finishQ(\''+barId+'\')">⚡ همه ('+speedCost(S.training[barId].reduce((a,j)=>a+j.left,0))+'🪙)</button> <button class="btn sm ghost" onclick="cancelQ(\''+barId+'\','+i+')">لغو</button></div><div class="bar"><i style="width:'+pct+'%"></i></div>';}).join('')||'<div class="q">صف خالی</div>';
    const btns=Object.keys(TROOPS).map(tid=>{const T=TROOPS[tid];
      const locked=T.unlock>lvl;
      return '<div class="tcard'+(locked?' lock':'')+'"><div class="trow"><b>'+T.icon+' '+T.name+'</b><span class="tpow">⚔'+T.power+' • 👥'+fmt(S.troops[tid]||0)+'</span></div>'
      +(locked?'<div class="q">🔒 سربازخانه Lv'+T.unlock+'</div>'
        :'<div class="q">'+costStr(T.cost)+' • '+T.time+'ث</div><div class="row">'
        +BATCH_OPTIONS.map(n=>'<button class="btn sm" onclick="train(\''+barId+'\',\''+tid+'\','+n+')">'+n+'</button>').join('')
        +'<button class="btn sm gold" onclick="instantTrain(\''+barId+'\',\''+tid+'\',1000)">⚡۱۰۰۰ لحظه‌ای</button></div>');}).join('');
    return '<div class="card"><div class="bhead">⚔️ <b>سربازخانه '+(barId.slice(-1))+'</b> <span class="lvl">Lv'+lvl+'</span></div>'+qs+'</div>'+btns;}).join('');}
if(cur==='attack'){
  const cap=expeditionCap(S),mm=maxMarches(S);
  let h='<div class="card hero"><div class="bhead">🚩 <b>لشکر</b> <span class="lvl">ظرفیت '+cap+' • '+S.marches.length+'/'+mm+' صف • '+S.tribes.length+' هدف</span></div></div>';
  if(S.marches.length){h+=S.marches.map((m,i)=>{
    const tr=S.tribes.find(t=>t.id===m.target);
    if(m.returning)return '<div class="card"><b>🏳️ بازگشت به خانه</b> — '+Math.ceil(m.travelLeft)+'ث <button class="btn sm" onclick="speedMarch('+i+')">⚡ '+speedCost(m.travelLeft)+'🪙</button></div>';
    return '<div class="card"><b>🎯 '+(tr?.name||'هدف')+'</b> — '+Math.ceil(m.travelLeft)+'ث • 👥'+fmt(armyCount(m.army))+' ⚔'+fmt(armyPower(m.army))+' <button class="btn sm" onclick="speedMarch('+i+')">⚡ '+speedCost(m.travelLeft)+'🪙</button> <button class="btn sm ghost" onclick="cancelMarch('+i+')">فراخوان</button></div>';}).join('');}
  h+='<div class="seg">'
    +'<button class="'+(atkSort==='near'?'on':'')+'" onclick="setAtkSort(\'near\')">📏 نزدیک‌ترین</button>'
    +'<button class="'+(atkSort==='weak'?'on':'')+'" onclick="setAtkSort2(\'weak\')">🐣 ضعیف‌ترین</button>'
    +'<button class="'+(atkSort==='strong'?'on':'')+'" onclick="setAtkSort2(\'strong\')">🐉 قوی‌ترین</button>'
    +'<button class="'+(atkSort==='level'?'on':'')+'" onclick="setAtkSort2(\'level\')">🏰 سطح</button></div>';
  const list=sortedTribes();
  h+=list.slice(0,25).map(t=>tribeRow(t,'openDetail(\''+t.id+'\')')).join('');
  if(list.length>25)h+='<div class="q" style="justify-content:center">… و '+(list.length-25)+' قلعه دیگر — از 🔍 جستجو یا مرتب‌سازی استفاده کنید</div>';
  B.innerHTML=h;}
if(cur==='detail'){
  const t=S.tribes.find(x=>x.id===detailId);
  if(!t){cur='attack';renderSheet();return;}
  const def=t.power+(t.wall||0)*15;
  let h='<button class="btn sm ghost" onclick="backToAttack()">→ بازگشت به فهرست</button>';
  h+='<div class="card hero"><div class="bhead"><span class="fdot" style="background:'+(t.color||'#e5484d')+'"></span><b>'+t.name+'</b><span class="lvl">Lv'+t.level+'</span></div>'
    +'<div class="q">'+(t.factionName||'')+' • 🛡 دیوار Lv'+(t.wall||0)+' • ⚔ پاور دفاع: '+fmt(def)+'</div>'
    +'<div class="q">📏 فاصله: '+Math.round(dist(t))+' • ⏱ زمان رسیدن: '+eta(t)+' ثانیه</div>'
    +'<div class="q">💰 غنیمت: '+costStr(t.loot)+'</div>'
    +'<div class="q">🛡 گارد: '+Object.entries(t.garrison||{}).map(([k,v])=>TROOPS[k].icon+fmt(v)).join(' ')+'</div></div>';
  const owned=Object.keys(TROOPS).filter(tid=>(S.troops[tid]||0)>0);
  if(!owned.length)h+='<div class="card">سربازی نداری! از منوی ⚔️ سرباز، نیرو بساز.</div>';
  else{
    h+='<div class="row"><button class="btn sm" onclick="selAll()">✚ انتخاب همه (تا ظرفیت)</button><button class="btn sm ghost" onclick="selClear()">✕ پاک کردن</button></div>';
    h+=owned.map(tid=>{const T=TROOPS[tid];
      return '<div class="armyrow"><span>'+T.icon+'</span><b>'+T.name+'</b><span class="cnt">موجود: '+fmt(S.troops[tid])+' • ⚔'+T.power+'</span>'
      +'<input type="number" min="0" max="'+S.troops[tid]+'" value="'+(selTroops[tid]||0)+'" onchange="setSel(\''+tid+'\',this.value)">'
      +'<button class="btn sm ghost" onclick="selMax(\''+tid+'\')">MAX</button></div>';}).join('');
    h+='<div class="card"><div id="selTotals"></div>'
    +'<button class="btn wide" onclick="launch(\''+t.id+'\')">🚩 اعزام لشکر به '+t.name+'</button></div>';}
  B.innerHTML=h;updateDetailTotals();return;}
if(cur==='search'){
  let h='<input id="searchIn" class="sinput" placeholder="🔍 نام قلعه یا قبیله… (مثلاً: اژدها)" value="'+searchQ+'" oninput="doSearch(this.value)">';
  h+='<div class="seg">'+FACTIONS.map(f=>'<button onclick="doSearch(\''+f.name.split('‌')[0]+'\')">'+f.icon+' '+f.name+'</button>').join('')+'</div>';
  let list=S.tribes;
  if(searchQ.trim()){const q=searchQ.trim();
    list=list.filter(t=>t.name.includes(q)||(t.factionName||'').includes(q));}
  list=[...list].sort((a,b)=>dist(a)-dist(b));
  h+='<div class="q">'+(searchQ?list.length+' نتیجه':'همه '+list.length+' قلعه — برای محدود کردن بنویسید')+'</div>';
  h+=list.slice(0,30).map(t=>tribeRow(t,'jumpTo(\''+t.id+'\')')).join('');
  if(list.length>30)h+='<div class="q" style="justify-content:center">… و '+(list.length-30)+' نتیجه دیگر — جستجو را دقیق‌تر کنید</div>';
  B.innerHTML=h;
  const inp=$('searchIn');if(inp&&searchQ){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}}
if(cur==='reports'){
  B.innerHTML=S.log.length?S.log.map(l=>{
    const ic=l.kind==='win'?'🏆':l.kind==='lose'?'💀':'📜';
    const cls=l.kind==='win'?' win':(l.kind==='lose'?' lose':'');
    return '<div class="logrow'+cls+'"><span class="ic">'+ic+'</span><span>'+l.text+'</span><time>'+new Date(l.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+'</time></div>';}).join('')
    :'<div class="card">هنوز گزارشی نیست — اولین لشکر را اعزام کن!</div>';}
if(cur==='board'){
  const tabs='<div class="seg">'+[['power','👑 قدرت'],['kills','☠️ کشتار'],['fac','🏴 قبایل']].map(([k,l])=>'<button class="'+(boardTab===k?'on':'')+'" onclick="setBoardTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  if(boardTab==='fac'){
    const fb=factionBoard(S,FACTIONS),mx=Math.max(1,...fb.map(f=>f.power));
    B.innerHTML=tabs+fb.map((f,i)=>'<div class="card"><div class="bhead"><span class="rank">'+(['🥇','🥈','🥉'][i]||(i+1))+'</span><span class="fdot" style="background:'+f.color+'"></span>'+f.icon+' <b>'+f.name+'</b><span class="lvl">'+f.castles+' قلعه</span></div>'
      +'<div class="q">⚔ مجموع قدرت: <b>'+fmt(f.power)+'</b> • ☠ کشتار: <b>'+fmt(f.kills)+'</b> • 🏰 فتح‌شده توسط شما: <b>'+f.conquered+'</b></div>'
      +'<div class="bar"><i style="width:'+Math.floor(f.power/mx*100)+'%"></i></div></div>').join('');
  }else{
    const key=boardTab,l=rankBoard(S,key),me=l.find(e=>e.me);
    const row=e=>{const medal=['🥇','🥈','🥉'][e.rank-1]||('#'+e.rank);
      const a=key==='power'?'⚔'+fmt(e.power):'☠'+fmt(e.kills),b=key==='power'?'☠'+fmt(e.kills):'⚔'+fmt(e.power);
      return '<div class="res'+(e.me?' me':'')+'" onclick="'+(e.me?'goHome()':'jumpTo(\''+e.id+'\')')+'"><span class="rank">'+medal+'</span><span class="fdot" style="background:'+e.color+'"></span>'
        +'<div><b>'+e.name+'</b><br><span style="color:var(--dim);font-size:12px">'+e.fac+(e.me?'Lv'+e.level:' • Lv'+e.level)+'</span></div>'
        +'<div class="meta"><b style="color:var(--gold)">'+a+'</b><br><span style="font-size:11.5px">'+b+'</span></div></div>';};
    B.innerHTML=tabs+'<div class="card hero"><div class="bhead">🏆 <b>رتبه شما: #'+me.rank+'</b><span class="lvl">از '+l.length+' فرمانده</span></div><div class="q">'+(key==='power'?'⚔ قدرت ارتش: ':'☠ کشته‌ها: ')+'<b>'+fmt(key==='power'?me.power:me.kills)+'</b></div></div>'
      +l.slice(0,20).map(row).join('')+(me.rank>20?'<div class="q" style="justify-content:center">⋯</div>'+row(me):'');}
}
if(cur==='empire'){
  const total=S.tribes.length+S.conquered;
  const perFaction=FACTIONS.map(f=>{
    const all=S.tribes.filter(t=>t.faction===f.id).length;
    const done=S.factionKills?.[f.id]||0;
    const sum=all+done;
    const pct=sum?Math.floor(done/sum*100):0;
    return '<div class="card"><div class="bhead"><span class="fdot" style="background:'+f.color+'"></span>'+f.icon+' <b>'+f.name+'</b><span class="lvl">'+done+'/'+sum+'</span></div><div class="bar"><i style="width:'+pct+'%"></i></div></div>';}).join('');
  const strongest=S.tribes.length?[...S.tribes].sort((a,b)=>b.power-a.power)[0]:null;
  B.innerHTML='<div class="statgrid">'
    +'<div class="stat">🏰 فتوحات<b>'+S.conquered+' از '+total+'</b></div>'
    +'<div class="stat">⚔ قدرت ارتش<b>'+fmt(armyPower(S.troops))+'</b></div>'
    +'<div class="stat">👥 جمعیت ارتش<b>'+fmt(armyCount(S.troops))+'</b></div>'
    +'<div class="stat">☠ کشته‌ها<b>'+fmt(S.kills||0)+'</b></div>'
    +'<div class="stat">🚩 صف‌های لشکر<b>'+maxMarches(S)+'</b></div>'
    +'<div class="stat">🏗 ارتقای فعال<b>'+S.upgrades.length+'</b></div>'
    +'<div class="stat">🐉 قوی‌ترین باقی‌مانده<b>'+(strongest?strongest.name+' ⚔'+fmt(strongest.power):'—')+'</b></div></div>'
    +'<div class="bhead" style="margin:12px 0 2px">🗺 قلمروها</div>'+perFaction
    +'<div class="card">'+Object.keys(TROOPS).map(tid=>TROOPS[tid].icon+' '+TROOPS[tid].name+': <b>'+fmt(S.troops[tid]||0)+'</b>').join('<br>')+'</div>';}}
window.setBoardTab=(k)=>{boardTab=k;renderSheet();};
window.goHome=()=>{$('sheet').hidden=true;$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');R.setView('world');R.centerOn(S.homePos.x,S.homePos.y);};
window.setAtkSort=(k)=>{atkSort=k;renderSheet();};
window.setAtkSort2=(k)=>{atkSort=k;renderSheet();};
window.doSearch=(q)=>{searchQ=q;renderSheet();};
window.jumpTo=(id)=>{const t=S.tribes.find(x=>x.id===id);if(!t)return;
  $('sheet').hidden=true;$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');
  R.setView('world');R.centerOn(t.x,t.y);R.zoom=Math.max(R.zoom,1);
  toast('📍 '+t.name+' • Lv'+t.level+' • ⚔'+fmt(t.power));};
function updateDetailTotals(){const el=$('selTotals');if(!el||!detailId)return;
  const t=S.tribes.find(x=>x.id===detailId);if(!t)return;
  let cnt=0,pw=0;for(const tid in selTroops){const n=selTroops[tid]||0;cnt+=n;pw+=n*TROOPS[tid].power;}
  const def=t.power+(t.wall||0)*15;const cap=expeditionCap(S);
  const ok=pw>def*1.02&&cnt<=cap&&cnt>0;
  el.innerHTML='<div class="trow"><b>👥 '+fmt(cnt)+'/'+cap+'</b><span class="tpow" style="color:'+(ok?'var(--green)':'var(--red)')+'">⚔'+fmt(pw)+' در برابر '+fmt(def)+' '+(ok?'✅ شانس پیروزی':'⚠️ کافی نیست')+'</span></div>';}
function openSheet(k){cur=k;$('sheet').hidden=false;
  $('sheetTitle').textContent={build:'🏗️ ساخت و ارتقا',train:'⚔️ تربیت سرباز — لحظه‌ای با سکه',attack:'🚩 لشکرکشی',detail:'🎯 جزئیات هدف',search:'🔍 جستجو در نقشه',reports:'📜 گزارش‌ها',empire:'👑 امپراتوری',board:'🏆 لیدربرد'}[k]||'';
  renderSheet();}
document.querySelectorAll('#dock button').forEach(b=>b.onclick=()=>openSheet(b.dataset.act));
$('sheetClose').onclick=()=>$('sheet').hidden=true;
$('btnSearch').onclick=()=>openSheet('search');
$('btnHome2').onclick=()=>{$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');R.setView('world');R.centerOn(S.homePos.x,S.homePos.y);};
$('zin').onclick=()=>R.zoomBy(1.3);
$('zout').onclick=()=>R.zoomBy(0.77);
R.onTap=(hit)=>{
  if(hit.kind==='minimap'){R.centerOn(hit.wx,hit.wy);R.hl=null;return;}
  if(hit.kind==='tribe'){openDetail(hit.tribe.id);}
  if(hit.kind==='home'){R.setView('castle');$('tabCastle').classList.add('on');$('tabWorld').classList.remove('on');}};
$('tabWorld').onclick=()=>{R.setView('world');$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');};
$('tabCastle').onclick=()=>{R.setView('castle');$('tabCastle').classList.add('on');$('tabWorld').classList.remove('on');};
$('btnContinue').onclick=()=>{$('splash').style.display='none';$('game').hidden=false;updTop();};
$('btnNew').onclick=()=>{localStorage.removeItem(SAVE_KEY);localStorage.removeItem('village_rise_v8');S=freshState();location.reload();};
$('btnHelp').onclick=()=>{const h=$('helpBox');h.hidden=!h.hidden;};

// ================= tick =================
let tickN=0;
setInterval(()=>{
  if(++tickN%5===0)npcTick(S,Math.random,25);
  for(const b of S.buildings){const p=buildingProd(b.type,b.level);for(const k in p)S.resources[k]+=p[k]/60*20;}
  for(const u of[...S.upgrades]){u.left-=1;
    if(u.left<=0){const b=S.buildings.find(x=>x.id===u.id);if(b)b.level++;
      S.upgrades=S.upgrades.filter(x=>x.id!==u.id);
      addLog(S,'info','✅ '+BUILD_DEFS[u.type].name+' به Lv'+b.level+' رسید');
      toast('✅ '+BUILD_DEFS[u.type].name+' به Lv'+b.level+' رسید');}}
  for(const barId in S.training){const q=S.training[barId][0];
    if(q){q.left-=1;if(q.left<=0){S.troops[q.tid]=(S.troops[q.tid]||0)+q.count;S.training[barId].shift();
      addLog(S,'info','⚔ '+q.count+'× '+TROOPS[q.tid].name+' آماده شد');
      toast('✅ '+q.count+'× '+TROOPS[q.tid].name+' آماده شد');}}}
  for(const m of[...S.marches]){m.travelLeft-=1;
    if(m.travelLeft<=0){S.marches=S.marches.filter(x=>x!==m);
      if(m.returning){for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];addLog(S,'info','🏳️ لشکر به خانه بازگشت');toast('🏳️ لشکر به خانه بازگشت');}
      else resolveMarch(m);}}
  save(S);updTop();
  if(cur&&!$('sheet').hidden&&cur!=='detail'&&cur!=='search'&&cur!=='board')renderSheet();},1000);
(function loop(){R.draw();requestAnimationFrame(loop);})();
updTop();
