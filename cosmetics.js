// شخصیت‌های پایه و اسکین‌های انحصاری فصل؛ هیچ آپلود تصویری در بازی وجود ندارد.
export const BASE_AVATARS=[
  {id:'base-warrior-f',name:'ملکه شیرازی',emoji:'👑',image:'assets/avatars/shirazi-queen.jpg',gender:'دختر'},
  {id:'base-archer-f',name:'ملکه جنگجوی ایرانی',emoji:'👑',image:'assets/avatars/warrior-queen.jpg',gender:'دختر'},
  {id:'base-warrior-m',name:'شاه زرتشتی',emoji:'👑',image:'assets/avatars/zoroastrian-king.jpg',gender:'پسر'},
  {id:'base-king-m',name:'شاه سربدار',emoji:'👑',image:'assets/avatars/sarbadar-king.jpg',gender:'پسر'}
];
export const HERO_SKINS=[
  {id:'hero-dragon',name:'اژدهاسوار',emoji:'🐉'},
  {id:'hero-phoenix',name:'ققنوس',emoji:'🔥'},
  {id:'hero-shadow',name:'سایه‌پوش',emoji:'🥷'},
  {id:'hero-emperor',name:'امپراتور',emoji:'👑'},
  {id:'hero-ice',name:'نگهبان یخی',emoji:'🧊'},
  {id:'hero-lion',name:'شیرنشان',emoji:'🦁'},
  {id:'hero-storm',name:'توفان',emoji:'⚡'},
  {id:'hero-royal',name:'سلطنتی',emoji:'💎'}
];
export const CASTLE_SKINS=[
  {id:'castle-dragon',name:'دژ اژدها',emoji:'🐉',className:'castle-skin-dragon',colors:{wall:'#6e5148',keep:'#b47a53',roof:'#a63d2d',shade:'#38211d'}},
  {id:'castle-phoenix',name:'دژ آتشین',emoji:'🔥',className:'castle-skin-phoenix',colors:{wall:'#a65a35',keep:'#e2a04b',roof:'#e34d22',shade:'#6b291c'}},
  {id:'castle-shadow',name:'دژ سایه‌ها',emoji:'🌑',className:'castle-skin-shadow',colors:{wall:'#484653',keep:'#777184',roof:'#292536',shade:'#17151f'}},
  {id:'castle-ice',name:'دژ یخی',emoji:'❄️',className:'castle-skin-ice',colors:{wall:'#8bb9c9',keep:'#d1e8ee',roof:'#4e9dc4',shade:'#456b7c'}},
  {id:'castle-gold',name:'دژ زرین',emoji:'🏆',className:'castle-skin-gold',colors:{wall:'#b89b53',keep:'#f0d58a',roof:'#d5a52d',shade:'#806329'}},
  {id:'castle-lion',name:'دژ شیر',emoji:'🦁',className:'castle-skin-lion',colors:{wall:'#94734a',keep:'#c6a16b',roof:'#a56c2b',shade:'#584027'}},
  {id:'castle-storm',name:'دژ توفان',emoji:'⚡',className:'castle-skin-storm',colors:{wall:'#586c94',keep:'#a9b8d8',roof:'#5963b6',shade:'#29344f'}},
  {id:'castle-royal',name:'دژ سلطنتی',emoji:'👑',className:'castle-skin-royal',colors:{wall:'#80618f',keep:'#c7a3d4',roof:'#8d4fa8',shade:'#482b58'}}
];
export const DEFAULT_AVATAR_ID=BASE_AVATARS[0].id;
export function avatarById(id){return BASE_AVATARS.find(x=>x.id===id)||HERO_SKINS.find(x=>x.id===id)||BASE_AVATARS[0];}
export function castleSkinById(id){return CASTLE_SKINS.find(x=>x.id===id)||null;}
export function seasonCosmetics(seasonId){
  const i=(Math.max(1,Number(seasonId)||1)-1)%HERO_SKINS.length;
  const c=(Math.max(1,Number(seasonId)||1)-1)%CASTLE_SKINS.length;
  return {hero:HERO_SKINS[i],castle:CASTLE_SKINS[c]};
}
