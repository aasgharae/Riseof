import{START_RESOURCES,STORAGE_BASE,WORLD_W,WORLD_H}from'./config.js';
export const SAVE_KEY='village_rise_v9';
export const LEGACY_KEY='village_rise_v8';
export function freshState(){return{v:9,day:1,resources:{...START_RESOURCES},
homePos:{x:WORLD_W*0.5,y:WORLD_H*0.5},
buildings:[
{id:'keep-1',type:'keep',x:13,y:8,level:1},{id:'farm-1',type:'farm',x:8,y:6,level:1},
{id:'farm-2',type:'farm',x:18,y:6,level:1},{id:'lumber-1',type:'lumber',x:6,y:10,level:1},
{id:'lumber-2',type:'lumber',x:20,y:10,level:1},{id:'quarry-1',type:'quarry',x:9,y:13,level:1},
{id:'iron-1',type:'ironmine',x:17,y:13,level:1},{id:'gold-1',type:'goldmine',x:13,y:4,level:1},
{id:'bar-1',type:'barracks',x:5,y:6,level:1},{id:'bar-2',type:'barracks',x:21,y:6,level:1},
{id:'bar-3',type:'barracks',x:13,y:12,level:1},{id:'muster-1',type:'muster',x:13,y:15,level:1},
{id:'wall-1',type:'wall',x:12,y:7,level:1}],
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
// فیلدهای نسخه ۴ (بیمارستان، حمله NPC، گنج، ماموریت) برای سیوهای قدیمی
export function ensureDefaults(S){
  S.wounded=S.wounded||{};S.healing=S.healing||[];S.incoming=S.incoming||[];S.npcMarches=[];S.respawns=S.respawns||[];
  S.stats=S.stats||{};if(S.nextRaid==null)S.nextRaid=0;
  S.camps=S.camps||[];S.intel=S.intel||{};S.pastSeasons=S.pastSeasons||[];
  if(!S.cmd)S.cmd={tokens:1,unlocked:[],levels:{},emblems:0,granted:[]};
  if(!S.buildings.some(b=>b.type==='hospital'))S.buildings.push({id:'hosp-1',type:'hospital',x:22,y:13,level:1});
  return S;}
function loadRaw(){try{const s=localStorage.getItem(SAVE_KEY);
  if(s){const o=JSON.parse(s);if(o.v===9){if(!o.log)o.log=[];if(o.kills==null)o.kills=0;return o;}}
  const old=localStorage.getItem(LEGACY_KEY);
  if(old){const m=migrateV8(JSON.parse(old));if(m){save(m);return m;}}
}catch(e){}const f=freshState();save(f);return f;}
export const load=()=>ensureDefaults(loadRaw());
export function save(s){try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}}
export function storageCap(s){const k=(s.buildings.find(b=>b.type==='keep')?.level||1);return STORAGE_BASE+k*1000000;}
export function troopCap(s){return Infinity;}
export function addLog(s,kind,text){s.log.unshift({t:Date.now(),kind,text});if(s.log.length>60)s.log.length=60;}
