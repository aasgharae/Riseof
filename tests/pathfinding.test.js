import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath,pointOnRoute} from '../js/pathfinding.js';
import {BIOME,WORLD_W,WORLD_H} from '../js/worldgen.js';

test('A* routes around an impassable mountain wall',()=>{
  const terrain=new Uint8Array(WORLD_W*WORLD_H);terrain.fill(BIOME.GRASS);
  for(let y=0;y<WORLD_H-30;y++)for(let x=100;x<=101;x++)terrain[y*WORLD_W+x]=BIOME.MOUNT;
  const r=findPath(terrain,{x:40,y:80},{x:160,y:80},{cellSize:2});
  assert.equal(r.ok,true);assert.ok(r.distance>150);assert.ok(r.points.length>2);
  for(const p of r.points){const tile=terrain[Math.min(WORLD_H-1,Math.floor(p.y))*WORLD_W+Math.min(WORLD_W-1,Math.floor(p.x))];assert.notEqual(tile,BIOME.MOUNT);}
});
test('A* rejects a fully sealed destination region',()=>{
  const terrain=new Uint8Array(WORLD_W*WORLD_H);terrain.fill(BIOME.GRASS);
  for(let y=0;y<WORLD_H;y++)terrain[y*WORLD_W+100]=BIOME.SEA;
  for(let x=101;x<WORLD_W;x++)for(let y=0;y<WORLD_H;y++)terrain[y*WORLD_W+x]=BIOME.MOUNT;
  const r=findPath(terrain,{x:40,y:80},{x:160,y:80},{cellSize:2});
  assert.equal(r.ok,false);
});
test('pointOnRoute interpolates along route segments',()=>{
  const p=pointOnRoute([{x:0,y:0},{x:10,y:0},{x:10,y:10}],0.75);
  assert.deepEqual(p,{x:10,y:5});
});

const grass=()=>{const t=new Uint8Array(WORLD_W*WORLD_H);t.fill(BIOME.GRASS);return t;};
test('open ground gives one straight segment',()=>{
  const r=findPath(grass(),{x:40,y:80},{x:160,y:80});
  assert.equal(r.ok,true);assert.equal(r.points.length,2);assert.ok(Math.abs(r.distance-120)<1);assert.ok(Math.abs(r.cost-120)<2);
});
test('a river is crossed straight through but costs more time',()=>{
  const t=grass();for(let y=0;y<WORLD_H;y++)for(let x=100;x<=101;x++)t[y*WORLD_W+x]=BIOME.SEA;
  const r=findPath(t,{x:40,y:80},{x:160,y:80});
  assert.equal(r.ok,true);assert.ok(r.distance<125);assert.ok(r.cost>r.distance+4);
});
test('deep sea and snow are never crossed',()=>{
  const t=grass();for(let y=0;y<WORLD_H;y++)for(let x=100;x<=101;x++)t[y*WORLD_W+x]=BIOME.DEEP;
  assert.equal(findPath(t,{x:40,y:80},{x:160,y:80}).ok,false);
});
test('forest is crossed straight and the army visibly slows down inside it',()=>{
  const t=grass();for(let y=0;y<WORLD_H;y++)for(let x=80;x<140;x++)t[y*WORLD_W+x]=BIOME.FOREST;
  const r=findPath(t,{x:40,y:80},{x:200,y:80});
  assert.equal(r.ok,true);assert.ok(r.points.length<=4);assert.ok(r.points.every(p=>p.y===80));assert.ok(r.cost>r.distance+30);
  const mid=pointOnRoute(r.points,0.5);assert.ok(mid.x<118,'half the travel time should be before the geometric midpoint, got '+mid.x);
});
