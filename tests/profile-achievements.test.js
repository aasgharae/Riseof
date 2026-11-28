import test from 'node:test';
import assert from 'node:assert/strict';
import {ACH,getStat} from '../quests.js';
import {freshState,ensureDefaults} from '../state.js';

test('v11 has a broad, uniquely identified achievement catalog',()=>{
  const ids=ACH.map(a=>a.id);
  assert.ok(ids.length>=30);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(ACH.some(a=>a.cat==='اقتصادی'));
  assert.ok(ACH.some(a=>a.cat==='اجتماعی'));
  assert.ok(ACH.some(a=>a.cat==='قهرمانی'));
});

test('profile and achievement-derived profile statistics survive defaults',()=>{
  const s=freshState();
  s.profile={name:'فرمانده تست',avatar:'🦅',flag:'⚔️',title:'فاتح',bio:'آزمایش'};
  s.troops.swordsman=123;
  s.resources.gold=456;
  s.buildings.find(b=>b.type==='hideout').level=7;
  ensureDefaults(s);
  assert.equal(s.profile.name,'فرمانده تست');
  assert.equal(getStat(s,'armyCount'),123);
  assert.equal(getStat(s,'goldStock'),456);
  assert.equal(getStat(s,'hideoutLevel'),7);
});
