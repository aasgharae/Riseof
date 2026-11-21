import{TROOPS,TROOP_CLASS,COUNTER,CLASS_INFO}from'./config.js';
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

// سهم قدرت هر کلاس در یک ارتش
export function classShares(army){
  const s={inf:0,spear:0,archer:0,cav:0,siege:0};let tot=0;
  for(const k in army){const n=army[k]||0;if(!n||!TROOPS[k])continue;const p=n*TROOPS[k].power;s[TROOP_CLASS[k]]+=p;tot+=p;}
  if(tot>0)for(const c in s)s[c]/=tot;
  return s;}
// ضریب میانگین قدرت ارتش a در برابر ارتش b
export function counterMult(a,b){
  const sa=classShares(a),sb=classShares(b);let m=0;
  for(const x in sa){if(!sa[x])continue;for(const y in sb){if(!sb[y])continue;m+=sa[x]*sb[y]*COUNTER[x][y];}}
  return m>0?m:1;}
// ضریب یک نوع سرباز در برابر ترکیب یک ارتش (برای نمایش در منو)
export function troopMultVs(tid,army){
  const sb=classShares(army),c=TROOP_CLASS[tid];let m=0,t=0;
  for(const y in sb){m+=sb[y]*COUNTER[c][y];t+=sb[y];}
  return t>0?m:1;}
// بهترین کلاس‌ها برای شکست یک ارتش
export function bestCounters(army){
  const sb=classShares(army),score={};
  for(const x in COUNTER){let m=0;for(const y in sb)m+=sb[y]*COUNTER[x][y];score[x]=m;}
  return Object.entries(score).sort((a,b)=>b[1]-a[1]).slice(0,2).filter(e=>e[1]>1.05).map(e=>({cls:e[0],mult:e[1],...CLASS_INFO[e[0]]}));}

function losses(army,f){const o={};for(const k in army){const n=Math.floor((army[k]||0)*f+0.5);if(n>0)o[k]=Math.min(n,army[k]);}return o;}

// نبرد: def = {army, power?} ، wall = سطح دیوار ، wallK = قدرت هر سطح دیوار
export function battle(att,def,wall=0,wallK=15){
  const defArmy=def.army||{};
  let atkRaw=armyPower(att);
  if((att.royal||0)>0)atkRaw*=1.15;else if((att.knight||0)>0)atkRaw*=1.1;
  const defBase=def.power!=null?def.power:armyPower(defArmy);
  const siege=classShares(att).siege;
  const wallBonus=wall*wallK*(1-Math.min(0.7,siege*0.9));
  const mA=counterMult(att,defArmy),mD=counterMult(defArmy,att);
  const A=atkRaw*mA,D=(defBase+wallBonus)*mD;
  const win=A>D*1.02;
  let aLoss,dLoss;
  if(win){aLoss=Math.min(0.6,0.03+0.5*Math.pow(Math.min(1,D/Math.max(1,A)),1.5));dLoss=1;}
  else{const r=Math.min(1,A/Math.max(1,D));aLoss=Math.min(0.9,0.45+0.5*(1-r));dLoss=Math.min(0.6,0.6*r);}
  return{win,atk:Math.floor(A),def:Math.floor(D),atkMul:mA,defMul:mD,aLoss,dLoss,
    attLosses:losses(att,aLoss),defLosses:losses(defArmy,dLoss)};}

// سازگاری با نسخه‌های قبل
export function resolveAttack(army,tribe,wallLvl=0){
  const r=battle(army,{army:tribe.garrison||{},power:tribe.power||0},wallLvl,15);
  return{win:r.win,atk:r.atk,def:r.def,loot:r.win?(tribe.loot||{gold:200}):{}};}
