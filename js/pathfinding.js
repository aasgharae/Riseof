import {BIOME, WORLD_W, WORLD_H} from './worldgen.js';
const SQRT2=Math.SQRT2;
// فقط کوه/برف و دریای عمیق بسته‌اند و دورشان می‌زنند؛ رود (و آب کم‌عمق) و جنگل قابل‌عبورند ولی کندتر
export const TERRAIN_COST={river:4,pine:2.2,forest:1.8};
function terrainCost(tile){
  if(tile===BIOME.DEEP||tile===BIOME.MOUNT||tile===BIOME.SNOW)return Infinity;
  if(tile===BIOME.SEA)return TERRAIN_COST.river;
  if(tile===BIOME.PINE)return TERRAIN_COST.pine;
  if(tile===BIOME.FOREST)return TERRAIN_COST.forest;
  return 1;
}
class MinHeap{
  constructor(){this.a=[];}
  push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
  pop(){const a=this.a;if(!a.length)return null;const top=a[0],last=a.pop();if(a.length){let i=0;while(true){let l=i*2+1,r=l+1,b=i;if(l<a.length&&a[l].f<a[b].f)b=l;if(r<a.length&&a[r].f<a[b].f)b=r;if(b===i)break;a[i]=a[b];i=b;}a[i]=last;}return top;}
  get length(){return this.a.length;}
}
export function findPath(terrain,start,end,{cellSize=2,maxVisited=200000,hWeight=1.25}={}){
  if(!terrain||terrain.length<WORLD_W*WORLD_H)return{ok:false,reason:'terrain'};
  const cols=Math.ceil(WORLD_W/cellSize),rows=Math.ceil(WORLD_H/cellSize),n=cols*rows;
  const cellAt=(x,y)=>Math.max(0,Math.min(rows-1,Math.floor(y/cellSize)))*cols+Math.max(0,Math.min(cols-1,Math.floor(x/cellSize)));
  const xy=i=>({x:(i%cols)*cellSize+cellSize/2,y:Math.floor(i/cols)*cellSize+cellSize/2});
  const tileCost=(x,y)=>terrainCost(terrain[Math.max(0,Math.min(WORLD_H-1,Math.floor(y)))*WORLD_W+Math.max(0,Math.min(WORLD_W-1,Math.floor(x)))]);
  // هزینه‌ی هر خانه = بدترین تایل داخلش، تا رودها و کوه‌های باریک از قلم نیفتند
  const costAt=i=>{const cx=(i%cols)*cellSize,cy=Math.floor(i/cols)*cellSize;let m=1;for(let dy=0;dy<cellSize;dy++)for(let dx=0;dx<cellSize;dx++){const c=tileCost(cx+dx,cy+dy);if(c>m)m=c;if(c===Infinity)return Infinity;}return m;};
  // هزینه‌ی واقعی یک پاره‌خط مستقیم (null = از زمین بسته رد می‌شود)
  const segCost=(a,b,marks,base=0)=>{const L=Math.hypot(b.x-a.x,b.y-a.y);if(L<1e-6)return 0;const n=Math.max(1,Math.ceil(L/0.5));let c=0,prev=null,lastMark=-9;
    for(let k=0;k<n;k++){const t=(k+0.5)/n,tc=tileCost(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);if(tc===Infinity)return null;
      // نقطه‌ی شکست روی مرز تغییر زمین (جاده→جنگل، جنگل→رود…) تا سرعت حرکت روی نقشه درست دیده شود
      if(marks&&prev!==null&&tc!==prev&&k*L/n-lastMark>=1.5&&(n-k)*L/n>=1.5){const tb=k/n;marks.push({x:a.x+(b.x-a.x)*tb,y:a.y+(b.y-a.y)*tb,c:base+c});lastMark=k*L/n;}
      prev=tc;c+=tc*L/n;}return c;};
  const nearestPassable=idx=>{if(Number.isFinite(costAt(idx)))return idx;const p=xy(idx);for(let rad=1;rad<=8;rad++)for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==rad)continue;const x=Math.floor(p.x/cellSize)+dx,y=Math.floor(p.y/cellSize)+dy;if(x<0||y<0||x>=cols||y>=rows)continue;const j=y*cols+x;if(Number.isFinite(costAt(j)))return j;}return -1;};
  const s=nearestPassable(cellAt(start.x,start.y)),g=nearestPassable(cellAt(end.x,end.y));if(s<0||g<0)return{ok:false,reason:'blocked'};
  const gScore=new Float64Array(n);gScore.fill(Infinity);gScore[s]=0;const came=new Int32Array(n);came.fill(-1);const closed=new Uint8Array(n),heap=new MinHeap();
  const goal=xy(g),heur=i=>{const p=xy(i);return Math.hypot(goal.x-p.x,goal.y-p.y)/cellSize;};heap.push({i:s,f:heur(s)*cellSize*hWeight});let visited=0;
  const dirs=[[-1,0,1],[1,0,1],[0,-1,1],[0,1,1],[-1,-1,SQRT2],[1,-1,SQRT2],[-1,1,SQRT2],[1,1,SQRT2]];
  while(heap.length&&visited<maxVisited){const cur=heap.pop(),i=cur.i;if(closed[i])continue;closed[i]=1;visited++;if(i===g)break;const x=i%cols,y=(i/cols)|0;
    for(const[dx,dy,mul]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const j=ny*cols+nx;if(closed[j])continue;const tc=costAt(j);if(!Number.isFinite(tc))continue;if(dx&&dy){if(!Number.isFinite(costAt(y*cols+nx))||!Number.isFinite(costAt(ny*cols+x)))continue;}
      const ng=gScore[i]+cellSize*mul*(tc+costAt(i))*0.5;if(ng<gScore[j]){gScore[j]=ng;came[j]=i;heap.push({i:j,f:ng+heur(j)*cellSize*hWeight});}}
  }
  if(!closed[g])return{ok:false,reason:visited>=maxVisited?'limit':'no-route',visited};
  const ids=[];for(let i=g;i!==-1;i=came[i]){ids.push(i);if(i===s)break;}ids.reverse();
  const gp=xy(g),raw=[{x:start.x,y:start.y,g:0},...ids.map(i=>({...xy(i),g:gScore[i]})),{x:end.x,y:end.y,g:gScore[g]+Math.hypot(end.x-gp.x,end.y-gp.y)}],pts=[];
  for(const p of raw){const q=pts[pts.length-1];if(!q||Math.hypot(p.x-q.x,p.y-q.y)>cellSize*.4)pts.push(p);}
  if(pts.length>1&&pts[pts.length-1].x!==end.x)pts[pts.length-1]={x:end.x,y:end.y,g:pts[pts.length-1].g};
  // ساده‌سازی مسیر: تا جایی که خط مستقیم از زمین بسته رد نشود و گرانتر از مسیر A* نباشد، مستقیم می‌رویم
  const out=[{x:pts[0].x,y:pts[0].y,c:0}];let acc=0,i0=0;
  const last=pts.length-1;
  while(i0<last){let took=null,j=last;
    // اول مستقیم تا مقصد، بعد پنجره‌ی ۶۰ نقطه‌ای
    for(;j>i0+1;j=(j===last?Math.min(last-1,i0+60):j-1)){const sc=segCost(pts[i0],pts[j]);if(sc!==null&&sc<=(pts[j].g-pts[i0].g)*1.1+1){took=sc;break;}}
    if(took===null){j=i0+1;const sc=segCost(pts[i0],pts[j]);took=sc!==null?sc:Math.max(0,pts[j].g-pts[i0].g);}
    if(j>i0+1||segCost(pts[i0],pts[j])!==null){const mk=[];segCost(pts[i0],pts[j],mk,acc);for(const m of mk)out.push(m);}
    acc+=took;out.push({x:pts[j].x,y:pts[j].y,c:acc});i0=j;}
  let distance=0;for(let i=1;i<out.length;i++)distance+=Math.hypot(out[i].x-out[i-1].x,out[i].y-out[i-1].y);
  return{ok:true,points:out,distance,cost:acc,visited};
}
// موقعیت روی مسیر. اگر مسیر هزینه‌ی تجمعی (c) دارد، پیشرفت بر اساس هزینه است؛ یعنی در جنگل و رود کندتر حرکت می‌کنند
export function pointOnRoute(route,progress){if(!route?.length)return null;if(route.length===1)return route[0];
  const weighted=route.every(p=>Number.isFinite(p.c))&&route[route.length-1].c>0,lens=[];let total=0;
  for(let i=1;i<route.length;i++){const d=weighted?Math.max(0,route[i].c-route[i-1].c):Math.hypot(route[i].x-route[i-1].x,route[i].y-route[i-1].y);lens.push(d);total+=d;}
  let left=Math.max(0,Math.min(1,progress))*total;
  for(let i=0;i<lens.length;i++){if(left<=lens[i]){const t=lens[i]?left/lens[i]:0;return{x:route[i].x+(route[i+1].x-route[i].x)*t,y:route[i].y+(route[i+1].y-route[i].y)*t};}left-=lens[i];}
  return route[route.length-1];}
