import{ENERGY}from'./config.js';
// ---- ۱۰ فرمانده ارشد؛ هرکدام یک وسوسه‌ی متفاوت ----
// fx: atk, cls:{کلاس:بونوس}, wall (نادیده‌گرفتن دیوار), loss (کاهش تلفات), lossUp, heal (سهم مجروح)، speed, loot, spy, item, camp, boss, cap, home, energy
export const COMMANDERS=[
 {id:'rostam',name:'رستم',title:'پهلوان زورمند',icon:'🦁',color:'#d9534f',lure:'خام‌ترین قدرت. هر نبرد را او شروع می‌کند.',fx:{atk:0.25,lossUp:0.10}},
 {id:'arash',name:'آرش',title:'کمانگیر افسانه‌ای',icon:'🏹',color:'#e0a030',lure:'تیری که دیوار را می‌شکافد.',fx:{cls:{archer:0.45},wall:0.25}},
 {id:'tahmineh',name:'تهمینه',title:'بانوی سوارکار',icon:'🐎',color:'#c26fd1',lure:'ضربه‌ی برق‌آسا؛ زودتر از همه می‌رسد.',fx:{cls:{cav:0.35},speed:0.35}},
 {id:'gordafarid',name:'گردآفرید',title:'سپر آهنین',icon:'🛡️',color:'#5b8fd6',lure:'سربازانت کم می‌میرند و قلعه‌ات نفوذناپذیر می‌شود.',fx:{loss:0.30,home:0.25}},
 {id:'kaveh',name:'کاوه',title:'آهنگر دیوارشکن',icon:'🔨',color:'#8a8d93',lure:'هیچ دیواری جلودارش نیست.',fx:{cls:{siege:0.45},wall:0.5}},
 {id:'bahram',name:'بهرام',title:'کمین‌گر شب‌رو',icon:'🌙',color:'#3d4f8a',lure:'کمین و حمله‌ی غافلگیرانه؛ انرژی کمتر خرج می‌کند.',fx:{camp:0.5,energy:1,speed:0.15}},
 {id:'jamasp',name:'جاماسپ',title:'حکیم و طبیب',icon:'⚕️',color:'#3fae7a',lure:'مجروح‌ها زنده می‌مانند و درمانشان ارزان‌تر است.',fx:{heal:0.25}},
 {id:'buzurgmehr',name:'بوذرجمهر',title:'وزیر دانا',icon:'🕵️',color:'#9a7bd1',lure:'همه‌چیز را می‌داند؛ جاسوسی‌هایش دو برابر قوی و هاله‌ی آیتم را بی‌خطا می‌بیند.',fx:{spy:1.0}},
 {id:'qarun',name:'قارون',title:'گنج‌یاب بی‌رحم',icon:'💰',color:'#f2c230',lure:'غنیمت بیشتر و شانس بیشتر برای نشان‌های نایاب.',fx:{loot:0.4,item:0.06}},
 {id:'mehrab',name:'مهراب',title:'غول‌کش',icon:'🗿',color:'#c0663a',lure:'ضربه‌ی سنگین به غول آخر فصل و لشکر بزرگ‌تر.',fx:{boss:0.30,cap:0.20}}];
export const CMD=Object.fromEntries(COMMANDERS.map(c=>[c.id,c]));
export const MAX_CMD_LEVEL=10,MAX_UNLOCK=4,TOKEN_LEVELS=[10,20,30];
export const scaleOf=l=>1+0.12*((l||1)-1);
export const upgradeCost=l=>Math.ceil(l/2);          // نشان لازم برای رفتن از سطح l به l+1

export function ensureCmd(S){S.cmd=S.cmd||{tokens:1,unlocked:[],levels:{},emblems:0,granted:[]};return S.cmd;}
// هر ۱۰ لول قلعه یک توکن (لول ۱۰، ۲۰، ۳۰)
export function grantTokens(S){const c=ensureCmd(S),lv=S.buildings.find(b=>b.type==='keep')?.level||1,got=[];
  for(const L of TOKEN_LEVELS)if(lv>=L&&!c.granted.includes(L)){c.granted.push(L);c.tokens++;got.push(L);}
  return got;}
export function unlockCmd(S,id){const c=ensureCmd(S);
  if(!CMD[id]||c.unlocked.includes(id)||c.tokens<1||c.unlocked.length>=MAX_UNLOCK)return false;
  c.tokens--;c.unlocked.push(id);c.levels[id]=1;return true;}
export function upgradeCmd(S,id){const c=ensureCmd(S),l=c.levels[id]||0;
  if(!c.unlocked.includes(id)||l>=MAX_CMD_LEVEL||c.emblems<upgradeCost(l))return false;
  c.emblems-=upgradeCost(l);c.levels[id]=l+1;return true;}
// فرمانده‌هایی که الان همراه لشکر یا در کمپ‌اند
export function busyCmds(S){const b=new Set();
  for(const m of S.marches||[])if(m.cmd)b.add(m.cmd);
  for(const k of S.camps||[])if(k.cmd)b.add(k.cmd);
  return b;}
export const freeCmds=S=>{const b=busyCmds(S);return ensureCmd(S).unlocked.filter(id=>!b.has(id));};
// اثر یک فرمانده با ضریب سطح
export function cmdFx(S,id){if(!id)return{};const c=ensureCmd(S);if(!c.unlocked.includes(id))return{};
  const k=scaleOf(c.levels[id]),f=CMD[id].fx,o={};
  for(const key in f){if(key==='cls'){o.cls={};for(const cl in f.cls)o.cls[cl]=f.cls[cl]*k;}else if(key==='energy')o.energy=(c.levels[id]>=6?2:1);else o[key]=f[key]*k;}
  return o;}
// فرمانده‌ی مستقر در قلعه (آزاد) اثر مشاور دارد: دفاع، درمان؛ و وزیر همیشه جاسوسی را تقویت می‌کند
export function homeFx(S,key){let v=0;const free=new Set(freeCmds(S));
  for(const id of ensureCmd(S).unlocked){if(key==='spy'||free.has(id)){const f=cmdFx(S,id);if(f[key])v=Math.max(v,f[key]);}}
  return v;}
export function battleMods(fx,extra={}){
  const cls={};for(const k in fx.cls||{})cls[k]=1+fx.cls[k];
  return{atk:(1+(fx.atk||0))*(1+(extra.atk||0)),cls,wallIgnore:Math.min(0.9,(fx.wall||0)+(extra.wall||0)),lossMul:1-(fx.loss||0)+(fx.lossUp||0)};}
export const energyCost=(S,cmdId)=>Math.max(2,ENERGY.move-((cmdFx(S,cmdId).energy)||0));
export const armyCap=(S,base,cmdId)=>Math.min(70000,Math.floor(base*(1+(cmdFx(S,cmdId).cap||0))));
// متن اثرها برای نمایش
export function fxChips(f,lvl=1){const k=scaleOf(lvl),p=v=>'+'+Math.round(v*k*100)+'٪',a=[];
  if(f.atk)a.push('⚔ '+p(f.atk)+' قدرت حمله');
  for(const c in f.cls||{})a.push(({inf:'🗡️',spear:'🔱',archer:'🏹',cav:'🐎',siege:'💣'})[c]+' '+p(f.cls[c])+' قدرت');
  if(f.wall)a.push('🧱 '+Math.round(f.wall*k*100)+'٪ نادیده‌گرفتن دیوار');
  if(f.loss)a.push('🩸 −'+Math.round(f.loss*k*100)+'٪ تلفات');
  if(f.lossUp)a.push('☠ +'+Math.round(f.lossUp*k*100)+'٪ تلفات');
  if(f.home)a.push('🏰 '+p(f.home)+' دفاع قلعه');
  if(f.speed)a.push('💨 '+p(f.speed)+' سرعت');
  if(f.camp)a.push('⛺ '+p(f.camp)+' کمین و غافلگیری');
  if(f.energy)a.push('⚡ انرژی کمتر در هر حرکت');
  if(f.heal)a.push('⚕️ مجروح بیشتر زنده می‌ماند، درمان ارزان‌تر');
  if(f.spy)a.push('🕵️ '+p(f.spy)+' قدرت جاسوسی');
  if(f.loot)a.push('💰 '+p(f.loot)+' غنیمت');
  if(f.item)a.push('🎖 شانس بیشتر نشان نایاب');
  if(f.boss)a.push('🗿 '+p(f.boss)+' ضربه به غول');
  if(f.cap)a.push('👥 '+p(f.cap)+' ظرفیت لشکر');
  return a;}
