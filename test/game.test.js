import test from 'node:test';
import assert from 'node:assert/strict';
import {START_RESOURCES,FACTIONS,factionAt,tribeLevelAt,WORLD_W,WORLD_H,CASTLE_COUNT,TROOPS} from '../config.js';
import {freshState,storageCap} from '../state.js';
import {armyPower,armyCount,resolveAttack,genGarrison} from '../combat.js';
import {makeRng} from '../js/noise.js';
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
 assert.ok(WORLD_W>=400&&WORLD_H>=280);
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
