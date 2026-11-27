import test from 'node:test';
import assert from 'node:assert/strict';
import {isWithinHitRadius} from '../js/renderer.js';

test('map hit testing scales CSS pointer coordinates to 2x canvas coordinates',()=>{
  // Tap at CSS (100,50) maps to canvas (200,100).
  assert.equal(isWithinHitRadius(200,100,200,100,26),true);
  assert.equal(isWithinHitRadius(100,50,200,100,26),false);
});

test('map hit testing accepts taps inside target radius and rejects outside',()=>{
  assert.equal(isWithinHitRadius(210,100,200,100,26),true);
  assert.equal(isWithinHitRadius(230,100,200,100,26),false);
});
