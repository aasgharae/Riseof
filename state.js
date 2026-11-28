import{START_RESOURCES,STORAGE_BASE,WORLD_W,WORLD_H,NPC,NPC_POWER_EXP,NPC_POWER_EXP_OLD,NPC_LOOT_EXP}from'./config.js';
export const SAVE_KEY='village_rise_v9';
export const LEGACY_KEY='village_rise_v8';
export function freshState(){return{v:9,day:1,resources:{...START_RESOURCES},
homePos:{x:WORLD_W*0.5,y:WORLD_H*0.5},
buildings:[
{id:'keep-1',type:'keep',x:13,y:8,level:1},{id:'farm-1',type:'farm',x:8,y:6,level:1},
{id:'farm-2',type:'farm',x:18,y:6,level:1},{id:'lumber-1',type:'lumber',x:6,y:10,level:1},
{id:'lumber-2',type:'lumber',x:20,y:10,level:1},{id:'quarry-1',type:'quarry',x:9,y:13,level:1},
{id:'iron-1',type:'ironmine',x:17,y:13,level:1},
{id:'bar-1',type:'barracks',x:5,y:6,level:1},{id:'bar-2',type:'barracks',x:21,y:6,level:1},
{id:'bar-3',type:'barracks',x:13,y:12,level:1},{id:'muster-1',type:'muster',x:13,y:15,level:1},
{id:'wall-1',type:'wall',x:12,y:7,level:1},{id:'hideout-1',type:'hideout',x:22,y:15,level:1}],
upgrades:[],troops:{swordsman:0,spearman:0,archer:0,axeman:0,guard:0,cavalry:0,camel:0,knight:0,royal:0,ram:0,ballista:0,catapult:0},
training:{'bar-1':[],'bar-2':[],'bar-3':[]},
marches:[],tribes:[],conquered:0,kills:0,log:[],factionKills:{}};}
// سیو نسخه ۸ (جهان کوچک) → ۹: منابع/ساختمان/سرباز حفظ می‌شود، جهان از نو ساخته می‌شود
function migrateV8(o){
  if(!o||o.v!==8)return null;
  for(const m of o.marches||[]){if(m.army&&!m.returning)for(const t in m.army)o.troops[t]=(o.troops[t]||0)+m.army[t];
    else if(m.army)for(const t in m.army)o.troops[t]=(o.troops[t]||0)+m.army[t];}
  o.marches=[];o.tribes=[];o.conquered=0;o.factionKills={};o.kills=0;o.v=9;
  if(!o.log)o.log=[];
  addLog(o,'info','🌍 جهان جدید و بزرگ‌تر (۸۰۰×۵۶۰) ساخته شد — منابع و ساختمان‌هایت حفظ شد');
  return o;}
// قدرت NPCها در فاز ۳٫۳ بالا رفت: قلعه‌ها و گنج‌های سیوهای قدیمی یک‌بار بازمقیاس می‌شوند
export function migrateNpcPower(S){
  if(S.npcPowerV===2)return S;
  const sc=(t,f,lf)=>{for(const id in (t.garrison||{}))t.garrison[id]=Math.max(1,Math.round(t.garrison[id]*f));
    if(t.power!=null)t.power=Math.max(10,Math.floor(t.power*f));if(t.base!=null)t.base=Math.floor(t.base*f);
    for(const r in (t.loot||{}))t.loot[r]=Math.floor(t.loot[r]*lf);};
  for(const t of S.tribes||[]){const L=Math.max(1,t.level||1);sc(t,Math.pow(L,NPC_POWER_EXP-NPC_POWER_EXP_OLD),Math.pow(L,NPC_LOOT_EXP-1));}
  for(const t of S.sites||[]){const L=Math.max(1,t.level||1);sc(t,Math.pow(L,NPC_POWER_EXP-NPC_POWER_EXP_OLD)*NPC.buff,Math.pow(L,NPC_LOOT_EXP-1));}
  for(const r of S.respawns||[]){const L=Math.max(1,r.level||1);if(r.minPower)r.minPower=Math.floor(r.minPower*Math.pow(L,NPC_POWER_EXP-NPC_POWER_EXP_OLD));}
  S.intel={};S.npcPowerV=2;return S;}
// فیلدهای نسخه ۴ (بیمارستان، حمله NPC، گنج، ماموریت) برای سیوهای قدیمی
export function ensureDefaults(S){
  if(!S || typeof S !== 'object') S=freshState();
  S.resources=S.resources&&typeof S.resources==='object'?S.resources:{...START_RESOURCES};
  S.buildings=Array.isArray(S.buildings)?S.buildings:[];
  S.upgrades=Array.isArray(S.upgrades)?S.upgrades:[];
  S.troops=S.troops&&typeof S.troops==='object'?S.troops:{};
  S.training=S.training&&typeof S.training==='object'?S.training:{};
  S.marches=Array.isArray(S.marches)?S.marches:[];
  S.tribes=Array.isArray(S.tribes)?S.tribes:[];
  S.log=Array.isArray(S.log)?S.log:[];
  S.factionKills=S.factionKills&&typeof S.factionKills==='object'?S.factionKills:{};

  // Preserve live world data across reloads. These values were previously reset
  // unconditionally, which erased NPC marches and re-granted the first-day shield.
  S.wounded=S.wounded&&typeof S.wounded==='object'?S.wounded:{};
  S.healing=Array.isArray(S.healing)?S.healing:[];
  S.incoming=Array.isArray(S.incoming)?S.incoming:[];
  S.npcMarches=Array.isArray(S.npcMarches)?S.npcMarches:[];
  S.respawns=Array.isArray(S.respawns)?S.respawns:[];
  S.stats=S.stats&&typeof S.stats==='object'?S.stats:{};
  if(S.nextRaid==null)S.nextRaid=0;
  S.camps=Array.isArray(S.camps)?S.camps:[];
  S.intel=S.intel&&typeof S.intel==='object'?S.intel:{};
  S.pastSeasons=Array.isArray(S.pastSeasons)?S.pastSeasons:[];
  S.seasonHallOfFame=Array.isArray(S.seasonHallOfFame)?S.seasonHallOfFame:[];
  S.chats=S.chats&&typeof S.chats==='object'?S.chats:{};
  S.unread=S.unread&&typeof S.unread==='object'?S.unread:{};
  S.players=Array.isArray(S.players)?S.players:[];
  S.profile=S.profile&&typeof S.profile==='object'?S.profile:{name:'فرمانروا',avatarId:'base-warrior-f',flag:'🏰',title:'فرمانروای قلمرو',bio:'',unlockedHeroSkins:[],unlockedCastleSkins:[]};
  if(!S.profile.avatarId)S.profile.avatarId='base-warrior-f';
  S.profile.unlockedHeroSkins=Array.isArray(S.profile.unlockedHeroSkins)?S.profile.unlockedHeroSkins:[];
  S.profile.unlockedCastleSkins=Array.isArray(S.profile.unlockedCastleSkins)?S.profile.unlockedCastleSkins:[];
  S.seasonsList=Array.isArray(S.seasonsList)?S.seasonsList:[{id:1,name:'فصل ۱'}];
  if(S.mySeason==null)S.mySeason=1;
  S.sysMsgs=Array.isArray(S.sysMsgs)?S.sysMsgs:[];
  S.clans=Array.isArray(S.clans)?S.clans:[];
  if(S.myClan===undefined)S.myClan=null;
  S.clanChats=S.clanChats&&typeof S.clanChats==='object'?S.clanChats:{};
  if(S.unreadClan==null)S.unreadClan=0;
  S.invites=Array.isArray(S.invites)?S.invites:[];
  S.clanRequests=Array.isArray(S.clanRequests)?S.clanRequests:[];
  // null is meaningful to clans.js: it initializes the first-day shield once.
  if(!Object.prototype.hasOwnProperty.call(S,'shield'))S.shield=null;
  if(!S.cmd)S.cmd={tokens:1,unlocked:[],levels:{},emblems:0,granted:[]};
  S.buildings=S.buildings.filter(b=>b&&b.type!=='goldmine');
  S.upgrades=S.upgrades.filter(u=>u&&u.type!=='goldmine');
  if(!S.resources.gold||S.resources.gold<0)S.resources.gold=0;
  if(!S.buildings.some(b=>b&&b.type==='hospital'))S.buildings.push({id:'hosp-1',type:'hospital',x:22,y:13,level:1});
  if(!S.buildings.some(b=>b&&b.type==='hideout'))S.buildings.push({id:'hideout-1',type:'hideout',x:22,y:15,level:1});
  if(!Number.isFinite(S.lastTickAt))S.lastTickAt=Date.now();
  migrateNpcPower(S);
  return S;
}
function loadRaw(){try{const s=localStorage.getItem(SAVE_KEY);
  if(s){const o=JSON.parse(s);if(o.v===9){if(!o.log)o.log=[];if(o.kills==null)o.kills=0;return o;}}
  const old=localStorage.getItem(LEGACY_KEY);
  if(old){const m=migrateV8(JSON.parse(old));if(m){save(m);return m;}}
}catch(e){}const f=freshState();save(f);return f;}
export const load=()=>ensureDefaults(loadRaw());
export function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}}
export function storageCap(s){const k=(s.buildings.find(b=>b.type==='keep')?.level||1);return STORAGE_BASE+k*1000000;}
export function troopCap(s){return Infinity;}
export function addLog(s,kind,text,detail){const e={t:Date.now(),id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind,text};if(detail)e.d=detail;s.log.unshift(e);if(s.log.length>120)s.log.length=120;}
