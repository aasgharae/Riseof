import {makeRng, makeNoise, fbm, hash2} from './noise.js';
import {WORLD_W, WORLD_H} from '../config.js';

export {WORLD_W, WORLD_H};
export const BIOME={DEEP:0, SEA:1, SAND:2, GRASS:3, MEADOW:4, FOREST:5, PINE:6, HILL:7, MOUNT:8, SNOW:9};

// Olive-green military-map style terrain: large landmass, winding rivers, lakes, dense pine forests
export function generateWorld(seed=1337){
  const n1=makeNoise(seed), n2=makeNoise(seed+77), n3=makeNoise(seed+191), n4=makeNoise(seed+301);
  const t=new Uint8Array(WORLD_W*WORLD_H);
  const elev=new Float32Array(WORLD_W*WORLD_H);
  const cx=WORLD_W*0.5, cy=WORLD_H*0.5;
  for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){
    const i=y*WORLD_W+x;
    const u=x/WORLD_W*11, v=y/WORLD_H*11;
    let e=fbm(n1,u,v,5); e=e*0.75+0.25;
    const d=Math.hypot((x-cx)/(WORLD_W*0.55),(y-cy)/(WORLD_H*0.52));
    e=e*0.5+(1-d)*0.85-0.32;
    const edge=Math.min(x,y,WORLD_W-1-x,WORLD_H-1-y)/(WORLD_W*0.10);
    if(edge<1)e*=(0.3+0.7*Math.min(1,edge));
    elev[i]=e;
    if(e<0.20)t[i]=BIOME.DEEP;
    else if(e<0.32)t[i]=BIOME.SEA;
    else if(e<0.38)t[i]=BIOME.SAND;
    else{
      const m=fbm(n2,u*1.5,v*1.5,4);
      const f=fbm(n3,u*2.4,v*2.4,3);
      const p=fbm(n4,u*3.0,v*3.0,2);
      if(e>0.80&&m>0.42)t[i]=BIOME.SNOW;
      else if(e>0.70||m>0.66)t[i]=BIOME.MOUNT;
      else if(e>0.58&&m>0.48)t[i]=BIOME.HILL;
      else if(p>0.60)t[i]=BIOME.PINE;
      else if(f>0.55)t[i]=BIOME.FOREST;
      else if(f<0.38)t[i]=BIOME.MEADOW;
      else t[i]=BIOME.GRASS;
    }
  }
  // winding rivers from mountain sources
  const rng=makeRng(seed+999);
  for(let r=0;r<26;r++){
    let x=(rng()*WORLD_W)|0, y=(rng()*WORLD_H)|0;
    if(t[y*WORLD_W+x]<BIOME.HILL)continue;
    let dir=rng()*Math.PI*2;
    for(let step=0;step<900;step++){
      const i=y*WORLD_W+x;
      if(t[i]<=BIOME.SEA)break;
      t[i]=BIOME.SEA;
      dir+=(rng()-0.5)*0.9; // meander
      const nx=Math.round(x+Math.cos(dir)*1.6), ny=Math.round(y+Math.sin(dir)*1.6);
      if(nx<1||ny<1||nx>=WORLD_W-1||ny>=WORLD_H-1)break;
      if(elev[ny*WORLD_W+nx]>elev[i]+0.08)break; // don't climb uphill
      x=nx;y=ny;
    }
  }
  // small lakes: depressions filled with water
  for(let k=0;k<140;k++){
    const x=(rng()*WORLD_W)|0, y=(rng()*WORLD_H)|0, r=1+(rng()*2|0);
    if(t[y*WORLD_W+x]<BIOME.GRASS)continue;
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(dx*dx+dy*dy<=r*r){const nx=x+dx,ny=y+dy;
        if(nx>0&&ny>0&&nx<WORLD_W-1&&ny<WORLD_H-1&&t[ny*WORLD_W+nx]>=BIOME.GRASS)t[ny*WORLD_W+nx]=BIOME.SEA;}
    }
  }
  return t;
}

// place up to N castles on good land spots, deterministically, spread apart
export function placeCastles(t, count, seed=555){
  const rng=makeRng(seed);
  const spots=[];
  let tries=0;
  while(spots.length<count&&tries<count*80){
    tries++;
    const x=6+(rng()*(WORLD_W-12)), y=6+(rng()*(WORLD_H-12));
    const b=t[Math.floor(y)*WORLD_W+Math.floor(x)];
    if(b<BIOME.GRASS||b>BIOME.HILL)continue;
    let ok=true;
    for(const s of spots){const d=Math.hypot(s.x-x,s.y-y);if(d<6){ok=false;break;}}
    if(!ok)continue;
    const rx=Math.round(x*10)/10, ry=Math.round(y*10)/10;
    const b2=t[Math.floor(ry)*WORLD_W+Math.floor(rx)];
    if(b2<BIOME.GRASS||b2>BIOME.HILL)continue;
    spots.push({x:rx,y:ry});
  }
  return spots;
}

// player home: good spot near the centre-west
export function findHome(t){
  const rng=makeRng(4242);
  for(let k=0;k<900;k++){
    const x=WORLD_W*0.15+(rng()*(WORLD_W*0.4)), y=20+(rng()*(WORLD_H-40));
    const b=t[Math.floor(y)*WORLD_W+Math.floor(x)];
    if(b<BIOME.GRASS||b>BIOME.FOREST)continue;
    return {x:Math.round(x*10)/10,y:Math.round(y*10)/10};
  }
  return {x:WORLD_W*0.3,y:WORLD_H*0.5};
}
