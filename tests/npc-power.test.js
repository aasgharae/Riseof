import test from 'node:test';
import assert from 'node:assert/strict';
class MemoryStorage{#m=new Map();getItem(k){return this.#m.has(k)?this.#m.get(k):null;}setItem(k,v){this.#m.set(k,String(v));}removeItem(k){this.#m.delete(k);}}
globalThis.localStorage=new MemoryStorage();
const {buildTribe}=await import('../npc.js');
const {NPC}=await import('../config.js');
const {migrateNpcPower}=await import('../state.js');
const rng=()=>0.5;
test('NPC power rises steeply with level and top castles are truly strong',()=>{
  const p=l=>buildTribe('t'+l,'x',0,0,l,rng,NPC.buff).power;
  let prev=0;for(const l of [1,5,10,15,20,25,30]){const v=p(l);assert.ok(v>prev);prev=v;}
  assert.ok(p(30)>800000,'level 30 castle should exceed 800k power, got '+p(30));
  assert.ok(p(1)<1000);
});
test('old saves get NPC power rescaled exactly once',()=>{
  const S={tribes:[{level:20,power:1000,base:1000,garrison:{swordsman:10},loot:{gold:100}}],sites:[{level:10,power:500,garrison:{archer:4},loot:{gold:50}}],respawns:[]};
  migrateNpcPower(S);const p1=S.tribes[0].power,s1=S.sites[0].power;
  assert.ok(p1>1000*5&&s1>500*5);assert.equal(S.npcPowerV,2);
  migrateNpcPower(S);assert.equal(S.tribes[0].power,p1);assert.equal(S.sites[0].power,s1);
});
