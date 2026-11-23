import{TROOPS,BUILD_DEFS,BATCH_OPTIONS,EXTRA_NAMES,FACTIONS,MAX_LEVEL,CLASS_INFO,TROOP_CLASS,COUNTER,NPC,hospitalCap,buildingProd,upgradeCost,upgradeTime,speedCost,expeditionCap,maxMarches,marchSpeed,factionAt,tribeLevelAt,WORLD_W,WORLD_H,CASTLE_COUNT}from'./config.js';
import{SAVE_KEY,freshState,load,save,storageCap,addLog}from'./state.js';
import{armyPower,armyCount,battle,genGarrison,troopMultVs,bestCounters}from'./combat.js';
import{hospitalLevel,woundedCount,healingCount,addWounded,healCost,healTime}from'./hospital.js';
import{buildTribe,scaleTribe,queueRespawn,processRespawns,npcGrow,startWar,resolveWar,maybeRaid,resolveRaid}from'./npc.js';
import{genSites,siteReady,lootSite,SITE_KINDS}from'./sites.js';
import{ensureQuests,questsHTML,claimQuest,claimAch,countClaimable,bump}from'./quests.js';
import{Renderer}from'./js/renderer.js';
import{placeCastles,findHome}from'./js/worldgen.js';
import{makeRng}from'./js/noise.js';
import{rankBoard,factionBoard,npcKillsInit,npcTick}from'./leaderboard.js';
let S=load();window.__S=S;const $=id=>document.getElementById(id);
const cv=$('cv'),R=new Renderer(cv);R.setState(S);

// ---- جهان: ۶۰۰ قلعه، ۵ قبیله، گنج و غار در مرکز ----
(function populate(){
  const terr=R.terr;
  const home=findHome(terr);
  if(!S.tribes.length){
    S.homePos=home;
    const spots=placeCastles(terr,CASTLE_COUNT+12,555).filter(p=>Math.hypot(p.x-home.x,p.y-home.y)>11).slice(0,CASTLE_COUNT);
    const rng=makeRng(20240907);
    const maxDist=Math.hypot(WORLD_W,WORLD_H)/2;
    S.tribes=spots.map((sp,i)=>{
      const dRatio=Math.hypot(sp.x-home.x,sp.y-home.y)/maxDist;
      const level=Math.max(1,Math.min(30,tribeLevelAt(dRatio)+Math.floor(rng()*5)-2));
      return buildTribe('t'+i,'قلعه '+EXTRA_NAMES[i%EXTRA_NAMES.length]+' '+(Math.floor(i/EXTRA_NAMES.length)+1),sp.x,sp.y,level,rng,NPC.buff);});
    S.buffed=true;S.buffVer=2;
    addLog(S,'info','🌍 جهان جدید ساخته شد: '+S.tribes.length+' قلعه در '+FACTIONS.length+' قلمرو');
  }
  if((S.buffVer||0)<2){const k=S.buffed?NPC.buff/1.4:NPC.buff;for(const t of S.tribes){scaleTribe(t,k);t.base=t.power;}S.buffed=true;S.buffVer=2;}
  for(const t of S.tribes)if(!t.base)t.base=t.power;
  if(!S.sites||!S.sites.length){S.sites=genSites(terr,S.tribes,S.homePos,makeRng(777),30);
    addLog(S,'info','💎 '+S.sites.length+' گنج و غار در قلب نقشه کشف شد');}
  ensureQuests(S);
  R.setState(S);save(S);
})();
R.setView('world'); // ورود: دوربین روی قلعه خودت، زوم نزدیک


const toast=m=>{const t=$('toast');if(!t)return;t.innerHTML=m;clearTimeout(t._h);t._h=setTimeout(()=>t.textContent='',2600);};
function fmt(n){n=Math.floor(n);if(n>=1e12)return(n/1e12).toFixed(1)+'T';if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n;}
function dist(t){return Math.hypot(t.x-S.homePos.x,t.y-S.homePos.y);}
function eta(t){return Math.ceil(dist(t)/marchSpeed());}
function updBadges(){
  const qb=document.querySelector('#dock [data-act=quests] .badge'),ab=document.querySelector('#dock [data-act=attack] .badge'),al=$('alertBar');
  const n=countClaimable(S);if(qb){qb.hidden=!n;qb.textContent=n;}
  const inc=S.incoming||[];if(ab){ab.hidden=!inc.length;ab.textContent=inc.length;}
  if(al){if(inc.length){const r=inc.reduce((a,b)=>a.left<b.left?a:b);al.hidden=false;
    al.textContent='⚠️ حمله '+r.name+' — '+Math.ceil(r.left)+'ث تا رسیدن • ⚔'+fmt(r.power)+' در برابر دفاع شما ⚔'+fmt(armyPower(S.troops));}else al.hidden=true;}}
function updTop(){updBadges();const cap=storageCap(S);for(const k in S.resources)S.resources[k]=Math.min(S.resources[k],cap);
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
  const b=S.buildings.find(x=>x.id===id);if(b)b.level++;bump(S,'upgraded');
  save(S);renderSheet();updTop();toast('⚡ ارتقا فوری تکمیل شد! (-'+cost+'🪙)');};
window.speedAll=()=>{if(!S.upgrades.length)return toast('ارتقایی در جریان نیست');
  let total=0;for(const u of S.upgrades)total+=speedCost(u.left);
  if(S.resources.gold<total)return toast('🪙 سکه کافی نیست ('+total+' لازم)');
  S.resources.gold-=total;
  for(const u of S.upgrades){const b=S.buildings.find(x=>x.id===u.id);if(b)b.level++;}
  bump(S,'upgraded',S.upgrades.length);S.upgrades=[];save(S);renderSheet();updTop();toast('⚡ همه ارتقاها فوری شد (-'+total+'🪙)');};

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
  S.resources.gold-=gc;pay(cost);S.troops[tid]=(S.troops[tid]||0)+count;bump(S,'trained',count);
  save(S);renderSheet();updTop();toast('⚡ '+count+'× '+T.name+' لحظه‌ای آماده شد (-'+gc+'🪙)');};
window.cancelQ=(barId,i)=>{const q=S.training[barId]?.[i];if(!q)return;const T=TROOPS[q.tid];
  for(const k in T.cost)S.resources[k]+=Math.floor(T.cost[k]*q.count*0.7);S.training[barId].splice(i,1);save(S);renderSheet();};
window.finishQ=(barId)=>{const q=S.training[barId];if(!q||!q.length)return;
  let tLeft=0;for(const j of q)tLeft+=j.left;const gc=speedCost(tLeft);
  if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;
  for(const j of q){S.troops[j.tid]=(S.troops[j.tid]||0)+j.count;bump(S,'trained',j.count);}
  S.training[barId]=[];save(S);renderSheet();updTop();toast('⚡ کل صف فوری تحویل شد (-'+gc+'🪙)');};

// ================= HOSPITAL =================
window.heal=(tid,count)=>{const n=Math.min(count,S.wounded[tid]||0);if(n<=0)return;
  const cost=healCost(tid,n);if(!canPay(cost))return toast('منابع کافی نیست');
  pay(cost);S.wounded[tid]-=n;if(S.wounded[tid]<=0)delete S.wounded[tid];
  const total=healTime(tid,n,hospitalLevel(S));S.healing.push({tid,count:n,left:total,total});
  save(S);renderSheet();updTop();toast('🏥 درمان '+n+'× '+TROOPS[tid].name+' شروع شد');};
window.healAll=()=>{const tids=Object.keys(S.wounded);if(!tids.length)return;
  const tot={};for(const t of tids){const c=healCost(t,S.wounded[t]);for(const k in c)tot[k]=(tot[k]||0)+c[k];}
  if(!canPay(tot))return toast('منابع کافی نیست');pay(tot);
  for(const t of tids){const n=S.wounded[t];S.healing.push({tid:t,count:n,left:healTime(t,n,hospitalLevel(S)),total:healTime(t,n,hospitalLevel(S))});}
  S.wounded={};save(S);renderSheet();updTop();toast('🏥 درمان همه مجروحان شروع شد');};
window.finishHeal=()=>{if(!S.healing.length)return;let left=0;for(const j of S.healing)left+=j.left;
  const gc=speedCost(left);if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;
  for(const j of S.healing){S.troops[j.tid]=(S.troops[j.tid]||0)+j.count;bump(S,'healed',j.count);}
  S.healing=[];save(S);renderSheet();updTop();toast('⚡ همه مجروحان فوری درمان شدند (-'+gc+'🪙)');};
window.cancelHeal=(i)=>{const j=S.healing[i];if(!j)return;
  const c=healCost(j.tid,j.count);for(const k in c)S.resources[k]+=Math.floor(c[k]*0.7);
  S.wounded[j.tid]=(S.wounded[j.tid]||0)+j.count;S.healing.splice(i,1);save(S);renderSheet();};

// ================= EXPEDITIONS =================
let selTroops={},detailId=null;
const getTarget=id=>S.tribes.find(t=>t.id===id)||(S.sites||[]).find(s=>s.id===id);
window.setSel=(tid,n)=>{n=Math.max(0,Math.min(S.troops[tid]||0,parseInt(n||0)||0));selTroops[tid]=n;updateDetailTotals();};
window.selMax=(tid)=>{selTroops[tid]=Math.min(S.troops[tid]||0,Math.max(0,expeditionCap(S)-selCount()+(selTroops[tid]||0)));renderSheet();};
const selCount=()=>Object.values(selTroops).reduce((a,b)=>a+(b||0),0);
window.selAll=()=>{const cap=expeditionCap(S);let room=cap;selTroops={};
  for(const tid of Object.keys(TROOPS)){const take=Math.min(S.troops[tid]||0,room);if(take>0)selTroops[tid]=take;room-=take;}
  renderSheet();};
window.selClear=()=>{selTroops={};renderSheet();};
window.openDetail=(id)=>{detailId=id;selTroops={};openSheet('detail');};
window.backToAttack=()=>{detailId=null;openSheet('attack');};
window.launch=(tribeId)=>{const tr=getTarget(tribeId);if(!tr)return;
  if(tr.kind&&!siteReady(tr,Date.now()))return toast('این مکان در حال بازسازی است');
  const cap=expeditionCap(S);const marches=maxMarches(S);
  if(S.marches.length>=marches)return toast('همه صف‌های لشکر پر است (سطح لشکر را بالا ببرید)');
  const army={};let count=0;
  for(const tid in selTroops){const n=parseInt(selTroops[tid]||0);if(n>0){army[tid]=Math.min(n,S.troops[tid]||0);count+=army[tid];}}
  if(!count)return toast('سربازی انتخاب نشده');
  if(count>cap)return toast('ظرفیت لشکر: '+cap+' سرباز');
  for(const tid in army)S.troops[tid]-=army[tid];
  const travel=dist(tr)/marchSpeed();
  S.marches.push({army,target:tribeId,tx:tr.x,ty:tr.y,hx:S.homePos.x,hy:S.homePos.y,travelLeft:travel,travelTotal:travel});
  bump(S,'marches');
  addLog(S,'info','🚩 لشکر به سمت '+tr.name+' حرکت کرد ('+fmt(armyCount(army))+' نفر)');
  selTroops={};save(S);openSheet('attack');toast('🚩 لشکر به سمت '+tr.name+' حرکت کرد — '+Math.ceil(travel)+'ث');};
window.speedMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  const gc=speedCost(m.travelLeft);if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;m.travelLeft=0;save(S);toast('⚡ لشکر فوری رسید (-'+gc+'🪙)');};
window.cancelMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];
  S.marches.splice(idx,1);save(S);renderSheet();toast('لشکر فراخوانده شد');};

const ICO={food:'🌾',wood:'🪵',stone:'🪨',iron:'⛓️',gold:'🪙'};
const mulNote=(m)=>m>=1.15?' • 🎯 تقابل به نفع تو ×'+m.toFixed(2):m<=0.88?' • ⚠ تقابل بر ضد تو ×'+m.toFixed(2):'';
function sendHome(army,hx,hy){if(armyCount(army)<=0)return;
  const d=Math.hypot(S.homePos.x-hx,S.homePos.y-hy)/marchSpeed();
  S.marches.push({army,target:null,returning:true,tx:S.homePos.x,ty:S.homePos.y,hx,hy,travelLeft:d,travelTotal:d});}
function resolveMarch(m){
  const now=Date.now(),tr=getTarget(m.target);
  if(!tr||(tr.kind&&!siteReady(tr,now))){
    addLog(S,'info','🏳️ هدف دیگر در دسترس نبود — لشکر برگشت');toast('🏳️ هدف دیگر وجود ندارد — لشکر برمی‌گردد');
    sendHome(m.army,m.tx,m.ty);return;}
  const site=!!tr.kind,gcount=armyCount(tr.garrison||{});
  const r=battle(m.army,{army:tr.garrison||{},power:tr.power},tr.wall||0,15);
  const survivors={};for(const k in m.army){const n=m.army[k]-(r.attLosses[k]||0);if(n>0)survivors[k]=n;}
  const hurt=addWounded(S,r.attLosses),lostTxt=armyCount(r.attLosses)?' — 🩹'+fmt(hurt.wounded)+' مجروح • ☠'+fmt(hurt.dead)+' کشته':'';
  if(r.win){
    const loot={...tr.loot};for(const k in loot)S.resources[k]=(S.resources[k]||0)+loot[k];
    S.kills=(S.kills||0)+gcount;bump(S,'won');
    if(site){lootSite(tr,now,Math.random);bump(S,'sites');
      addLog(S,'win','💎 '+tr.name+' غارت شد — '+fmt(loot.gold||0)+'🪙 '+fmt(loot.iron||0)+'⛓️ '+fmt(loot.stone||0)+'🪨'+lostTxt+mulNote(r.atkMul));
      toast('💎 <b>'+tr.name+'</b> غارت شد! +'+fmt(loot.gold||0)+'🪙');
    }else{
      S.tribes=S.tribes.filter(t=>t.id!==tr.id);S.conquered++;
      S.factionKills=S.factionKills||{};S.factionKills[tr.faction]=(S.factionKills[tr.faction]||0)+1;
      queueRespawn(S,tr,now,Math.random);
      addLog(S,'win','🏰 پیروزی! '+tr.name+' (Lv'+tr.level+') فتح شد — ☠'+fmt(gcount)+' دشمن'+lostTxt+' — غنیمت: '+fmt(loot.gold||0)+'🪙 '+fmt(loot.food||0)+'🌾'+mulNote(r.atkMul));
      toast('🏰 <b>پیروزی!</b> '+tr.name+' فتح شد — غنیمت: +'+fmt(loot.gold||0)+'🪙');}
  }else{
    S.kills=(S.kills||0)+Math.floor(gcount*r.dLoss);
    scaleTribe(tr,Math.max(0.3,1-r.dLoss));
    addLog(S,'lose','❌ شکست از '+tr.name+' — قدرت مؤثر ما '+fmt(r.atk)+' در برابر '+fmt(r.def)+lostTxt+mulNote(r.atkMul));
    toast('❌ شکست از '+tr.name+' — '+fmt(r.atk)+' در برابر '+fmt(r.def));}
  sendHome(survivors,tr.x,tr.y);
}
// حمله NPC به قلعه من
function handleRaid(raid){
  const o=resolveRaid(S,raid,Math.random),hurt=addWounded(S,o.myLosses);
  S.kills=(S.kills||0)+o.kills;
  const lostTxt=armyCount(o.myLosses)?' — 🩹'+fmt(hurt.wounded)+' مجروح • ☠'+fmt(hurt.dead)+' کشته':'';
  if(o.attackerWon){
    const lootTxt=Object.keys(o.loot).filter(k=>o.loot[k]>0).map(k=>fmt(o.loot[k])+ICO[k]).join(' ');
    addLog(S,'lose','🔥 '+raid.name+' قلعه‌ات را غارت کرد'+lostTxt+' — غارت‌شده: '+lootTxt);
    toast('🔥 <b>'+raid.name+'</b> قلعه‌ات را غارت کرد! سرباز و دیوار بیشتری لازم داری');
  }else{
    bump(S,'defended');
    const gold=o.loot.gold||0;
    addLog(S,'win','🛡 حمله '+raid.name+' دفع شد! ☠'+fmt(o.kills)+' دشمن'+lostTxt+' — غنیمت: '+fmt(gold)+'🪙');
    toast('🛡 <b>حمله '+raid.name+' دفع شد!</b> ☠'+fmt(o.kills)+' دشمن کشته شد');}}

// ================= UI =================
let cur='build',atkSort='near',searchQ='',boardTab='power',trainBar='bar-1',trainCls='all',trainQty=100,qTab='daily';
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

const costChips=c=>Object.entries(c).map(([k,v])=>'<span class="'+((S.resources[k]||0)>=v?'ok':'no')+'">'+ICO[k]+' '+fmt(v)+'</span>').join(' ');
function sheetSeg(){const wc=woundedCount(S);
  return '<div class="seg"><button class="'+(cur==='train'?'on':'')+'" onclick="openSheet(\'train\')">⚔️ سربازخانه</button><button class="'+(cur==='hospital'?'on':'')+'" onclick="openSheet(\'hospital\')">🏥 بیمارستان'+(wc?' • 🩹'+fmt(wc):'')+'</button></div>';}
function maxAfford(tid){const T=TROOPS[tid];let m=Infinity;for(const k in T.cost)m=Math.min(m,Math.floor((S.resources[k]||0)/T.cost[k]));return Math.max(0,m);}
function troopCard(tid,lvl){
  const T=TROOPS[tid],cls=TROOP_CLASS[tid],locked=T.unlock>lvl;
  const beats=Object.keys(COUNTER[cls]).filter(d=>COUNTER[cls][d]>=1.3).map(d=>CLASS_INFO[d].icon).join(' ');
  const weak=Object.keys(COUNTER[cls]).filter(d=>COUNTER[cls][d]<=0.8).map(d=>CLASS_INFO[d].icon).join(' ');
  const qty=trainQty,cost={};for(const k in T.cost)cost[k]=T.cost[k]*qty;
  const t=Math.ceil(T.time*Math.pow(qty,0.7)/(1+lvl*0.22)),mx=maxAfford(tid),ok=canPay(cost);
  return '<div class="tcard'+(locked?' lock':'')+'"><div class="trow"><b>'+T.icon+' '+T.name+' <span class="chip">'+CLASS_INFO[cls].icon+' '+CLASS_INFO[cls].name+'</span></b><span class="tpow">👥 '+fmt(S.troops[tid]||0)+'</span></div>'
   +(locked?'<div class="q">🔒 نیاز به سربازخانه Lv'+T.unlock+'</div>'
   :'<div class="q">⚔ قدرت '+T.power+' • ⏱ '+(t>=60?Math.floor(t/60)+'د ':'')+(t%60)+'ث برای '+fmt(qty)+'</div>'
   +'<div class="q">'+(beats?'✅ قوی در برابر: '+beats:'')+(weak?' &nbsp; ⚠️ ضعیف در برابر: '+weak:'')+'</div>'
   +'<div class="q">'+costChips(cost)+'</div>'
   +'<div class="row"><button class="btn sm" '+(ok?'':'disabled')+' onclick="train(\''+trainBar+'\',\''+tid+'\','+qty+')">⚔ ساخت '+fmt(qty)+'</button>'
   +'<button class="btn sm ghost" '+(mx<1?'disabled':'')+' onclick="trainMax(\''+trainBar+'\',\''+tid+'\')">MAX ('+fmt(mx)+')</button>'
   +'<button class="btn sm gold" '+(ok?'':'disabled')+' onclick="instantTrain(\''+trainBar+'\',\''+tid+'\','+qty+')">⚡ '+speedCost(T.time*Math.pow(qty,0.7)/(1+lvl*0.22))+'🪙</button></div>')+'</div>';}
window.setTrainBar=id=>{trainBar=id;renderSheet();};
window.setTrainCls=k=>{trainCls=k;renderSheet();};
window.setTrainQty=n=>{trainQty=Math.max(1,Math.min(100000,parseInt(n)||1));renderSheet();};
window.trainMax=(barId,tid)=>{const n=maxAfford(tid);if(n<1)return toast('منابع کافی نیست');train(barId,tid,n);};
window.setQTab=k=>{qTab=k;renderSheet();};
window.claimQ=(list,i)=>{const rw=claimQuest(S,list,i);if(!rw)return;save(S);updTop();renderSheet();toast('🎁 جایزه دریافت شد: +'+fmt(rw.gold)+'🪙');};
window.claimA=id=>{const rw=claimAch(S,id);if(!rw)return;save(S);updTop();renderSheet();toast('🏅 دستاورد! +'+fmt(rw.gold)+'🪙');};
window.openSheet=k=>openSheet(k);
const ER_SEG=()=>'<div class="seg"><button class="'+(cur==='empire'?'on':'')+'" onclick="openSheet(\'empire\')">👑 امپراتوری</button><button class="'+(cur==='reports'?'on':'')+'" onclick="openSheet(\'reports\')">📜 گزارش‌ها</button></div>';
function renderSheet(){const els=[$('sheetBody'),$('sheetCard')],st=els.map(e=>e?e.scrollTop:0);
  _renderSheet();if(!$('sheet').hidden&&(cur==='empire'||cur==='reports'))$('sheetBody').insertAdjacentHTML('afterbegin',ER_SEG());
  els.forEach((e,i)=>{if(e)e.scrollTop=st[i];});}
function _renderSheet(){const B=$('sheetBody');if(!B||$('sheet').hidden)return;
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
  const bars=Object.keys(S.training);if(!bars.includes(trainBar))trainBar=bars[0];
  const lvl=S.buildings.find(b=>b.id===trainBar)?.level||1;
  let h=sheetSeg();
  h+='<div class="q" style="justify-content:center;text-align:center">🔄 چرخه تقابل: 🗡️ پیاده ▶ 🔱 نیزه‌دار ▶ 🐎 سواره ▶ 🏹 کماندار ▶ 🗡️ پیاده • 💣 محاصره دیوار را می‌شکند</div>';
  h+='<div class="seg">'+bars.map((id,i)=>{const L=S.buildings.find(b=>b.id===id)?.level||1,q=S.training[id].length;
    return '<button class="'+(id===trainBar?'on':'')+'" onclick="setTrainBar(\''+id+'\')">🏰 سربازخانه '+(i+1)+' • Lv'+L+(q?' • ⏳'+q:'')+'</button>';}).join('')+'</div>';
  h+='<div class="seg"><span class="q" style="margin:0 4px">تعداد:</span>'+[1,10,100,1000,5000,10000].map(n=>'<button class="'+(trainQty===n?'on':'')+'" onclick="setTrainQty('+n+')">'+fmt(n)+'</button>').join('')
    +'<input class="qin" type="number" min="1" value="'+trainQty+'" onchange="setTrainQty(this.value)"></div>';
  h+='<div class="seg">'+[['all','همه']].concat(Object.entries(CLASS_INFO).map(([k,v])=>[k,v.icon+' '+v.name])).map(([k,l])=>'<button class="'+(trainCls===k?'on':'')+'" onclick="setTrainCls(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  const ql=S.training[trainBar];
  if(ql.length){h+='<div class="card"><div class="bhead">⏳ <b>صف این سربازخانه</b><button class="btn sm" onclick="finishQ(\''+trainBar+'\')">⚡ همه ('+speedCost(ql.reduce((a,j)=>a+j.left,0))+'🪙)</button></div>'
    +ql.map((q,i)=>{const pct=Math.floor((1-q.left/q.total)*100);
      return '<div class="q">'+TROOPS[q.tid].icon+' '+TROOPS[q.tid].name+' ×'+fmt(q.count)+' — '+Math.ceil(q.left)+'ث'+(i?' (در انتظار)':'')+' <button class="btn sm ghost" onclick="cancelQ(\''+trainBar+'\','+i+')">لغو</button></div>'+(i?'':'<div class="bar"><i style="width:'+pct+'%"></i></div>');}).join('')+'</div>';}
  h+=Object.keys(TROOPS).filter(tid=>trainCls==='all'||TROOP_CLASS[tid]===trainCls).map(tid=>troopCard(tid,lvl)).join('');
  B.innerHTML=h;}
if(cur==='hospital'){
  const lvl=hospitalLevel(S),cap=hospitalCap(lvl),w=woundedCount(S),hc=healingCount(S);
  let h=sheetSeg();
  h+='<div class="card hero"><div class="bhead">🏥 <b>بیمارستان</b><span class="lvl">Lv'+lvl+'</span></div>'
    +'<div class="q">🩹 ظرفیت: '+fmt(w+hc)+' / '+fmt(cap)+' <button class="btn sm" onclick="openSheet(\'build\')">⬆ ارتقای بیمارستان</button></div>'
    +'<div class="bar"><i style="width:'+Math.min(100,Math.floor((w+hc)/Math.max(1,cap)*100))+'%"></i></div>'
    +'<div class="q">بعد از هر جنگ، ۵۵٪ تلفات مجروح می‌شوند و در بیمارستان می‌مانند (بقیه کشته). درمان فقط ۳۵٪ هزینه و ۲۵٪ زمان ساخت دارد. مجروحِ بیش از ظرفیت می‌میرد.</div></div>';
  if(S.healing.length){h+='<div class="card"><div class="bhead">⏳ <b>در حال درمان</b><button class="btn sm" onclick="finishHeal()">⚡ همه ('+speedCost(S.healing.reduce((a,j)=>a+j.left,0))+'🪙)</button></div>'
    +S.healing.map((j,i)=>'<div class="q">'+TROOPS[j.tid].icon+' '+TROOPS[j.tid].name+' ×'+fmt(j.count)+' — '+Math.ceil(j.left)+'ث'+(i?' (در انتظار)':'')+' <button class="btn sm ghost" onclick="cancelHeal('+i+')">لغو</button></div>'+(i?'':'<div class="bar"><i style="width:'+Math.floor((1-j.left/j.total)*100)+'%"></i></div>')).join('')+'</div>';}
  const tids=Object.keys(S.wounded);
  if(!tids.length)h+='<div class="card">✅ مجروحی نداری. هر جنگ مجروح می‌دهد؛ اینجا درمانشان کن.</div>';
  else{
    const tot={};for(const t of tids){const c=healCost(t,S.wounded[t]);for(const k in c)tot[k]=(tot[k]||0)+c[k];}
    h+='<button class="btn wide" onclick="healAll()">🩹 درمان همه ('+fmt(w)+' نفر) — '+costStr(tot)+'</button>';
    h+=tids.map(t=>{const n=S.wounded[t],c=healCost(t,n),own=canPay(c);
      return '<div class="tcard"><div class="trow"><b>'+TROOPS[t].icon+' '+TROOPS[t].name+'</b><span class="tpow">🩹 '+fmt(n)+' مجروح</span></div>'
       +'<div class="q">'+costChips(c)+' • ⏱ '+healTime(t,n,lvl)+'ث</div>'
       +'<div class="row"><button class="btn sm" '+(own?'':'disabled')+' onclick="heal(\''+t+'\','+n+')">🩹 درمان همه</button>'
       +(n>10?'<button class="btn sm ghost" onclick="heal(\''+t+'\','+Math.ceil(n/2)+')">نیمی</button>':'')+'</div></div>';}).join('');}
  B.innerHTML=h;}
if(cur==='quests'){B.innerHTML=questsHTML(S,qTab,fmt);}
if(cur==='attack'){
  const cap=expeditionCap(S),mm=maxMarches(S),wl=S.buildings.find(b=>b.type==='wall')?.level||0;
  let h='<div class="card hero"><div class="bhead">🚩 <b>لشکر</b> <span class="lvl">ظرفیت '+fmt(cap)+' • '+S.marches.length+'/'+mm+' صف</span></div>'
    +'<div class="q">🛡 دفاع قلعه: ⚔'+fmt(armyPower(S.troops))+' • 🧱 دیوار Lv'+wl+' • 🩹 مجروح: '+fmt(woundedCount(S))+'</div></div>';
  for(const r of S.incoming)h+='<div class="card danger"><b>⚠️ حمله دشمن: '+r.name+'</b><div class="q">⏱ '+Math.ceil(r.left)+' ثانیه تا رسیدن • 👥'+fmt(armyCount(r.army))+' ⚔'+fmt(r.power)+' — دفاع شما ⚔'+fmt(armyPower(S.troops))+'</div></div>';
  h+=S.marches.map((m,i)=>{const tr=getTarget(m.target);
    if(m.returning)return '<div class="card"><b>🏳️ بازگشت به خانه</b> — 👥'+fmt(armyCount(m.army))+' • '+Math.ceil(m.travelLeft)+'ث <button class="btn sm" onclick="speedMarch('+i+')">⚡ '+speedCost(m.travelLeft)+'🪙</button></div>';
    return '<div class="card"><b>🎯 '+(tr?.name||'هدف')+'</b> — '+Math.ceil(m.travelLeft)+'ث • 👥'+fmt(armyCount(m.army))+' ⚔'+fmt(armyPower(m.army))+' <button class="btn sm" onclick="speedMarch('+i+')">⚡ '+speedCost(m.travelLeft)+'🪙</button> <button class="btn sm ghost" onclick="cancelMarch('+i+')">فراخوان</button></div>';}).join('');
  h+='<div class="seg">'
    +'<button class="'+(atkSort==='near'?'on':'')+'" onclick="setAtkSort(\'near\')">📏 نزدیک</button>'
    +'<button class="'+(atkSort==='weak'?'on':'')+'" onclick="setAtkSort(\'weak\')">🐣 ضعیف</button>'
    +'<button class="'+(atkSort==='strong'?'on':'')+'" onclick="setAtkSort(\'strong\')">🐉 قوی</button>'
    +'<button class="'+(atkSort==='level'?'on':'')+'" onclick="setAtkSort(\'level\')">🏰 سطح</button>'
    +'<button class="'+(atkSort==='sites'?'on':'')+'" onclick="setAtkSort(\'sites\')">💎 گنج و غار</button></div>';
  if(atkSort==='sites'){
    const now=Date.now(),L=[...(S.sites||[])].sort((a,b)=>dist(a)-dist(b));
    h+=L.map(t=>{const ready=siteReady(t,now);
      return '<div class="res" onclick="openDetail(\''+t.id+'\')"><span style="font-size:20px">'+SITE_KINDS[t.kind].icon+'</span>'
       +'<div><b>'+t.name+'</b><br><span style="color:var(--dim);font-size:12px">'+SITE_KINDS[t.kind].note+(ready?'':' • 💤 '+Math.ceil((t.cd-now)/1000)+'ث')+'</span></div>'
       +'<div class="meta">Lv'+t.level+' • ⚔'+fmt(t.power)+'<br>📏'+Math.round(dist(t))+' • ⏱'+eta(t)+'ث</div></div>';}).join('');
  }else{
    const list=sortedTribes();
    h+=list.slice(0,25).map(t=>tribeRow(t,'openDetail(\''+t.id+'\')')).join('');
    if(list.length>25)h+='<div class="q" style="justify-content:center">… و '+(list.length-25)+' قلعه دیگر — از 🔍 جستجو یا مرتب‌سازی استفاده کنید</div>';}
  B.innerHTML=h;}
if(cur==='detail'){
  const t=getTarget(detailId);
  if(!t){cur='attack';renderSheet();return;}
  const site=!!t.kind,now=Date.now(),def=t.power+(t.wall||0)*15;
  const best=bestCounters(t.garrison||{});
  let h='<button class="btn sm ghost" onclick="backToAttack()">→ بازگشت به فهرست</button>';
  h+='<div class="card hero"><div class="bhead">'+(site?'<span style="font-size:20px">'+SITE_KINDS[t.kind].icon+'</span>':'<span class="fdot" style="background:'+(t.color||'#e5484d')+'"></span>')+'<b>'+t.name+'</b><span class="lvl">Lv'+t.level+'</span></div>'
    +'<div class="q">'+(site?SITE_KINDS[t.kind].note:(t.factionName||''))+(t.wall?' • 🧱 دیوار Lv'+t.wall:'')+' • ⚔ پاور دفاع: '+fmt(def)+'</div>'
    +'<div class="q">📏 فاصله: '+Math.round(dist(t))+' • ⏱ رسیدن: '+eta(t)+' ثانیه • 👥 نگهبان: '+fmt(armyCount(t.garrison||{}))+'</div>'
    +'<div class="q">💰 غنیمت: '+costStr(t.loot)+'</div>'
    +'<div class="q">🛡 گارد: '+Object.entries(t.garrison||{}).map(([k,v])=>TROOPS[k].icon+fmt(v)).join(' ')+'</div>'
    +(best.length?'<div class="q">💡 پیشنهاد تقابل: '+best.map(b=>b.icon+' '+b.name+' ×'+b.mult.toFixed(2)).join(' و ')+'</div>':'')+'</div>';
  if(site&&!siteReady(t,now)){h+='<div class="card">💤 در حال بازسازی — '+Math.ceil((t.cd-now)/1000)+' ثانیه دیگر با نگهبانان قوی‌تر برمی‌گردد.</div>';B.innerHTML=h;return;}
  const owned=Object.keys(TROOPS).filter(tid=>(S.troops[tid]||0)>0);
  if(!owned.length)h+='<div class="card">سربازی نداری! از منوی ⚔️ سرباز، نیرو بساز.</div>';
  else{
    h+='<div class="row"><button class="btn sm" onclick="selAll()">✚ انتخاب همه (تا ظرفیت '+fmt(expeditionCap(S))+')</button><button class="btn sm ghost" onclick="selClear()">✕ پاک کردن</button></div>';
    h+=owned.map(tid=>{const T=TROOPS[tid],m=troopMultVs(tid,t.garrison||{}),col=m>1.15?'var(--green)':m<0.88?'var(--red)':'var(--dim)';
      return '<div class="armyrow"><span>'+T.icon+'</span><b>'+T.name+'</b><span class="cnt">'+CLASS_INFO[TROOP_CLASS[tid]].icon+' موجود: '+fmt(S.troops[tid])+' • ⚔'+T.power+' • <b style="color:'+col+'">🎯×'+m.toFixed(2)+'</b></span>'
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
window.jumpTo=(id)=>{const t=getTarget(id);if(!t)return;
  $('sheet').hidden=true;$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');
  R.setView('world');R.centerOn(t.x,t.y);R.zoom=Math.max(R.zoom,1);
  toast('📍 '+t.name+' • Lv'+t.level+' • ⚔'+fmt(t.power));};
function updateDetailTotals(){const el=$('selTotals');if(!el||!detailId)return;
  const t=getTarget(detailId);if(!t)return;
  const army={};let cnt=0;for(const tid in selTroops){const n=selTroops[tid]||0;if(n>0){army[tid]=n;cnt+=n;}}
  const cap=expeditionCap(S);
  if(!cnt){el.innerHTML='<div class="q">سربازی انتخاب نشده — از ردیف‌های بالا تعداد را وارد کن</div>';return;}
  const r=battle(army,{army:t.garrison||{},power:t.power},t.wall||0,15);
  const ok=r.win&&cnt<=cap;
  el.innerHTML='<div class="trow"><b>👥 '+fmt(cnt)+'/'+fmt(cap)+'</b><span class="tpow" style="color:'+(ok?'var(--green)':'var(--red)')+'">⚔'+fmt(r.atk)+' در برابر '+fmt(r.def)+' '+(cnt>cap?'⚠️ بیش از ظرفیت':ok?'✅ شانس پیروزی':'⚠️ کافی نیست')+'</span></div>'
   +'<div class="q">🎯 ضریب تقابل: شما ×'+r.atkMul.toFixed(2)+' • دشمن ×'+r.defMul.toFixed(2)+' • 📉 تلفات تخمینی شما: '+Math.round(r.aLoss*100)+'٪ (۵۵٪ از تلفات مجروح می‌شود 🏥)</div>';}
function openSheet(k){cur=k;$('sheet').hidden=false;
  $('sheetTitle').textContent={build:'🏗️ ساخت و ارتقا',train:'⚔️ سربازخانه',attack:'🚩 لشکرکشی',detail:'🎯 جزئیات هدف',search:'🔍 جستجو در نقشه',reports:'📜 گزارش‌ها',empire:'👑 امپراتوری',board:'🏆 لیدربرد',hospital:'🏥 بیمارستان',quests:'🎯 ماموریت‌ها و دستاوردها'}[k]||'';
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
  if(hit.kind==='site'){openDetail(hit.site.id);}
  if(hit.kind==='building'){const t=hit.b.type;openSheet(t==='barracks'?'train':t==='hospital'?'hospital':t==='muster'?'attack':'build');}
  if(hit.kind==='home'){R.setView('castle');$('tabCastle').classList.add('on');$('tabWorld').classList.remove('on');}};
$('tabWorld').onclick=()=>{R.setView('world');$('tabWorld').classList.add('on');$('tabCastle').classList.remove('on');};
$('tabCastle').onclick=()=>{R.setView('castle');$('tabCastle').classList.add('on');$('tabWorld').classList.remove('on');};
$('btnContinue').onclick=()=>{$('splash').style.display='none';$('game').hidden=false;updTop();};
$('btnNew').onclick=()=>{localStorage.removeItem(SAVE_KEY);localStorage.removeItem('village_rise_v8');S=freshState();location.reload();};
$('btnHelp').onclick=()=>{const h=$('helpBox');h.hidden=!h.hidden;};

// ================= tick =================
let tickN=0;
setInterval(()=>{
  tickN++;const now=Date.now();
  if(tickN%5===0)npcTick(S,Math.random,25);
  if(tickN%10===0)npcGrow(S,Math.random,40);
  if(tickN%NPC.warEverySec===0)startWar(S,Math.random);
  for(const b of S.buildings){const p=buildingProd(b.type,b.level);for(const k in p)S.resources[k]+=p[k]/60*20;}
  for(const u of[...S.upgrades]){u.left-=1;
    if(u.left<=0){const b=S.buildings.find(x=>x.id===u.id);if(b)b.level++;
      S.upgrades=S.upgrades.filter(x=>x.id!==u.id);bump(S,'upgraded');
      addLog(S,'info','✅ '+BUILD_DEFS[u.type].name+' به Lv'+b.level+' رسید');
      toast('✅ '+BUILD_DEFS[u.type].name+' به Lv'+b.level+' رسید');}}
  for(const barId in S.training){const q=S.training[barId][0];
    if(q){q.left-=1;if(q.left<=0){S.troops[q.tid]=(S.troops[q.tid]||0)+q.count;S.training[barId].shift();bump(S,'trained',q.count);
      addLog(S,'info','⚔ '+q.count+'× '+TROOPS[q.tid].name+' آماده شد');
      toast('✅ '+q.count+'× '+TROOPS[q.tid].name+' آماده شد');}}}
  const hj=S.healing[0];
  if(hj){hj.left-=1;if(hj.left<=0){S.troops[hj.tid]=(S.troops[hj.tid]||0)+hj.count;bump(S,'healed',hj.count);S.healing.shift();
    addLog(S,'info','🏥 '+fmt(hj.count)+'× '+TROOPS[hj.tid].name+' درمان شدند');toast('🏥 '+fmt(hj.count)+'× '+TROOPS[hj.tid].name+' درمان شدند');}}
  for(const m of[...S.marches]){m.travelLeft-=1;
    if(m.travelLeft<=0){S.marches=S.marches.filter(x=>x!==m);
      if(m.returning){for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];addLog(S,'info','🏳️ لشکر به خانه بازگشت');toast('🏳️ لشکر به خانه بازگشت');}
      else resolveMarch(m);}}
  // دنیای NPC: جنگ با هم، جایگزینی قوی‌تر، حمله به من
  for(const m of[...S.npcMarches]){m.left-=1;
    if(m.left<=0){S.npcMarches=S.npcMarches.filter(x=>x!==m);const o=resolveWar(S,m,now,Math.random);
      if(o&&o.type==='fall'&&Math.hypot(o.B.x-S.homePos.x,o.B.y-S.homePos.y)<70)addLog(S,'info','⚔️ '+o.A.name+' قلعه '+o.B.name+' را نابود کرد — به‌زودی قلعه‌ای قوی‌تر جایش می‌آید');}}
  processRespawns(S,now,Math.random);
  const raid=maybeRaid(S,now,Math.random);
  if(raid){addLog(S,'lose','⚠️ '+raid.name+' با ⚔'+fmt(raid.power)+' به قلعه‌ات لشکر کشید — '+Math.ceil(raid.left)+' ثانیه تا رسیدن!');
    toast('⚠️ <b>حمله دشمن!</b> '+raid.name+' — '+Math.ceil(raid.left)+'ث');}
  for(const r of[...S.incoming]){r.left-=1;if(r.left<=0){S.incoming=S.incoming.filter(x=>x!==r);handleRaid(r);}}
  if(tickN%30===0)ensureQuests(S,now);
  save(S);updTop();
  if(cur&&!$('sheet').hidden&&!['detail','search','board','quests'].includes(cur)&&document.activeElement?.tagName!=='INPUT')renderSheet();},1000);
(function loop(){R.draw();requestAnimationFrame(loop);})();
updTop();
