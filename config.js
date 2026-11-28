export const CONFIG={seasonLength:45,dayMs:86400000,tickMs:1000};

// ---- منابع اولیه: خیلی بالا برای تست آزادانه (v3) ----
export const START_RESOURCES={food:2000000000,wood:1500000000,stone:1200000000,iron:800000000,gold:0};
export const SEASON_START_RESOURCES={food:100000,wood:75000,stone:50000,iron:25000};
export const STORAGE_BASE=50000000000;
export const BATCH_OPTIONS=[1,10,100,1000,10000];
export const MAX_LEVEL=30;

// ---- جهان بزرگ‌تر ----
export const WORLD_W=800,WORLD_H=560;
export const CASTLE_COUNT=600;

// ---- ۵ قبیله بزرگ NPC: هر کدام قلمرو، رنگ و نام خودشان را دارند ----
export const FACTIONS=[
 {id:'wolf',name:'گرگ‌های شمال',icon:'🐺',color:'#7fb4e0'},
 {id:'falcon',name:'شاهین‌های صحرا',icon:'🦅',color:'#e0b34d'},
 {id:'dragon',name:'اژدهایان آتش',icon:'🐉',color:'#e05c4d'},
 {id:'bear',name:'خرس‌های کوهستان',icon:'🐻',color:'#b08a5a'},
 {id:'serpent',name:'مارهای جنوب',icon:'🐍',color:'#6fc46f'}];

// قلمرو قبیله‌ها: جهان به ۵ قطاع زاویه‌ای دور مرکز تقسیم می‌شود
export function factionAt(x,y){
  const cx=WORLD_W/2,cy=WORLD_H/2;
  let a=Math.atan2(y-cy,x-cx);if(a<0)a+=Math.PI*2;
  const idx=Math.floor(a/(Math.PI*2/FACTIONS.length))%FACTIONS.length;
  return{...FACTIONS[idx],idx};}

// سطح قلعه بر اساس فاصله از خانه: نزدیک‌ها ضعیف، دورها قوی
export function tribeLevelAt(distRatio){
  return 1+Math.floor((MAX_LEVEL-1)*Math.pow(Math.max(0,Math.min(1,distRatio)),0.75));}

// ---- troops: 12 types, no gold in costs (gold is only for speed-ups) ----
export const TROOPS={
swordsman:{name:'شمشیرزن',icon:'🗡️',cost:{food:60,iron:20},time:15,power:12,unlock:1},
spearman:{name:'نیزه‌دار',icon:'🔱',cost:{food:50,wood:30},time:14,power:10,unlock:1},
archer:{name:'کماندار',icon:'🏹',cost:{food:70,wood:50},time:18,power:14,unlock:1},
axeman:{name:'تبرزن',icon:'🪓',cost:{food:80,wood:40},time:20,power:16,unlock:3},
guard:{name:'سپردار',icon:'🛡️',cost:{food:90,wood:60,iron:30},time:24,power:20,unlock:5},
cavalry:{name:'سواره‌نظام',icon:'🐎',cost:{food:120,iron:40},time:30,power:28,unlock:7},
camel:{name:'شترسوار',icon:'🐫',cost:{food:130,wood:50,iron:45},time:34,power:34,unlock:9},
knight:{name:'شوالیه',icon:'⚜️',cost:{food:160,iron:90,stone:40},time:42,power:44,unlock:11},
royal:{name:'گارد سلطنتی',icon:'👑',cost:{food:220,iron:130,stone:80},time:55,power:60,unlock:14},
ram:{name:'دژکوب',icon:'🐏',cost:{wood:260,iron:110,stone:120},time:60,power:70,unlock:17},
ballista:{name:'بالیستا',icon:'🎯',cost:{wood:220,iron:130},time:65,power:82,unlock:20},
catapult:{name:'منجنیق',icon:'💣',cost:{wood:280,stone:220,iron:100},time:80,power:105,unlock:24},
spy:{name:'جاسوس',icon:'🕵️',cost:{food:90,wood:50,iron:15},time:22,power:1,unlock:4}};

// ---- کلاس نیروها و تقابل: پیاده > نیزه‌دار > سواره > کماندار > پیاده (چرخه) ----
export const TROOP_CLASS={swordsman:'inf',axeman:'inf',guard:'inf',spearman:'spear',archer:'archer',
 cavalry:'cav',camel:'cav',knight:'cav',royal:'cav',ram:'siege',ballista:'siege',catapult:'siege',spy:'spy'};
export const CLASS_INFO={inf:{name:'پیاده',icon:'🗡️'},spear:{name:'نیزه‌دار',icon:'🔱'},archer:{name:'کماندار',icon:'🏹'},
 cav:{name:'سواره',icon:'🐎'},siege:{name:'محاصره',icon:'💣'},spy:{name:'جاسوس',icon:'🕵️'}};
// COUNTER[مهاجم][مدافع] = ضریب قدرت مهاجم در برابر آن کلاس
export const COUNTER={
 inf:{inf:1,spear:1.5,archer:0.75,cav:1,siege:1.3},
 spear:{inf:0.7,spear:1,archer:1,cav:1.6,siege:1.2},
 archer:{inf:1.5,spear:1,archer:1,cav:0.65,siege:1},
 cav:{inf:1,spear:0.6,archer:1.6,cav:1,siege:1.4},
 siege:{inf:1.2,spear:1,archer:1,cav:0.7,siege:1}};

// ---- buildings: gold mine removed in v13 ----
export const BUILD_DEFS={
keep:{name:'قلعه',icon:'🏰',max:30,baseTime:40},
farm:{name:'مزرعه',icon:'🌾',max:30,baseTime:25},
lumber:{name:'چوب‌بری',icon:'🪵',max:30,baseTime:25},
quarry:{name:'معدن سنگ',icon:'🪨',max:30,baseTime:30},
ironmine:{name:'معدن آهن',icon:'⛓️',max:30,baseTime:35},
barracks:{name:'سربازخانه',icon:'⚔️',max:30,baseTime:50},
muster:{name:'لشکر',icon:'🚩',max:30,baseTime:60},
wall:{name:'دیوار',icon:'🧱',max:30,baseTime:45},
hospital:{name:'بیمارستان',icon:'🏥',max:30,baseTime:50},
hideout:{name:'مخفیگاه',icon:'🕳️',max:30,baseTime:55}};

// ---- بیمارستان: ظرفیت مجروح، هزینه و زمان درمان ----
export const WOUNDED_RATIO=0.55;   // سهم مجروح از تلفات (بقیه کشته)
export const HEAL_COST_RATIO=0.35;  // هزینه درمان = ۳۵٪ هزینه ساخت
export const HEAL_TIME_RATIO=0.25;  // زمان درمان = ۲۵٪ زمان ساخت
export function hospitalCap(l){return l<=0?0:Math.floor(250*l*(1+l*0.1));}

export function buildingProd(t,l){
  if(t==='farm')return{food:30*l};
  if(t==='lumber')return{wood:24*l};
  if(t==='quarry')return{stone:18*l};
  if(t==='ironmine')return{iron:12*l};
  return{};}

// cost grows ~55% per level; NO gold cost anywhere
export function upgradeCost(t,l){const m=Math.pow(1.55,l);
  return{food:Math.floor(100*m),wood:Math.floor(90*m),stone:Math.floor(60*m),iron:Math.floor(20*m)};}

// each upgrade takes 18% longer than the previous one
export function upgradeTime(t,l){const d=BUILD_DEFS[t];return Math.ceil(d.baseTime*Math.pow(1.18,l)*10);}
// ظرفیت مستقل مخفیگاه برای هر منبع؛ سطح ۳۰ = ۱٫۵۵ میلیون از هر منبع
export function hideoutCap(level){return level<=0?0:50000+50000*Math.min(30,level);}
export function formatDuration(sec){sec=Math.max(0,Math.ceil(sec||0));if(sec<60)return sec+'ث';const m=Math.ceil(sec/60);if(m<60)return m+'د';const h=Math.ceil(m/60);if(h<24)return h+'س';return Math.ceil(h/24)+'روز';}

// ---- gold speed-up: the ONLY use of gold ----
export function speedCost(sec){return Math.max(1,Math.ceil(sec/60*2));}

// ---- expedition (لشکر) ----
export const ARMY_CAP_MAX=70000;
export function expeditionCap(s){const m=s.buildings.find(b=>b.type==='muster')?.level||1;return Math.round(m*ARMY_CAP_MAX/30);} // سطح ۳۰ = ۷۰٬۰۰۰ سرباز
export function maxMarches(s){const m=s.buildings.find(b=>b.type==='muster')?.level||1;return 1+Math.floor(m/3);}
export function marchSpeed(){return 0.1;} // tiles per second؛ حرکت واقعی و کندتر

export const EXTRA_NAMES=['گرگ','شاهین','اژدها','پلنگ','عقاب','خرس','روباه','شیر','مار','گراز','کلاغ','ببر','کرم','سیاه‌پوش','آذرخش','بهشتی','سرداب','دریا','باد','باران','صخره','توفان','خنجر','سپر','نیزه','تاج','ستاره','ماه','خورشید','رعد'];

// ---- NPC: رشد، جنگ بین خودشان، حمله به بازیکن ----
// قدرت اثر تقابل: ۱ = جدول کامل، ۰ = بدون تقابل. ضریب نهایی = 1 + (ضریب جدول − 1) × این عدد
export const COUNTER_STRENGTH=0.6;
// ظرفیت حمل غنیمت هر سرباز زنده‌ی مهاجم (مجموع همه‌ی منابع)
export const CARRY_PER_UNIT=40;
// قدرت پایه‌ی گارد هر قلعه/گنج = 150 × سطح^NPC_POWER_EXP (قبلاً ۱٫۷۵). سطح ۳۰ حدود ۶٫۵ برابر قوی‌تر از قبل است.
export const NPC_POWER_EXP=2.3,NPC_POWER_EXP_OLD=1.75;
// غنیمت هر قلعه/گنج ∝ سطح^NPC_LOOT_EXP (قبلاً ۱٫۰) تا با قدرت بیشتر هماهنگ باشد
export const NPC_LOOT_EXP=1.45;
export const NPC={buff:2.6,growCap:4.5,growStep:1.018,warEverySec:12,raidMinSec:150,raidMaxSec:330,firstRaidSec:240,raidSpeed:0.05,warSpeed:0.05,
 respawnMinSec:45,respawnMaxSec:120,siteCooldownSec:480};

// ---- انرژی روزانه، فصل، غول، کمپ ----
export const ENERGY={max:100,move:5,spy:2};           // هر جابجایی لشکر ۵ واحد از ۱۰۰ واحد روزانه
export const INTEL_TTL=600;                           // ثانیه اعتبار اطلاعات جاسوسی
export const SEASON={days:CONFIG.seasonLength,bossHours:48,rotHours:6,itemPool:20,maxHits:16};
export const CAMP={surprise:0.2,wallIgnore:0.3,speed:0.5,radius:9};
export const maxCamps=s=>{const m=s.buildings.find(b=>b.type==='muster')?.level||1;return 1+(m>=12?1:0)+(m>=24?1:0);};
export const BOSS_POS={x:WORLD_W/2,y:WORLD_H/2};
