import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{#m=new Map();getItem(k){return this.#m.has(k)?this.#m.get(k):null;}setItem(k,v){this.#m.set(k,String(v));}removeItem(k){this.#m.delete(k);}}
globalThis.localStorage=new MemoryStorage();
const {resolveRaid}=await import('../npc.js');
const {CARRY_PER_UNIT,hideoutCap,upgradeTime,marchSpeed,NPC}=await import('../config.js');
const {armyCount,battle}=await import('../combat.js');
const mk=(troops,raidArmy)=>({troops,buildings:[{type:'wall',level:0}],tribes:[],resources:{food:1e6,wood:1e6,stone:1e6,iron:1e6,gold:1e6}});
test('raid loot never exceeds what survivors can carry',()=>{
  const S=mk({swordsman:100},null),raid={army:{catapult:50},from:'x'};
  const before=Object.values(S.resources).reduce((a,b)=>a+b,0);
  const o=resolveRaid(S,raid,()=>0.5);
  assert.equal(o.attackerWon,true);
  const stolen=Object.values(o.loot).reduce((a,b)=>a+b,0);
  assert.ok(stolen<=armyCount(raid.army)*CARRY_PER_UNIT);
  assert.equal(before-Object.values(S.resources).reduce((a,b)=>a+b,0),stolen);
});
test('a narrow raid win steals far less than a crushing one',()=>{
  const narrow=mk({swordsman:1000},null),crush=mk({swordsman:10},null);
  const rn=resolveRaid(narrow,{army:{swordsman:1100},from:'x'},()=>0.5);
  const rc=resolveRaid(crush,{army:{swordsman:1100},from:'x'},()=>0.5);
  const sn=Object.values(rn.loot).reduce((a,b)=>a+b,0),sc=Object.values(rc.loot).reduce((a,b)=>a+b,0);
  assert.ok(rn.attackerWon&&rc.attackerWon);assert.ok(sn<=sc);
});
test('counter bonus is damped so numbers still matter',()=>{
  const r=battle({archer:300},{army:{swordsman:200}});
  assert.ok(r.atkMul>1&&r.atkMul<1.5);
});
const {expeditionCap,ARMY_CAP_MAX}=await import('../config.js');
const {marginFactor,carryLimit}=await import('../combat.js');
const {armyCap}=await import('../commanders.js');
test('army capacity reaches 70000 at muster level 30 and never beyond',()=>{
  const st=lv=>({buildings:[{type:'muster',level:lv}],cmd:{unlocked:[],levels:{}}});
  assert.equal(ARMY_CAP_MAX,70000);
  assert.equal(expeditionCap(st(30)),70000);
  assert.ok(expeditionCap(st(1))>0&&expeditionCap(st(15))<70000);
  assert.ok(armyCap(st(30),expeditionCap(st(30)),null)<=70000);
});
test('my loot is limited by margin and carry capacity',()=>{
  assert.equal(marginFactor(1.02),0);assert.equal(marginFactor(3),1);
  const r=carryLimit({gold:1000000,food:1000000},100);
  assert.equal(r.capped,true);assert.ok(r.loot.gold+r.loot.food<=r.cap);
  const small=carryLimit({gold:10},100);assert.equal(small.capped,false);assert.equal(small.loot.gold,10);
});

test('hideout protects a separate amount of every resource',()=>{
  const S=mk({swordsman:10},{});
  S.buildings.push({type:'hideout',level:1});
  const before={...S.resources};
  const out=resolveRaid(S,{army:{catapult:1000},from:'x'},()=>0.5);
  assert.equal(out.attackerWon,true);
  assert.equal(out.protectedEach,100000);
  for(const k of Object.keys(before)){
    assert.ok(S.resources[k]>=100000);
    assert.equal(S.resources[k],before[k]-out.loot[k]);
  }
});
test('defender victory does not transfer attacker loot',()=>{
  const S=mk({swordsman:100000},{});
  const before={...S.resources};
  const out=resolveRaid(S,{army:{swordsman:10},from:'x'},()=>0.5);
  assert.equal(out.attackerWon,false);
  assert.deepEqual(S.resources,before);
  assert.deepEqual(out.loot,{});
});
test('time progression is deliberately slower',()=>{
  assert.equal(marchSpeed(),0.1);
  assert.equal(NPC.raidSpeed,0.05);
  assert.ok(upgradeTime('farm',1)>=250);
});
