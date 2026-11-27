// ===== پنل مدیریت جدا از بازی =====
// زیرساخت کامل آماده است ولی تا ورود به سرور نمایش داده نمی‌شود.
// فعال‌سازی تستی: افزودن ?admin=1 به آدرس بازی
import{save,addLog}from'./state.js';
import{playerById,createSeason,banPlayer,unbanPlayer,banChat,unbanChat,kickFromSeason,addSys}from'./social.js';

const ADMIN_PASS='admin123';
let S=null,admTab='players';

export function initAdmin(state){
  S=state;
  window.__admin={open:openAdmin};
  // تا ورود به سرور: فقط با ?admin=1 باز می‌شود
  if(location.search.indexOf('admin=1')>=0)setTimeout(openAdmin,600);
  const c=document.getElementById('adminClose');
  if(c)c.onclick=()=>{document.getElementById('admin').hidden=true;};
}
function openAdmin(){
  if(!sessionStorage.getItem('adm_ok')){
    const v=prompt('رمز پنل مدیریت:');
    if(v!==ADMIN_PASS)return alert('رمز نادرست است');
    sessionStorage.setItem('adm_ok','1');}
  document.getElementById('admin').hidden=false;render();}
function render(){
  const B=document.getElementById('admBody');if(!B)return;
  let h='<div class="seg">'+[['stats','📊 آمار'],['players','👥 بازیکنان'],['seasons','🏁 فصل‌ها'],['broadcast','📢 همگانی']].map(([k,l])=>'<button class="'+(admTab===k?'on':'')+'" onclick="__admTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  if(admTab==='stats'){
    const clans=S.clans.length,inClan=S.players.filter(p=>p.clanId).length;
    h+='<div class="statgrid">'
      +'<div class="stat">👥 بازیکنان<b>'+S.players.length+'</b></div>'
      +'<div class="stat">🏳 قبیله‌ها<b>'+clans+'</b></div>'
      +'<div class="stat">🏰 اعضای قبیله<b>'+inClan+'</b></div>'
      +'<div class="stat">🏁 فصل جاری<b>'+(S.mySeason||'—')+'</b></div>'
      +'<div class="stat">⛔ بن<b>'+S.players.filter(p=>p.blocked).length+'</b></div>'
      +'<div class="stat">🔇 چت مسدود<b>'+S.players.filter(p=>p.chatBanned).length+'</b></div></div>';}
  if(admTab==='players'){
    h+=S.players.map(p=>'<div class="admrow"><div class="trow"><span class="fdot" style="background:'+p.color+'"></span><b>'+p.name+(p.me?' (تو)':'')+'</b>'
      +(p.blocked?'<span class="chip">⛔ بن</span>':'')+(p.chatBanned?'<span class="chip">🔇 چت</span>':'')
      +(p.clanId?'<span class="chip">🏳 قبیله</span>':'')
      +(p.me?'':'<span class="tpow">فصل'+(p.season||'—')+'</span>')+'</div>'
      +'<div class="row">'
      +(p.me?'':'<button class="btn sm ghost" onclick="__admBan(\''+p.id+'\')">'+(p.blocked?'✅ رفع بن':'⛔ بن')+'</button>'
        +'<button class="btn sm ghost" onclick="__admChat(\''+p.id+'\')">'+(p.chatBanned?'💬 بازکردن چت':'🔇 انسداد چت')+'</button>'
        +(p.season?'<button class="btn sm ghost" onclick="__admKick(\''+p.id+'\')">🚫 اخراج از فصل</button>':''))
      +'</div>'
      +'<div class="row"><input id="gift-'+p.id+'" class="qin" value="1000000">'
      +'<select id="giftk-'+p.id+'" class="qin"><option value="gold">🪙 سکه</option><option value="food">🌾 غذا</option><option value="wood">🪵 چوب</option><option value="stone">🪨 سنگ</option><option value="iron">⛓️ آهن</option></select>'
      +'<button class="btn sm gold" onclick="__admGift(\''+p.id+'\')">🎁 هدیه</button></div></div>').join('');}
  if(admTab==='seasons'){
    h+='<div class="card hero"><div class="bhead">🏁 <b>فصل‌ها</b><span class="lvl">فعلی: '+(S.mySeason||'—')+'</span></div>'
      +'<div class="q">'+S.seasonsList.map(se=>'<span class="chip">'+se.id+'. '+se.name+'</span>').join(' ')+'</div>'
      +'<div class="row"><input id="admSeasonName" class="qin" style="width:160px" placeholder="نام فصل جدید"><button class="btn sm" onclick="__admSeason()">＋ ایجاد فصل</button></div>'
      +'<div class="q">فصل جدید فقط برای ورود بازیکنان تازه است؛ بازیکنان فعلی در فصل خود می‌مانند مگر خودشان خارج شوند یا اخراج شوند.</div></div>';}
  if(admTab==='broadcast'){
    h+='<div class="card hero"><div class="bhead">📢 <b>پیام همگانی</b></div>'
      +'<textarea id="admSys" class="sinput" rows="3" placeholder="متن اطلاعیه به همه‌ی بازیکنان…"></textarea>'
      +'<div class="row"><button class="btn" onclick="__admBc()">📢 ارسال به همه</button></div></div>';}
  B.innerHTML=h;}
window.__admTab=k=>{admTab=k;render();};
window.__admBc=()=>{const t=document.getElementById('admSys')?.value.trim();if(!t)return;
  addSys(S,'📢 '+t);save(S);render();};
window.__admSeason=()=>{const n=document.getElementById('admSeasonName')?.value.trim();
  const id=createSeason(S,n);save(S);render();};
window.__admBan=id=>{banPlayer(S,id);save(S);render();};
window.__admChat=id=>{const p=playerById(S,id);if(p.chatBanned)unbanChat(S,id);else banChat(S,id);save(S);render();};
window.__admKick=id=>{kickFromSeason(S,id);save(S);render();};
window.__admGift=id=>{const k=document.getElementById('giftk-'+id)?.value,v=parseInt(document.getElementById('gift-'+id)?.value||0);
  if(!v||v<=0)return;S.resources[k]=(S.resources[k]||0)+v;
  const p=playerById(S,id);addSys(S,'🎁 هدیه به '+p.name+' ثبت شد');save(S);render();};
