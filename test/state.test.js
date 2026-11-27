import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
  removeItem(key) { this.#data.delete(key); }
  clear() { this.#data.clear(); }
}

globalThis.localStorage = new MemoryStorage();
const state = await import('../state.js');

test('freshState creates a complete v9 baseline', () => {
  const s = state.freshState();
  assert.equal(s.v, 9);
  assert.ok(Array.isArray(s.buildings));
  assert.ok(s.resources.food > 0);
  assert.ok(s.troops && typeof s.troops === 'object');
});

test('ensureDefaults preserves existing NPC marches and shield state', () => {
  const march = { id: 'npc-1', left: 42, total: 60 };
  const shield = { until: 123456789, day1: false };
  const s = state.ensureDefaults({ ...state.freshState(), npcMarches: [march], shield });
  assert.deepEqual(s.npcMarches, [march]);
  assert.deepEqual(s.shield, shield);
});

test('ensureDefaults initializes missing defaults and is idempotent', () => {
  const s = state.ensureDefaults({ v: 9, buildings: [] });
  assert.deepEqual(s.npcMarches, []);
  assert.equal(s.shield, null);
  assert.ok(s.buildings.some(b => b.type === 'hospital'));
  const once = structuredClone(s);
  state.ensureDefaults(s);
  assert.deepEqual(s, once);
});

test('load/save round trip preserves NPC marches and shield timer', () => {
  localStorage.clear();
  const s = state.freshState();
  s.npcMarches = [{ id: 'march-keep', left: 17, total: 30 }];
  s.shield = { until: 987654321, day1: false };
  state.save(s);
  const loaded = state.load();
  assert.deepEqual(loaded.npcMarches, s.npcMarches);
  assert.deepEqual(loaded.shield, s.shield);
});

test('v8 save migrates to v9 while retaining core player progress', () => {
  localStorage.clear();
  const old = {
    v: 8,
    resources: { food: 123, wood: 456, stone: 789, iron: 12, gold: 3 },
    buildings: [{ id: 'keep-1', type: 'keep', x: 1, y: 1, level: 7 }],
    troops: { swordsman: 10 },
    marches: [{ id: 'old-march', army: { archer: 5 }, returning: false }],
    log: []
  };
  localStorage.setItem(state.LEGACY_KEY, JSON.stringify(old));
  const migrated = state.load();
  assert.equal(migrated.v, 9);
  assert.equal(migrated.resources.food, 123);
  assert.equal(migrated.buildings[0].level, 7);
  assert.equal(migrated.troops.swordsman, 10);
  assert.equal(migrated.troops.archer, 5);
  assert.deepEqual(migrated.marches, []);
  assert.ok(migrated.buildings.some(b => b.type === 'hospital'));
});
