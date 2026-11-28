import{makeRng}from'./js/noise.js';
import{armyPower}from'./combat.js';

// ---- ماموریت‌ها و دستاوردها ----
const DAILY=[
 {key:'won',goals:[2,3,5],ic:'⚔️',t:n=>'در '+n+' نبرد پیروز شو'},
 {key:'trained',goals:[300,600,1000],ic:'🛡️',t:n=>n+' سرباز بساز'},
 {key:'upgraded',goals:[1,2,3],ic:'🏗️',t:n=>n+' ساختمان را ارتقا بده'},
 {key:'healed',goals:[100,250,500],ic:'🏥',t:n=>n+' مجروح را درمان کن'},
 {key:'defended',goals:[1,1,2],ic:'🧱',t:n=>n+' حمله دشمن را دفع کن'},
 {key:'sites',goals:[1,1,2],ic:'💎',t:n=>n+' گنج یا غار را غارت کن'},
 {key:'kills',goals:[500,1500,3000],ic:'☠️',t:n=>n+' دشمن را بکش'},
 {key:'marches',goals:[3,5,8],ic:'🚩',t:n=>n+' لشکرکشی انجام بده'}];
const WEEKLY=[
 {key:'won',goals:[15,25,40],ic:'🏆',t:n=>'در '+n+' نبرد پیروز شو'},
 {key:'trained',goals:[5000,10000,20000],ic:'🛡️',t:n=>n+' سرباز بساز'},
 {key:'upgraded',goals:[8,12,20],ic:'🏗️',t:n=>n+' ارتقای ساختمان'},
 {key:'defended',goals:[4,6,10],ic:'🧱',t:n=>n+' حمله دشمن را دفع کن'},
 {key:'sites',goals:[4,7,12],ic:'💎',t:n=>n+' گنج و غار را غارت کن'},
 {key:'kills',goals:[10000,25000,60000],ic:'☠️',t:n=>n+' دشمن را بکش'},
 {key:'healed',goals:[2000,5000,10000],ic:'🏥',t:n=>n+' مجروح را درمان کن'},
 {key:'conquered',goals:[5,10,20],ic:'🏰',t:n=>n+' قلعه را فتح کن'}];
export const ACH=[
 {id:'conquered',key:'conquered',ic:'🏰',name:'فاتح',goals:[1,10,50,150,400],t:n=>n+' قلعه فتح کن'},
 {id:'kills',key:'kills',ic:'☠️',name:'قتل‌عام',goals:[1000,10000,100000,1000000],t:n=>n+' دشمن بکش'},
 {id:'won',key:'won',ic:'⚔️',name:'شکست‌ناپذیر',goals:[1,25,100,500],t:n=>n+' نبرد ببر'},
 {id:'trained',key:'trained',ic:'🛡️',name:'سردار',goals:[1000,10000,100000],t:n=>n+' سرباز بساز'},
 {id:'defended',key:'defended',ic:'🧱',name:'دیوار آهنین',goals:[1,10,50],t:n=>n+' حمله را دفع کن'},
 {id:'sites',key:'sites',ic:'💎',name:'گنج‌یاب',goals:[1,10,30],t:n=>n+' گنج/غار غارت کن'},
 {id:'healed',key:'healed',ic:'🏥',name:'طبیب',goals:[1000,10000,100000],t:n=>n+' مجروح درمان کن'},
 {id:'keepLevel',key:'keepLevel',ic:'👑',name:'ارباب قلعه',goals:[5,10,20,30],t:n=>'قلعه را به سطح '+n+' برسان'},
 {id:'power',key:'power',ic:'💪',name:'ارتش بزرگ',goals:[10000,100000,1000000,10000000],t:n=>'قدرت ارتش به '+n+' برسد'},
 {id:'armyCount',key:'armyCount',ic:'🪖',name:'لشکر انبوه',cat:'نظامی',goals:[5000,25000,100000,300000],t:n=>'تعداد سربازان به '+n+' برسد'},
 {id:'wallLevel',key:'wallLevel',ic:'🧱',name:'دژ نفوذناپذیر',cat:'دفاعی',goals:[5,10,20,30],t:n=>'دیوار را به سطح '+n+' برسان'},
 {id:'hideoutLevel',key:'hideoutLevel',ic:'🕳️',name:'امین منابع',cat:'اقتصادی',goals:[5,10,20,30],t:n=>'مخفیگاه را به سطح '+n+' برسان'},
 {id:'hospitalLevel',key:'hospitalLevel',ic:'🏥',name:'درمانگر بزرگ',cat:'پشتیبانی',goals:[5,10,20,30],t:n=>'بیمارستان را به سطح '+n+' برسان'},
 {id:'buildingsLevel',key:'buildingsLevel',ic:'🏗️',name:'معمار امپراتوری',cat:'عمرانی',goals:[30,70,140,250],t:n=>'مجموع سطوح ساختمان‌ها به '+n+' برسد'},
 {id:'resourceStock',key:'resourceStock',ic:'📦',name:'انباردار',cat:'اقتصادی',goals:[1000000,10000000,50000000,100000000],t:n=>'موجودی منابع به '+n+' برسد'},
 {id:'goldStock',key:'goldStock',ic:'🪙',name:'خزانه‌دار',cat:'اقتصادی',goals:[500,2500,10000,50000],t:n=>'موجودی سکه به '+n+' برسد'},
 {id:'commanderCount',key:'commanderCount',ic:'🎖️',name:'شورای فرماندهی',cat:'نظامی',goals:[1,2,3,4],t:n=>n+' فرمانده آزاد کن'},
 {id:'campCount',key:'campCount',ic:'⛺',name:'استاد کمین',cat:'اکتشاف',goals:[1,2,3,5],t:n=>'هم‌زمان '+n+' کمپ داشته باش'},
 {id:'bossDamage',key:'bossDamage',ic:'🗿',name:'شکارچی غول',cat:'قهرمانی',goals:[10000,100000,1000000,10000000],t:n=>'به غول '+n+' آسیب وارد کن'},
 {id:'bossHits',key:'bossHits',ic:'💥',name:'ضربه‌زن',cat:'قهرمانی',goals:[1,10,50,100],t:n=>n+' بار به غول ضربه بزن'},
 {id:'spyCount',key:'spyCount',ic:'🕵️',name:'چشم پنهان',cat:'اطلاعاتی',goals:[10,50,250,1000],t:n=>'تعداد جاسوس‌ها به '+n+' برسد'},
 {id:'clanJoined',key:'clanJoined',ic:'🏳️',name:'هم‌پیمان',cat:'اجتماعی',goals:[1],t:()=> 'به یک قبیله بپیوند'},
 {id:'marcher',key:'marches',ic:'🚩',name:'راه‌پیمای بزرگ',cat:'اکتشاف',goals:[10,50,200,1000],t:n=>n+' لشکرکشی انجام بده'},
 {id:'builder',key:'upgraded',ic:'🔨',name:'سازنده',cat:'عمرانی',goals:[10,50,200,500],t:n=>n+' بار ساختمان ارتقا بده'},
 {id:'trainer',key:'trained',ic:'⚔️',name:'فرمانده سپاه',cat:'نظامی',goals:[5000,50000,250000,1000000],t:n=>n+' سرباز آموزش بده'},
 {id:'healer',key:'healed',ic:'🩹',name:'شفادهنده',cat:'پشتیبانی',goals:[500,5000,50000,250000],t:n=>n+' سرباز درمان کن'},
 {id:'explorer',key:'sites',ic:'🧭',name:'کاوشگر',cat:'اکتشاف',goals:[5,25,100,500],t:n=>n+' مکان را غارت کن'},
 {id:'guardian',key:'defended',ic:'🛡️',name:'نگهبان قلمرو',cat:'دفاعی',goals:[5,25,100,500],t:n=>n+' حمله را دفع کن'},
 {id:'fieldHero',key:'won',ic:'🏅',name:'قهرمان میدان',cat:'نظامی',goals:[10,50,250,1000],t:n=>n+' نبرد پیروز شو'},
 {id:'warstorm',key:'kills',ic:'🔥',name:'طوفان جنگ',cat:'نظامی',goals:[5000,50000,500000,5000000],t:n=>n+' دشمن را شکست بده'},
 {id:'expansionist',key:'conquered',ic:'🏴',name:'گسترش‌طلب',cat:'قلمرو',goals:[5,25,100,500],t:n=>n+' قلعه فتح کن'},
 {id:'legendpower',key:'power',ic:'👑',name:'قدرت افسانه‌ای',cat:'نظامی',goals:[50000,250000,1000000,5000000],t:n=>'قدرت ارتش به '+n+' برسد'}];
const ACH_GOLD=[60,180,450,1100,2600];

export function getStat(S,key){
  if(key==='kills')return S.kills||0;
  if(key==='conquered')return S.conquered||0;
  if(key==='keepLevel')return S.buildings.find(b=>b.type==='keep')?.level||1;
  if(key==='wallLevel')return S.buildings.find(b=>b.type==='wall')?.level||0;
  if(key==='hideoutLevel')return S.buildings.find(b=>b.type==='hideout')?.level||0;
  if(key==='hospitalLevel')return S.buildings.find(b=>b.type==='hospital')?.level||0;
  if(key==='power')return armyPower(S.troops);
  if(key==='armyCount')return Object.values(S.troops||{}).reduce((a,b)=>a+(b||0),0);
  if(key==='resourceStock')return Object.values(S.resources||{}).reduce((a,b)=>a+(b||0),0);
  if(key==='goldStock')return S.resources?.gold||0;
  if(key==='buildingsLevel')return (S.buildings||[]).reduce((a,b)=>a+(b.level||0),0);
  if(key==='commanderCount')return S.cmd?.unlocked?.length||0;
  if(key==='campCount')return S.camps?.length||0;
  if(key==='bossDamage')return S.boss?.dmg||0;
  if(key==='bossHits')return S.boss?.hits||0;
  if(key==='spyCount')return S.troops?.spy||0;
  if(key==='clanJoined')return S.myClan?1:0;
  return(S.stats&&S.stats[key])||0;}
export const bump=(S,key,n=1)=>{S.stats=S.stats||{};S.stats[key]=(S.stats[key]||0)+n;};

const hashStr=s=>{let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const dayKey=(now=Date.now())=>{const d=new Date(now);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
export function weekKey(now=Date.now()){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+1)%7));return dayKey(d.getTime());} // شروع هفته: شنبه

function makeSet(S,pool,count,seed,mult){
  const rng=makeRng(hashStr(seed)),idx=[...pool.keys()],out=[];
  for(let i=0;i<count;i++){
    const p=pool[idx.splice((rng()*idx.length)|0,1)[0]],tier=(rng()*p.goals.length)|0,goal=p.goals[tier];
    out.push({key:p.key,goal,ic:p.ic,label:p.t(goal),base:getStat(S,p.key),claimed:false,
      reward:{gold:Math.floor((100+tier*70)*mult),food:Math.floor(600000*(1+tier)*mult),wood:Math.floor(450000*(1+tier)*mult),iron:Math.floor(180000*(1+tier)*mult)}});}
  return out;}
export function ensureQuests(S,now=Date.now()){
  S.stats=S.stats||{};
  const q=S.quests=S.quests||{day:'',week:'',daily:[],weekly:[],ach:{}};
  if(q.day!==dayKey(now)){q.day=dayKey(now);q.daily=makeSet(S,DAILY,4,'d'+q.day,1);}
  if(q.week!==weekKey(now)){q.week=weekKey(now);q.weekly=makeSet(S,WEEKLY,4,'w'+q.week,6);}
  return q;}
export const progress=(S,q)=>Math.max(0,Math.min(q.goal,getStat(S,q.key)-q.base));
const achProgress=(S,a,goal)=>Math.min(goal,getStat(S,a.key));

function pay(S,rw){for(const k in rw)S.resources[k]=(S.resources[k]||0)+rw[k];}
export function claimQuest(S,list,i){
  const q=S.quests[list]?.[i];if(!q||q.claimed||progress(S,q)<q.goal)return null;
  q.claimed=true;pay(S,q.reward);return q.reward;}
export function claimAch(S,id){
  const a=ACH.find(x=>x.id===id);if(!a)return null;
  const tier=S.quests.ach[id]||0,goal=a.goals[tier];
  if(goal==null||getStat(S,a.key)<goal)return null;
  const rw={gold:ACH_GOLD[Math.min(tier,ACH_GOLD.length-1)],food:2000000*(tier+1),iron:600000*(tier+1)};
  S.quests.ach[id]=tier+1;pay(S,rw);return rw;}
export function countClaimable(S){
  if(!S.quests)return 0;let n=0;
  for(const l of['daily','weekly'])for(const q of S.quests[l])if(!q.claimed&&progress(S,q)>=q.goal)n++;
  for(const a of ACH){const t=S.quests.ach[a.id]||0;if(a.goals[t]!=null&&getStat(S,a.key)>=a.goals[t])n++;}
  return n;}

// ---- HTML ----
const rwStr=(rw,fmt)=>'🪙'+fmt(rw.gold)+' 🌾'+fmt(rw.food)+(rw.wood?' 🪵'+fmt(rw.wood):'')+(rw.iron?' ⛓️'+fmt(rw.iron):'');
function timeLeft(ms){const m=Math.max(0,Math.floor(ms/60000));return m>=1440?Math.floor(m/1440)+' روز '+Math.floor(m%1440/60)+' ساعت':Math.floor(m/60)+':'+String(m%60).padStart(2,'0')+' ساعت';}
export function questsHTML(S,tab,fmt,now=Date.now()){
  const q=ensureQuests(S,now);
  const tabs='<div class="seg">'+[['daily','🌅 روزانه'],['weekly','📅 هفتگی'],['ach','🏅 دستاوردها']].map(([k,l])=>'<button class="'+(tab===k?'on':'')+'" onclick="setQTab(\''+k+'\')">'+l+'</button>').join('')+'</div>';
  const card=(it,list,i)=>{const p=progress(S,it),done=p>=it.goal,pct=Math.floor(p/it.goal*100);
    return '<div class="card'+(it.claimed?' dim':'')+'"><div class="bhead">'+it.ic+' <b>'+it.label+'</b><span class="lvl">'+fmt(p)+'/'+fmt(it.goal)+'</span></div>'
     +'<div class="bar"><i style="width:'+pct+'%"></i></div><div class="q">🎁 '+rwStr(it.reward,fmt)
     +(it.claimed?' <span class="tag">✔ دریافت شد</span>':done?' <button class="btn sm gold" onclick="claimQ(\''+list+'\','+i+')">🎁 دریافت</button>':'')+'</div></div>';};
  if(tab==='ach'){
    return tabs+ACH.map(a=>{const t=q.ach[a.id]||0,goal=a.goals[t],max=goal==null;
      const cur=max?a.goals[a.goals.length-1]:achProgress(S,a,goal),pct=max?100:Math.floor(cur/goal*100);
      const rw={gold:ACH_GOLD[Math.min(t,ACH_GOLD.length-1)],food:2000000*(t+1),iron:600000*(t+1)};
      return '<div class="achievement-card"><div class="ach-head"><span class="ach-icon">'+a.ic+'</span><b>'+a.name+'</b><span class="ach-cat">'+(a.cat||'افتخار')+'</span><span class="lvl">مرحله '+Math.min(t+1,a.goals.length)+'/'+a.goals.length+'</span></div>'
       +(max?'<div class="q">🏅 همه مراحل کامل شد</div>':'<div class="q">'+a.t(fmt(goal))+' — '+fmt(cur)+'/'+fmt(goal)+'</div><div class="bar"><i style="width:'+pct+'%"></i></div><div class="q">🎁 '+rwStr(rw,fmt)
        +(cur>=goal?' <button class="btn sm gold" onclick="claimA(\''+a.id+'\')">🎁 دریافت</button>':'')+'</div>')+'</div>';}).join('');}
  const d=new Date(now);const midnight=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime();
  const wk=new Date(weekKey(now).split('-')[0],weekKey(now).split('-')[1]-1,+weekKey(now).split('-')[2]+7).getTime();
  const list=tab==='weekly'?q.weekly:q.daily;
  return tabs+'<div class="q">⏳ تا ریست: '+timeLeft((tab==='weekly'?wk:midnight)-now)+'</div>'+list.map((it,i)=>card(it,tab,i)).join('');}
