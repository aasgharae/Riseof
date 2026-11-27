import test from 'node:test';
import assert from 'node:assert/strict';
import {findPath,pointOnRoute} from '../js/pathfinding.js';
import {BIOME,WORLD_W,WORLD_H} from '../js/worldgen.js';

test('A* routes around an impassable mountain wall',()=>{
  const terrain=new Uint8Array(WORLD_W*WORLD_H);terrain.fill(BIOME.GRASS);
  for(let y=0;y<WORLD_H;y++)terrain[y*WORLD_W+100]=BIOME.MOUNT;
  const r=findPath(terrain,{x:40,y:80},{x:160,y:80},{cellSize:2});
  assert.equal(r.ok,true);assert.ok(r.distance>120);assert.ok(r.points.length>2);
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
