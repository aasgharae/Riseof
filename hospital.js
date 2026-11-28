import{TROOPS,WOUNDED_RATIO,HEAL_COST_RATIO,HEAL_TIME_RATIO,hospitalCap}from'./config.js';
export const hospitalLevel=S=>S.buildings.find(b=>b.type==='hospital')?.level||0;
export const woundedCount=S=>{let n=0;for(const k in S.wounded||{})n+=S.wounded[k]||0;return n;};
export const healingCount=S=>(S.healing||[]).reduce((a,j)=>a+j.count,0);
// ظرفیت = مجروحان در انتظار + در حال درمان
export const hospitalRoom=S=>Math.max(0,hospitalCap(hospitalLevel(S))-woundedCount(S)-healingCount(S));
// تلفات → مجروح (تا ظرفیت بیمارستان) + کشته
export function addWounded(S,losses,ratioBonus=0){
  let room=hospitalRoom(S),wounded=0,dead=0;S.wounded=S.wounded||{};
  const ratio=Math.min(0.95,WOUNDED_RATIO+ratioBonus);
  for(const k in losses){const n=losses[k];let w=Math.floor(n*ratio);w=Math.min(w,room);room-=w;
    if(w>0)S.wounded[k]=(S.wounded[k]||0)+w;wounded+=w;dead+=n-w;}
  return{wounded,dead};}
export function healCost(tid,n,disc=0){const T=TROOPS[tid],c={};for(const k in T.cost)c[k]=Math.ceil(T.cost[k]*HEAL_COST_RATIO*n*(1-Math.min(0.6,disc)));return c;}
export function healTime(tid,n,lvl){return Math.max(1,Math.ceil(TROOPS[tid].time*HEAL_TIME_RATIO*Math.pow(n,0.7)/(1+lvl*0.22)*10));}
