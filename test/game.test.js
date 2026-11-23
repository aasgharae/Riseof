import test from 'node:test';
import assert from 'node:assert/strict';
import {START_RESOURCES,FACTIONS,factionAt,tribeLevelAt,WORLD_W,WORLD_H,CASTLE_COUNT,TROOPS} from '../config.js';
import {freshState,storageCap} from '../state.js';
import {armyPower,armyCount,resolveAttack,genGarrison} from '../combat.js';
import {makeRng} from '../js/noise.js';
import {rankBoard,factionBoard,npcTick} from '../leaderboard.js';
import {generateWorld,placeCastles,findHome,BIOME} from '../js/worldgen.js';

test('huge starting stock fits the warehouse',()=>{
 assert.ok(START_RESOURCES.food>=1e9);
 const s=freshState();
 assert.ok(storageCap(s)>START_RESOURCES.food);
});

test('garrison power grows with castle level',()=>{
 const r1=makeRng(7),r2=makeRng(7);
 const weak=armyPower(genGarrison(3,r1));
 const strong=armyPower(genGarrison(28,r2));
 assert.ok(strong>weak*10, `strong=${strong} weak=${weak}`);
});

test('royal/knight buff applies without crashing and catapult melts walls',()=>{
 const army={royal:100,catapult:10};
 const tribe={power:5000,loot:{gold:100}};
 const r=resolveAttack(army,tribe,10);
 assert.ok(r.atk>armyPower({royal:100}),'royal buff should raise attack');
 const plain=resolveAttack({swordsman:100},tribe,10);
 const siege=resolveAttack({swordsman:100,catapult:5},tribe,10);
 assert.ok(siege.def<plain.def,'catapult should reduce defense');
});

test('world is big and castles fit inside it',()=>{
 const terr=generateWorld(1337);
 assert.equal(terr.length,WORLD_W*WORLD_H);
 assert.ok(WORLD_W>=800&&WORLD_H>=560);
 assert.equal(terr.ground.length,WORLD_W*WORLD_H);
 const spots=placeCastles(terr,CASTLE_COUNT,555);
 assert.equal(spots.length,CASTLE_COUNT);
 for(const s of spots){
  assert.ok(s.x>=0&&s.x<WORLD_W&&s.y>=0&&s.y<WORLD_H);
  const b=terr[Math.floor(s.y)*WORLD_W+Math.floor(s.x)];
  assert.ok(b>=BIOME.GRASS&&b<=BIOME.HILL);}
 const home=findHome(terr);
 assert.ok(home.x>=0&&home.x<WORLD_W);
});

test('faction map covers the world and levels rise with distance',()=>{
 for(let i=0;i<40;i++){
  const f=factionAt(Math.random()*WORLD_W,Math.random()*WORLD_H);
  assert.ok(FACTIONS.some(x=>x.id===f.id));}
 assert.equal(tribeLevelAt(0),1);
 assert.equal(tribeLevelAt(1),30);
 assert.ok(tribeLevelAt(0.6)>tribeLevelAt(0.2));
});

test('army helpers count correctly',()=>{
 const a={swordsman:10,archer:5};
 assert.equal(armyCount(a),15);
 assert.equal(armyPower(a),10*TROOPS.swordsman.power+5*TROOPS.archer.power);
});

test('leaderboard ranks power and kills, player included',()=>{
 const S={buildings:[{type:'keep',level:3}],troops:{swordsman:1000},kills:500,factionKills:{},
  tribes:[{id:'a',name:'A',power:5000,kills:100,level:5,faction:'wolf',garrison:{spearman:10}},
          {id:'b',name:'B',power:20000,kills:900,level:9,faction:'wolf',garrison:{spearman:10}}]};
 const p=rankBoard(S,'power');
 assert.equal(p[0].id,'b');assert.equal(p.find(e=>e.me).rank,2);
 const k=rankBoard(S,'kills');
 assert.equal(k[0].id,'b');assert.equal(k.find(e=>e.me).rank,2);
 const before=S.tribes.reduce((a,t)=>a+t.kills,0);
 npcTick(S,()=>0.5,10);
 assert.ok(S.tribes.reduce((a,t)=>a+t.kills,0)>before);
 const fb=factionBoard(S,FACTIONS);
 assert.equal(fb.find(f=>f.id==='wolf').castles,2);
});

// ---------- v4: تقابل، بیمارستان، NPC، گنج، ماموریت ----------
import {battle,counterMult,bestCounters,troopMultVs,genGarrison as gg} from '../combat.js';
import {addWounded,healCost,hospitalRoom} from '../hospital.js';
import {buildTribe,queueRespawn,processRespawns,startWar,resolveWar,maybeRaid,resolveRaid,scaleTribe} from '../npc.js';
import {genSites,lootSite,siteReady} from '../sites.js';
import {ensureQuests,claimQuest,progress,bump,countClaimable} from '../quests.js';
import {expeditionCap,hospitalCap,NPC as NPCCFG} from '../config.js';
import {makeRng as mkRng} from '../js/noise.js';

test('counters: spear beats cavalry, cavalry beats archers, archers beat infantry',()=>{
 assert.ok(counterMult({spearman:100},{cavalry:100})>1.4);
 assert.ok(counterMult({cavalry:100},{archer:100})>1.4);
 assert.ok(counterMult({archer:100},{swordsman:100})>1.4);
 assert.ok(counterMult({swordsman:100},{spearman:100})>1.4);
 assert.ok(counterMult({cavalry:100},{spearman:100})<0.8);
 const r1=battle({spearman:200},{army:{cavalry:100}});   // نیزه‌دار ۲۰۰۰ در برابر سواره ۲۸۰۰
 const r2=battle({swordsman:167},{army:{cavalry:100}});  // قدرت خام برابر، بدون برتری
 assert.ok(r1.win&&!r2.win);
 assert.ok(bestCounters({cavalry:50})[0].cls==='spear');
 assert.ok(troopMultVs('archer',{swordsman:10})>1.4);
});
test('expedition cap reaches 30000 at muster level 30',()=>{
 assert.equal(expeditionCap({buildings:[{type:'muster',level:30}]}),30000);
 assert.ok(expeditionCap({buildings:[{type:'muster',level:1}]})>=1000);
});
test('hospital keeps wounded up to capacity, rest die; healing is cheaper than training',()=>{
 const S={buildings:[{type:'hospital',level:1}],wounded:{},healing:[]};
 const cap=hospitalCap(1);
 const r=addWounded(S,{swordsman:10000});
 assert.equal(r.wounded,cap);assert.equal(r.wounded+r.dead,10000);
 assert.equal(hospitalRoom(S),0);
 const c=healCost('swordsman',100),T=TROOPS.swordsman;
 assert.ok(c.food<T.cost.food*100&&c.iron<T.cost.iron*100);
});
test('NPC castle that falls is replaced later by a stronger one',()=>{
 const rng=mkRng(5),S={tribes:[],respawns:[],npcMarches:[]};
 const t=buildTribe('t1','قلعه الف',200,200,10,rng,NPCCFG.buff);S.tribes.push(t);
 const old=t.power;S.tribes=[];
 queueRespawn(S,t,1000,rng);
 assert.equal(processRespawns(S,1000,rng).length,0);
 const sp=processRespawns(S,1000+NPCCFG.respawnMaxSec*1000+1,rng);
 assert.equal(sp.length,1);assert.ok(sp[0].power>=old*1.25);assert.equal(S.tribes.length,1);
});
test('NPC wars resolve and kill counters rise',()=>{
 const rng=mkRng(9),S={tribes:[],respawns:[],npcMarches:[]};
 const a=buildTribe('a','A',100,100,20,rng),b=buildTribe('b','B',110,100,3,rng);S.tribes.push(a,b);
 const m={from:'a',to:'b',left:0,total:1};
 const o=resolveWar(S,m,0,()=>0.1);
 assert.ok(o&&['fall','win'].includes(o.type));assert.ok(a.kills>0);
});
test('raid on the player: defended raid kills attackers, empty home gets looted',()=>{
 const rng=mkRng(3);
 const mk=()=>({tribes:[buildTribe('x','X',100,100,2,rng)],troops:{swordsman:0,spearman:0},wounded:{},
  buildings:[{type:'wall',level:1}],resources:{food:1e6,gold:1e4},homePos:{x:130,y:100},incoming:[],nextRaid:0});
 let S=mk();const raid=maybeRaid(S,0,rng);assert.equal(raid,null);   // اولین حمله با تأخیر
 S.nextRaid=1;const rd=maybeRaid(S,5,rng);assert.ok(rd&&S.incoming.length===1);
 const o1=resolveRaid(S,rd,rng);assert.ok(o1.attackerWon&&o1.loot.food>0);
 S=mk();S.troops.swordsman=100000;
 const rd2=maybeRaid(Object.assign(S,{nextRaid:1}),5,rng);
 const o2=resolveRaid(S,rd2,rng);assert.ok(!o2.attackerWon&&o2.kills>0);
});
test('sites sit near the centre, can be looted and then cool down',()=>{
 const terr=generateWorld(1337),rng=mkRng(77),S={tribes:[]};
 const sites=genSites(terr,S.tribes,{x:50,y:50},rng,30);
 assert.ok(sites.length>=20);
 for(const s of sites)assert.ok(Math.hypot(s.x-WORLD_W/2,s.y-WORLD_H/2)<WORLD_W*0.5);
 const s=sites[0],lvl=s.level;lootSite(s,1000,rng);
 assert.ok(!siteReady(s,1001)&&siteReady(s,1000+NPCCFG.siteCooldownSec*1000+1)&&s.level>=lvl);
});
test('daily/weekly quests progress from stats and pay out once',()=>{
 const S={buildings:[{type:'keep',level:1}],troops:{},resources:{gold:0,food:0,wood:0,iron:0},kills:0,conquered:0};
 const q=ensureQuests(S,Date.UTC(2026,10,21,10));
 assert.equal(q.daily.length,4);assert.equal(q.weekly.length,4);
 const d=q.daily[0];bump(S,d.key,d.goal);
 assert.equal(progress(S,d),d.goal);assert.ok(countClaimable(S)>=1);
 assert.ok(claimQuest(S,'daily',0));assert.equal(claimQuest(S,'daily',0),null);assert.ok(S.resources.gold>0);
 assert.equal(ensureQuests(S,Date.UTC(2026,10,21,12)).daily[0].claimed,true);   // همان روز تغییر نمی‌کند
});
