import{EXTRA_NAMES,NPC,factionAt}from'./config.js';
import{genGarrison,armyPower,armyCount,battle}from'./combat.js';
import{npcKillsInit}from'./leaderboard.js';

// ضریب k روی نیروها، قدرت و غنیمت یک قلعه
export function scaleTribe(t,k){
  for(const id in t.garrison)t.garrison[id]=Math.max(1,Math.round(t.garrison[id]*k));
  t.power=Math.max(10,Math.floor(t.power*k));
  if(k>1&&t.loot)for(const r in t.loot)t.loot[r]=Math.floor(t.loot[r]*(1+(k-1)*0.5));}

export function newId(S){S.nextId=(S.nextId||1000)+1;return 't'+S.nextId;}

// ساخت یک قلعه NPC (هم برای جهان اول، هم جایگزین‌ها)
export function buildTribe(id,name,x,y,level,rng,buff=1){
  const f=factionAt(x,y),garrison=genGarrison(level,rng);
  const t={id,name,faction:f.id,factionName:f.icon+' '+f.name,color:f.color,x,y,level,wall:Math.floor(level/4),garrison,
    power:Math.floor(armyPower(garrison)*(1+f.idx*0.07)),kills:0,
    loot:{food:Math.floor(3000*level*(0.8+rng()*0.5)),wood:Math.floor(2500*level*(0.8+rng()*0.5)),
      stone:Math.floor(2000*level*(0.8+rng()*0.5)),iron:Math.floor(1200*level*(0.8+rng()*0.5)),gold:Math.floor(35*level*(0.8+rng()*0.6))}};
  t.kills=npcKillsInit(garrison,rng);
  t.spies=Math.floor(level*6*(0.6+rng()*0.8));
  if(buff!==1)scaleTribe(t,buff);
  t.base=t.power;return t;}

// ---- هر قلعه حذف‌شده، بعد از چند ثانیه با یک قلعه قوی‌تر جایگزین می‌شود ----
export function queueRespawn(S,old,now,rng){
  S.respawns=S.respawns||[];
  S.respawns.push({x:old.x,y:old.y,level:Math.min(30,old.level+1+((rng()*2)|0)),
    minPower:Math.max(old.base||0,old.power)*(1.35+rng()*0.5),
    at:now+(NPC.respawnMinSec+rng()*(NPC.respawnMaxSec-NPC.respawnMinSec))*1000});}
export function processRespawns(S,now,rng){
  const due=(S.respawns||[]).filter(r=>r.at<=now);if(!due.length)return[];
  S.respawns=S.respawns.filter(r=>r.at>now);
  return due.map(r=>{
    const name='قلعه '+EXTRA_NAMES[(rng()*EXTRA_NAMES.length)|0]+' '+(2+((rng()*98)|0));
    const t=buildTribe(newId(S),name,r.x,r.y,r.level,rng,NPC.buff);
    if(t.power<r.minPower)scaleTribe(t,r.minPower/t.power);
    t.base=t.power;S.tribes.push(t);return t;});}

// ---- رشد آرام قدرت NPCها ----
export function npcGrow(S,rng,n=40){
  const L=S.tribes.length;if(!L)return;
  for(let i=0;i<n;i++){const t=S.tribes[(rng()*L)|0];
    if(t.power<(t.base||t.power)*NPC.growCap)scaleTribe(t,NPC.growStep);}}

// ---- جنگ NPCها با هم ----
export function startWar(S,rng){
  S.npcMarches=S.npcMarches||[];
  if(S.npcMarches.length>=14||S.tribes.length<3)return null;
  const A=S.tribes[(rng()*S.tribes.length)|0];
  if(S.npcMarches.some(m=>m.from===A.id))return null;
  let best=null,bs=-1;
  for(const B of S.tribes){if(B===A)continue;const d=Math.hypot(B.x-A.x,B.y-A.y);if(d>70||d<4)continue;
    if(B.power>A.power*1.3)continue;
    const sc=(B.faction!==A.faction?2:1)*rng()+(1-d/70);if(sc>bs){bs=sc;best=B;}}
  if(!best)return null;
  const d=Math.hypot(best.x-A.x,best.y-A.y),t=Math.max(8,d/NPC.warSpeed);
  const m={from:A.id,to:best.id,x0:A.x,y0:A.y,x1:best.x,y1:best.y,left:t,total:t,color:A.color,power:Math.floor(A.power*0.7)};
  S.npcMarches.push(m);return m;}
export function resolveWar(S,m,now,rng){
  const A=S.tribes.find(t=>t.id===m.from),B=S.tribes.find(t=>t.id===m.to);
  if(!A||!B)return null;
  const Aeff=A.power*0.7*(0.85+rng()*0.35),Deff=B.power+B.wall*15,gB=armyCount(B.garrison);
  if(Aeff>Deff*1.05){
    A.kills=(A.kills||0)+gB;
    if(rng()<0.4||Aeff>Deff*2){
      S.tribes=S.tribes.filter(t=>t!==B);queueRespawn(S,B,now,rng);scaleTribe(A,1.12);return{type:'fall',A,B};}
    scaleTribe(B,0.55);scaleTribe(A,0.9);return{type:'win',A,B};}
  A.kills=(A.kills||0)+Math.floor(gB*0.3);B.kills=(B.kills||0)+Math.floor(armyCount(A.garrison)*0.2);
  scaleTribe(A,0.72);return{type:'lose',A,B};}

// ---- حمله NPC به قلعه بازیکن ----
export function maybeRaid(S,now,rng){
  S.incoming=S.incoming||[];
  if(!S.nextRaid){S.nextRaid=now+NPC.firstRaidSec*1000;return null;}
  if(now<S.nextRaid||S.incoming.length>=2)return null;
  const hp=S.homePos,def=Math.max(400,armyPower(S.troops)*(0.7+rng()*0.7));
  const c=S.tribes.map(t=>({t,d:Math.hypot(t.x-hp.x,t.y-hp.y)})).filter(o=>o.d<170&&o.d>8);
  if(!c.length){S.nextRaid=now+60000;return null;}
  c.sort((a,b)=>Math.abs(Math.log(a.t.power/def))-Math.abs(Math.log(b.t.power/def)));
  const pick=c[(rng()*Math.min(5,c.length))|0],t=pick.t,army={};
  for(const k in t.garrison)army[k]=Math.max(1,Math.round(t.garrison[k]*0.7));
  const left=Math.max(25,pick.d/NPC.raidSpeed);
  const raid={id:'r'+now,from:t.id,name:t.name,fx:t.x,fy:t.y,army,power:armyPower(army),left,total:left,color:t.color};
  S.incoming.push(raid);
  S.nextRaid=now+(NPC.raidMinSec+rng()*(NPC.raidMaxSec-NPC.raidMinSec))*1000;
  return raid;}
const lossFrac=(army,f)=>{const o={};for(const k in army){const n=Math.min(army[k],Math.floor(army[k]*f+0.5));if(n>0)o[k]=n;}return o;};
export function resolveRaid(S,raid,rng){
  const wallLv=S.buildings.find(b=>b.type==='wall')?.level||0;
  const r=battle(raid.army,{army:S.troops,power:armyPower(S.troops)},wallLv,25);
  const t=S.tribes.find(x=>x.id===raid.from),out={r,attackerWon:r.win,myLosses:{},loot:{},kills:0,tribe:t};
  if(r.win){
    out.myLosses=lossFrac(S.troops,Math.min(0.7,0.3+0.4*(1-r.def/Math.max(1,r.atk))));
    for(const k in S.resources){const st=Math.floor(S.resources[k]*(0.08+rng()*0.14));S.resources[k]-=st;out.loot[k]=st;}
    if(t){t.kills=(t.kills||0)+armyCount(out.myLosses);scaleTribe(t,Math.max(0.5,1-r.aLoss*0.5));}
  }else{
    out.myLosses=r.defLosses;out.kills=Math.floor(armyCount(raid.army)*r.aLoss);
    if(t){scaleTribe(t,Math.max(0.3,1-r.aLoss*0.8));
      for(const k in t.loot){const g=Math.floor(t.loot[k]*0.25);S.resources[k]=(S.resources[k]||0)+g;out.loot[k]=g;}}}
  for(const k in out.myLosses)S.troops[k]=Math.max(0,(S.troops[k]||0)-out.myLosses[k]);
  return out;}
