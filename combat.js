import{TROOPS}from'./config.js';
export function armyPower(tr){let p=0;for(const k in tr)p+=(TROOPS[k]?.power||0)*(tr[k]||0);return p;}
export function armyCount(tr){let n=0;for(const k in tr)n+=tr[k]||0;return n;}

// ساخت گارد دفاعی قلعه بر اساس سطح آن (۲ تا ۴ نوع نیرو، قطعی با rng)
export function genGarrison(level,rng){
  const maxUnlock=Math.max(1,Math.min(24,level+2));
  const avail=Object.keys(TROOPS).filter(t=>TROOPS[t].unlock<=maxUnlock);
  const nTypes=Math.min(avail.length,2+Math.floor(rng()*3));
  const pool=[...avail],picks=[];
  while(picks.length<nTypes)picks.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
  let remaining=Math.floor(150*Math.pow(level,1.6)*(0.9+rng()*0.25));
  const g={};
  picks.forEach((t,i)=>{
    const last=i===picks.length-1;
    const p=last?remaining:Math.max(1,Math.floor(remaining*(0.3+rng()*0.3)));
    remaining-=p;
    g[t]=Math.max(1,Math.round(p/TROOPS[t].power));});
  return g;}

export function resolveAttack(army,tribe,wallLvl=0){
  let atk=armyPower(army);
  let def=(tribe.power||0)+wallLvl*15;
  if((army.catapult||0)>0)def*=0.65;else if((army.ballista||0)>0)def*=0.8;
  if((army.royal||0)>0)atk*=1.15;else if((army.knight||0)>0)atk*=1.1;
  const win=atk>def*1.02;
  const loot=win?(tribe.loot||{gold:200}):{};
  return{win,atk:Math.floor(atk),def:Math.floor(def),loot};}
