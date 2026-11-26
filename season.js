import{SEASON,BOSS_POS}from'./config.js';
import{TROOPS,TROOP_CLASS}from'./config.js';
import{classShares}from'./combat.js';
import{hash2}from'./js/noise.js';
export{BOSS_POS};
const DAY=864e5,H=36e5;
export const WEAK_ORDER=['cav','archer','inf','spear','siege'];
export const CLS_NAME={inf:'🗡️ پیاده',spear:'🔱 نیزه‌دار',archer:'🏹 کماندار',cav:'🐎 سواره',siege:'💣 محاصره'};
const idNum=id=>{let h=0;for(const ch of String(id))h=(h*31+ch.charCodeAt(0))%100003;return h;};
export const newSeason=(id,now)=>({id,start:now,end:now+SEASON.days*DAY,bossStart:now+SEASON.days*DAY-SEASON.bossHours*H,itemPool:SEASON.itemPool});

export function bossPhase(S,now=Date.now()){
  const s=S.season;if(!s)return'before';
  return now<s.bossStart?'before':now<s.end?'active':'ended';}
export function weaknessAt(S,now=Date.now()){
  const s=S.season,idx=Math.max(0,Math.floor((now-s.bossStart)/(SEASON.rotHours*H)));
  const nextIn=Math.max(0,(s.bossStart+(idx+1)*SEASON.rotHours*H)-now);
  return{weak:WEAK_ORDER[idx%5],resist:WEAK_ORDER[(idx+2)%5],nextIn};}

// ضربه به غول: ضعف ×۱٫۶، مقاومت ×۰٫۷؛ غول تلفات سنگین می‌گیرد
export function bossHit(S,army,fx,now=Date.now()){
  const {weak,resist}=weaknessAt(S,now),sh=classShares(army);
  let mult=0;for(const c in sh)mult+=sh[c]*(c===weak?1.6:c===resist?0.7:1);
  if(!mult)mult=1;
  let raw=0;for(const k in army){if(!TROOPS[k]||TROOP_CLASS[k]==='spy')continue;raw+=army[k]*TROOPS[k].power*(1+((fx.cls&&fx.cls[TROOP_CLASS[k]])||0));}
  raw*=(1+(fx.atk||0))*(1+(fx.boss||0));
  const damage=Math.floor(raw*mult);
  const lossFrac=Math.max(0.12,Math.min(0.75,(0.45/Math.sqrt(mult))*(1-(fx.loss||0)+(fx.lossUp||0))));
  return{damage,mult,lossFrac,weak,resist};}

export function spawnBoss(S){
  S.boss={dmg:0,hits:0,snap:S.tribes.map(t=>({id:t.id,n:t.name,c:t.color,p:t.power,k:0.5+0.4*hash2(idNum(t.id),11),h:hash2(idNum(t.id),13)}))};}
// امتیاز NPCها تابعی قطعی از زمان است (حتی وقتی بازی بسته بوده)
export const npcScore=(e,progress)=>{const hits=Math.min(SEASON.maxHits,Math.floor(progress*SEASON.maxHits*(0.7+0.6*e.h)));return Math.floor(e.p*e.k*hits);};
export function bossBoard(S,now=Date.now()){
  const s=S.season,b=S.boss;if(!b)return[];
  const pr=Math.max(0,Math.min(1,(now-s.bossStart)/(s.end-s.bossStart)));
  const rows=b.snap.map(e=>({id:e.id,name:e.n,color:e.c,dmg:npcScore(e,pr),me:false})).filter(r=>r.dmg>0);
  if(b.hits>0)rows.push({id:'me',name:'⭐ شما',color:'#ffd166',dmg:b.dmg,me:true});
  rows.sort((a,b2)=>b2.dmg-a.dmg);rows.forEach((r,i)=>r.rank=i+1);
  return rows;}
export function rewardFor(rank,total){
  if(rank===1)return{label:'🥇 قهرمان فصل',gold:3000,emblems:4,res:5e6};
  if(rank<=10)return{label:'🏅 ۱۰ نفر برتر',gold:1500,emblems:2,res:3e6};
  if(rank<=Math.max(10,Math.ceil(total*0.1)))return{label:'⭐ ۱۰٪ برتر',gold:800,emblems:1,res:2e6};
  if(rank<=Math.ceil(total*0.5))return{label:'✔ ۵۰٪ برتر',gold:300,emblems:0,res:1e6};
  return{label:'شرکت‌کننده',gold:100,emblems:0,res:3e5};}
// پایان فصل: جایزه، ثبت تاریخچه و شروع فصل بعد
export function finalizeSeason(S,now=Date.now()){
  const rows=bossBoard(S,S.season.end),me=rows.find(r=>r.me);
  let res=null;
  if(me){const rw=rewardFor(me.rank,rows.length);
    S.resources.gold=(S.resources.gold||0)+rw.gold;for(const k of['food','wood','stone','iron'])S.resources[k]=(S.resources[k]||0)+rw.res;
    S.cmd.emblems=(S.cmd.emblems||0)+rw.emblems;
    res={season:S.season.id,rank:me.rank,total:rows.length,dmg:me.dmg,...rw};}
  else res={season:S.season.id,rank:null,total:rows.length,dmg:0,label:'بدون شرکت در نبرد با غول',gold:0,emblems:0,res:0};
  S.pastSeasons=S.pastSeasons||[];S.pastSeasons.unshift(res);S.pastSeasons.length=Math.min(S.pastSeasons.length,8);
  S.season=newSeason(S.season.id+1,now);S.boss=null;
  return res;}
// هر تیک: ساخت فصل، ظهور غول، پایان فصل
export function ensureSeason(S,now=Date.now()){
  const ev=[];
  if(!S.season)S.season=newSeason(1,now);
  if(now>=S.season.end){ev.push({type:'end',res:finalizeSeason(S,now)});}
  if(now>=S.season.bossStart&&!S.boss){spawnBoss(S);ev.push({type:'spawn'});}
  return ev;}
export function fmtDur(ms){const s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);
  return d?d+' روز '+h+' ساعت':h?h+' ساعت '+m+' دقیقه':m+' دقیقه '+(s%60)+' ثانیه';}
