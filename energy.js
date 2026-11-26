import{ENERGY}from'./config.js';
const dayKey=(now)=>{const d=new Date(now);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
// انرژی روزانه: هر روز ۱۰۰ واحد
export function ensureEnergy(S,now=Date.now()){
  const k=dayKey(now);
  if(!S.energy||S.energy.day!==k)S.energy={v:ENERGY.max,day:k};
  return S.energy;}
export function spendEnergy(S,n,now=Date.now()){const e=ensureEnergy(S,now);if(e.v<n)return false;e.v-=n;return true;}
