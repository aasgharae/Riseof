import{BIOME}from'./js/worldgen.js';
import{WORLD_W,WORLD_H,CAMP,marchSpeed}from'./config.js';
import{battle,armyCount}from'./combat.js';
import{battleMods,cmdFx}from'./commanders.js';

// جای کمپ: خشکی، دور از قلعه و گنج و کمپ‌های دیگر
export function campSpotError(S,terr,x,y){
  if(x<3||y<3||x>WORLD_W-3||y>WORLD_H-3)return'خارج از نقشه';
  if(terr[Math.floor(y)*WORLD_W+Math.floor(x)]<BIOME.SAND)return'روی آب نمی‌شود کمپ زد';
  if(Math.hypot(x-S.homePos.x,y-S.homePos.y)<6)return'خیلی نزدیک به قلعه خودت';
  if(S.tribes.some(t=>Math.hypot(t.x-x,t.y-y)<4))return'خیلی نزدیک به یک قلعه';
  if((S.sites||[]).some(t=>Math.hypot(t.x-x,t.y-y)<4))return'خیلی نزدیک به غار یا گنج';
  if((S.camps||[]).some(t=>Math.hypot(t.x-x,t.y-y)<6))return'خیلی نزدیک به کمپ دیگر';
  return null;}
// حمله از کمپ: سریع‌تر و غافلگیرانه
export function campSpeed(S,cmdId){return marchSpeed()*(1+CAMP.speed+(cmdFx(S,cmdId).speed||0));}
export function campMods(S,camp){const fx=cmdFx(S,camp.cmd);
  return battleMods(fx,{atk:CAMP.surprise*(1+(fx.camp||0)),wall:CAMP.wallIgnore*(1+(fx.camp||0))});}
const posRaid=(r,home)=>{const p=1-r.left/r.total;return[r.fx+(home.x-r.fx)*p,r.fy+(home.y-r.fy)*p];};
const posWar=m=>{const p=1-m.left/m.total;return[m.x0+(m.x1-m.x0)*p,m.y0+(m.y1-m.y0)*p];};
// کمین: هر لشکر NPC که از شعاع کمپ رد شود، یک‌بار به آن حمله می‌شود
export function campAmbush(S,hooks={}){
  const out=[];
  for(const camp of S.camps||[]){
    if(armyCount(camp.army)<=0)continue;
    const fx=cmdFx(S,camp.cmd),mods=battleMods(fx,{atk:CAMP.surprise*(1+(fx.camp||0))});
    mods.atk*=1.5;   // کمین: ۵۰٪ بونوس پایه
    const fight=(foeArmy,foePower,kind,ref)=>{
      const r=battle(camp.army,{army:foeArmy,power:foePower},0,0,mods);
      for(const k in r.attLosses){camp.army[k]=Math.max(0,(camp.army[k]||0)-r.attLosses[k]);}
      const res={camp,r,kind,ref,win:r.win,lost:r.attLosses};out.push(res);return r.win;};
    for(const raid of[...(S.incoming||[])]){
      if(raid.amb&&raid.amb.includes(camp.id))continue;
      const[x,y]=posRaid(raid,S.homePos);if(Math.hypot(x-camp.x,y-camp.y)>CAMP.radius)continue;
      (raid.amb=raid.amb||[]).push(camp.id);
      if(fight(raid.army,raid.power,'raid',raid))S.incoming=S.incoming.filter(r=>r!==raid);}
    for(const m of[...(S.npcMarches||[])]){
      if(m.amb&&m.amb.includes(camp.id))continue;
      const[x,y]=posWar(m);if(Math.hypot(x-camp.x,y-camp.y)>CAMP.radius)continue;
      (m.amb=m.amb||[]).push(camp.id);
      const A=S.tribes.find(t=>t.id===m.from);
      if(fight(A?.garrison||{},m.power,'war',m))S.npcMarches=S.npcMarches.filter(x2=>x2!==m);}
  }
  return out;}
