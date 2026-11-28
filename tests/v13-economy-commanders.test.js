import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMMANDERS,CMD,cmdFx,battleMods,ensureCmd} from '../commanders.js';
import {battle} from '../combat.js';
import {finalizeSeason} from '../season.js';
import {START_RESOURCES,SEASON_START_RESOURCES,BUILD_DEFS,buildingProd,upgradeCost,TROOPS} from '../config.js';
import {ensureDefaults} from '../state.js';
import {rankBoard} from '../leaderboard.js';

test('v13 contains twelve illustrated commanders: six women and six men',()=>{
  assert.equal(COMMANDERS.length,12);
  assert.equal(COMMANDERS.filter(c=>c.gender==='زن').length,6);
  assert.equal(COMMANDERS.filter(c=>c.gender==='مرد').length,6);
  assert.equal(new Set(COMMANDERS.map(c=>c.id)).size,12);
  for(const c of COMMANDERS){assert.ok(c.fx.weakTo);assert.ok(c.image);assert.ok(fs.existsSync(new URL('../'+c.image,import.meta.url)));}
  assert.equal(CMD.lagerta.name,'لاگرتا');
  assert.ok(CMD.lagerta.fx.atk>Math.max(...COMMANDERS.filter(c=>c.id!=='lagerta').map(c=>c.fx.atk||0)));
});

test('commander weakness reduces attack against its counter class',()=>{
  const army={swordsman:1000};
  const defenders={archer:1000};
  const plain=battle(army,{army:defenders,power:0},0,0,{});
  const weakened=battle(army,{army:defenders,power:0},0,0,{weakTo:'archer',weakPenalty:0.25});
  assert.ok(weakened.atk<plain.atk);
});

test('legacy commander unlocks and levels migrate to the new roster',()=>{
  const S={buildings:[],cmd:{tokens:0,unlocked:['mehrab','rostam'],levels:{mehrab:4,rostam:2},emblems:0,granted:[]}};
  const c=ensureCmd(S);
  assert.deepEqual(c.unlocked,['lagerta','arthur']);
  assert.equal(c.levels.lagerta,4);
  assert.equal(c.levels.arthur,2);
});

test('gold mines are removed and no building produces gold',()=>{
  assert.equal(BUILD_DEFS.goldmine,undefined);
  assert.deepEqual(buildingProd('goldmine',30),{});
  assert.equal(START_RESOURCES.gold,0);
  assert.equal(Object.hasOwn(upgradeCost('keep',1),'gold'),false);
  for(const troop of Object.values(TROOPS))assert.equal(Object.hasOwn(troop.cost,'gold'),false);
});

test('season end preserves all gold but resets all ordinary resources',()=>{
  const now=Date.now();
  const S={season:{id:7,start:now-1000,end:now,bossStart:now-1000},boss:{dmg:1000,hits:1,snap:[]},
    resources:{gold:9876,food:900000,wood:800000,stone:700000,iron:600000},cmd:{emblems:0},profile:{avatarId:'base-warrior-f'},players:[],pastSeasons:[],stats:{}};
  finalizeSeason(S,now);
  assert.equal(S.resources.gold,9876+3000);
  for(const k of ['food','wood','stone','iron'])assert.equal(S.resources[k],SEASON_START_RESOURCES[k]);
  assert.ok(SEASON_START_RESOURCES.food<START_RESOURCES.food);
  assert.equal(S.season.id,8);
  assert.equal(S.seasonHallOfFame[0].season,7);
  assert.equal(S.seasonHallOfFame[0].champions[0].avatarId,'base-warrior-f');
});

test('rank board assigns the selected profile avatar to the player row',()=>{
  const S={tribes:[],troops:{swordsman:1},kills:0,buildings:[{type:'keep',level:1}],profile:{avatarId:'base-king-m'}};
  assert.equal(rankBoard(S,'power').find(x=>x.me).avatarId,'base-king-m');
});

test('old saves automatically remove gold mines and their pending upgrades',()=>{
  const S={v:9,resources:{gold:1234,food:100,wood:100,stone:100,iron:100},buildings:[{id:'keep-1',type:'keep',level:3},{id:'gold-1',type:'goldmine',level:12}],upgrades:[{id:'gold-1',type:'goldmine',left:100,total:200}],troops:{},training:{},marches:[],tribes:[],log:[],factionKills:{},npcPowerV:2};
  ensureDefaults(S);
  assert.equal(S.buildings.some(b=>b.type==='goldmine'),false);
  assert.equal(S.upgrades.some(u=>u.type==='goldmine'),false);
  assert.equal(S.resources.gold,1234);
});
