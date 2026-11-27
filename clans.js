// ===== قبیله‌های بازیکنی، جادوی محافظت و فروشگاه =====
import{save}from'./state.js';
import{addSys,playerById}from'./social.js';

export const CLAN_COST=500000;        // هزینه‌ی ساخت قبیله با سکه
export const CLAN_MAX_CASTLES=15;     // سقف اعضای هر قبیله
export const PROT_DAY1_MS=24*3600*1000; // جادوی روز اول

// ---------- قبیله ----------
export function createClan(S,name){
  name=(name||'').trim();if(!name)return toastErr('نام قبیله را بنویس');
  if(S.clans.some(c=>c.name===name))return toastErr('این نام قبلاً گرفته شده');
  if(S.resources.gold<CLAN_COST)return toastErr('سکه کافی نیست ('+CLAN_COST+'🪙 لازم)');
  if(S.myClan)return toastErr('قبلاً در قبیله‌ای هستی');
  S.resources.gold-=CLAN_COST;
  const c={id:'cl'+Date.now(),name,owner:'me',members:['me'],created:Date.now()};
  S.clans.push(c);S.myClan=c.id;
  const me=playerById(S,'me');me.clanId=c.id;me.clanRole='owner';
  addSys(S,'🏳 قبیله «'+name+'» تاسیس شد');
  save(S);return true;}
function toastErr(m){if(typeof toast==='function')toast(m);alert(m);return false;}

export function myClan(S){return S.clans.find(c=>c.id===S.myClan)||null;}
export function clanById(S,id){return S.clans.find(c=>c.id===id)||null;}
export function clanMembers(S,c){return c.members.map(id=>playerById(S,id)).filter(Boolean);}
export function castleCount(S,c){return c.members.length;} // هر عضو = یک قلعه

// عضویت: حداکثر ۱۵ قلعه؛ بعد از عضویت با همه‌ی اعضا متحد است
export function joinClan(S,clanId,who='me'){
  const c=clanById(S,clanId);if(!c)return false;
  if(c.members.length>=CLAN_MAX_CASTLES){toastErr('قبیله ظرفیت ۱۵ قلعه را دارد');return false;}
  if(c.members.includes(who))return false;
  c.members.push(who);
  const p=playerById(S,who);if(p){p.clanId=clanId;}
  if(who==='me')S.myClan=clanId;
  addSys(S,'🏳 '+(p?.name||who)+' به قبیله «'+c.name+'» پیوست');
  save(S);return true;}
export function leaveClan(S,who='me'){
  const c=myClan(S);if(!c)return;
  c.members=c.members.filter(m=>m!==who);
  const p=playerById(S,who);if(p){p.clanId=null;p.clanRole=null;}
  if(who==='me')S.myClan=null;
  if(!c.members.length)S.clans=S.clans.filter(x=>x!==c);
  addSys(S,'🏳 '+(p?.name||who)+' قبیله «'+c.name+'» را ترک کرد');
  save(S);}
export function kickClan(S,who){
  const c=myClan(S);if(!c||c.owner!=='me')return toastErr('فقط بنیان‌گذار می‌تواند اخراج کند');
  if(who===c.owner)return;
  c.members=c.members.filter(m=>m!==who);
  const p=playerById(S,who);if(p){p.clanId=null;p.clanRole=null;}
  addSys(S,'🏳 '+p?.name+' از قبیله اخراج شد');save(S);}

// اتحاد: حمله به هم‌قبیله‌ای‌ها ممنوع
export function allied(S,tribeId){
  const t=S.tribes.find(x=>x.id===tribeId);
  if(t&&t.clanId){
    // قلعه‌ی NPC عضو قبیله‌ای که من هم عضوش هستم
    return t.clanId===S.myClan;}
  if(t&&t.playerId){
    const p=playerById(S,t.playerId);
    return p&&p.clanId&&p.clanId===S.myClan;}
  return false;}

// ---------- جادوی محافظت ----------
export function ensureShield(S,now=Date.now()){
  if(S.shield==null)S.shield={until:0,day1:true};
  if(S.shield.day1){S.shield.until=now+PROT_DAY1_MS;S.shield.day1=false;}
  return S.shield;}
export const shieldActive=(S,now=Date.now())=>{ensureShield(S,now);return S.shield.until>now;};
export const shieldLeft=(S,now=Date.now())=>Math.max(0,S.shield.until-now);
export function buyShield(S,hours,now=Date.now()){
  const cost=hours===24?SHOP.protection24.cost:SHOP.protection12.cost;
  if(S.resources.gold<cost)return{ok:false,msg:'سکه کافی نیست'};
  S.resources.gold-=cost;ensureShield(S,now);
  S.shield.until=Math.max(S.shield.until,now)+hours*3600*1000;
  addSys(S,'🛡 جادوی محافظت '+hours+' ساعته فعال شد');
  save(S);return{ok:true};}

// ---------- فروشگاه ----------
export const SHOP={
  protection12:{name:'جادوی محافظت ۱۲ ساعته',icon:'🛡',cost:250,hours:12},
  protection24:{name:'جادوی محافظت ۲۴ ساعته',icon:'🛡',cost:450,hours:24},
  food:{name:'بسته غذا',icon:'🌾',cost:120,amount:5000000},
  wood:{name:'بسته چوب',icon:'🪵',cost:120,amount:5000000},
  stone:{name:'بسته سنگ',icon:'🪨',cost:150,amount:4000000},
  iron:{name:'بسته آهن',icon:'⛓️',cost:200,amount:3000000}};
export function buyItem(S,key){
  const it=SHOP[key];if(!it)return{ok:false,msg:'نامعتبر'};
  if(S.resources.gold<it.cost)return{ok:false,msg:'سکه کافی نیست ('+it.cost+'🪙)'};
  S.resources.gold-=it.cost;
  if(it.hours){const r=buyShield(S,it.hours);if(!r.ok){S.resources.gold+=it.cost;return r;}}
  else{S.resources[key]=(S.resources[key]||0)+it.amount;addSys(S,'🛒 '+it.name+' خریداری شد');save(S);}
  return{ok:true};}

// ---------- چت گروهی قبیله ----------
export function clanChatOf(S,clanId){return S.clanChats[clanId]||(S.clanChats[clanId]=[]);}
export function pushClanMsg(S,clanId,from,fromColor,text,me=false){
  const a=clanChatOf(S,clanId);a.push({t:Date.now(),from,fromColor,text,me});
  if(a.length>100)S.clanChats[clanId]=a.slice(-100);}
export function unreadClan(S){return S.unreadClan||0;}
