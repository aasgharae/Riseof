import{INTEL_TTL,ENERGY}from'./config.js';
import{hash2}from'./js/noise.js';
const idNum=id=>{let h=0;for(const ch of String(id))h=(h*31+ch.charCodeAt(0))%100003;return h;};
// تعداد و قدرت جاسوس‌های مدافع
export const enemySpies=t=>t.spies??Math.floor((t.level||1)*6);
export const enemySpyStrength=t=>enemySpies(t)*(1+(t.level||1)*0.03);
export const mySpyStrength=(n,bonus=0)=>n*(1+bonus);
// بدون جاسوسی فقط یک تخمین مبهم از قدرت می‌بینی
export const estPower=t=>{const f=0.7+0.6*hash2(idNum(t.id),7),v=t.power*f,r=Math.pow(10,Math.max(1,String(Math.floor(v)).length-2));return Math.round(v/r)*r;};
export function getIntel(S,id,now=Date.now(),bonus=0){
  const it=S.intel&&S.intel[id];if(!it)return null;
  const ttl=INTEL_TTL*(bonus>=0.9?2:1)*1000;
  return now-it.t<=ttl?it:null;}
// جاسوسی: اگر جاسوس دشمن بیشتر یا قوی‌تر باشد شکست می‌خوری
export function runSpy(S,t,n,bonus,rng,now=Date.now()){
  S.intel=S.intel||{};
  const mine=mySpyStrength(n,bonus),theirs=enemySpyStrength(t);
  if(mine>theirs){
    let aura=null;
    if(t.kind){const acc=bonus>=0.9?1:0.6,real=!!t.item;aura=rng()<acc?real:!real;}
    const intel={t:now,level:t.level,power:t.power,wall:t.wall||0,garrison:{...t.garrison},loot:{...t.loot},spies:enemySpies(t),aura};
    S.intel[t.id]=intel;
    return{ok:true,lost:Math.floor(n*0.1+0.5),intel,mine,theirs};}
  return{ok:false,lost:Math.max(1,Math.floor(n*0.6)),mine,theirs};}
