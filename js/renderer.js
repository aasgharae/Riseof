import {WORLD_W, WORLD_H, BIOME, generateWorld} from './worldgen.js';
import {makeRng, hash2} from './noise.js';
import {drawCastle, drawTree, drawFlag} from './castles.js';
import {FACTIONS} from '../config.js';
import {armyPower} from '../combat.js';

const COL=['#3d6a8f','#4a7fa5','#e5d5a0','#a8b06e','#9aa763','#7d8f4e','#5f7a42','#a39a63','#8f8a70','#dfe7ee'];

export class Renderer{
  constructor(cv){
    this.cv=cv; this.ctx=cv.getContext('2d');
    this.view='world'; this.S=null; this.t=0;
    this.zoom=0.55; this.minZoom=0.18; this.maxZoom=3.2;
    this.camX=WORLD_W*0.34; this.camY=WORLD_H*0.46;
    this.vx=0; this.vy=0; this._pd=null; this._moved=0;
    this.hl=null; // search highlight {x,y,until}
    this.terr=generateWorld(1337);
    // decorations in a spatial grid so big maps stay fast
    this.decoGrid=new Map();
    for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){
      const b=this.terr[y*WORLD_W+x];
      const h=hash2(x,y);
      let d=null;
      if(b===BIOME.PINE&&h<0.85)d={x,y,s:0.6+h*0.4,k:0};
      else if(b===BIOME.FOREST&&h<0.6)d={x,y,s:0.5+h*0.4,k:(hash2(x,y+3)<0.5?0:1)};
      else if((b===BIOME.GRASS||b===BIOME.MEADOW)&&h<0.06)d={x,y,s:0.35+h*0.25,k:1};
      if(d){const key=(x>>3)+','+(y>>3);
        if(!this.decoGrid.has(key))this.decoGrid.set(key,[]);
        this.decoGrid.get(key).push(d);}
    }
    this._mini=null; // lazy minimap offscreen
    this._bindInput();
  }
  _bindInput(){
    const cv=this.cv;
    let lastX=0,lastY=0,lastT=0;
    cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);this._pin=1;this._moved=0;this.vx=0;this.vy=0;lastX=e.clientX;lastY=e.clientY;lastT=performance.now();});
    cv.addEventListener('pointermove',e=>{
      if(!this._pin)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(dx)+Math.abs(dy)>3)this._moved++;
      const now=performance.now(),dt=Math.max(8,now-lastT);
      const ppu=this._ppu()*this.zoom*(cv.width/cv.clientWidth);
      this.camX-=dx*2/ppu;this.camY-=dy*2/ppu;
      this.vx=-dx*2/ppu/(dt/1000)*0.9;this.vy=-dy*2/ppu/(dt/1000)*0.9;
      lastX=e.clientX;lastY=e.clientY;lastT=now;
    });
    const up=()=>{this._pin=0;
      if(Math.hypot(this.vx,this.vy)>0.4){this._inertia=true;}
    };
    cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',e=>{e.preventDefault();
      this.zoom=Math.min(this.maxZoom,Math.max(this.minZoom,this.zoom*(e.deltaY<0?1.12:0.89)));},{passive:false});
    cv.addEventListener('touchmove',e=>{
      if(e.touches.length===2){e.preventDefault();
        const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
        if(this._pd)this.zoom=Math.min(this.maxZoom,Math.max(this.minZoom,this.zoom*(d/this._pd)));
        this._pd=d;}
    },{passive:false});
    cv.addEventListener('touchend',()=>{this._pd=null;});
    cv.addEventListener('click',e=>{
      if(this._moved>3)return;
      const r=cv.getBoundingClientRect();
      const hit=this.hitTest(e.clientX-r.left,e.clientY-r.top);
      if(hit&&this.onTap)this.onTap(hit);
    });
  }
  _ppu(){const r=this.cv.getBoundingClientRect();
    return this.view==='world'?Math.min(r.width/WORLD_W,r.height/WORLD_H)*2.1:Math.min(r.width/26,r.height/18)*1.4;}
  setView(v){this.view=v;this.zoom=v==='world'?0.55:1.15;
    if(v==='world'&&this.S?.homePos){this.camX=this.S.homePos.x;this.camY=this.S.homePos.y;}}
  setState(s){this.S=s;}
  centerOn(x,y){this.view='world';this.camX=x;this.camY=y;this.vx=0;this.vy=0;this._inertia=false;
    this.hl={x,y,until:performance.now()+4500};}
  zoomBy(f){this.zoom=Math.min(this.maxZoom,Math.max(this.minZoom,this.zoom*f));}
  _miniRect(W,H){const mw=Math.min(W*0.30,360),mh=mw*WORLD_H/WORLD_W;return{x:12,y:12,w:mw,h:mh};}
  hitTest(cx,cy){
    if(!this.S||this.view!=='world')return null;
    const W=this.cv.width;
    const mr=this._miniRect(W,this.cv.height);
    const px2=cx*2,py2=cy*2;
    if(px2>=mr.x&&px2<=mr.x+mr.w&&py2>=mr.y&&py2<=mr.y+mr.h)
      return{kind:'minimap',wx:(px2-mr.x)/mr.w*WORLD_W,wy:(py2-mr.y)/mr.h*WORLD_H};
    const ppu=this._ppu()*this.zoom*(this.cv.width/this.cv.clientWidth);
    const scr=(wx,wy)=>[(wx-this.camX)*ppu+W/2,(wy-this.camY)*ppu+this.cv.height/2];
    const test=(x,y,s)=>{const[px,py]=scr(x,y);const dx=px2-px,dy=py2-py;return dx*dx+dy*dy<(s*1.0)**2;};
    if(this.S.homePos&&test(this.S.homePos.x,this.S.homePos.y,ppu*1.6))return{kind:'home'};
    for(const tr of this.S.tribes){if(test(tr.x,tr.y,ppu*1.5))return{kind:'tribe',tribe:tr};}
    return null;}
  _clampCam(){
    const hw=this.cv.width/2/this._ppu()/this.zoom, hh=this.cv.height/2/this._ppu()/this.zoom;
    this.camX=hw>=WORLD_W/2?WORLD_W/2:Math.max(hw,Math.min(WORLD_W-hw,this.camX));
    this.camY=hh>=WORLD_H/2?WORLD_H/2:Math.max(hh,Math.min(WORLD_H-hh,this.camY));}

  draw(){
    const c=this.ctx,W=this.cv.width=this.cv.clientWidth*2,H=this.cv.height=this.cv.clientHeight*2;
    this.t+=0.016;
    if(this._inertia&&!this._pin){
      this.camX+=this.vx*0.016*60;this.camY+=this.vy*0.016*60;
      this.vx*=0.94;this.vy*=0.94;
      if(Math.hypot(this.vx,this.vy)<0.3)this._inertia=false;}
    const ppu=this._ppu()*this.zoom;
    if(this.view==='world')this.drawWorld(c,W,H,ppu);
    else this.drawCastleView(c,W,H,ppu);}

  drawWorld(c,W,H,ppu){
    this._clampCam();
    c.fillStyle='#c9b98a';c.fillRect(0,0,W,H);
    const rng=makeRng(99);
    for(let i=0;i<140;i++){c.fillStyle=`rgba(120,95,55,${0.03+rng()*0.04})`;
      c.beginPath();c.arc(rng()*W,rng()*H,20+rng()*70,0,7);c.fill();}
    const scr=(wx,wy)=>[(wx-this.camX)*ppu+W/2,(wy-this.camY)*ppu+H/2];
    const x0=Math.max(0,Math.floor(this.camX-W/2/ppu)-1),x1=Math.min(WORLD_W,Math.ceil(this.camX+W/2/ppu)+1);
    const y0=Math.max(0,Math.floor(this.camY-H/2/ppu)-1),y1=Math.min(WORLD_H,Math.ceil(this.camY+H/2/ppu)+1);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const b=this.terr[y*WORLD_W+x];
      const[sx,sy]=scr(x,y);
      c.fillStyle=COL[b]||'#a8b06e';
      c.fillRect(sx,sy,ppu+1,ppu+1);
      const h=hash2(x*13,y*7);
      if(b>=BIOME.GRASS&&h<0.3){c.fillStyle='rgba(60,70,30,.10)';c.fillRect(sx+ppu*h,sy+ppu*hash2(y,x),ppu*0.35,ppu*0.25);}
      if(b<=BIOME.SEA&&hash2(x,y)<0.08){c.fillStyle='rgba(255,255,255,.12)';
        c.fillRect(sx+ppu*0.2,sy+ppu*0.4+Math.sin(this.t*2+x)*ppu*0.12,ppu*0.4,ppu*0.08);}
      if(b===BIOME.MOUNT&&hash2(x*7,y*11)<0.5){
        c.strokeStyle='rgba(70,60,40,.5)';c.lineWidth=Math.max(1,ppu*0.05);
        c.beginPath();c.moveTo(sx,sy+ppu*0.9);c.lineTo(sx+ppu*0.5,sy+ppu*0.15);c.lineTo(sx+ppu,sy+ppu*0.9);c.stroke();}
    }
    c.fillStyle='rgba(40,60,80,.25)';
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      if(this.terr[y*WORLD_W+x]===BIOME.SAND&&hash2(x,y+99)<0.25)c.fillRect(scr(x,y)[0],scr(x,y)[1],ppu,ppu*0.18);}
    // forests from spatial grid (only visible cells)
    for(let gy=Math.max(0,y0>>3);gy<=(Math.min(WORLD_H,y1)+7>>3);gy++)
      for(let gx=Math.max(0,x0>>3);gx<=(Math.min(WORLD_W,x1)+7>>3);gx++){
        const cell=this.decoGrid.get(gx+','+gy);if(!cell)continue;
        for(const d of cell){
          if(d.x<x0||d.x>=x1||d.y<y0||d.y>=y1)continue;
          const[sx,sy]=scr(d.x+0.5,d.y+0.8);
          drawTree(c,sx,sy,d.s*ppu,d.k,this.t);}
      }
    // faction territory names when zoomed out
    if(this.zoom<0.75){
      c.textAlign='center';
      for(let i=0;i<FACTIONS.length;i++){
        const a=(i+0.5)/FACTIONS.length*Math.PI*2-Math.PI/2;
        const fx=WORLD_W/2+Math.cos(a)*WORLD_W*0.30, fy=WORLD_H/2+Math.sin(a)*WORLD_H*0.30;
        const[px,py]=scr(fx,fy);
        c.font=`bold ${Math.max(14,ppu*1.6)}px Vazirmatn, sans-serif`;
        c.fillStyle=FACTIONS[i].color+'55';
        c.fillText(FACTIONS[i].icon+' '+FACTIONS[i].name,px,py);}
    }
    if(!this.S)return;
    // enemy castles: level badge above, name+power label below
    for(const tr of this.S.tribes){
      const[px,py]=scr(tr.x,tr.y);
      if(px<-120||px>W+120||py<-120||py>H+120)continue;
      drawCastle(c,px,py,ppu*1.35,tr.color||'#a03a3a',this.t,0,tr.level);
      this._label2(c,tr.name,'⚔'+this._fmt(tr.power)+' • 🛡Lv'+(tr.wall||0),px,py+ppu*1.35*0.72,'#ffd166',ppu);}
    // search highlight ring
    if(this.hl&&performance.now()<this.hl.until){
      const[px,py]=scr(this.hl.x,this.hl.y);
      const r=ppu*(1.6+Math.sin(this.t*6)*0.35);
      c.strokeStyle='#ffd166';c.lineWidth=4;
      c.beginPath();c.arc(px,py-ppu*0.4,r,0,7);c.stroke();
      c.strokeStyle='rgba(255,209,102,.35)';c.lineWidth=10;
      c.beginPath();c.arc(px,py-ppu*0.4,r,0,7);c.stroke();
    }
    // player home
    if(this.S.homePos){
      const[hx,hy]=scr(this.S.homePos.x,this.S.homePos.y);
      const keepLv=this.S.buildings.find(b=>b.type==='keep')?.level||1;
      drawCastle(c,hx,hy,ppu*1.5,'#ffd166',this.t,0,keepLv);
      this._label2(c,'⭐ قلعه شما','⚔'+this._fmt(armyPower(this.S.troops))+' • 👥'+this._fmt((Object.values(this.S.troops).reduce((a,b)=>a+b,0))),hx,hy+ppu*1.5*0.72,'#ffe9a8',ppu);}
    // marching armies
    for(const m of this.S.marches||[]){
      const prog=1-(m.travelLeft/m.travelTotal);
      const mx=m.hx+(m.tx-m.hx)*prog, my=m.hy+(m.ty-m.hy)*prog;
      const[px,py]=scr(mx,my);
      c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(px,py+4,ppu*0.4,ppu*0.14,0,0,7);c.fill();
      c.fillStyle=m.returning?'#46a758':'#e5484d';c.beginPath();c.arc(px,py,ppu*0.3,0,7);c.fill();
      c.fillStyle='#fff';c.font=`bold ${Math.max(9,ppu*0.35)}px Vazirmatn`;c.textAlign='center';c.fillText(m.returning?'🏳':'⚔',px,py+ppu*0.12);}
    this._drawMini(c,W,H);
    c.fillStyle='rgba(60,45,20,.55)';c.font='12px Vazirmatn';c.textAlign='center';
    c.fillText('برای جابه‌جایی بکشید • زوم با دو انگشت یا اسکرول • ضربه روی مینی‌مپ = پرش',W/2,H-14);}
  _fmt(n){n=Math.floor(n);if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n;}
  _label2(c,l1,l2,px,py,color,ppu){
    c.font=`bold ${Math.max(11,ppu*0.36)}px Vazirmatn, sans-serif`;c.textAlign='center';
    const w=Math.max(c.measureText(l1).width,c.measureText(l2).width)+16;
    const lh=Math.max(15,ppu*0.42), h=lh*2+8;
    c.fillStyle='rgba(30,25,12,.80)';c.beginPath();c.roundRect(px-w/2,py,w,h,7);c.fill();
    c.strokeStyle='rgba(255,209,102,.4)';c.lineWidth=1;c.stroke();
    c.fillStyle=color;c.fillText(l1,px,py+lh);
    c.fillStyle='#ffd166';c.fillText(l2,px,py+lh*2+2);}
  _buildMini(){
    const m=document.createElement('canvas');m.width=WORLD_W;m.height=WORLD_H;
    const g=m.getContext('2d');
    for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){
      g.fillStyle=COL[this.terr[y*WORLD_W+x]]||'#a8b06e';g.fillRect(x,y,1,1);}
    this._mini=m;}
  _drawMini(c,W,H){
    if(!this._mini)this._buildMini();
    const mr=this._miniRect(W,H);
    c.fillStyle='rgba(10,14,20,.75)';c.beginPath();c.roundRect(mr.x-5,mr.y-5,mr.w+10,mr.h+10,10);c.fill();
    c.drawImage(this._mini,mr.x,mr.y,mr.w,mr.h);
    if(this.S){
      for(const tr of this.S.tribes){
        c.fillStyle=tr.color||'#e5484d';
        c.fillRect(mr.x+tr.x/WORLD_W*mr.w-1.5,mr.y+tr.y/WORLD_H*mr.h-1.5,3,3);}
      if(this.S.homePos){
        const hx=mr.x+this.S.homePos.x/WORLD_W*mr.w, hy=mr.y+this.S.homePos.y/WORLD_H*mr.h;
        c.fillStyle='#ffd166';c.beginPath();c.arc(hx,hy,4,0,7);c.fill();
        c.strokeStyle='#000';c.lineWidth=1;c.stroke();}
      // viewport rectangle
      const vw=this.cv.width/this._ppu()/this.zoom/WORLD_W*mr.w, vh=this.cv.height/this._ppu()/this.zoom/WORLD_H*mr.h;
      c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.5;
      c.strokeRect(mr.x+this.camX/WORLD_W*mr.w-vw/2,mr.y+this.camY/WORLD_H*mr.h-vh/2,vw,vh);
    }
    c.strokeStyle='rgba(255,209,102,.5)';c.lineWidth=2;
    c.beginPath();c.roundRect(mr.x-5,mr.y-5,mr.w+10,mr.h+10,10);c.stroke();}

  drawCastleView(c,W,H,ppu){
    if(!this.S)return;
    c.fillStyle='#8ba05e';c.fillRect(0,0,W,H);
    c.fillStyle='rgba(255,255,255,.04)';
    for(let y=0;y<H;y+=48)for(let x=0;x<W;x+=48)if(((x+y)/48)%2<1)c.fillRect(x,y,48,48);
    const keep=this.S.buildings.find(b=>b.type==='keep');
    if(keep){c.strokeStyle='rgba(150,120,80,.5)';c.lineCap='round';
      for(const b of this.S.buildings){if(b===keep)continue;
        c.lineWidth=ppu*0.4;
        c.beginPath();c.moveTo(this._bx(keep.x,ppu,W),this._by(keep.y,ppu,H)+12);
        c.lineTo(this._bx(b.x,ppu,W),this._by(b.y,ppu,H)+12);c.stroke();}}
    c.strokeStyle='rgba(90,60,35,.5)';c.lineWidth=4;c.strokeRect(10,10,W-20,H-20);
    for(const b of[...this.S.buildings].sort((a,b)=>a.y-b.y)){
      drawBuilding(c,b.type,this._bx(b.x,ppu,W),this._by(b.y,ppu,H),ppu*1.5,b.level,this.t);}}
  _bx(x,ppu,W){return W*0.5+(x-13)*ppu*1.6;}
  _by(y,ppu,H){return H*0.42+(y-8)*ppu*1.6;}
}

// marching arrow when expedition travels
export function drawBuilding(c,type,px,py,s,level,t){
  c.fillStyle='rgba(0,0,0,.25)';
  c.beginPath();c.ellipse(px,py+s*0.1,s*0.78,s*0.2,0,0,7);c.fill();
  const wood='#8a5a33',woodD='#6d431f',wallC='#e8dcc2',wallS='rgba(0,0,0,.12)';
  const roof='#b5432f',roofD='#8a2f22';
  const pips=()=>{const n=Math.min(level,30);for(let i=0;i<Math.min(n,10);i++){
    c.fillStyle='#ffd166';c.beginPath();c.arc(px-s*0.5+i*s*0.17,py+s*0.34,s*0.055,0,7);c.fill();}
    if(n>10){c.fillStyle='#ffd166';c.font=`bold ${s*0.3}px Vazirmatn`;c.textAlign='left';c.fillText('Lv'+n,px-s*0.55,py+s*0.5);}};
  if(type==='keep'){
    const w=s*1.1,hgt=s*0.95;
    c.fillStyle='#b3a992';c.fillRect(px-w/2,py-hgt*0.55,w,hgt*0.55);
    c.fillStyle=wallS;c.fillRect(px+w*0.08,py-hgt*0.55,w*0.42,hgt*0.55);
    const cw=w*0.085;
    for(let i=0;i<6;i++){c.fillStyle='#b3a992';c.fillRect(px-w/2+i*cw*1.5,py-hgt*0.55-cw*0.8,cw,cw*0.8);}
    c.fillStyle='#4a3524';
    c.beginPath();c.moveTo(px-w*0.15,py);c.lineTo(px-w*0.15,py-hgt*0.32);
    c.arc(px,py-hgt*0.32,w*0.15,Math.PI,0);c.lineTo(px+w*0.15,py);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=1;
    for(let i=1;i<4;i++){c.beginPath();c.moveTo(px-w*0.15+i*w*0.075,py);c.lineTo(px-w*0.15+i*w*0.075,py-hgt*0.32);c.stroke();}
    const tw=s*0.52,th=s*1.3;
    c.fillStyle='#c7bda6';c.fillRect(px-tw/2,py-th-hgt*0.3,tw,th);
    c.fillStyle=wallS;c.fillRect(px+tw*0.12,py-th-hgt*0.3,tw*0.38,th);
    c.fillStyle='#2a2118';
    for(let i=0;i<2;i++){c.beginPath();c.roundRect(px-tw*0.12,py-th-hgt*0.3+th*0.25+i*th*0.32,tw*0.24,tw*0.34,tw*0.12);c.fill();}
    for(const[tx,ty]of[[px-tw*0.78,py-hgt*0.22],[px+tw*0.78,py-hgt*0.22]]){
      c.fillStyle='#8d8578';c.fillRect(tx-s*0.16,ty-s*0.72,s*0.32,s*0.72);
      c.fillStyle=roof;c.beginPath();c.moveTo(tx-s*0.24,ty-s*0.72);c.lineTo(tx,ty-s*1.15);c.lineTo(tx+s*0.24,ty-s*0.72);c.closePath();c.fill();
      c.fillStyle=roofD;c.beginPath();c.moveTo(tx,ty-s*1.15);c.lineTo(tx+s*0.24,ty-s*0.72);c.lineTo(tx+s*0.06,ty-s*0.72);c.closePath();c.fill();}
    drawFlag(c,px,py-th-hgt*0.3-cw*0.8,s*0.5,s*0.6,'#e5484d',t);
    pips();return;}
  if(type==='muster'){
    c.fillStyle='rgba(140,115,75,.4)';c.beginPath();c.roundRect(px-s*0.8,py-s*0.55,s*1.6,s*0.85,s*0.12);c.fill();
    const tent=(x,wd,ht,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(x-wd,py-s*0.15);c.lineTo(x,py-s*0.15-ht);c.lineTo(x+wd,py-s*0.15);c.closePath();c.fill();
      c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.moveTo(x,py-s*0.15-ht);c.lineTo(x+wd,py-s*0.15);c.lineTo(x+wd*0.35,py-s*0.15);c.closePath();c.fill();};
    tent(px-s*0.45,s*0.22,s*0.4,'#a8342f');tent(px+s*0.45,s*0.22,s*0.4,'#3f5d8a');
    c.strokeStyle='#5d4126';c.lineWidth=s*0.06;
    c.beginPath();c.moveTo(px,py);c.lineTo(px,py-s*0.95);c.stroke();
    drawFlag(c,px,py-s*0.95,s*0.42,s*0.5,'#ffd166',t);
    c.fillStyle='#8a5a33';c.beginPath();c.roundRect(px+s*0.15,py-s*0.34,s*0.3,s*0.22,4);c.fill();
    c.fillStyle='#e8dcc2';c.beginPath();c.ellipse(px+s*0.3,py-s*0.34,s*0.15,s*0.05,0,0,7);c.fill();
    const pu=(Math.sin(t*4)+1)/2;
    c.strokeStyle=`rgba(255,209,102,${0.7-pu*0.6})`;c.lineWidth=2;
    c.beginPath();c.arc(px+s*0.3,py-s*0.3,s*(0.25+pu*0.3),0,7);c.stroke();
    pips();return;}
  if(type==='farm'){
    c.fillStyle='#d9b64e';
    for(let r=0;r<3;r++)c.fillRect(px-s*0.85,py-s*0.15+r*s*0.22,s*0.85,s*0.12);
    c.fillStyle='#c2a03e';
    for(let r=0;r<3;r++)for(let i=0;i<4;i++)c.fillRect(px-s*0.8+i*s*0.2,py-s*0.15+r*s*0.22,s*0.08,s*0.12);
    const hw=s*0.55,hh=s*0.42;
    c.fillStyle=wallC;c.fillRect(px-s*0.2,py-hh-s*0.25,hw,hh);
    c.fillStyle=wallS;c.fillRect(px+hw*0.05,py-hh-s*0.25,hw*0.4,hh);
    c.fillStyle=roof;
    c.beginPath();c.moveTo(px-s*0.28,py-hh-s*0.25);c.lineTo(px+hw*0.15,py-hh-s*0.62);c.lineTo(px+hw*0.8,py-hh-s*0.25);c.closePath();c.fill();
    c.fillStyle=roofD;
    c.beginPath();c.moveTo(px+hw*0.15,py-hh-s*0.62);c.lineTo(px+hw*0.8,py-hh-s*0.25);c.lineTo(px+hw*0.3,py-hh-s*0.25);c.closePath();c.fill();
    c.fillStyle='#5d4126';c.fillRect(px-s*0.08,py-s*0.32,s*0.14,s*0.32);
    const mx=px+s*0.72,my=py-s*0.45;
    c.fillStyle='#a8917a';c.beginPath();
    c.moveTo(mx-s*0.14,py);c.lineTo(mx-s*0.08,my);c.lineTo(mx+s*0.08,my);c.lineTo(mx+s*0.14,py);c.closePath();c.fill();
    c.fillStyle=woodD;c.beginPath();c.moveTo(mx-s*0.12,my);c.lineTo(mx,my-s*0.34);c.lineTo(mx+s*0.12,my);c.closePath();c.fill();
    c.save();c.translate(mx,my-s*0.3);c.rotate(t*1.5);
    for(let i=0;i<4;i++){c.rotate(Math.PI/2);
      c.strokeStyle='#5d4126';c.lineWidth=s*0.06;c.beginPath();c.moveTo(0,0);c.lineTo(s*0.4,0);c.stroke();
      c.fillStyle='rgba(255,255,255,.78)';c.fillRect(s*0.1,-s*0.09,s*0.3,s*0.18);}
    c.restore();pips();return;}
  if(type==='lumber'){
    const hw=s*0.6,hh=s*0.42;
    c.fillStyle=wood;c.fillRect(px-s*0.35,py-hh-s*0.2,hw,hh);
    c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=1;
    for(let i=1;i<5;i++){c.beginPath();c.moveTo(px-s*0.35,py-hh-s*0.2+hh*i/5);c.lineTo(px+s*0.25,py-hh-s*0.2+hh*i/5);c.stroke();}
    c.fillStyle=roof;
    c.beginPath();c.moveTo(px-s*0.42,py-hh-s*0.2);c.lineTo(px-s*0.05,py-hh-s*0.55);c.lineTo(px+s*0.32,py-hh-s*0.2);c.closePath();c.fill();
    c.fillStyle=roofD;
    c.beginPath();c.moveTo(px-s*0.05,py-hh-s*0.55);c.lineTo(px+s*0.32,py-hh-s*0.2);c.lineTo(px+s*0.05,py-hh-s*0.2);c.closePath();c.fill();
    for(let i=0;i<3;i++){c.fillStyle='#a97b4f';c.beginPath();c.roundRect(px+s*0.4,py-s*0.1-i*s*0.12,s*0.32,s*0.11,3);c.fill();
      c.fillStyle='#8a5a33';c.beginPath();c.arc(px+s*0.72,py-s*0.05-i*s*0.12,s*0.055,0,7);c.fill();}
    drawTree(c,px-s*0.6,py,s*0.55,0,t);
    drawTree(c,px-s*0.8,py+s*0.12,s*0.45,0,t);pips();return;}
  if(type==='quarry'){
    c.fillStyle='#b0a99a';c.beginPath();c.ellipse(px,py-s*0.05,s*0.6,s*0.28,0,0,7);c.fill();
    c.fillStyle='#98917f';c.beginPath();c.ellipse(px,py-s*0.05,s*0.4,s*0.18,0,0,7);c.fill();
    const rock=(x,y,r)=>{c.fillStyle='#8d9196';c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*0.4,y-r);c.lineTo(x+r*0.5,y-r*0.9);c.lineTo(x+r,y);c.closePath();c.fill();
      c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.moveTo(x-r*0.4,y-r);c.lineTo(x+r*0.5,y-r*0.9);c.lineTo(x+r*0.15,y-r*0.35);c.closePath();c.fill();};
    rock(px-s*0.35,py-s*0.12,s*0.14);rock(px+s*0.3,py-s*0.1,s*0.17);rock(px-s*0.05,py-s*0.32,s*0.12);
    c.fillStyle=woodD;c.fillRect(px+s*0.42,py-s*0.6,s*0.09,s*0.6);
    c.save();c.translate(px+s*0.465,py-s*0.6);c.rotate(Math.sin(t*0.8)*0.3);
    c.strokeStyle=woodD;c.lineWidth=s*0.06;c.beginPath();c.moveTo(0,0);c.lineTo(-s*0.5,0);c.stroke();
    c.strokeStyle='#2a2118';c.lineWidth=1;c.beginPath();c.moveTo(-s*0.5,0);c.lineTo(-s*0.5,s*0.28);c.stroke();
    c.fillStyle='#8d9196';c.fillRect(-s*0.58,s*0.28,s*0.16,s*0.12);c.restore();pips();return;}
  if(type==='ironmine'||type==='goldmine'){
    const gold=type==='goldmine';
    c.fillStyle=gold?'#8a8154':'#7d8288';c.beginPath();
    c.moveTo(px-s*0.55,py);c.lineTo(px-s*0.35,py-s*0.55);c.lineTo(px+s*0.3,py-s*0.55);c.lineTo(px+s*0.55,py);c.closePath();c.fill();
    c.fillStyle='#17110b';
    c.beginPath();c.moveTo(px-s*0.14,py);c.lineTo(px-s*0.1,py-s*0.22);c.arc(px,py-s*0.22,s*0.1,Math.PI,0);c.lineTo(px+s*0.14,py);c.closePath();c.fill();
    c.strokeStyle=woodD;c.lineWidth=s*0.05;
    c.beginPath();c.moveTo(px-s*0.15,py);c.lineTo(px-s*0.15,py-s*0.28);c.lineTo(px+s*0.15,py-s*0.28);c.lineTo(px+s*0.15,py);c.stroke();
    c.strokeStyle='#4a3524';c.lineWidth=2;
    c.beginPath();c.moveTo(px-s*0.6,py+s*0.1);c.lineTo(px+s*0.1,py+s*0.1);c.stroke();
    const cx=px-s*0.6+(Math.abs((t*0.4)%2-1))*s*0.6;
    c.fillStyle=woodD;c.fillRect(cx,py-s*0.05,s*0.2,s*0.12);
    c.fillStyle='#3b4046';c.beginPath();c.arc(cx+s*0.05,py+s*0.08,s*0.045,0,7);c.arc(cx+s*0.16,py+s*0.08,s*0.045,0,7);c.fill();
    if(gold){const gl=0.5+Math.sin(t*3)*0.5;
      c.fillStyle=`rgba(255,209,102,${gl})`;
      c.beginPath();c.arc(px-s*0.25,py-s*0.25,s*0.05,0,7);c.arc(px+s*0.28,py-s*0.15,s*0.04,0,7);c.fill();}
    else{c.fillStyle='#aab2ba';
      c.beginPath();c.arc(cx+s*0.07,py-s*0.06,s*0.04,0,7);c.arc(cx+s*0.13,py-s*0.05,s*0.035,0,7);c.fill();}
    pips();return;}
  if(type==='barracks'){
    c.fillStyle='rgba(150,120,80,.35)';c.beginPath();c.roundRect(px-s*0.75,py-s*0.5,s*1.5,s*0.78,s*0.12);c.fill();
    const bw=s*0.55,bh=s*0.45;
    c.fillStyle=wallC;c.fillRect(px-s*0.55,py-bh-s*0.3,bw,bh);
    c.fillStyle=wallS;c.fillRect(px-s*0.55+bw*0.6,py-bh-s*0.3,bw*0.4,bh);
    c.fillStyle=roof;
    c.beginPath();c.moveTo(px-s*0.62,py-bh-s*0.3);c.lineTo(px-s*0.27,py-bh-s*0.6);c.lineTo(px+s*0.08,py-bh-s*0.3);c.closePath();c.fill();
    c.fillStyle=roofD;
    c.beginPath();c.moveTo(px-s*0.27,py-bh-s*0.6);c.lineTo(px+s*0.08,py-bh-s*0.3);c.lineTo(px-s*0.1,py-bh-s*0.3);c.closePath();c.fill();
    drawFlag(c,px-s*0.27,py-bh-s*0.6,s*0.3,s*0.35,'#46a758',t);
    c.strokeStyle='#5d4126';c.lineWidth=s*0.05;
    c.beginPath();c.moveTo(px+s*0.45,py);c.lineTo(px+s*0.45,py-s*0.3);c.stroke();
    c.beginPath();c.moveTo(px+s*0.32,py-s*0.22);c.lineTo(px+s*0.58,py-s*0.22);c.stroke();
    c.fillStyle='#c8a265';c.beginPath();c.arc(px+s*0.45,py-s*0.46,s*0.07,0,7);c.fill();
    c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=2;
    const ang=-0.6+Math.sin(t*4)*0.9;
    c.beginPath();c.arc(px+s*0.45,py-s*0.34,s*0.2,ang-0.5,ang+0.5);c.stroke();pips();return;}
  if(type==='wall'){
    const wh=s*0.5;
    c.fillStyle='#9a9284';c.fillRect(px-s*0.6,py-wh,s*1.2,wh);
    c.fillStyle='rgba(0,0,0,.15)';c.fillRect(px-s*0.6,py-wh,s*1.2,wh*0.18);
    c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=1;
    for(let r=1;r<3;r++){c.beginPath();c.moveTo(px-s*0.6,py-wh+r*wh/3);c.lineTo(px+s*0.6,py-wh+r*wh/3);c.stroke();}
    for(let i=0;i<4;i++){c.fillStyle='#9a9284';c.fillRect(px-s*0.6+i*s*0.33,py-wh-s*0.14,s*0.18,s*0.14);}
    const fl=0.7+Math.sin(t*9+px)*0.3;
    c.fillStyle='#5d4126';c.fillRect(px+s*0.35,py-wh-s*0.3,s*0.05,s*0.3);
    c.fillStyle=`rgba(255,150,50,${fl})`;
    c.beginPath();c.arc(px+s*0.375,py-wh-s*0.34,s*0.07,0,7);c.fill();pips();return;}
  c.fillStyle=wallC;c.fillRect(px-s*0.3,py-s*0.4,s*0.6,s*0.4);
  c.fillStyle=roof;c.beginPath();c.moveTo(px-s*0.38,py-s*0.4);c.lineTo(px,py-s*0.68);c.lineTo(px+s*0.38,py-s*0.4);c.closePath();c.fill();
  pips();
}
