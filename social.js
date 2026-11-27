// ===== اجتماعی: چت شخصی، بازیکنان، فصل‌ها، پنل مدیریت =====
// دمو آفلاین: بازیکنان مجازی + ذخیره در localStorage. برای آنلاین: همین API را به سرور وصل کنید.
import{save}from'./state.js';

export const ADMIN_KEY='rise_admin'; // رمز پنل مدیریت (بعداً از سرور چک می‌شود)

const BOT_NAMES=[['آرتا','#e05c4d'],['نظام','#7fb4e0'],['سوبار','#b08a5a'],['مهرک','#6fc46f'],['دیانا','#e0b34d'],['کاوه','#7de08a'],['رستم','#c9a02f']];
const REPLIES=[
  'سلام! مرسی از پیامت',
  'منم آماده‌ام، کِی حمله کنیم؟',
  'اول جاسوسی کنیم بهتره',
  'از کمپ کمک می‌فرستم',
  'سرباز دارم برای دفاع، خبرم کن',
  'دیشب یک قلعه رو زدم، غنیمت خوب بود',
  'قبول! کجا حمله کنیم؟'];

// ---------- بازیکنان ----------
export function ensurePlayers(S){
  if(S.players.length){S.players.sort((a,b)=>(b.me?1:0)-(a.me?1:0));return;}
  S.players=[{id:'me',name:'شما',color:'#ffd166',me:true,blocked:false,chatBanned:false,season:1},
    ...BOT_NAMES.map(([n,c],i)=>({id:'p'+(i+1),name:n,color:c,me:false,blocked:false,chatBanned:false,season:1,online:Math.random()<0.6}))];
}
export const others=S=>S.players.filter(p=>!p.me);
export function playerById(S,id){return S.players.find(p=>p.id===id);}

// ---------- چت شخصی ----------
export const threadOf=(S,id)=>S.chats[id]||(S.chats[id]=[]);
export function pushMsg(S,toId,from,fromColor,text,me=false){
  threadOf(S,toId).push({t:Date.now(),from,fromColor,text,me});
  if(S.chats[toId].length>60)S.chats[toId]=S.chats[toId].slice(-60);
}
export function unreadFor(S,id){return S.unread[id]||0;}
export function markRead(S,id){S.unread[id]=0;}
export function bumpUnread(S,id){S.unread[id]=(S.unread[id]||0)+1;}
export function totalUnread(S){
  let n=0;
  for(const id in S.unread){const p=playerById(S,id);if(p&&!p.me)n+=S.unread[id];}
  return n;}

// ---------- فصل‌ها ----------
export function createSeason(S,name){
  const id=(S.seasonsList[S.seasonsList.length-1]?.id||0)+1;
  S.seasonsList.push({id,name:name||('فصل '+id)});
  return id;}
export function joinSeason(S,id){
  S.mySeason=id;
  S.players.forEach(p=>{if(!p.me)p.season=id;});
  addSys(S,'به فصل '+id+' منتقل شدی — جهان تازه‌ای در انتظارت است');}
export function kickFromSeason(S,pid){
  const p=playerById(S,pid);
  if(p&&!p.me){p.season=null;addSys(S,p.name+' از فصل اخراج شد');}}
export function addSys(S,text){
  S.sysMsgs.push({t:Date.now(),text});
  if(S.sysMsgs.length>40)S.sysMsgs=S.sysMsgs.slice(-40);}

// ---------- مدیریت ----------
export function banPlayer(S,pid){const p=playerById(S,pid);if(p){p.blocked=true;addSys(S,p.name+' بن شد');}}
export function unbanPlayer(S,pid){const p=playerById(S,pid);if(p){p.blocked=false;addSys(S,'بن '+p.name+' برداشته شد');}}
export function banChat(S,pid){const p=playerById(S,pid);if(p){p.chatBanned=true;addSys(S,'چت '+p.name+' مسدود شد');}}
export function unbanChat(S,pid){const p=playerById(S,pid);if(p){p.chatBanned=false;addSys(S,'چت '+p.name+' باز شد');}}
export function gift(S,pid,res){const p=playerById(S,pid);if(!p)return;
  for(const k in res)S.resources[k]=(S.resources[k]||0)+res[k];
  addSys(S,'هدیه به '+p.name+' ثبت شد');}

// ---------- ربات‌های محیطی چت شخصی (دمو) ----------
export function ambientReply(S,fromId){
  const p=playerById(S,fromId);if(!p||p.me)return;
  setTimeout(()=>{
    const msg=REPLIES[Math.floor(Math.random()*REPLIES.length)];
    pushMsg(S,fromId,p.name,p.color,msg);
    bumpUnread(S,fromId);save(S);
    if(window.__refreshMsgs)window.__refreshMsgs();
  },1200+Math.random()*2200);}
export function ambientRandom(S){
  if(Math.random()<0.5)return;
  const cands=others(S).filter(p=>!p.blocked&&!p.chatBanned&&S.chats[p.id]&&S.chats[p.id].length);
  if(!cands.length)return;
  const p=cands[Math.floor(Math.random()*cands.length)];
  const msg=REPLIES[Math.floor(Math.random()*REPLIES.length)];
  pushMsg(S,p.id,p.name,p.color,msg);
  bumpUnread(S,p.id);}
export{BOT_NAMES};
