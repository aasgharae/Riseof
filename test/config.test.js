import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG, SEASON, WORLD_W, WORLD_H, CASTLE_COUNT } from '../config.js';

test('season duration has one source of truth', () => {
  assert.equal(SEASON.days, CONFIG.seasonLength);
  assert.equal(SEASON.days, 45);
});

test('world dimensions and NPC castle count are valid', () => {
  assert.ok(Number.isInteger(WORLD_W) && WORLD_W > 0);
  assert.ok(Number.isInteger(WORLD_H) && WORLD_H > 0);
  assert.ok(Number.isInteger(CASTLE_COUNT) && CASTLE_COUNT > 0);
});
