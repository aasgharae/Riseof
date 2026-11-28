import{BASE_AVATARS,DEFAULT_AVATAR_ID}from'./cosmetics.js';
import{armyPower,armyCount}from'./combat.js';

// همه شرکت‌کننده‌ها: قلعه‌های NPC + خود بازیکن
export function boardEntries(S){
  const list=S.tribes.map(t=>({id:t.id,name:t.name,fac:t.factionName||'',faction:t.faction,color:t.color||'#aaa',
    power:t.power||0,kills:t.kills||0,level:t.level,avatarId:t.avatarId||BASE_AVATARS[(Number(String(t.id).replace(/\D/g,''))||0)%BASE_AVATARS.length].id,me:false}));
  const keep=S.buildings?.find(b=>b.type==='keep')?.level||1;
  list.push({id:'me',name:'⭐ شما',fac:'',faction:null,color:'#ffd166',power:armyPower(S.troops||{}),kills:S.kills||0,level:keep,avatarId:S.profile?.avatarId||DEFAULT_AVATAR_ID,me:true});
  return list;}

// key = 'power' | 'kills' — مرتب‌شده نزولی با رتبه
export function rankBoard(S,key){
  const l=boardEntries(S);
  l.sort((a,b)=>(b[key]-a[key])||(a.me?-1:b.me?1:0));
  l.forEach((e,i)=>e.rank=i+1);
  return l;}

export function factionBoard(S,FACTIONS){
  return FACTIONS.map(f=>{
    const mine=S.tribes.filter(t=>t.faction===f.id);
    return{...f,castles:mine.length,power:mine.reduce((a,t)=>a+(t.power||0),0),
      kills:mine.reduce((a,t)=>a+(t.kills||0),0),conquered:S.factionKills?.[f.id]||0};
  }).sort((a,b)=>b.power-a.power);}

// کشتار اولیه NPC بر حسب تعداد سرباز (هم‌مقیاس با کشتار بازیکن)
export function npcKillsInit(garrison,rng){return Math.floor(armyCount(garrison)*(1+rng()*2.5));}

// NPCها با هم می‌جنگند: چند قلعه تصادفی کشتارشان بالا می‌رود
export function npcTick(S,rng,n=25){
  const L=S.tribes.length;if(!L)return;
  for(let k=0;k<n;k++){
    const t=S.tribes[Math.floor(rng()*L)];
    t.kills=(t.kills||0)+Math.floor(armyCount(t.garrison||{})*0.02*(0.5+rng()))+1;}}
