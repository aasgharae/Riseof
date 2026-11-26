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

// ---------- v5: جاسوس، فرمانده، انرژی، فصل و غول، کمپ ----------
import {COMMANDERS,ensureCmd,grantTokens,unlockCmd,upgradeCmd,cmdFx,busyCmds,freeCmds,battleMods,energyCost,armyCap,homeFx} from '../commanders.js';
import {runSpy,getIntel,estPower,enemySpyStrength} from '../spy.js';
import {ensureEnergy,spendEnergy} from '../energy.js';
import {ensureSeason,bossPhase,weaknessAt,bossHit,bossBoard,rewardFor,finalizeSeason,newSeason} from '../season.js';
import {campSpotError,campAmbush,campMods} from '../camps.js';
import {BIOME as BM} from '../js/worldgen.js';

const mkS=()=>({buildings:[{type:'keep',level:1},{type:'muster',level:1}],troops:{},resources:{gold:0,food:0,wood:0,iron:0,stone:0},marches:[],camps:[],intel:{},kills:0,
 tribes:[],incoming:[],npcMarches:[],homePos:{x:100,y:100},cmd:{tokens:1,unlocked:[],levels:{},emblems:0,granted:[]}});
test('ten commanders; 1 starting token + tokens at keep level 10, 20, 30; max 4 unlocked',()=>{
 assert.equal(COMMANDERS.length,10);assert.equal(new Set(COMMANDERS.map(c=>c.id)).size,10);
 const S=mkS();assert.ok(unlockCmd(S,'rostam'));assert.ok(!unlockCmd(S,'arash'));   // توکن تمام شد
 S.buildings[0].level=10;assert.deepEqual(grantTokens(S),[10]);assert.deepEqual(grantTokens(S),[]);
 assert.ok(unlockCmd(S,'arash'));S.buildings[0].level=30;assert.deepEqual(grantTokens(S),[20,30]);
 assert.ok(unlockCmd(S,'kaveh'));assert.ok(unlockCmd(S,'qarun'));
 S.cmd.tokens=5;assert.ok(!unlockCmd(S,'mehrab'));assert.equal(S.cmd.unlocked.length,4);
});
test('commander effects scale with level via limited emblems; busy commanders are tracked',()=>{
 const S=mkS();unlockCmd(S,'tahmineh');
 const f1=cmdFx(S,'tahmineh');S.cmd.emblems=3;assert.ok(upgradeCmd(S,'tahmineh'));assert.ok(cmdFx(S,'tahmineh').speed>f1.speed);
 S.cmd.emblems=0;assert.ok(!upgradeCmd(S,'tahmineh'));
 assert.deepEqual(freeCmds(S),['tahmineh']);S.marches.push({cmd:'tahmineh'});assert.equal(busyCmds(S).has('tahmineh'),true);assert.deepEqual(freeCmds(S),[]);
 const m=battleMods(cmdFx(S,'tahmineh'));assert.ok(m.cls.cav>1);
 assert.equal(energyCost(mkS(),null),5);
 const S2=mkS();unlockCmd(S2,'bahram');assert.equal(energyCost(S2,'bahram'),4);
 const S3=mkS();unlockCmd(S3,'mehrab');assert.ok(armyCap(S3,10000,'mehrab')>10000);
});
test('commander changes battle outcome (archer commander + walls)',()=>{
 const S=mkS();unlockCmd(S,'arash');
 const army={archer:100},def={army:{swordsman:50},power:1700};
 const base=battle(army,def,10,15),boost=battle(army,def,10,15,battleMods(cmdFx(S,'arash')));
 assert.ok(boost.atk>base.atk&&boost.def<base.def);
 const g=battle({spearman:100},{army:{cavalry:10},power:300},0,0,{lossMul:0.5});assert.ok(g.aLoss<0.3);
});
test('spies: fewer/weaker spies fail and die, stronger succeed and reveal intel; intel expires',()=>{
 const rng=mkRng(1),S=mkS(),t={id:'t9',name:'X',level:10,power:5000,wall:3,garrison:{archer:50},loot:{gold:5},spies:30};
 const weak=runSpy(S,t,10,0,rng,1000);assert.ok(!weak.ok&&weak.lost>=6&&!getIntel(S,'t9',1000));
 const strong=runSpy(S,t,Math.ceil(enemySpyStrength(t))+5,0,rng,1000);assert.ok(strong.ok&&strong.intel.garrison.archer===50);
 assert.ok(getIntel(S,'t9',1000+60*1000));assert.equal(getIntel(S,'t9',1000+700*1000),null);
 assert.ok(runSpy(S,t,20,1.0,rng,2000).ok);                       // بونوس وزیر: ۲۰ جاسوس کافی است
 const site={...t,id:'s1',kind:'cave',item:true},r=runSpy(S,site,40,1.0,rng,3000);assert.equal(r.intel.aura,true); // وزیر بی‌خطا می‌بیند
 assert.ok(estPower(t)>0);
});
test('daily energy: 100 units, 5 per move, resets next day',()=>{
 const S=mkS(),d=Date.UTC(2026,10,25,9);ensureEnergy(S,d);
 for(let i=0;i<20;i++)assert.ok(spendEnergy(S,5,d));assert.ok(!spendEnergy(S,5,d));
 assert.equal(ensureEnergy(S,d+864e5).v,100);
});
test('season: boss only in last 48h, weakness rotates every 6h, board and rewards work',()=>{
 const S=mkS(),t0=Date.UTC(2026,10,1);S.cmd.emblems=0;
 S.tribes=[{id:'a',name:'A',color:'#f00',power:100000},{id:'b',name:'B',color:'#0f0',power:20000}];
 assert.deepEqual(ensureSeason(S,t0),[]);assert.equal(bossPhase(S,t0+10*864e5),'before');
 const bs=S.season.bossStart;assert.ok(S.season.end-bs===48*36e5);
 assert.equal(ensureSeason(S,bs+1)[0].type,'spawn');assert.equal(bossPhase(S,bs+1),'active');
 const w0=weaknessAt(S,bs+1),w1=weaknessAt(S,bs+6*36e5+1);assert.notEqual(w0.weak,w1.weak);assert.ok(w0.nextIn<=6*36e5);
 const cavArmy={cavalry:1000},spearArmy={spearman:1000};
 const hitCav=(w)=>bossHit(S,cavArmy,{}, w==='cav'?bs+1:bs+6*36e5+1);   // سواره: ضعف غول در ساعت اول
 assert.ok(hitCav('cav').mult>1.5);assert.ok(bossHit(S,spearArmy,{},bs+1).mult<=1);
 assert.ok(bossHit(S,cavArmy,{boss:0.3},bs+1).damage>bossHit(S,cavArmy,{},bs+1).damage);
 assert.ok(bossHit(S,cavArmy,{},bs+1).lossFrac>=0.12);
 S.boss.dmg=5e6;S.boss.hits=10;
 const board=bossBoard(S,S.season.end-1);assert.ok(board.find(r=>r.me));assert.equal(board[0].rank,1);
 assert.equal(rewardFor(1,600).emblems,4);assert.ok(rewardFor(400,600).gold<rewardFor(5,600).gold);
 const ev=ensureSeason(S,S.season.end+1);assert.equal(ev[0].type,'end');assert.equal(S.season.id,2);assert.equal(S.boss,null);
 assert.ok(S.pastSeasons[0].rank>=1&&S.resources.gold>0);
});
test('camps: valid spot rules and ambush stops a raid heading home',()=>{
 const terr=generateWorld(1337),S=mkS();S.homePos={x:WORLD_W/2-40,y:WORLD_H/2};
 let land=null;for(let x=300;x<500&&!land;x++)if(terr[Math.floor(WORLD_H/2)*WORLD_W+x]>=BM.GRASS)land={x,y:WORLD_H/2};
 assert.equal(campSpotError(S,terr,land.x,land.y),null);assert.ok(campSpotError(S,terr,3,3));
 S.tribes=[{id:'x',x:land.x+2,y:land.y,level:1,power:100,garrison:{swordsman:3}}];assert.ok(campSpotError(S,terr,land.x,land.y));
 S.tribes=[];
 const camp={id:'c1',x:land.x,y:land.y,army:{swordsman:3000},cmd:null};S.camps=[camp];
 S.homePos={x:land.x+40,y:land.y};
 const raid={id:'r',from:'x',fx:land.x-40,fy:land.y,army:{swordsman:20},power:240,left:50,total:100};S.incoming=[raid]; // وسط راه = موقعیت کمپ
 const out=campAmbush(S);assert.equal(out.length,1);assert.ok(out[0].win);assert.equal(S.incoming.length,0);
 assert.equal(campAmbush(S).length,0);   // هر لشکر فقط یک‌بار کمین می‌شود
 assert.ok(campMods(S,camp).atk>1&&campMods(S,camp).wallIgnore>0);
});
