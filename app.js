import{TROOPS,BUILD_DEFS,BATCH_OPTIONS,EXTRA_NAMES,FACTIONS,MAX_LEVEL,CLASS_INFO,TROOP_CLASS,COUNTER,NPC,hospitalCap,buildingProd,upgradeCost,upgradeTime,speedCost,expeditionCap,maxMarches,marchSpeed,factionAt,tribeLevelAt,WORLD_W,WORLD_H,CASTLE_COUNT}from'./config.js';
import{SAVE_KEY,freshState,load,save,storageCap,addLog}from'./state.js';
import{armyPower,armyCount,battle,genGarrison,troopMultVs,bestCounters}from'./combat.js';
import{hospitalLevel,woundedCount,healingCount,addWounded,healCost,healTime}from'./hospital.js';
import{buildTribe,scaleTribe,queueRespawn,processRespawns,npcGrow,startWar,resolveWar,maybeRaid,resolveRaid}from'./npc.js';
import{genSites,siteReady,lootSite,SITE_KINDS}from'./sites.js';
import{ensureQuests,questsHTML,claimQuest,claimAch,countClaimable,bump}from'./quests.js';
import{COMMANDERS,CMD,MAX_UNLOCK,MAX_CMD_LEVEL,TOKEN_LEVELS,ensureCmd,grantTokens,unlockCmd,upgradeCmd,upgradeCost as cmdUpCost,busyCmds,freeCmds,cmdFx,homeFx,battleMods,energyCost,armyCap,fxChips,scaleOf}from'./commanders.js';
import{runSpy,getIntel,estPower,enemySpies}from'./spy.js';
import{ensureEnergy,spendEnergy}from'./energy.js';
import{ensureSeason,bossPhase,weaknessAt,bossHit,bossBoard,rewardFor,fmtDur,CLS_NAME}from'./season.js';
import{campSpotError,campAmbush,campMods,campSpeed}from'./camps.js';
import{ensurePlayers,others,playerById,threadOf,pushMsg,unreadFor,markRead,bumpUnread,totalUnread,addSys,ambientReply,ambientRandom}from'./social.js';
import{initAdmin}from'./admin.js';
import{createClan,myClan,clanById,clanMembers,castleCount,joinClan,requestClan,approveClanRequest,rejectClanRequest,leaveClan,kickClan,allied,ensureShield,shieldActive,shieldLeft,buyShield,SHOP,buyItem,CLAN_COST,CLAN_MAX_CASTLES,clanChatOf,pushClanMsg,unreadClan}from'./clans.js';
import{ENERGY,SEASON,CAMP,maxCamps,BOSS_POS}from'./config.js';
import{Renderer}from'./js/renderer.js';
import{findPath}from'./js/pathfinding.js';
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
    addLog(S,'info','🌍 جهان جدید ساخته شد: '+S.tribes.length+' قلعه در نقشه');
  }
  if((S.buffVer||0)<2){const k=S.buffed?NPC.buff/1.4:NPC.buff;for(const t of S.tribes){scaleTribe(t,k);t.base=t.power;}S.buffed=true;S.buffVer=2;}
  for(const t of S.tribes)if(!t.base)t.base=t.power;
  if(!S.sites||!S.sites.length){S.sites=genSites(terr,S.tribes,S.homePos,makeRng(777),30);
    addLog(S,'info','💎 '+S.sites.length+' گنج و غار در قلب نقشه کشف شد');}
  for(const t of S.tribes)if(t.spies==null)t.spies=Math.floor(t.level*6*0.8);
  for(const x of S.sites){if(x.spies==null)x.spies=Math.floor(x.level*5*0.8);if(x.item==null)x.item=Math.random()<0.13;}
  ensureQuests(S);ensureCmd(S);ensureEnergy(S);ensureSeason(S);
  R.setState(S);R.bossOn=bossPhase(S)==='active';save(S);
})();
ensurePlayers(S);ensureShield(S);initAdmin(S);R.setView('world'); // ورود: دوربین روی قلعه خودت، زوم نزدیک


const toast=m=>{const t=$('toast');if(!t)return;t.innerHTML=m;clearTimeout(t._h);t._h=setTimeout(()=>t.textContent='',2600);};
function fmt(n){n=Math.floor(n);if(n>=1e12)return(n/1e12).toFixed(1)+'T';if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n;}
function origin(){const k=detailCamp&&S.camps.find(x=>x.id===detailCamp);return k?{x:k.x,y:k.y,camp:k}:{x:S.homePos.x,y:S.homePos.y};}
function dist(t){const o=origin();return Math.hypot(t.x-o.x,t.y-o.y);}
function legSpeed(cmd){const o=origin();return o.camp?campSpeed(S,o.camp.cmd):marchSpeed()*(1+(cmdFx(S,cmd).speed||0));}
function eta(t){return Math.ceil(dist(t)/legSpeed(selCmd));}
const intelOf=t=>getIntel(S,t.id,Date.now(),homeFx(S,'spy'));
const powTxt=t=>intelOf(t)?'⚔'+fmt(t.power):'⚔≈'+fmt(estPower(t))+' ؟';
function updBadges(){
  const cb=document.querySelector('#dock [data-act=cmd] .badge');if(cb){const t=ensureCmd(S).tokens,ok=t>0&&S.cmd.unlocked.length<MAX_UNLOCK;cb.hidden=!ok;cb.textContent=t;}
  const en=$('res-energy');if(en&&S.energy)en.textContent='⚡ '+S.energy.v+'/'+ENERGY.max;
  const qb=document.querySelector('#dock [data-act=quests] .badge'),ab=document.querySelector('#dock [data-act=attack] .badge'),al=$('alertBar');
  const n=countClaimable(S);if(qb){qb.hidden=!n;qb.textContent=n;}
  const inc=S.incoming||[];if(ab){ab.hidden=!inc.length;ab.textContent=inc.length;}
  const mb=document.querySelector('#dock [data-act=msgs] .badge');
  if(mb){const rd=S.msgRead||{rep:0,sys:0};
    const u=totalUnread(S)+unreadClan(S)+(S.log||[]).filter(l=>l.t>rd.rep).length+(S.sysMsgs||[]).filter(m=>m.t>rd.sys).length;
    mb.hidden=!u;mb.textContent=u>9?'9+':u;}
  if(al){if(inc.length){const r=inc.reduce((a,b)=>a.left<b.left?a:b);al.hidden=false;
    al.textContent='⚠️ حمله '+r.name+' — '+Math.ceil(r.left)+'ث تا رسیدن • ⚔'+fmt(r.power)+' در برابر دفاع شما ⚔'+fmt(armyPower(S.troops));}else al.hidden=true;}}
function updTop(){updBadges();const cap=storageCap(S);for(const k in S.resources)S.resources[k]=Math.min(S.resources[k],cap);
if($('res-food')){$('res-food').textContent='🌾 '+fmt(S.resources.food);$('res-wood').textContent='🪵 '+fmt(S.resources.wood);$('res-stone').textContent='🪨 '+fmt(S.resources.stone);$('res-iron').textContent='⛓️ '+fmt(S.resources.iron);$('res-gold').textContent='🪙 '+fmt(S.resources.gold);
const keepLv=S.buildings.find(b=>b.type==='keep')?.level||1;
$('dayLabel').textContent='🏰Lv'+keepLv+' • ⚔'+fmt(armyPower(S.troops))+' • 👥'+fmt(armyCount(S.troops));}}

function setViewUI(v){R.setView(v);const b=$('btnView');if(b)b.textContent=v==='world'?'🏰':'🌍';}
window.toggleView=()=>{setViewUI(R.view==='world'?'castle':'world');};
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
  const cost=healCost(tid,n,homeFx(S,'heal')*1.2);if(!canPay(cost))return toast('منابع کافی نیست');
  pay(cost);S.wounded[tid]-=n;if(S.wounded[tid]<=0)delete S.wounded[tid];
  const total=healTime(tid,n,hospitalLevel(S));S.healing.push({tid,count:n,left:total,total});
  save(S);renderSheet();updTop();toast('🏥 درمان '+n+'× '+TROOPS[tid].name+' شروع شد');};
window.healAll=()=>{const tids=Object.keys(S.wounded);if(!tids.length)return;
  const tot={};for(const t of tids){const c=healCost(t,S.wounded[t],homeFx(S,'heal')*1.2);for(const k in c)tot[k]=(tot[k]||0)+c[k];}
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
window.selMax=(tid)=>{selTroops[tid]=Math.min(S.troops[tid]||0,Math.max(0,armyCap(S,expeditionCap(S),selCmd)-selCount()+(selTroops[tid]||0)));renderSheet();};
const selCount=()=>Object.values(selTroops).reduce((a,b)=>a+(b||0),0);
window.selAll=()=>{const cap=armyCap(S,expeditionCap(S),selCmd);let room=cap;selTroops={};
  for(const tid of Object.keys(TROOPS)){if(tid==='spy')continue;const take=Math.min(S.troops[tid]||0,room);if(take>0)selTroops[tid]=take;room-=take;}
  renderSheet();};
window.selClear=()=>{selTroops={};renderSheet();};
window.openDetail=(id)=>{detailId=id;selTroops={};openSheet('detail');};
window.backToAttack=()=>{detailId=null;openSheet('attack');};
const BOSS_T={id:'boss',name:'غول آخر فصل',x:BOSS_POS.x,y:BOSS_POS.y};
window.setSelCmd=id=>{selCmd=selCmd===id?null:id;selTroops={};renderSheet();};
// اعزام: حمله عادی، حمله به غول، یا حمله‌ی غافلگیرانه از کمپ
window.launch=(targetId)=>{
  const isBoss=targetId==='boss',tr=isBoss?BOSS_T:getTarget(targetId);if(!tr)return;
  if(isBoss&&bossPhase(S)!=='active')return toast('غول هنوز ظاهر نشده');
  if(tr.kind&&!siteReady(tr,Date.now()))return toast('این مکان در حال بازسازی است');
  if(allied(S,targetId))return toast('🏳 حمله به هم‌قبیله‌ای ممنوع است');
  const camp=detailCamp?S.camps.find(k=>k.id===detailCamp):null;
  if(S.marches.length>=maxMarches(S))return toast('همه صف‌های لشکر پر است (سطح لشکر را بالا ببرید)');
  let army={},count=0,cmd=null;
  if(camp){army={...camp.army};count=armyCount(army);cmd=camp.cmd;if(!count)return toast('کمپ لشکری ندارد');}
  else{cmd=selCmd&&freeCmds(S).includes(selCmd)?selCmd:null;
    for(const tid in selTroops){const n=parseInt(selTroops[tid]||0);if(n>0&&tid!=='spy'){army[tid]=Math.min(n,S.troops[tid]||0);count+=army[tid];}}
    if(!count)return toast('سربازی انتخاب نشده');
    const cap=armyCap(S,expeditionCap(S),cmd);if(count>cap)return toast('ظرفیت لشکر: '+fmt(cap)+' سرباز');}
  const o=origin(),path=findPath(R.terr,{x:o.x,y:o.y},{x:tr.x,y:tr.y});
  if(!path.ok)return toast('⛔ مسیر زمینی قابل عبور تا این قلعه پیدا نشد');
  const cost=energyCost(S,cmd);
  if(!spendEnergy(S,cost))return toast('⚡ انرژی امروز کافی نیست ('+cost+' لازم، '+S.energy.v+' مانده)');
  if(camp)camp.army={};else for(const tid in army)S.troops[tid]-=army[tid];
  const travel=path.cost/legSpeed(cmd);
  S.marches.push({army,target:targetId,tx:tr.x,ty:tr.y,hx:o.x,hy:o.y,route:path.points,travelLeft:travel,travelTotal:travel,cmd,fromCamp:camp?camp.id:null,surprise:!!camp});
  bump(S,'marches');
  addLog(S,'info','🚩 '+(camp?'حمله‌ی غافلگیرانه از کمپ':'لشکر')+' به سمت '+tr.name+' حرکت کرد ('+fmt(armyCount(army))+' نفر'+(cmd?' • '+CMD[cmd].icon+CMD[cmd].name:'')+')');
  selTroops={};save(S);updTop();openSheet('attack');toast('🚩 به سمت '+tr.name+' — '+Math.ceil(travel)+'ث • ⚡-'+cost);};
// برپایی کمپ: لشکر + فرمانده ارشد به یک نقطه‌ی خالی می‌روند و همان‌جا می‌مانند
window.startCamp=()=>{
  if(S.camps.length>=maxCamps(S))return toast('حداکثر '+maxCamps(S)+' کمپ (با سطح لشکر بیشتر می‌شود)');
  $('sheet').hidden=true;R.campMode=true;R.setView('world');setViewUI('world');
  $('modeBar').hidden=false;$('modeBar').innerHTML='⛺ روی یک نقطه‌ی خالی از نقشه ضربه بزن <button onclick="cancelCamp()">لغو</button>';};
window.cancelCamp=()=>{R.campMode=false;$('modeBar').hidden=true;};
window.deployCamp=()=>{
  if(!campDraft)return;const err=campSpotError(S,R.terr,campDraft.x,campDraft.y);if(err)return toast(err);
  if(S.camps.length>=maxCamps(S))return toast('حداکثر کمپ پر است');
  if(S.marches.length>=maxMarches(S))return toast('همه صف‌های لشکر پر است');
  const cmd=selCmd&&freeCmds(S).includes(selCmd)?selCmd:null;if(!cmd)return toast('برای کمپ باید یک فرمانده ارشد انتخاب کنی');
  const army={};let count=0;for(const tid in selTroops){const n=parseInt(selTroops[tid]||0);if(n>0&&tid!=='spy'){army[tid]=Math.min(n,S.troops[tid]||0);count+=army[tid];}}
  if(!count)return toast('سربازی انتخاب نشده');if(count>armyCap(S,expeditionCap(S),cmd))return toast('بیش از ظرفیت لشکر');
  const path=findPath(R.terr,{x:S.homePos.x,y:S.homePos.y},{x:campDraft.x,y:campDraft.y});if(!path.ok)return toast('⛔ مسیر زمینی تا محل کمپ وجود ندارد');
  const cost=energyCost(S,cmd);if(!spendEnergy(S,cost))return toast('⚡ انرژی کافی نیست ('+cost+' لازم)');
  for(const tid in army)S.troops[tid]-=army[tid];
  const d=path.cost/legSpeed(cmd);
  S.marches.push({army,target:null,deployCamp:true,tx:campDraft.x,ty:campDraft.y,hx:S.homePos.x,hy:S.homePos.y,route:path.points,travelLeft:d,travelTotal:d,cmd});
  bump(S,'marches');addLog(S,'info','⛺ لشکر برای برپایی کمپ حرکت کرد');campDraft=null;selTroops={};save(S);updTop();openSheet('attack');toast('⛺ در راه کمپ — ⚡-'+cost);};
window.useCamp=(id)=>{detailCamp=id;openSheet('attack');};
window.homeMode=()=>{detailCamp=null;openSheet('attack');};
window.recallCamp=(id)=>{const k=S.camps.find(x=>x.id===id);if(!k)return;
  S.camps=S.camps.filter(x=>x!==k);
  if(armyCount(k.army)>0){const path=findPath(R.terr,{x:k.x,y:k.y},{x:S.homePos.x,y:S.homePos.y});if(path.ok){const d=path.cost/(marchSpeed()*(1+(cmdFx(S,k.cmd).speed||0)));
    S.marches.push({army:k.army,target:null,returning:true,cmd:k.cmd,tx:S.homePos.x,ty:S.homePos.y,hx:k.x,hy:k.y,route:path.points,travelLeft:d,travelTotal:d});}else addLog(S,'lose','⛔ مسیر بازگشت کمپ پیدا نشد');}
  detailCamp=null;save(S);renderSheet();toast('⛺ کمپ جمع شد و لشکر برمی‌گردد');};
// جاسوسی
window.setSpyN=n=>{spyN=Math.max(1,parseInt(n)||1);};
window.doSpy=(id)=>{const t=getTarget(id);if(!t)return;
  const have=S.troops.spy||0,n=Math.min(spyN,have);if(n<1)return toast('جاسوس نداری — در سربازخانه (فیلتر 🕵️ جاسوس) بساز');
  if(!spendEnergy(S,ENERGY.spy))return toast('⚡ انرژی کافی نیست');
  const r=runSpy(S,t,n,homeFx(S,'spy'),Math.random);S.troops.spy-=r.lost;
  if(r.ok){addLog(S,'info','🕵️ جاسوسی از '+t.name+' موفق بود — اطلاعات تا ۱۰ دقیقه معتبر'+(r.lost?' ('+r.lost+' جاسوس از دست رفت)':''));toast('🕵️ جاسوسی موفق: اطلاعات '+t.name+' آشکار شد');}
  else{addLog(S,'lose','🕵️ جاسوسی از '+t.name+' لو رفت — جاسوس‌های دشمن قوی‌تر بودند ('+r.lost+' جاسوس کشته شد)');toast('🕵️ جاسوس‌هایت لو رفتند! جاسوس بیشتر یا قوی‌تر بفرست');}
  save(S);updTop();renderSheet();};
window.speedMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  const gc=speedCost(m.travelLeft);if(S.resources.gold<gc)return toast('🪙 سکه کافی نیست ('+gc+' لازم)');
  S.resources.gold-=gc;m.travelLeft=0;save(S);toast('⚡ لشکر فوری رسید (-'+gc+'🪙)');};
window.cancelMarch=(idx)=>{const m=S.marches[idx];if(!m)return;
  for(const tid in m.army)S.troops[tid]=(S.troops[tid]||0)+m.army[tid];
  S.marches.splice(idx,1);save(S);renderSheet();toast('لشکر فراخوانده شد');};

const ICO={food:'🌾',wood:'🪵',stone:'🪨',iron:'⛓️',gold:'🪙'};
const mulNote=(m)=>m>=1.15?' • 🎯 تقابل به نفع تو ×'+m.toFixed(2):m<=0.88?' • ⚠ تقابل بر ضد تو ×'+m.toFixed(2):'';
function sendBack(army,hx,hy,m){
  if(armyCount(army)<=0)return;
  const camp=m&&m.fromCamp?S.camps.find(k=>k.id===m.fromCamp):null;
  const tx=camp?camp.x:S.homePos.x,ty=camp?camp.y:S.homePos.y;
  const sp=camp?campSpeed(S,m.cmd):marchSpeed()*(1+(cmdFx(S,m?.cmd).speed||0));
  const path=findPath(R.terr,{x:hx,y:hy},{x:tx,y:ty});
  if(!path.ok){addLog(S,'lose','⛔ مسیر بازگشت زمینی پیدا نشد؛ لشکر در موقعیت فعلی باقی ماند');return;}
  const d=path.cost/sp;
  S.marches.push({army,target:null,returning:true,toCamp:camp?camp.id:null,cmd:m?.cmd||null,tx,ty,hx,hy,route:path.points,travelLeft:d,travelTotal:d});}
const sendHome=(army,hx,hy)=>sendBack(army,hx,hy,null);
function takeLosses(army,losses){const sv={};for(const k in army){const n=army[k]-(losses[k]||0);if(n>0)sv[k]=n;}return sv;}
function resolveBoss(m){
  if(bossPhase(S)!=='active'){addLog(S,'info','🗿 غول دیگر در نقشه نیست — لشکر برگشت');sendBack(m.army,m.tx,m.ty,m);return;}
  const fx=cmdFx(S,m.cmd),h=bossHit(S,m.army,fx),losses={};
  for(const k in m.army){const n=Math.min(m.army[k],Math.floor(m.army[k]*h.lossFrac+0.5));if(n>0)losses[k]=n;}
  const hurt=addWounded(S,losses,fx.heal||homeFx(S,'heal'));
  S.boss.dmg+=h.damage;S.boss.hits++;
  const me=bossBoard(S).find(r=>r.me);
  const lostTxt=armyCount(losses)?' — 🩹'+fmt(hurt.wounded)+' مجروح • ☠'+fmt(hurt.dead)+' کشته':'';
  addLog(S,'win','🗿 ضربه به غول: '+fmt(h.damage)+' امتیاز (تقابل ×'+h.mult.toFixed(2)+')'+lostTxt+' — رتبه شما: #'+(me?me.rank:'؟'));
  toast('🗿 <b>'+fmt(h.damage)+'</b> امتیاز به غول زدی • رتبه #'+(me?me.rank:'؟'));
  sendBack(takeLosses(m.army,losses),m.tx,m.ty,m);}
function resolveMarch(m){
  const now=Date.now();
  if(m.deployCamp){const k={id:'c'+now,x:m.tx,y:m.ty,army:m.army,cmd:m.cmd||null,cmdIcon:m.cmd?CMD[m.cmd].icon:'',since:now};
    S.camps.push(k);addLog(S,'info','⛺ کمپ برپا شد — حالا کمین می‌کند و حمله‌ی سریع‌تر دارد');toast('⛺ کمپ برپا شد');return;}
  if(m.target==='boss')return resolveBoss(m);
  const tr=getTarget(m.target);
  if(!tr||(tr.kind&&!siteReady(tr,now))){
    addLog(S,'info','🏳️ هدف دیگر در دسترس نبود — لشکر برگشت');toast('🏳️ هدف دیگر وجود ندارد — لشکر برمی‌گردد');
    sendBack(m.army,m.tx,m.ty,m);return;}
  const site=!!tr.kind,gcount=armyCount(tr.garrison||{}),fx=cmdFx(S,m.cmd);
  const mods=m.surprise?campMods(S,{cmd:m.cmd}):battleMods(fx);
  const r=battle(m.army,{army:tr.garrison||{},power:tr.power},tr.wall||0,15,mods);
  const survivors=takeLosses(m.army,r.attLosses);
  const hurt=addWounded(S,r.attLosses,fx.heal||homeFx(S,'heal')),lostTxt=armyCount(r.attLosses)?' — 🩹'+fmt(hurt.wounded)+' مجروح • ☠'+fmt(hurt.dead)+' کشته':'';
  delete S.intel[tr.id];
  const tag=(m.surprise?' • ⛺ غافلگیری':'')+(m.cmd?' • '+CMD[m.cmd].icon:'');
  if(r.win){
    const lm=1+(fx.loot||0),loot={};for(const k in tr.loot){loot[k]=Math.floor(tr.loot[k]*lm);S.resources[k]=(S.resources[k]||0)+loot[k];}
    S.kills=(S.kills||0)+gcount;bump(S,'won');
    if(site){
      const lucky=(tr.item||Math.random()<(fx.item||0))&&S.season.itemPool>0;
      if(lucky){S.season.itemPool--;S.cmd.emblems++;}
      lootSite(tr,now,Math.random);bump(S,'sites');
      addLog(S,'win','💎 '+tr.name+' غارت شد — '+fmt(loot.gold||0)+'🪙 '+fmt(loot.iron||0)+'⛓️ '+fmt(loot.stone||0)+'🪨'+(lucky?' • 🎖 نشان ارتقای فرمانده پیدا شد!':'')+lostTxt+mulNote(r.atkMul)+tag);
      toast(lucky?'🎖 <b>نشان ارتقای فرمانده</b> از '+tr.name+' پیدا کردی!':'💎 <b>'+tr.name+'</b> غارت شد! +'+fmt(loot.gold||0)+'🪙');
    }else{
      S.tribes=S.tribes.filter(t=>t.id!==tr.id);S.conquered++;
      S.factionKills=S.factionKills||{};S.factionKills[tr.faction]=(S.factionKills[tr.faction]||0)+1;
      queueRespawn(S,tr,now,Math.random);
      addLog(S,'win','🏰 پیروزی! '+tr.name+' (Lv'+tr.level+') فتح شد — ☠'+fmt(gcount)+' دشمن'+lostTxt+' — غنیمت: '+fmt(loot.gold||0)+'🪙 '+fmt(loot.food||0)+'🌾'+mulNote(r.atkMul)+tag);
      toast('🏰 <b>پیروزی!</b> '+tr.name+' فتح شد — غنیمت: +'+fmt(loot.gold||0)+'🪙');}
  }else{
    S.kills=(S.kills||0)+Math.floor(gcount*r.dLoss);
    scaleTribe(tr,Math.max(0.3,1-r.dLoss));
    addLog(S,'lose','❌ شکست از '+tr.name+' — قدرت مؤثر ما '+fmt(r.atk)+' در برابر '+fmt(r.def)+lostTxt+mulNote(r.atkMul)+tag);
    toast('❌ شکست از '+tr.name+' — '+fmt(r.atk)+' در برابر '+fmt(r.def));}
  sendBack(survivors,tr.x,tr.y,m);
}

// حمله NPC به قلعه من
function handleRaid(raid){
  if(shieldActive(S,Date.now())){addLog(S,'win','🛡 جادوی محافظت فعال بود؛ حمله '+raid.name+' خنثی شد و هیچ خسارتی وارد نشد');toast('🛡 محافظت فعال بود؛ حمله دشمن خنثی شد');return;}
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

// ---------- منوی ۴گانه روی قلعه‌های نقشه ----------
window.mapMenu=(id)=>{const t=getTarget(id);if(!t)return;mapMenuTarget=id;const o=origin();mapMenuPath=findPath(R.terr,{x:o.x,y:o.y},{x:t.x,y:t.y});openSheet('mapmenu');};
let mapMenuTarget=null,mapMenuPath=null;
function renderMapMenu(){const B=$('sheetBody'),t=getTarget(mapMenuTarget);
  if(!t){cur='attack';renderSheet();return;}
  const isAlly=allied(S,mapMenuTarget),isPlayer=!!t.playerId;
  const menuEta=mapMenuPath?.ok?Math.ceil(mapMenuPath.cost/legSpeed(selCmd)):'—';
  B.innerHTML='<div class="card hero"><div class="bhead"><span class="fdot" style="background:'+(t.color||'#b08a5a')+'"></span><b>'+t.name+'</b><span class="lvl">Lv'+t.level+'</span></div>'
    +'<div class="q">⚔ پاور '+powTxt(t)+' • 📏'+Math.round(dist(t))+' • ⏱'+menuEta+'ث</div></div>'
    +'<div class="map-actions">'
    +'<button class="map-action" '+(isAlly?'disabled':'')+' onclick="openDetail(\''+t.id+'\')">🚩<br>حمله</button>'
    +'<button class="map-action" onclick="quickSpy(\''+t.id+'\')">🕵️<br>جاسوسی</button>'
    +'<button class="map-action" '+(!isPlayer?'disabled':'')+' onclick="openThreadByTribe(\''+t.id+'\')">✉️<br>پیام</button>'
    +'<button class="map-action" '+(!isPlayer?'disabled':'')+' onclick="inviteClan(\''+t.id+'\')">🏳️<br>دعوت به قبیله</button></div>'
    +'<div class="q" style="justify-content:center;margin-top:10px">'+(isAlly?'این قلعه هم‌قبیله‌ای توست؛ حمله غیرفعال است':!isPlayer?'برای قلعه‌های NPC پیام و دعوت قبیله غیرفعال است':'یک عملیات انتخاب کن')+'</div>';}
window.quickSpy=(id)=>{const t=getTarget(id);if(!t)return;spyN=Math.max(spyN,10);doSpy(id);};
window.openThreadByTribe=(id)=>{const t=getTarget(id);
  if(t&&t.playerId){msgsPeer=t.playerId;msgsTab='thread';markRead(S,t.playerId);openSheet('msgs');}
  else toast('این قلعه NPC است و پیام ندارد');};
window.inviteClan=(id)=>{const t=getTarget(id);const c=myClan(S);
  if(!c)return toast('اول قبیله بساز یا به یکی بپیوند (منوی 🏳️)');
  if(c.owner!=='me')return toast('فقط بنیان‌گذار می‌تواند دعوت کند');
  if(castleCount(S,c)>=CLAN_MAX_CASTLES)return toast('ظرفیت ۱۵ قلعه پر است');
  if(!t.playerId)return toast('قلعه‌های NPC قابل دعوت نیستند — فقط بازیکنان');
  if(joinClan(S,c.id,t.playerId)){toast('🏳 '+t.name+' به قبیله پیوست');renderSheet();}};

// ---------- قبیله ----------
function renderClan(){const B=$('sheetBody');const c=myClan(S);
  let h='<div class="seg">'+[['clanhome','🏳 قبیله من'],['shop','🛒 فروشگاه']].map(([k,l])=>'<button class="'+(cur===k?'on':'')+'" onclick="openSheet(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  if(!c){
    h+='<div class="card hero"><div class="bhead">🏳 <b>ساخت قبیله</b><span class="lvl">'+CLAN_COST+'🪙</span></div>'
      +'<div class="q">• هر قبیله حداکثر ۱۵ قلعه دارد<br>• اعضای قبیله متحدند و حمله به هم ممنوع<br>• چت گروهی مخصوص قبیله داری</div>'
      +'<div class="row"><input id="clanName" class="sinput" style="flex:1" placeholder="نام قبیله…" maxlength="20"><button class="btn" onclick="doCreateClan()">🏳 تأسیس</button></div></div>';
    const open=S.clans.filter(x=>x.members.length<CLAN_MAX_CASTLES&&x.owner!=='me');
    if(open.length)h+='<div class="q"><b>قبیله‌های موجود</b></div>'+open.map(x=>'<div class="res"><div><b>'+x.name+'</b><br><span style="color:var(--dim);font-size:11.5px">'+x.members.length+'/'+CLAN_MAX_CASTLES+' قلعه</span></div><div class="meta"><button class="btn sm" onclick="doJoinClan(\''+x.id+'\')">درخواست عضویت</button></div></div>').join('');
    B.innerHTML=h;return;}
  const members=clanMembers(S,c);
  h+='<div class="card hero"><div class="bhead">🏳 <b>'+c.name+'</b><span class="lvl">'+c.members.length+'/'+CLAN_MAX_CASTLES+' قلعه</span></div>'
    +'<div class="q">👑 بنیان‌گذار: '+(playerById(S,c.owner)?.name||'—')+'</div>'
    +(S.shieldUntilTxt?'':'')
    +'<div class="q">📜 دفترچه قبیله و چت گروهی در منوی ✉️ پیام‌ها</div></div>';
  const pending=(S.clanRequests||[]).filter(r=>r.clanId===c.id&&r.status==='pending');
  if(c.owner==='me'){h+='<div class="card"><b>📨 درخواست‌های عضویت ('+pending.length+')</b>';
    h+=pending.length?pending.map(r=>{const p=playerById(S,r.playerId);return '<div class="res"><div><b>'+(p?.name||r.playerId)+'</b><br><span class="q">درخواست عضویت</span></div><div class="meta"><button class="btn sm" onclick="approveClanJoin(\''+r.id+'\')">تأیید</button> <button class="btn sm ghost" onclick="rejectClanJoin(\''+r.id+'\')">رد</button></div></div>';}).join(''):'<div class="q">درخواستی در انتظار نیست</div>';
    h+='</div>';}
  h+='<div class="q"><b>اعضا (همه با هم متحدند)</b></div>';
  h+=members.map(p=>'<div class="res"><span class="fdot" style="background:'+p.color+'"></span><div><b>'+p.name+'</b>'+(p.id===c.owner?' 👑':'')+'<br><span style="color:var(--dim);font-size:11.5px">⚔'+fmt(p.power||0)+'</span></div>'
    +(c.owner==='me'&&p.id!=='me'?'<div class="meta"><button class="btn sm ghost" onclick="doKickClan(\''+p.id+'\')">اخراج</button></div>':'')+'</div>').join('');
  h+='<button class="btn wide ghost" onclick="doLeaveClan()">🚪 خروج از قبیله</button>';
  B.innerHTML=h;}
window.doCreateClan=()=>{const n=$('clanName')?.value.trim();if(!n)return toast('نام قبیله را بنویس');
  if(createClan(S,n)){updTop();renderSheet();toast('🏳 قبیله «'+n+'» تاسیس شد!');}};
window.doJoinClan=id=>{const r=requestClan(S,id,'me');if(!r.ok)return toast(r.msg);renderSheet();toast('درخواست عضویت برای مدیر قبیله ارسال شد');};
window.approveClanJoin=id=>{const r=approveClanRequest(S,id,'me');if(!r.ok)return toast(r.msg);updTop();renderSheet();toast('درخواست عضویت تأیید شد');};
window.rejectClanJoin=id=>{const r=rejectClanRequest(S,id,'me');if(!r.ok)return toast(r.msg);renderSheet();toast('درخواست رد شد');};
window.doLeaveClan=()=>{if(confirm('قبیله را ترک می‌کنی؟')){leaveClan(S,'me');renderSheet();}};
window.doKickClan=id=>{kickClan(S,id);renderSheet();};

// ---------- فروشگاه ----------
function renderShop(){const B=$('sheetBody');
  let h='<div class="seg">'+[['clan','🏳 قبیله من'],['shop','🛒 فروشگاه']].map(([k,l])=>'<button class="'+(cur==='shop'?'on':'')+'" onclick="openSheet(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  const sh=shieldActive(S);
  h+='<div class="card hero"><div class="bhead">🛡 <b>جادوی محافظت</b><span class="lvl">'+(sh?('فعال — '+Math.ceil(shieldLeft(S)/3600000)+'س دیگر'):'غیرفعال')+'</span></div>'
    +'<div class="bar"><i style="width:'+Math.min(100,shieldLeft(S)/(24*3600000)*100)+'%"></i></div>'
    +'<div class="q">تا پایان جادو، هیچ‌کس نمی‌تواند به قلعه‌ات حمله کند</div></div>';
  h+='<div class="statgrid">'+Object.entries(SHOP).map(([k,it])=>
    '<div class="stat" style="cursor:pointer" onclick="doBuy(\''+k+'\')"><div style="font-size:26px">'+it.icon+'</div>'+it.name+'<br><b style="color:var(--gold)">'+it.cost+'🪙</b></div>').join('')+'</div>'
    +'<div class="q" style="justify-content:center;margin-top:8px">روی هر کالا بزن تا با سکه خریده شود • موجودی: '+fmt(S.resources.gold)+'🪙</div>';
  B.innerHTML=h;}
window.doBuy=k=>{const r=buyItem(S,k);if(!r.ok)return toast(r.msg);
  updTop();renderSheet();toast('🛒 خرید با موفقیت انجام شد');};

// ---------- چت گروهی قبیله ----------
function renderClanChat(){const B=$('sheetBody');const c=myClan(S);
  let h='<div class="seg">'+[['inbox','💬 چت‌ها'],['clan','🏳 قبیله'],['sys','📢 سیستم']].map(([k,l])=>'<button class="'+(msgsTab==='clan'?'on':'')+'" onclick="setMsgsTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  if(!c){h+='<div class="card">در قبیله‌ای نیستی — از منوی 🏳️ بساز یا بپیوند.</div>';B.innerHTML=h;return;}
  const L=clanChatOf(S,c.id);
  h+='<div class="chatwrap"><div class="chatlog">'
    +(L.length?L.map(m=>'<div class="msg'+(m.me?' me':'')+'">'+(m.me?'':'<div class="who">'+m.from+'</div>')+m.text+'<div class="who time">'+new Date(m.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+'</div></div>').join('')
      :'<div class="card">چت گروهی قبیله «'+c.name+'» — اولین پیام را بفرست!</div>')
    +'</div><div class="chatbar"><input id="clanChatIn" maxlength="200" placeholder="پیام به قبیله…"><button class="btn" onclick="sendClanChat()">ارسال</button></div></div>';
  B.innerHTML=h;S.unreadClan=0;
  const cl=B.querySelector('.chatlog');if(cl)cl.scrollTop=cl.scrollHeight;
  const ci=$('clanChatIn');if(ci){ci.onkeydown=e=>{if(e.key==='Enter')window.sendClanChat();};ci.focus();}}
window.sendClanChat=()=>{const c=myClan(S);if(!c)return;
  const ci=$('clanChatIn');const txt=(ci&&ci.value||'').trim();if(!txt)return;
  pushClanMsg(S,c.id,'شما','#ffd166',txt.replace(/</g,'&lt;'),true);
  // پاسخ دمویی اعضا
  const mem=clanMembers(S,c).filter(p=>!p.me);
  if(mem.length)setTimeout(()=>{const p=mem[Math.floor(Math.random()*mem.length)];
    pushClanMsg(S,c.id,p.name,p.color,['به به 🏳','کمک می‌کنم ⚔','جای شما خالی 🛡','من هم هستم!'][Math.floor(Math.random()*4)]);save(S);
    if(window.__refreshMsgs)window.__refreshMsgs();},1200+Math.random()*1800);
  save(S);renderSheet();};

// ================= UI =================
let msgsTab='inbox',msgsPeer=null,cur='build',atkSort='near',searchQ='',boardTab='power',trainBar='bar-1',trainCls='all',trainQty=100,qTab='daily',selCmd=null,detailCamp=null,spyN=10,campDraft=null;
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
  +'<div class="meta">Lv'+t.level+' • '+powTxt(t)+'<br>📏'+Math.round(dist(t))+' • ⏱'+eta(t)+'ث</div></div>';}

const costChips=c=>Object.entries(c).map(([k,v])=>'<span class="'+((S.resources[k]||0)>=v?'ok':'no')+'">'+ICO[k]+' '+fmt(v)+'</span>').join(' ');
function sheetSeg(){const wc=woundedCount(S);
  return '<div class="seg"><button class="'+(cur==='train'?'on':'')+'" onclick="openSheet(\'train\')">⚔️ سربازخانه</button><button class="'+(cur==='hospital'?'on':'')+'" onclick="openSheet(\'hospital\')">🏥 بیمارستان'+(wc?' • 🩹'+fmt(wc):'')+'</button></div>';}
function maxAfford(tid){const T=TROOPS[tid];let m=Infinity;for(const k in T.cost)m=Math.min(m,Math.floor((S.resources[k]||0)/T.cost[k]));return Math.max(0,m);}
function troopCard(tid,lvl){
  const T=TROOPS[tid],cls=TROOP_CLASS[tid],locked=T.unlock>lvl;
  const beats=Object.keys(COUNTER[cls]||{}).filter(d=>COUNTER[cls][d]>=1.3).map(d=>CLASS_INFO[d].icon).join(' ');
  const weak=Object.keys(COUNTER[cls]||{}).filter(d=>COUNTER[cls][d]<=0.8).map(d=>CLASS_INFO[d].icon).join(' ');
  const qty=trainQty,cost={};for(const k in T.cost)cost[k]=T.cost[k]*qty;
  const t=Math.ceil(T.time*Math.pow(qty,0.7)/(1+lvl*0.22)),mx=maxAfford(tid),ok=canPay(cost);
  return '<div class="tcard'+(locked?' lock':'')+'"><div class="trow"><b>'+T.icon+' '+T.name+' <span class="chip">'+CLASS_INFO[cls].icon+' '+CLASS_INFO[cls].name+'</span></b><span class="tpow">👥 '+fmt(S.troops[tid]||0)+'</span></div>'
   +(locked?'<div class="q">🔒 نیاز به سربازخانه Lv'+T.unlock+'</div>'
   :'<div class="q">⚔ قدرت '+T.power+' • ⏱ '+(t>=60?Math.floor(t/60)+'د ':'')+(t%60)+'ث برای '+fmt(qty)+'</div>'
   +(cls==='spy'?'<div class="q">🕵️ غیرجنگی — برای جاسوسی از قلعه‌ها و گنج‌ها. جاسوس بیشتر یا قوی‌تر از جاسوس‌های دشمن = جاسوسی موفق</div>':'')
   +'<div class="q">'+(beats?'✅ قوی در برابر: '+beats:'')+(weak?' &nbsp; ⚠️ ضعیف در برابر: '+weak:'')+'</div>'
   +'<div class="q">'+costChips(cost)+'</div>'
   +'<div class="row"><button class="btn sm" '+(ok?'':'disabled')+' onclick="train(\''+trainBar+'\',\''+tid+'\','+qty+')">⚔ ساخت '+fmt(qty)+'</button>'
   +'<button class="btn sm ghost" '+(mx<1?'disabled':'')+' onclick="trainMax(\''+trainBar+'\',\''+tid+'\')">MAX ('+fmt(mx)+')</button>'
   +'<button class="btn sm gold" '+(ok?'':'disabled')+' onclick="instantTrain(\''+trainBar+'\',\''+tid+'\','+qty+')">⚡ '+speedCost(T.time*Math.pow(qty,0.7)/(1+lvl*0.22))+'🪙</button></div>')+'</div>';}
window.pickCmd=id=>{const c=CMD[id];if(!confirm('«'+c.name+'» را با ۱ توکن باز کنی؟ بازگشت ندارد.'))return;
  if(unlockCmd(S,id)){addLog(S,'info','🎖 فرمانده '+c.name+' باز شد');save(S);updTop();renderSheet();toast('🎖 '+c.icon+' '+c.name+' به لشکرت پیوست');}else toast('توکن یا جای خالی نداری');};
window.upCmd=id=>{if(upgradeCmd(S,id)){save(S);updTop();renderSheet();toast('⬆ '+CMD[id].name+' به Lv'+S.cmd.levels[id]+' رسید');}else toast('نشان ارتقا کافی نیست');};
window.setTrainBar=id=>{trainBar=id;renderSheet();};
window.setTrainCls=k=>{trainCls=k;renderSheet();};
window.setTrainQty=n=>{trainQty=Math.max(1,Math.min(100000,parseInt(n)||1));renderSheet();};
window.trainMax=(barId,tid)=>{const n=maxAfford(tid);if(n<1)return toast('منابع کافی نیست');train(barId,tid,n);};
window.setQTab=k=>{qTab=k;renderSheet();};
window.claimQ=(list,i)=>{const rw=claimQuest(S,list,i);if(!rw)return;save(S);updTop();renderSheet();toast('🎁 جایزه دریافت شد: +'+fmt(rw.gold)+'🪙');};
window.claimA=id=>{const rw=claimAch(S,id);if(!rw)return;save(S);updTop();renderSheet();toast('🏅 دستاورد! +'+fmt(rw.gold)+'🪙');};
window.openSheet=k=>openSheet(k);
const ER_SEG=()=>'<div class="seg">'+[['empire','👑 امپراتوری'],['board','🏆 لیدربرد'],['boss','🗿 غول و فصل'],['msgs','✉️ پیام‌ها']].map(([k,l])=>'<button class="'+(cur===k?'on':'')+'" onclick="openSheet(\''+k+'\')">'+l+'</button>').join('')+'</div>';
function renderSheet(){const els=[$('sheetBody'),$('sheetCard')],st=els.map(e=>e?e.scrollTop:0);
  _renderSheet();if(!$('sheet').hidden&&['empire','msgs','board','boss'].includes(cur))$('sheetBody').insertAdjacentHTML('afterbegin',ER_SEG());
  els.forEach((e,i)=>{if(e)e.scrollTop=st[i];});}
function _renderSheet(){const B=$('sheetBody');if(!B||$('sheet').hidden)return;
if(cur==='mapmenu'){renderMapMenu();return;}
if(cur==='clan'){renderClan();return;}
if(cur==='shop'){renderShop();return;}
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
  h+='<div class="card"><div class="q">⚡ انرژی امروز: <b>'+S.energy.v+'/'+ENERGY.max+'</b> (هر حرکت لشکر '+ENERGY.move+'، جاسوسی '+ENERGY.spy+') • فردا دوباره ۱۰۰</div><div class="bar"><i style="width:'+S.energy.v+'%"></i></div></div>';
  if(bossPhase(S)==='active')h+='<div class="card danger" onclick="openSheet(\'boss\')"><b>🗿 غول آخر فصل ظاهر شده!</b><div class="q">نامیرا — ضربه بزن و امتیاز بگیر ›</div></div>';
  const campNow=detailCamp&&S.camps.find(k=>k.id===detailCamp);
  if(campNow)h+='<div class="card hero"><b>⛺ حمله‌ی غافلگیرانه از کمپ '+campNow.cmdIcon+'</b><div class="q">👥 '+fmt(armyCount(campNow.army))+' • سریع‌تر، +۲۰٪ قدرت، نادیده‌گرفتن بخشی از دیوار <button class="btn sm ghost" onclick="homeMode()">حالت عادی</button></div></div>';
  h+='<div class="card"><div class="bhead">⛺ <b>کمپ‌ها</b><span class="lvl">'+S.camps.length+'/'+maxCamps(S)+'</span><button class="btn sm" onclick="startCamp()">+ برپایی کمپ</button></div>'
    +(S.camps.length?S.camps.map(k=>'<div class="q">'+(k.cmdIcon||'')+' '+(k.cmd?CMD[k.cmd].name:'')+' • 👥'+fmt(armyCount(k.army))+' <button class="btn sm" onclick="useCamp(\''+k.id+'\')">⚔ حمله از کمپ</button> <button class="btn sm ghost" onclick="recallCamp(\''+k.id+'\')">↩ فراخوان</button></div>').join('')
      :'<div class="q">با لشکر و فرمانده در یک نقطه‌ی خالی کمپ بزن: لشکرهای دشمن که از کنارش رد شوند کمین می‌شوند و حمله از کمپ سریع‌تر و غافلگیرانه است.</div>')+'</div>';
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
       +'<div class="meta">Lv'+t.level+' • '+powTxt(t)+'<br>📏'+Math.round(dist(t))+' • ⏱'+eta(t)+'ث</div></div>';}).join('');
  }else{
    const list=sortedTribes();
    h+=list.slice(0,25).map(t=>tribeRow(t,'openDetail(\''+t.id+'\')')).join('');
    if(list.length>25)h+='<div class="q" style="justify-content:center">… و '+(list.length-25)+' قلعه دیگر — از 🔍 جستجو یا مرتب‌سازی استفاده کنید</div>';}
  B.innerHTML=h;}
if(cur==='detail'||cur==='campSetup'){
  const isSetup=cur==='campSetup',isBoss=!isSetup&&detailId==='boss',t=isSetup?null:(isBoss?BOSS_T:getTarget(detailId));
  if(!isSetup&&!t){cur='attack';renderSheet();return;}
  if(isSetup&&!campDraft){cur='attack';renderSheet();return;}
  const free=freeCmds(S);if(selCmd&&!free.includes(selCmd))selCmd=null;
  const site=!!(t&&t.kind),now=Date.now(),camp=!isSetup&&detailCamp?S.camps.find(k=>k.id===detailCamp):null;
  const it=(!isBoss&&!isSetup)?intelOf(t):null,spyB=homeFx(S,'spy');
  let h=isSetup?'<button class="btn sm ghost" onclick="openSheet(\'attack\')">→ لغو</button>':'<button class="btn sm ghost" onclick="backToAttack()">→ بازگشت به فهرست</button>';
  if(isSetup){
    const d=Math.hypot(campDraft.x-S.homePos.x,campDraft.y-S.homePos.y);
    h+='<div class="card hero"><div class="bhead">⛺ <b>برپایی کمپ</b><span class="lvl">'+S.camps.length+'/'+maxCamps(S)+'</span></div>'
      +'<div class="q">📏 '+Math.round(d)+' • ⏱ '+Math.ceil(d/legSpeed(selCmd))+'ث • ⚡'+energyCost(S,selCmd)+' انرژی</div>'
      +'<div class="q">لشکر و فرمانده‌ای که انتخاب می‌کنی همان‌جا می‌مانند: لشکرهای دشمن که از کنارشان رد شوند کمین می‌شوند و از کمپ حمله‌ی سریع‌تر و غافلگیرانه داری. در عوض قلعه‌ات بدون آن‌ها می‌ماند!</div></div>';
  }else if(isBoss){
    const w=weaknessAt(S,now);
    h+='<div class="card hero"><div class="bhead">🗿 <b>غول آخر فصل</b><span class="lvl">نامیرا</span></div>'
      +'<div class="q">🎯 نقطه‌ضعف الان: <b>'+CLS_NAME[w.weak]+'</b> (×1.6) • مقاوم: '+CLS_NAME[w.resist]+' (×0.7) • تغییر تا '+fmtDur(w.nextIn)+'</div>'
      +'<div class="q">💥 امتیاز شما تا الان: <b>'+fmt(S.boss?.dmg||0)+'</b> در '+(S.boss?.hits||0)+' ضربه • غول تلفات سنگین می‌گیرد 🩹</div></div>';
  }else{
    const def=t.power+(t.wall||0)*15;
    h+='<div class="card hero"><div class="bhead">'+(site?'<span style="font-size:20px">'+SITE_KINDS[t.kind].icon+'</span>':'<span class="fdot" style="background:'+(t.color||'#e5484d')+'"></span>')+'<b>'+t.name+'</b><span class="lvl">Lv'+t.level+'</span></div>'
      +'<div class="q">'+(site?SITE_KINDS[t.kind].note:(t.factionName||''))+' • ⚔ پاور دفاع: '+(it?fmt(def)+(t.wall?' (🧱 دیوار Lv'+t.wall+')':''):'<b>≈'+fmt(estPower(t))+'</b> (تخمینی)')+'</div>'
      +'<div class="q">📏 فاصله: '+Math.round(dist(t))+' • ⏱ رسیدن: '+eta(t)+' ثانیه</div>'
      +'<div class="q">💰 غنیمت: '+(it?costStr(t.loot):'❓ ناشناخته')+'</div>'
      +'<div class="q">🛡 گارد: '+(it?Object.entries(t.garrison||{}).map(([k,v])=>TROOPS[k].icon+fmt(v)).join(' ')+' • 🕵️ '+fmt(it.spies)+' جاسوس':'❓ ناشناخته — جاسوسی کن')+'</div>';
    if(it){const best=bestCounters(t.garrison||{});
      if(best.length)h+='<div class="q">💡 پیشنهاد تقابل: '+best.map(b=>b.icon+' '+b.name+' ×'+b.mult.toFixed(2)).join(' و ')+'</div>';
      if(site&&it.aura!==null)h+='<div class="q">🔮 هاله‌ی آیتم: '+(it.aura?'<b style="color:var(--gold)">احتمالاً نشان ارتقا دارد ✨</b>':'احتمالاً ندارد')+' (دقت '+(spyB>=0.9?'۱۰۰':'۶۰')+'٪)</div>';
      h+='<div class="q" style="color:var(--dim)">🕵️ اطلاعات '+Math.floor((now-S.intel[t.id].t)/60000)+' دقیقه پیش — پس از ۱۰ دقیقه منقضی می‌شود</div>';}
    h+='</div>';
    h+='<div class="card"><div class="bhead">🕵️ <b>جاسوسی</b><span class="lvl">'+fmt(S.troops.spy||0)+' جاسوس</span></div>'
      +'<div class="q">اگر جاسوس‌های دشمن بیشتر یا قوی‌تر باشند، جاسوسی لو می‌رود و جاسوس‌هایت کشته می‌شوند. هزینه: ⚡'+ENERGY.spy+'</div>'
      +'<div class="row"><input class="qin" type="number" min="1" value="'+Math.min(spyN,Math.max(1,S.troops.spy||1))+'" onchange="setSpyN(this.value)"><button class="btn sm" onclick="doSpy(\''+t.id+'\')">🕵️ جاسوسی</button></div></div>';
  }
  if(site&&!siteReady(t,now)){h+='<div class="card">💤 در حال بازسازی — '+Math.ceil((t.cd-now)/1000)+' ثانیه دیگر با نگهبانان قوی‌تر برمی‌گردد.</div>';B.innerHTML=h;return;}
  if(camp){
    h+='<div class="card"><div class="bhead">⛺ <b>لشکر کمپ</b> '+camp.cmdIcon+' '+(camp.cmd?CMD[camp.cmd].name:'')+'</div><div class="q">👥 '+fmt(armyCount(camp.army))+' • ⚔'+fmt(armyPower(camp.army))+' • ⚡'+energyCost(S,camp.cmd)+'</div>'
      +'<div class="q">حمله‌ی غافلگیرانه: سریع‌تر، +۲۰٪ قدرت و بخشی از دیوار نادیده گرفته می‌شود.</div>'
      +'<button class="btn wide" onclick="launch(\''+t.id+'\')">🚀 حمله‌ی غافلگیرانه به '+t.name+'</button></div>';
    B.innerHTML=h;return;}
  // فرمانده ارشد
  h+='<div class="card"><div class="bhead">🎖 <b>فرمانده ارشد</b></div>'
    +(free.length?'<div class="seg">'+free.map(id=>'<button class="'+(selCmd===id?'on':'')+'" onclick="setSelCmd(\''+id+'\')">'+CMD[id].icon+' '+CMD[id].name+' Lv'+S.cmd.levels[id]+'</button>').join('')+'</div>'
      :'<div class="q">'+(S.cmd.unlocked.length?'همه‌ی فرمانده‌ها مشغول‌اند':'هنوز فرمانده‌ای باز نکرده‌ای — از دکمه‌ی 🎖 پایین انتخاب کن')+'</div>')
    +(selCmd?'<div class="q">'+fxChips(CMD[selCmd].fx,S.cmd.levels[selCmd]).join(' • ')+'</div>':'')+'</div>';
  const owned=Object.keys(TROOPS).filter(tid=>tid!=='spy'&&(S.troops[tid]||0)>0);
  if(!owned.length)h+='<div class="card">سربازی نداری! از منوی ⚔️ سرباز، نیرو بساز.</div>';
  else{
    h+='<div class="row"><button class="btn sm" onclick="selAll()">✚ انتخاب همه (تا ظرفیت '+fmt(armyCap(S,expeditionCap(S),selCmd))+')</button><button class="btn sm ghost" onclick="selClear()">✕ پاک کردن</button></div>';
    h+=owned.map(tid=>{const T=TROOPS[tid],known=it&&!isBoss&&!isSetup,m=known?troopMultVs(tid,t.garrison||{}):1,col=m>1.15?'var(--green)':m<0.88?'var(--red)':'var(--dim)';
      return '<div class="armyrow"><span>'+T.icon+'</span><b>'+T.name+'</b><span class="cnt">'+CLASS_INFO[TROOP_CLASS[tid]].icon+' موجود: '+fmt(S.troops[tid])+' • ⚔'+T.power+(known?' • <b style="color:'+col+'">🎯×'+m.toFixed(2)+'</b>':'')+'</span>'
      +'<input type="number" min="0" max="'+S.troops[tid]+'" value="'+(selTroops[tid]||0)+'" onchange="setSel(\''+tid+'\',this.value)">'
      +'<button class="btn sm ghost" onclick="selMax(\''+tid+'\')">MAX</button></div>';}).join('');
    h+='<div class="card"><div id="selTotals"></div>'
      +(isSetup?'<button class="btn wide" onclick="deployCamp()">⛺ برپایی کمپ</button>':'<button class="btn wide" onclick="launch(\''+t.id+'\')">'+(isBoss?'🗿 حمله به غول':'🚩 اعزام لشکر به '+t.name)+'</button>')+'</div>';}
  B.innerHTML=h;updateDetailTotals();return;}
if(cur==='cmd'){
  const c=ensureCmd(S),lv=S.buildings.find(b=>b.type==='keep')?.level||1,busy=busyCmds(S),nextTok=TOKEN_LEVELS.find(L=>!c.granted.includes(L));
  let h='<div class="card hero"><div class="bhead">🎖 <b>فرماندهان ارشد</b><span class="lvl">'+c.unlocked.length+'/'+MAX_UNLOCK+'</span></div>'
    +'<div class="q">🎫 توکن آزاد: <b>'+c.tokens+'</b> • 🏅 نشان ارتقا: <b>'+c.emblems+'</b></div>'
    +'<div class="q">'+(nextTok?'🎫 توکن بعدی: وقتی قلعه به <b>Lv'+nextTok+'</b> برسد (الان Lv'+lv+')':'همه‌ی ۴ توکن گرفته شد')+'</div>'
    +'<div class="q">🎖 نشان ارتقا کمیاب و محدود است: از 🕳️ غارها و 💎 گنج‌های پنهان نقشه با شانس کم پیدا می‌شود (نشان‌های باقی‌مانده‌ی این فصل: '+(S.season?S.season.itemPool:0)+'). با 🕵️ جاسوس می‌توانی هاله‌ی آیتم را ببینی.</div></div>';
  const card=(cm,own)=>{const lvl=c.levels[cm.id]||1,st=busy.has(cm.id),cost=cmdUpCost(lvl);
    return '<div class="cmdcard" style="--c:'+cm.color+'"><div class="cport">'+cm.icon+'</div><div class="cbody"><div class="trow"><b>'+cm.name+' <span class="chip">'+cm.title+'</span></b>'+(own?'<span class="tpow">Lv'+lvl+'/'+MAX_CMD_LEVEL+(st?' • ⚔ در مأموریت':'')+'</span>':'')+'</div>'
      +'<div class="q" style="font-style:italic;color:var(--gold)">«'+cm.lure+'»</div>'
      +'<div class="q">'+fxChips(cm.fx,lvl).map(x=>'<span class="chip">'+x+'</span>').join(' ')+'</div>'
      +(own?(lvl>=MAX_CMD_LEVEL?'<div class="q">🏆 حداکثر سطح</div>':'<button class="btn sm" '+(c.emblems>=cost?'':'disabled')+' onclick="upCmd(\''+cm.id+'\')">⬆ ارتقا به Lv'+(lvl+1)+' — 🏅'+cost+' نشان</button>')
        :'<button class="btn sm gold" '+(c.tokens>0&&c.unlocked.length<MAX_UNLOCK?'':'disabled')+' onclick="pickCmd(\''+cm.id+'\')">🎫 انتخاب با ۱ توکن</button>')+'</div></div>';};
  if(c.unlocked.length)h+='<div class="q"><b>فرماندهان تو</b></div>'+c.unlocked.map(id=>card(CMD[id],true)).join('');
  h+='<div class="q"><b>'+(c.tokens>0?'یکی را انتخاب کن — بازگشت ندارد':'فرماندهان قابل انتخاب')+'</b></div>'+COMMANDERS.filter(x=>!c.unlocked.includes(x.id)).map(x=>card(x,false)).join('');
  B.innerHTML=h;}
if(cur==='boss'){
  const s=S.season,now=Date.now(),ph=bossPhase(S,now);
  const done=Math.min(100,Math.floor((now-s.start)/(s.end-s.start)*100));
  let h='<div class="card hero"><div class="bhead">🏁 <b>فصل '+s.id+'</b><span class="lvl">'+done+'٪</span></div><div class="bar"><i style="width:'+done+'%"></i></div>'
    +'<div class="q">⏳ پایان فصل: '+fmtDur(s.end-now)+'</div></div>';
  if(ph==='before'){
    h+='<div class="card"><b>🗿 غول آخر فصل</b><div class="q">در <b>'+fmtDur(s.bossStart-now)+'</b> دیگر در مرکز نقشه ظاهر می‌شود و ۴۸ ساعت می‌ماند.</div>'
      +'<div class="q">• نامیرا است؛ هر ضربه به اندازه‌ی حجمش امتیاز می‌دهد و بالاترین امتیازها برنده‌اند<br>• هر ۶ ساعت نقطه‌ضعف عوض می‌شود (×1.6) و یک کلاس هم مقاوم می‌شود (×0.7)<br>• هر ضربه تلفات و مجروح سنگین دارد 🩹<br>• هر ضربه ⚡ انرژی می‌خواهد (روزی ۱۰۰ واحد)<br>• فرماندهان، نشان‌ها و ارتش بزرگ‌تر امتیاز را بالا می‌برند — از الان آماده شو</div></div>';
  }else{
    const w=weaknessAt(S,now),rows=bossBoard(S,now),me=rows.find(r=>r.me),total=rows.reduce((a,r)=>a+r.dmg,0);
    h+='<div class="card danger"><div class="bhead">🗿 <b>غول در مرکز نقشه است!</b><span class="lvl">نامیرا</span></div>'
      +'<div class="q">🎯 نقطه‌ضعف الان: <b>'+CLS_NAME[w.weak]+'</b> (×1.6) • مقاوم: '+CLS_NAME[w.resist]+' (×0.7)</div><div class="q">🔄 تغییر نقطه‌ضعف تا '+fmtDur(w.nextIn)+'</div>'
      +'<div class="q">💥 امتیاز شما: <b>'+fmt(S.boss.dmg)+'</b> • '+S.boss.hits+' ضربه • '+(me?'رتبه <b>#'+me.rank+'</b> از '+rows.length:'هنوز ضربه‌ای نزده‌ای')+'</div>'
      +'<div class="q">🌍 مجموع ضربه‌ی جهان: '+fmt(total)+' • ⚡ انرژی: '+S.energy.v+'</div>'
      +'<button class="btn wide" onclick="openDetail(\'boss\')">🗿 اعزام لشکر به غول</button></div>';
    h+='<div class="q"><b>🏆 برترین‌ها</b></div>'+rows.slice(0,10).map(r=>'<div class="res'+(r.me?' me':'')+'"><span class="rank">'+(['🥇','🥈','🥉'][r.rank-1]||'#'+r.rank)+'</span><span class="fdot" style="background:'+r.color+'"></span><div><b>'+r.name+'</b></div><div class="meta"><b style="color:var(--gold)">💥'+fmt(r.dmg)+'</b></div></div>').join('')
      +(me&&me.rank>10?'<div class="q" style="justify-content:center">⋯</div><div class="res me"><span class="rank">#'+me.rank+'</span><span class="fdot" style="background:#ffd166"></span><div><b>⭐ شما</b></div><div class="meta"><b style="color:var(--gold)">💥'+fmt(me.dmg)+'</b></div></div>':'');
    h+='<div class="card"><div class="q"><b>🎁 جایزه‌ها</b> (پایان فصل): 🥇 ۳۰۰۰🪙+۴🎖 • ۱۰ نفر برتر ۱۵۰۰🪙+۲🎖 • ۱۰٪ برتر ۸۰۰🪙+۱🎖 • ۵۰٪ برتر ۳۰۰🪙 • شرکت‌کننده ۱۰۰🪙</div></div>';}
  if(S.pastSeasons&&S.pastSeasons.length)h+='<div class="q"><b>📚 فصل‌های قبل</b></div>'+S.pastSeasons.map(p=>'<div class="q">فصل '+p.season+': '+(p.rank?'رتبه #'+p.rank+' از '+p.total+' • 💥'+fmt(p.dmg):'شرکت نکردی')+' • '+p.label+'</div>').join('');
  B.innerHTML=h;}
if(cur==='search'){
  let h='<input id="searchIn" class="sinput" placeholder="🔍 نام قلعه یا قبیله… (مثلاً: اژدها)" value="'+searchQ+'" oninput="doSearch(this.value)">';
  let list=S.tribes;
  if(searchQ.trim()){const q=searchQ.trim();
    list=list.filter(t=>t.name.includes(q)||(t.factionName||'').includes(q));}
  list=[...list].sort((a,b)=>dist(a)-dist(b));
  h+='<div class="q">'+(searchQ?list.length+' نتیجه':'همه '+list.length+' قلعه — برای محدود کردن بنویسید')+'</div>';
  h+=list.slice(0,30).map(t=>tribeRow(t,'jumpTo(\''+t.id+'\')')).join('');
  if(list.length>30)h+='<div class="q" style="justify-content:center">… و '+(list.length-30)+' نتیجه دیگر — جستجو را دقیق‌تر کنید</div>';
  B.innerHTML=h;
  const inp=$('searchIn');if(inp&&searchQ){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}}
if(cur==='board'){
  const tabs='<div class="seg">'+[['power','👑 قدرت'],['kills','☠️ کشتار']].map(([k,l])=>'<button class="'+(boardTab===k?'on':'')+'" onclick="setBoardTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
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
if(cur==='msgs'){
  if(!S.msgRead)S.msgRead={rep:0,sys:0};
  const tabs='<div class="seg">'+[['inbox','💬 چت‌ها'],['clan','🏳 قبیله'],['sys','📢 سیستم']].map(([k,l])=>'<button class="'+(msgsTab===k?'on':'')+'" onclick="setMsgsTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  if(msgsTab==='thread'&&msgsPeer){renderThread(msgsPeer);return;}
  if(msgsTab==='clan'){renderClanChat();return;}
  S.msgRead[msgsTab==='sys'?'sys':'rep']=Date.now();
  let h=tabs;
  if(msgsTab==='sys'){
    const L=[...(S.sysMsgs||[])].sort((a,b)=>b.t-a.t);
    h+=L.length?L.map(m=>'<div class="msg sys">'+m.text+'<br><span style="font-size:10.5px;color:var(--dim)">'+new Date(m.t).toLocaleString('fa-IR',{hour:'2-digit',minute:'2-digit'})+'</span></div>').join('')
      :'<div class="card">پیام سیستمی نداری.</div>';}
  else{ // inbox: لیست بازیکنان
    const L=others(S).map(p=>({p,u:unreadFor(S,p.id),last:(S.chats[p.id]||[]).at(-1)}))
      .sort((a,b)=>(b.last?.t||0)-(a.last?.t||0));
    h+=L.length?L.map(({p,u,last})=>{
      const blocked=p.blocked,cb=p.chatBanned;
      return '<div class="res" onclick="openThread(\''+p.id+'\')">'
        +'<span class="fdot" style="background:'+p.color+'"></span>'
        +'<div><b>'+p.name+'</b>'+(blocked?' <span class="chip">⛔ بن</span>':'')+(cb?' <span class="chip">🔇 چت</span>':'')+'<br>'
        +'<span style="color:var(--dim);font-size:11.5px">'+(last?(last.me?'تو: ':'')+last.text:'شروع گفتگو…')+'</span></div>'
        +'<div class="meta">'+(p.online?'🟢':'')+' فصل'+(p.season||'—')+(u?'<br><span class="pmbadge">'+u+'</span>':'')+'</div></div>';}).join('')
      :'<div class="card">هنوز بازیکن دیگری نیست.</div>';}
  B.innerHTML=h;return;}
if(cur==='empire'){
  const total=S.tribes.length+S.conquered;
  const perFaction='';
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
window.goHome=()=>{$('sheet').hidden=true;setViewUI('world');R.setView('world');R.centerOn(S.homePos.x,S.homePos.y);};
window.setAtkSort=(k)=>{atkSort=k;renderSheet();};
window.setAtkSort2=(k)=>{atkSort=k;renderSheet();};
window.doSearch=(q)=>{searchQ=q;renderSheet();};
window.setMsgsTab=k=>{msgsTab=k;renderSheet();};
window.openThread=id=>{msgsPeer=id;msgsTab='thread';markRead(S,id);renderSheet();};
window.__refreshMsgs=()=>{if(cur==='msgs'&&!$('sheet').hidden)renderSheet();};
window.sendChat=()=>{const inp=$('chatIn');const txt=(inp&&inp.value||'').trim();if(!txt)return;
  const p=playerById(S,msgsPeer);if(!p)return;
  if(p.blocked)return toast('⛔ این بازیکن بن است');
  if(S.adminState&&S.adminState.chatBanSelf)return toast('🔇 چت تو مسدود است');
  pushMsg(S,msgsPeer,'شما','#ffd166',txt.replace(/</g,'&lt;'),true);save(S);renderSheet();
  ambientReply(S,msgsPeer);};
window.closeThread=()=>{msgsPeer=null;msgsTab='inbox';renderSheet();};
// ---------- پنل مدیریت ----------
function adminGuard(){const key=localStorage.getItem(ADMIN_KEY);if(key==='ok')return true;
  const v=prompt('رمز پنل مدیریت:');if(v==='admin123'){localStorage.setItem(ADMIN_KEY,'ok');return true;}
  toast('رمز نادرست است');return false;}
function renderThread(pid){
  const B=$('sheetBody'),p=playerById(S,pid);
  if(!p){closeThread();return;}
  const L=threadOf(S,pid);
  let h='<div class="seg">'+[['inbox','💬 چت‌ها'],['clan','🏳 قبیله'],['sys','📢 سیستم']].map(([k,l])=>'<button class="'+(k==='thread'?'on':'')+'" onclick="setMsgsTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  h+='<div class="card" style="padding:8px 12px"><div class="trow"><span class="fdot" style="background:'+p.color+'"></span><b>'+p.name+'</b>'
    +(p.blocked?' <span class="chip">⛔ بن</span>':'')+(p.chatBanned?' <span class="chip">🔇 چتش مسدود</span>':'')
    +'<span class="tpow">'+(p.online?'🟢 آنلاین':' offline')+'</span></div></div>';
  h+='<div class="chatwrap"><div class="chatlog">'
    +(L.length?L.map(m=>'<div class="msg'+(m.me?' me':'')+'">'+(m.me?'':'<div class="who">'+m.from+'</div>')+m.text+'<div class="who time">'+new Date(m.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})+'</div></div>').join('')
      :'<div class="card">شروع گفتگو با '+p.name+'…</div>')
    +'</div>'
    +(p.blocked?'<div class="q" style="justify-content:center">⛔ گفتگو با این بازیکن ممکن نیست</div>'
      :'<div class="chatbar"><input id="chatIn" maxlength="200" placeholder="پیام شخصی…"><button class="btn" onclick="sendChat()">ارسال</button></div>')
    +'</div>';
  B.innerHTML=h;
  const cl=B.querySelector('.chatlog');if(cl)cl.scrollTop=cl.scrollHeight;
  const ci=$('chatIn');if(ci){ci.onkeydown=e=>{if(e.key==='Enter')window.sendChat();};ci.focus();}}
function renderAdmin(){
  const B=$('sheetBody');msgsTab='manage';
  let h='<div class="seg">'+[['inbox','💬 چت‌ها'],['clan','🏳 قبیله'],['sys','📢 سیستم']].map(([k,l])=>'<button class="'+(k==='manage'?'on':'')+'" onclick="setMsgsTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  h+='<div class="card hero"><div class="bhead">📢 <b>پیام همگانی</b></div>'
    +'<textarea id="admSys" class="sinput" rows="2" placeholder="متن اطلاعیه به همه‌ی بازیکنان…"></textarea>'
    +'<div class="row"><button class="btn" onclick="admBroadcast()">📢 ارسال به همه</button></div></div>';
  h+='<div class="card hero"><div class="bhead">🏁 <b>فصل‌ها</b><span class="lvl">فصل فعلی: '+S.mySeason+'</span></div>'
    +'<div class="q">فصل‌های موجود: '+S.seasonsList.map(se=>'<span class="chip">'+se.id+'. '+se.name+'</span>').join(' ')+'</div>'
    +'<div class="row"><input id="admSeasonName" class="qin" style="width:150px" placeholder="نام فصل جدید"><button class="btn sm" onclick="admNewSeason()">＋ ایجاد فصل</button></div>'
    +'<div class="q">بازیکنان فعلی در فصل خود می‌مانند مگر خودشان خارج یا اخراج شوند. فصل جدید برای بازیکنان تازه‌ساخت است.</div></div>';
  h+='<div class="q"><b>👥 بازیکنان ('+S.players.length+')</b></div>';
  h+=S.players.map(p=>{
    const u=unreadFor(S,p.id);
    return '<div class="admrow"><div class="trow"><span class="fdot" style="background:'+p.color+'"></span><b>'+p.name+(p.me?' (تو)':'')+'</b>'
      +(p.blocked?'<span class="chip">⛔ بن</span>':'')+(p.chatBanned?'<span class="chip">🔇 چت مسدود</span>':'')
      +(p.me?'':'<span class="tpow">فصل'+(p.season||'—')+'</span>')+'</div>'
      +'<div class="row">'
      +(p.me?'<span class="q" style="margin:0">مدیریت خودت: هدیه منابع به حساب خودت</span>'
        :'<button class="btn sm ghost" onclick="openThread(\''+p.id+'\')">💬 پیام</button>'
        +(p.blocked?'<button class="btn sm" onclick="admUnban(\''+p.id+'\')">✅ رفع بن</button>':'<button class="btn sm ghost" onclick="admBan(\''+p.id+'\')">⛔ بن</button>')
        +(p.chatBanned?'<button class="btn sm" onclick="admUnbanChat(\''+p.id+'\')">💬 بازکردن چت</button>':'<button class="btn sm ghost" onclick="admBanChat(\''+p.id+'\')">🔇 انسداد چت</button>')
        +(p.season?'<button class="btn sm ghost" onclick="admKick(\''+p.id+'\')">🚫 اخراج از فصل</button>':''))
      +'</div>'
      +'<div class="row"><input id="gift-'+p.id+'" class="qin" placeholder="مقدار" value="1000000">'
      +'<select id="giftk-'+p.id+'" class="qin"><option value="gold">🪙 سکه</option><option value="food">🌾 غذا</option><option value="wood">🪵 چوب</option><option value="stone">🪨 سنگ</option><option value="iron">⛓️ آهن</option></select>'
      +'<button class="btn sm gold" onclick="admGift(\''+p.id+'\')">🎁 هدیه</button></div></div>';}).join('');
  B.innerHTML=h;}
window.admBroadcast=()=>{const t=$('admSys')?.value.trim();if(!t)return toast('متن را بنویس');
  addSys(S,'📢 '+t);save(S);updBadges();toast('📢 اطلاعیه برای همه ارسال شد');renderAdmin();};
window.admNewSeason=()=>{const n=$('admSeasonName')?.value.trim();const id=createSeason(S,n);save(S);
  toast('🏁 فصل «'+(n||('فصل '+id))+'» ساخته شد — برای ورود بازیکنان جدید آماده است');renderAdmin();};
window.admBan=id=>{if(!adminGuard())return;banPlayer(S,id);save(S);renderAdmin();};
window.admUnban=id=>{unbanPlayer(S,id);save(S);renderAdmin();};
window.admBanChat=id=>{if(!adminGuard())return;banChat(S,id);save(S);renderAdmin();};
window.admUnbanChat=id=>{unbanChat(S,id);save(S);renderAdmin();};
window.admKick=id=>{if(!adminGuard())return;kickFromSeason(S,id);save(S);renderAdmin();};
window.admGift=(id)=>{const k=$('giftk-'+id)?.value,v=parseInt($('gift-'+id)?.value||0);
  if(!v||v<=0)return toast('مقدار نامعتبر');gift(S,id,{[k]:v});save(S);updTop();toast('🎁 هدیه ثبت شد');renderAdmin();};
window.leaveSeason=()=>{if(!confirm('از فصل فعلی خارج شوی؟ برای برگشتن باید مدیر اجازه دهد.'))return;
  addSys(S,'🏳️ از فصل خارج شدی');S.mySeason=null;save(S);toast('از فصل خارج شدی');};
window.jumpTo=(id)=>{const t=getTarget(id);if(!t)return;
  $('sheet').hidden=true;setViewUI('world');
  R.setView('world');R.centerOn(t.x,t.y);R.zoom=Math.max(R.zoom,1);
  toast('📍 '+t.name+' • Lv'+t.level+' • ⚔'+fmt(t.power));};
function updateDetailTotals(){const el=$('selTotals');if(!el)return;
  const isSetup=cur==='campSetup',isBoss=!isSetup&&detailId==='boss',t=isSetup?null:(isBoss?BOSS_T:getTarget(detailId));
  if(!isSetup&&!t)return;
  const army={};let cnt=0;for(const tid in selTroops){const n=selTroops[tid]||0;if(n>0&&tid!=='spy'){army[tid]=n;cnt+=n;}}
  const cmd=selCmd&&freeCmds(S).includes(selCmd)?selCmd:null,fx=cmdFx(S,cmd),cap=armyCap(S,expeditionCap(S),cmd),en='⚡ '+energyCost(S,cmd)+' از '+S.energy.v+' انرژی';
  if(!cnt){el.innerHTML='<div class="q">سربازی انتخاب نشده — از ردیف‌های بالا تعداد را وارد کن • '+en+'</div>';return;}
  const head=(txt,col)=>'<div class="trow"><b>👥 '+fmt(cnt)+'/'+fmt(cap)+'</b><span class="tpow" style="color:'+col+'">'+txt+'</span></div>';
  if(isSetup){el.innerHTML=head('⚔ '+fmt(armyPower(army)),cnt>cap?'var(--red)':'var(--green)')+'<div class="q">'+(cmd?CMD[cmd].icon+' '+CMD[cmd].name:'⚠️ فرمانده انتخاب نشده (برای کمپ لازم است)')+' • '+en+'</div>';return;}
  if(isBoss){const h=bossHit(S,army,fx);
    el.innerHTML=head('💥 ضربه‌ی تخمینی '+fmt(h.damage),cnt>cap?'var(--red)':'var(--green)')
     +'<div class="q">🎯 تقابل با نقطه‌ضعف فعلی ×'+h.mult.toFixed(2)+' • 📉 تلفات تخمینی: '+Math.round(h.lossFrac*100)+'٪ (بخشی مجروح 🏥) • '+en+'</div>';return;}
  const it=intelOf(t);
  if(!it){el.innerHTML=head('⚔ '+fmt(armyPower(army))+' خام',cnt>cap?'var(--red)':'var(--dim)')+'<div class="q">🕵️ بدون جاسوسی پیش‌بینی دقیق نداری؛ دشمن ≈'+fmt(estPower(t))+' • '+en+'</div>';return;}
  const r=battle(army,{army:t.garrison||{},power:t.power},t.wall||0,15,battleMods(fx)),ok=r.win&&cnt<=cap;
  el.innerHTML=head('⚔'+fmt(r.atk)+' در برابر '+fmt(r.def)+' '+(cnt>cap?'⚠️ بیش از ظرفیت':ok?'✅ شانس پیروزی':'⚠️ کافی نیست'),ok?'var(--green)':'var(--red)')
   +'<div class="q">🎯 ضریب تقابل: شما ×'+r.atkMul.toFixed(2)+' • دشمن ×'+r.defMul.toFixed(2)+' • 📉 تلفات تخمینی: '+Math.round(r.aLoss*100)+'٪ • '+en+'</div>';}
function openSheet(k){cur=k;if(k==='mapmenu')mapMenuTarget=mapMenuTarget;msgsPeer=msgsPeer;$('sheet').hidden=false;
  $('sheetTitle').textContent={build:'🏗️ ساخت و ارتقا',train:'⚔️ سربازخانه',attack:'🚩 لشکرکشی',detail:'🎯 جزئیات هدف',search:'🔍 جستجو در نقشه',reports:'📜 گزارش‌ها',empire:'👑 امپراتوری',board:'🏆 لیدربرد',hospital:'🏥 بیمارستان',quests:'🎯 ماموریت‌ها و دستاوردها',cmd:'🎖 فرماندهان ارشد',boss:'🗿 غول آخر فصل',campSetup:'⛺ برپایی کمپ',msgs:'✉️ پیام‌ها',mapmenu:'🎯 انتخاب عملیات',clan:'🏳️ قبیله',shop:'🛒 فروشگاه'}[k]||'';
  renderSheet();}
document.querySelectorAll('#dock button').forEach(b=>b.onclick=()=>{if(b.dataset.act==='attack')detailCamp=null;if(b.dataset.act==='clan')cur='clan';openSheet(b.dataset.act==='clan'?'clan':b.dataset.act);});
$('sheetClose').onclick=()=>$('sheet').hidden=true;
$('btnSearch').onclick=()=>openSheet('search');
$('btnHome2').onclick=()=>{setViewUI('world');R.setView('world');R.centerOn(S.homePos.x,S.homePos.y);};
$('zin').onclick=()=>R.zoomBy(1.3);
$('zout').onclick=()=>R.zoomBy(0.77);
R.onTap=(hit)=>{
  if(hit.kind==='empty'){const err=campSpotError(S,R.terr,hit.wx,hit.wy);if(err)return toast('⛺ '+err);
    campDraft={x:hit.wx,y:hit.wy};cancelCamp();selTroops={};openSheet('campSetup');return;}
  if(hit.kind==='boss'){openSheet('boss');return;}
  if(hit.kind==='camp'){useCamp(hit.camp.id);return;}
  if(hit.kind==='minimap'){R.centerOn(hit.wx,hit.wy);R.hl=null;return;}
  if(hit.kind==='tribe'){window.mapMenu(hit.tribe.id);}
  if(hit.kind==='site'){openDetail(hit.site.id);}
  if(hit.kind==='building'){const t=hit.b.type;openSheet(t==='barracks'?'train':t==='hospital'?'hospital':t==='muster'?'attack':'build');}
  if(hit.kind==='home'){setViewUI('castle');}};
$('btnView').onclick=()=>window.toggleView();
$('btnContinue').onclick=()=>{$('splash').style.display='none';$('game').hidden=false;updTop();};
$('btnNew').onclick=()=>{localStorage.removeItem(SAVE_KEY);localStorage.removeItem('village_rise_v8');S=freshState();location.reload();};
$('btnHelp').onclick=()=>{const h=$('helpBox');h.hidden=!h.hidden;};

// ================= tick =================
let tickN=0;
setInterval(()=>{
  tickN++;const now=Date.now();
  ensureEnergy(S,now);
  for(const e of ensureSeason(S,now)){
    if(e.type==='spawn'){addLog(S,'win','🗿 غول آخر فصل در مرکز نقشه ظاهر شد! ۴۸ ساعت فرصت داری');toast('🗿 <b>غول آخر فصل ظاهر شد!</b>');}
    if(e.type==='end'){const r=e.res;addLog(S,'win','🏁 فصل '+r.season+' تمام شد — رتبه '+(r.rank||'—')+' از '+r.total+' • '+r.label+' • 🪙'+r.gold+(r.emblems?' • 🎖×'+r.emblems:''));toast('🏁 فصل تمام شد: '+r.label+(r.rank?' (#'+r.rank+')':''));}}
  R.bossOn=bossPhase(S,now)==='active';
  const tk=grantTokens(S);if(tk.length){addLog(S,'info','🎫 توکن فرمانده گرفتی (قلعه Lv'+tk.join('، ')+')');toast('🎫 <b>توکن فرمانده ارشد</b> گرفتی! از 🎖 انتخاب کن');}
  if(tickN%5===0)npcTick(S,Math.random,25);
  if(tickN%10===0)npcGrow(S,Math.random,40);
  if(tickN%NPC.warEverySec===0)startWar(S,Math.random,R.terr);
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
      if(m.returning){const kc=m.toCamp&&S.camps.find(k=>k.id===m.toCamp),dst=kc?kc.army:S.troops;for(const tid in m.army)dst[tid]=(dst[tid]||0)+m.army[tid];
        addLog(S,'info',kc?'⛺ لشکر به کمپ بازگشت':'🏳️ لشکر به خانه بازگشت');toast(kc?'⛺ لشکر به کمپ بازگشت':'🏳️ لشکر به خانه بازگشت');}
      else resolveMarch(m);}}
  // دنیای NPC: جنگ با هم، جایگزینی قوی‌تر، حمله به من
  for(const m of[...S.npcMarches]){m.left-=1;
    if(m.left<=0){S.npcMarches=S.npcMarches.filter(x=>x!==m);const o=resolveWar(S,m,now,Math.random);
      if(o&&o.type==='fall'&&Math.hypot(o.B.x-S.homePos.x,o.B.y-S.homePos.y)<70)addLog(S,'info','⚔️ '+o.A.name+' قلعه '+o.B.name+' را نابود کرد — به‌زودی قلعه‌ای قوی‌تر جایش می‌آید');}}
  processRespawns(S,now,Math.random);
  for(const a of campAmbush(S)){
    addWounded(S,a.lost,homeFx(S,'heal'));
    if(a.win&&a.kind==='raid'){const t0=S.tribes.find(x=>x.id===a.ref.from);S.kills=(S.kills||0)+armyCount(a.ref.army);bump(S,'defended');
      if(t0){scaleTribe(t0,0.6);for(const k in t0.loot)S.resources[k]=(S.resources[k]||0)+Math.floor(t0.loot[k]*0.25);}
      addLog(S,'win','⛺ کمپ شما لشکر '+a.ref.name+' را کمین کرد و حمله به قلعه‌ات را خنثی کرد!');toast('⛺ <b>کمین موفق!</b> حمله '+a.ref.name+' خنثی شد');}
    else if(a.win)addLog(S,'win','⛺ کمپ شما یک لشکر در حال جنگ NPCها را کمین کرد');
    else if(a.kind==='raid')addLog(S,'lose','⛺ کمین ناموفق: لشکر دشمن از کمپ گذشت و به راهش ادامه می‌دهد');}
  const raid=shieldActive(S,now)?null:maybeRaid(S,now,Math.random,R.terr);
  if(raid){addLog(S,'lose','⚠️ '+raid.name+' با ⚔'+fmt(raid.power)+' به قلعه‌ات لشکر کشید — '+Math.ceil(raid.left)+' ثانیه تا رسیدن!');
    toast('⚠️ <b>حمله دشمن!</b> '+raid.name+' — '+Math.ceil(raid.left)+'ث');}
  if(shieldActive(S,now)&&S.incoming.length){addLog(S,'win','🛡 جادوی محافظت فعال شد و '+S.incoming.length+' حمله‌ی در راه را خنثی کرد');S.incoming=[];}
  for(const r of[...S.incoming]){r.left-=1;if(r.left<=0){S.incoming=S.incoming.filter(x=>x!==r);handleRaid(r);}}
  if(tickN%30===0)ensureQuests(S,now);
  if(tickN%45===0)ambientRandom(S);
  if(tickN%120===0){const sys=['📢 رویداد: غارت گنج‌ها تا امشب ۲۰٪ سکه‌ی بیشتر دارد 💎','📢 نکته: کمپ‌ها حمله‌ی غافلگیرانه می‌دهند ⛺','📢 فصل به پایان می‌رسد — رتبه‌ات را بالا ببر! 🏁'];
    S.sysMsgs.push({t:Date.now(),text:sys[Math.floor(Math.random()*sys.length)]});if(S.sysMsgs.length>40)S.sysMsgs=S.sysMsgs.slice(-40);}
  save(S);updTop();
  if(cur&&!$('sheet').hidden&&!['detail','search','board','quests','msgs'].includes(cur)&&document.activeElement?.tagName!=='INPUT')renderSheet();},1000);
(function loop(){R.draw();requestAnimationFrame(loop);})();
updTop();
