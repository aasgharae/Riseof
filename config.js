export const CONFIG={seasonLength:45,dayMs:86400000,tickMs:1000};

// ---- منابع اولیه: خیلی بالا برای تست آزادانه (v3) ----
export const START_RESOURCES={food:2000000000,wood:1500000000,stone:1200000000,iron:800000000,gold:5000000};
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
catapult:{name:'منجنیق',icon:'💣',cost:{wood:280,stone:220,iron:100},time:80,power:105,unlock:24}};

// ---- buildings: all upgrade to level 30 ----
export const BUILD_DEFS={
keep:{name:'قلعه',icon:'🏰',max:30,baseTime:40},
farm:{name:'مزرعه',icon:'🌾',max:30,baseTime:25},
lumber:{name:'چوب‌بری',icon:'🪵',max:30,baseTime:25},
quarry:{name:'معدن سنگ',icon:'🪨',max:30,baseTime:30},
ironmine:{name:'معدن آهن',icon:'⛓️',max:30,baseTime:35},
goldmine:{name:'معدن طلا',icon:'🪙',max:30,baseTime:45},
barracks:{name:'سربازخانه',icon:'⚔️',max:30,baseTime:50},
muster:{name:'لشکر',icon:'🚩',max:30,baseTime:60},
wall:{name:'دیوار',icon:'🧱',max:30,baseTime:45}};

export function buildingProd(t,l){
  if(t==='farm')return{food:30*l};
  if(t==='lumber')return{wood:24*l};
  if(t==='quarry')return{stone:18*l};
  if(t==='ironmine')return{iron:12*l};
  if(t==='goldmine')return{gold:2*l};
  return{};}

// cost grows ~55% per level; NO gold cost anywhere
export function upgradeCost(t,l){const m=Math.pow(1.55,l);
  return{food:Math.floor(100*m),wood:Math.floor(90*m),stone:Math.floor(60*m),iron:Math.floor(20*m)};}

// each upgrade takes 18% longer than the previous one
export function upgradeTime(t,l){const d=BUILD_DEFS[t];return Math.ceil(d.baseTime*Math.pow(1.18,l));}

// ---- gold speed-up: the ONLY use of gold ----
export function speedCost(sec){return Math.max(1,Math.ceil(sec/60*2));}

// ---- expedition (لشکر) ----
export function expeditionCap(s){const m=s.buildings.find(b=>b.type==='muster')?.level||1;return 60+m*20;}
export function maxMarches(s){const m=s.buildings.find(b=>b.type==='muster')?.level||1;return 1+Math.floor(m/3);}
export function marchSpeed(){return 3;} // tiles per second

export const EXTRA_NAMES=['گرگ','شاهین','اژدها','پلنگ','عقاب','خرس','روباه','شیر','مار','گراز','کلاغ','ببر','کرم','سیاه‌پوش','آذرخش','بهشتی','سرداب','دریا','باد','باران','صخره','توفان','خنجر','سپر','نیزه','تاج','ستاره','ماه','خورشید','رعد'];
