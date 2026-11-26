import{BIOME}from'./js/worldgen.js';
import{WORLD_W,WORLD_H,NPC}from'./config.js';
import{genGarrison,armyPower}from'./combat.js';

export const SITE_KINDS={
  cave:{name:'غار تاریک',icon:'🕳️',note:'آهن و سنگ فراوان'},
  treasure:{name:'گنج پنهان',icon:'💎',note:'سکه و منابع'},
  ruins:{name:'خرابه‌های باستانی',icon:'🏺',note:'سکه، چوب و غذا'}};

function siteLoot(kind,level,rng){
  const j=()=>0.8+rng()*0.5;
  if(kind==='cave')return{food:Math.floor(4000*level*j()),wood:Math.floor(3000*level*j()),stone:Math.floor(14000*level*j()),iron:Math.floor(9000*level*j()),gold:Math.floor(60*level*j())};
  if(kind==='treasure')return{food:Math.floor(6000*level*j()),wood:Math.floor(6000*level*j()),stone:Math.floor(3000*level*j()),iron:Math.floor(2000*level*j()),gold:Math.floor(260*level*j())};
  return{food:Math.floor(12000*level*j()),wood:Math.floor(14000*level*j()),stone:Math.floor(2000*level*j()),iron:Math.floor(1000*level*j()),gold:Math.floor(140*level*j())};}

function fillSite(s,rng){
  s.garrison=genGarrison(s.level,rng);
  s.power=Math.floor(armyPower(s.garrison)*1.1);
  s.loot=siteLoot(s.kind,s.level,rng);
  s.spies=Math.floor(s.level*5*(0.6+rng()*0.8));
  s.item=rng()<0.13;} // نشان ارتقای فرمانده: پنهان و کمیاب

// گنج‌ها و غارها در قلب نقشه — دور از قلعه‌ها
export function genSites(terr,tribes,home,rng,count=30){
  const ok=new Set([BIOME.GRASS,BIOME.MEADOW,BIOME.FOREST,BIOME.PINE,BIOME.HILL,BIOME.MOUNT]);
  const sites=[],kinds=['cave','treasure','ruins'];
  for(let radius=0.32;sites.length<count&&radius<0.6;radius+=0.08){
    for(let tries=0;tries<20000&&sites.length<count;tries++){
      const x=WORLD_W/2+(rng()*2-1)*WORLD_W*radius,y=WORLD_H/2+(rng()*2-1)*WORLD_H*radius;
      if(x<4||y<4||x>WORLD_W-4||y>WORLD_H-4)continue;
      const dx=(x-WORLD_W/2)/(WORLD_W*radius),dy=(y-WORLD_H/2)/(WORLD_H*radius);
      if(dx*dx+dy*dy>1)continue;
      if(!ok.has(terr[Math.floor(y)*WORLD_W+Math.floor(x)]))continue;
      if(Math.hypot(x-home.x,y-home.y)<16)continue;
      if(tribes.some(t=>Math.hypot(t.x-x,t.y-y)<8))continue;
      if(sites.some(s=>Math.hypot(s.x-x,s.y-y)<18))continue;
      const kind=kinds[sites.length%3],level=Math.min(26,8+Math.floor(rng()*14)+Math.floor(sites.length/6));
      const s={id:'s'+sites.length,kind,name:SITE_KINDS[kind].name+' '+(Math.floor(sites.length/3)+1),x,y,level,wall:0,cd:0,loots:0};
      fillSite(s,rng);sites.push(s);}}
  return sites;}
export const siteReady=(s,now)=>!(s.cd>now);
// بعد از غارت: دوره استراحت، بعد با نگهبان قوی‌تر برمی‌گردد
export function lootSite(s,now,rng){
  s.cd=now+NPC.siteCooldownSec*1000;s.loots=(s.loots||0)+1;s.level=Math.min(30,s.level+1);fillSite(s,rng);}
