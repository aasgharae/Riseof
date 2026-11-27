import {BIOME, WORLD_W, WORLD_H} from './worldgen.js';
const SQRT2=Math.SQRT2;
function terrainCost(tile){
  if(tile===BIOME.DEEP||tile===BIOME.SEA||tile===BIOME.MOUNT||tile===BIOME.SNOW)return Infinity;
  if(tile===BIOME.PINE)return 3.5;
  if(tile===BIOME.FOREST)return 2.4;
  if(tile===BIOME.HILL)return 1.65;
  if(tile===BIOME.SAND)return 1.25;
  return 1;
}
class MinHeap{
  constructor(){this.a=[];}
  push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.a;if(!a.length)return null;const top=a[0],last=a.pop();if(a.length){let i=0;while(true){let l=i*2+1,r=l+1,b=i;if(l<a.length&&a[l].f<a[b].f)b=l;if(r<a.length&&a[r].f<a[b].f)b=r;if(b===i)break;a[i]=a[b];i=b;}a[i]=last;}return top;}
  get length(){return this.a.length;}
}
export function findPath(terrain,start,end,{cellSize=2,maxVisited=90000}={}){
  if(!terrain||terrain.length<WORLD_W*WORLD_H)return{ok:false,reason:'terrain'};
  const cols=Math.ceil(WORLD_W/cellSize),rows=Math.ceil(WORLD_H/cellSize),n=cols*rows;
  const cellAt=(x,y)=>Math.max(0,Math.min(rows-1,Math.floor(y/cellSize)))*cols+Math.max(0,Math.min(cols-1,Math.floor(x/cellSize)));
  const xy=i=>({x:(i%cols)*cellSize+cellSize/2,y:Math.floor(i/cols)*cellSize+cellSize/2});
  const costAt=i=>{const p=xy(i),x=Math.min(WORLD_W-1,Math.floor(p.x)),y=Math.min(WORLD_H-1,Math.floor(p.y));return terrainCost(terrain[y*WORLD_W+x]);};
  const nearestPassable=idx=>{if(Number.isFinite(costAt(idx)))return idx;const p=xy(idx);for(let rad=1;rad<=8;rad++)for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==rad)continue;const x=Math.floor(p.x/cellSize)+dx,y=Math.floor(p.y/cellSize)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const j=y*cols+x;if(Number.isFinite(costAt(j)))return j;}return -1;};
  const s=nearestPassable(cellAt(start.x,start.y)),g=nearestPassable(cellAt(end.x,end.y));if(s<0||g<0)return{ok:false,reason:'blocked'};
  const gScore=new Float64Array(n);gScore.fill(Infinity);gScore[s]=0;const came=new Int32Array(n);came.fill(-1);const closed=new Uint8Array(n),heap=new MinHeap();
  const goal=xy(g),heur=i=>{const p=xy(i);return Math.hypot(goal.x-p.x,goal.y-p.y)/cellSize;};heap.push({i:s,f:heur(s)});let visited=0;
  const dirs=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,SQRT2],[1,-1,SQRT2],[-1,1,SQRT2],[1,1,SQRT2]];
  while(heap.length&&visited<maxVisited){const cur=heap.pop(),i=cur.i;if(closed[i])continue;closed[i]=1;visited++;if(i===g)break;const x=i%cols,y=(i/cols)|0;
    for(const[dx,dy,mul]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const j=ny*cols+nx;if(closed[j])continue;const tc=costAt(j);if(!Number.isFinite(tc))continue;if(dx&&dy){if(!Number.isFinite(costAt(y*cols+nx))||!Number.isFinite(costAt(ny*cols+x)))continue;}
      const ng=gScore[i]+cellSize*mul*(tc+costAt(i))*0.5;if(ng<gScore[j]){gScore[j]=ng;came[j]=i;heap.push({i:j,f:ng+heur(j)*cellSize});}}
  }
  if(!closed[g])return{ok:false,reason:visited>=maxVisited?'limit':'no-route',visited};
  const ids=[];for(let i=g;i!==-1;i=came[i]){ids.push(i);if(i===s)break;}ids.reverse();const points=[{x:start.x,y:start.y},...ids.map(xy),{x:end.x,y:end.y}],compact=[];
  for(const p of points){const q=compact[compact.length-1];if(!q||Math.hypot(p.x-q.x,p.y-q.y)>cellSize*.4)compact.push(p);}let distance=0;for(let i=1;i<compact.length;i++)distance+=Math.hypot(compact[i].x-compact[i-1].x,compact[i].y-compact[i-1].y);
  return{ok:true,points:compact,distance,cost:gScore[g],visited};
}
export function pointOnRoute(route,progress){if(!route?.length)return null;if(route.length===1)return route[0];const lens=[];let total=0;for(let i=1;i<route.length;i++){const d=Math.hypot(route[i].x-route[i-1].x,route[i].y-route[i-1].y);lens.push(d);total+=d;}let left=Math.max(0,Math.min(1,progress))*total;for(let i=0;i<lens.length;i++){if(left<=lens[i]){const t=lens[i]?left/lens[i]:0;return{x:route[i].x+(route[i+1].x-route[i].x)*t,y:route[i].y+(route[i+1].y-route[i].y)*t};}left-=lens[i];}return route[route.length-1];}
