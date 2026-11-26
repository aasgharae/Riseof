import {WORLD_W, WORLD_H, BIOME, generateWorld} from './worldgen.js';
import {makeRng, hash2} from './noise.js';
import {drawCastle, drawTree, drawFlag} from './castles.js';
import {K,drawPine,drawOak,drawBush,drawHill,drawMountain,drawCave,drawChest,drawRuins,drawSquad,drawCamp,drawGiant} from './scenery.js';
import {SITE_KINDS,siteReady} from '../sites.js';
import {CastleScene} from './castleview.js';
import {BOSS_POS} from '../config.js';
export {drawBuilding} from './buildings.js';
import {FACTIONS} from '../config.js';
import {armyPower} from '../combat.js';

const COL=['#3d6a8f','#4a7fa5','#e5d5a0','#a8b06e','#9aa763','#7d8f4e','#5f7a42','#a39a63','#8f8a70','#dfe7ee'];

const WORLD_TILE_PX=30; // پیکسل کنواس برای هر تایل در زوم ۱
export const WORLD_ENTRY_ZOOM=1; // زوم موقع ورود به نقشه جهان (روی قلعه خودت)

export class Renderer{
  constructor(cv){
    this.cv=cv; this.ctx=cv.getContext('2d');
    this.view='world'; this.S=null; this.t=0;
    this.zoom=1; this.minZoom=0.04; this.maxZoom=3;
    this.camX=WORLD_W*0.34; this.camY=WORLD_H*0.46;
    this.vx=0; this.vy=0; this._pd=null; this._moved=0;
    this.hl=null; // search highlight {x,y,until}
    this.scene=new CastleScene();this.ccx=13;this.ccy=9.8;
    this.terr=generateWorld(1337);
    this.ground=this.terr.ground;
    this._res=3; this._vis=[];
    this._buildScenery();
    this._bakeTerrain();

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
      const k=cv.width/cv.clientWidth,ppu=this._ppu()*this.zoom;
      if(this.view==='world'){this.camX-=dx*k/ppu;this.camY-=dy*k/ppu;
        this.vx=-dx*k/ppu/(dt/1000)*0.9;this.vy=-dy*k/ppu/(dt/1000)*0.9;}
      else{this.ccx-=dx*k/ppu;this.ccy-=dy*k/ppu;}
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
    // دنیا: اندازه ثابت هر تایل (پیکسل کنواس) — دیگه به اندازه کل نقشه وابسته نیست، پس بزرگ و خوانا می‌مونه
    return this.view==='world'?WORLD_TILE_PX:Math.min(2*r.width/21,2*r.height/15)/1.15;}
  setView(v){this.view=v;this.zoom=v==='world'?WORLD_ENTRY_ZOOM:1.15;if(v!=='world'){this.ccx=13;this.ccy=9.8;}
    if(v==='world'&&this.S?.homePos){this.camX=this.S.homePos.x;this.camY=this.S.homePos.y;}}
  setState(s){this.S=s;}
  centerOn(x,y){this.view='world';this.camX=x;this.camY=y;this.vx=0;this.vy=0;this._inertia=false;
    this.hl={x,y,until:performance.now()+4500};}
  zoomBy(f){this.zoom=Math.min(this.maxZoom,Math.max(this.minZoom,this.zoom*f));}
  _miniRect(W,H){const mw=Math.min(W*0.30,360),mh=mw*WORLD_H/WORLD_W;return{x:12,y:12,w:mw,h:mh};}
  hitTest(cx,cy){
    if(!this.S)return null;
    if(this.view!=='world'){const W=this.cv.width,H=this.cv.height,u=this._ppu()*this.zoom;
      return this.scene.hit(this.S,cx*2,cy*2,W,H,u,{x:this.ccx,y:this.ccy});}
    const W=this.cv.width;
    const mr=this._miniRect(W,this.cv.height);
    const px2=cx*2,py2=cy*2;
    if(px2>=mr.x&&px2<=mr.x+mr.w&&py2>=mr.y&&py2<=mr.y+mr.h)
      return{kind:'minimap',wx:(px2-mr.x)/mr.w*WORLD_W,wy:(py2-mr.y)/mr.h*WORLD_H};
    const ppu=this._ppu()*this.zoom;
    const scr=(wx,wy)=>[(wx-this.camX)*ppu+W/2,(wy-this.camY)*ppu+this.cv.height/2];
    const test=(x,y,s)=>{const[px,py]=scr(x,y);const dx=px2-px,dy=py2-py;s=Math.max(s,26);return dx*dx+dy*dy<s*s;};
    if(this.S.homePos&&test(this.S.homePos.x,this.S.homePos.y,ppu*1.6))return{kind:'home'};
    if(this.bossOn&&test(BOSS_POS.x,BOSS_POS.y-ppu*1.5,ppu*3))return{kind:'boss'};
    for(const k of this.S.camps||[]){if(test(k.x,k.y,ppu*1.2))return{kind:'camp',camp:k};}
    for(const st of this.S.sites||[]){if(test(st.x,st.y,ppu*1.2))return{kind:'site',site:st};}
    for(const tr of this.S.tribes){if(test(tr.x,tr.y,ppu*1.5))return{kind:'tribe',tribe:tr};}
    if(this.campMode)return{kind:'empty',wx:this.camX+(px2-W/2)/ppu,wy:this.camY+(py2-this.cv.height/2)/ppu};
    return null;}
  _clampCam(){
    const hw=this.cv.width/2/this._ppu()/this.zoom, hh=this.cv.height/2/this._ppu()/this.zoom;
    this.camX=hw>=WORLD_W/2?WORLD_W/2:Math.max(hw,Math.min(WORLD_W-hw,this.camX));
    this.camY=hh>=WORLD_H/2?WORLD_H/2:Math.max(hh,Math.min(WORLD_H-hh,this.camY));}

  draw(){
    const c=this.ctx,W=this.cv.width=this.cv.clientWidth*2,H=this.cv.height=this.cv.clientHeight*2;
    this.t+=0.016;
    if(this._inertia&&!this._pin){
      this.camX+=this.vx*0.016;this.camY+=this.vy*0.016;
      this.vx*=0.94;this.vy*=0.94;
      if(Math.hypot(this.vx,this.vy)<0.3)this._inertia=false;}
    const ppu=this._ppu()*this.zoom;
    if(this.view==='world')this.drawWorld(c,W,H,ppu);
    else this.drawCastleView(c,W,H,ppu);}

  // ---------- صحنه: درخت، کوه، تپه ----------
  _buildScenery(){
    this.decoGrid=new Map();
    const T=this.terr,G=this.ground;
    const add=d=>{const key=(d.x>>3)+','+(d.y>>3);let a=this.decoGrid.get(key);if(!a){a=[];this.decoGrid.set(key,a);}a.push(d);};
    for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){
      const b=T[y*WORLD_W+x];
      if(b<BIOME.GRASS)continue;
      const h=hash2(x,y),h2=hash2(x+17,y+31),h3=hash2(x*3+5,y*7+1);
      const px=x+0.12+h2*0.76,py=y+0.3+h3*0.6;
      if(b===BIOME.PINE){
        if(h<0.93)add({x:px,y:py,s:0.78+h2*0.5,k:K.PINE,v:h3});
        if(h3<0.5)add({x:x+0.1+h*0.8,y:y+0.2+h2*0.7,s:0.55+h*0.4,k:K.PINE,v:h2});
      }else if(b===BIOME.FOREST){
        if(h<0.82)add({x:px,y:py,s:0.7+h2*0.45,k:h2<0.4?K.PINE:K.OAK,v:h3});
        if(h3<0.32)add({x:x+0.1+h*0.8,y:y+0.2+h2*0.7,s:0.5+h*0.4,k:K.OAK,v:h2});
      }else if(b===BIOME.GRASS||b===BIOME.MEADOW){
        if(h<0.04)add({x:px,y:py,s:0.7+h2*0.45,k:K.OAK,v:h3});
        else if(h<(b===BIOME.MEADOW?0.15:0.10))add({x:px,y:py,s:0.5+h2*0.35,k:K.BUSH,v:h3});
      }else if(b===BIOME.HILL){
        if(h<0.55)add({x:px,y:py,s:0.8+h2*0.55,k:K.HILL,v:h3});
      }else if(b===BIOME.MOUNT){
        if(h<0.85)add({x:px,y:py+0.2,s:1.0+h2*0.8,k:G[y*WORLD_W+x]>0.76?K.PEAK:K.MOUNT,v:h3});
      }else if(b===BIOME.SNOW){
        if(h<0.92)add({x:px,y:py+0.2,s:1.3+h2*0.7,k:K.PEAK,v:h3});
      }
    }
  }

  // ---------- نقاشی زمین: ارتفاع پیوسته → ساحل و رود نرم، سایه‌روشن تپه‌ها ----------
  _bakeTerrain(){
    const RES=this._res,W=WORLD_W,H=WORLD_H,BW=W*RES,BH=H*RES,G=this.ground,T=this.terr;
    const LAND=[null,null,[232,214,160],[143,178,88],[162,192,98],[96,144,70],[66,116,72],[168,154,104],[150,138,118],[238,242,247]];
    const R=new Float32Array(W*H),Gc=new Float32Array(W*H),B=new Float32Array(W*H),SH=new Float32Array(W*H);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=y*W+x,col=LAND[T[i]]||LAND[2],j=(hash2(x*5,y*3)-0.5)*14;
      R[i]=col[0]+j;Gc[i]=col[1]+j;B[i]=col[2]+j*0.6;
      const gl=G[y*W+Math.max(0,x-1)],gr=G[y*W+Math.min(W-1,x+1)],gu=G[Math.max(0,y-1)*W+x],gd=G[Math.min(H-1,y+1)*W+x];
      SH[i]=Math.max(-0.35,Math.min(0.35,((gl-gr)+(gu-gd))*3));
    }
    const xi=new Int32Array(BW),xf=new Float32Array(BW),yi=new Int32Array(BH),yf=new Float32Array(BH);
    for(let p=0;p<BW;p++){const u=(p+0.5)/RES-0.5,i0=Math.floor(u);xi[p]=i0;xf[p]=u-i0;}
    for(let p=0;p<BH;p++){const u=(p+0.5)/RES-0.5,i0=Math.floor(u);yi[p]=i0;yf[p]=u-i0;}
    const cl=(v,m)=>v<0?0:(v>m?m:v);
    const img=new ImageData(BW,BH),d=img.data;
    for(let py=0;py<BH;py++){
      const ja=cl(yi[py],H-1),jb=cl(yi[py]+1,H-1),fy=yf[py];
      for(let px=0;px<BW;px++){
        const ia=cl(xi[px],W-1),ib=cl(xi[px]+1,W-1),fx=xf[px];
        const a=ja*W+ia,b=ja*W+ib,c2=jb*W+ia,d2=jb*W+ib;
        const w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
        const g=G[a]*w00+G[b]*w10+G[c2]*w01+G[d2]*w11;
        let r,gg,bb;
        if(g<0.32){
          const dep=Math.min(1,(0.32-g)/0.30);
          r=98-70*dep;gg=170-104*dep;bb=198-86*dep;
          if(g>0.298){const f=(g-0.298)/0.022*0.55;r+=(236-r)*f;gg+=(240-gg)*f;bb+=(236-bb)*f;}
        }else{
          r=R[a]*w00+R[b]*w10+R[c2]*w01+R[d2]*w11;
          gg=Gc[a]*w00+Gc[b]*w10+Gc[c2]*w01+Gc[d2]*w11;
          bb=B[a]*w00+B[b]*w10+B[c2]*w01+B[d2]*w11;
          const sh=SH[a]*w00+SH[b]*w10+SH[c2]*w01+SH[d2]*w11;
          const bt=cl((0.375-g)/0.05,1);
          if(bt>0){r+=(234-r)*bt;gg+=(216-gg)*bt;bb+=(162-bb)*bt;}
          if(g<0.336){const wt=(0.336-g)/0.016*0.4;r-=r*0.12*wt;gg-=gg*0.1*wt;bb-=bb*0.08*wt;}
          const mul=1+sh*0.55;r*=mul;gg*=mul;bb*=mul;
        }
        const n=(((px*73856093)^(py*19349663))&255)/255-0.5;
        const o=(py*BW+px)*4;
        d[o]=r+n*5;d[o+1]=gg+n*5;d[o+2]=bb+n*5;d[o+3]=255;
      }
    }
    const cv=document.createElement('canvas');cv.width=BW;cv.height=BH;
    cv.getContext('2d').putImageData(img,0,0);
    this._bake=cv;
  }

  drawWorld(c,W,H,ppu){
    this._clampCam();
    const vx0=this.camX-W/2/ppu,vy0=this.camY-H/2/ppu,vx1=this.camX+W/2/ppu,vy1=this.camY+H/2/ppu;
    const scr=(wx,wy)=>[(wx-vx0)*ppu,(wy-vy0)*ppu];
    c.fillStyle='#1d4570';c.fillRect(0,0,W,H);
    // زمین نقاشی‌شده (فقط بخش دیده‌شده کراپ می‌شود)
    const RES=this._res;
    const sx0=Math.max(0,vx0),sy0=Math.max(0,vy0),sx1=Math.min(WORLD_W,vx1),sy1=Math.min(WORLD_H,vy1);
    if(sx1>sx0&&sy1>sy0){
      c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
      c.drawImage(this._bake,sx0*RES,sy0*RES,(sx1-sx0)*RES,(sy1-sy0)*RES,(sx0-vx0)*ppu,(sy0-vy0)*ppu,(sx1-sx0)*ppu,(sy1-sy0)*ppu);}
    const x0=Math.max(0,Math.floor(vx0)-2),x1=Math.min(WORLD_W,Math.ceil(vx1)+2);
    const y0=Math.max(0,Math.floor(vy0)-2),y1=Math.min(WORLD_H,Math.ceil(vy1)+4);
    // مرز قلمرو قبیله‌ها (خط‌چین از مرکز)
    {const[wx0,wy0]=scr(0,0);c.save();c.beginPath();c.rect(wx0,wy0,WORLD_W*ppu,WORLD_H*ppu);c.clip();
     c.setLineDash([ppu*1.4,ppu*1.1]);c.lineWidth=Math.max(1.5,ppu*0.09);c.strokeStyle='rgba(255,232,160,.30)';
     const[cx,cy]=scr(WORLD_W/2,WORLD_H/2);
     for(let i=0;i<FACTIONS.length;i++){const a=i*Math.PI*2/FACTIONS.length;
       c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*WORLD_W*ppu,cy+Math.sin(a)*WORLD_W*ppu);c.stroke();}
     c.restore();}
    // درخشش آب
    if(this.zoom>=0.5){
      c.fillStyle='rgba(255,255,255,.2)';
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        if(this.terr[y*WORLD_W+x]<=BIOME.SEA&&hash2(x*1.3,y*0.7)<0.07){
          const[sx,sy]=scr(x,y);c.fillRect(sx+ppu*0.2,sy+ppu*0.5+Math.sin(this.t*2+x)*ppu*0.1,ppu*0.45,Math.max(1.5,ppu*0.06));}}}
    // کوه، تپه، جنگل — به ترتیب y برای هم‌پوشانی درست
    const trees=this.zoom>=0.4,mtn=this.zoom>=0.16,thin=this.zoom<0.35;
    const vis=this._vis;vis.length=0;
    for(let gy=Math.max(0,(y0>>3)-1);gy<=(y1>>3)+1;gy++)
      for(let gx=Math.max(0,(x0>>3)-1);gx<=(x1>>3)+1;gx++){
        const cell=this.decoGrid.get(gx+','+gy);if(!cell)continue;
        for(const d of cell){
          if(d.y<y0-3||d.y>y1+1||d.x<x0-3||d.x>x1+3)continue;
          if(d.k<=K.BUSH){if(!trees)continue;}else{if(!mtn||(thin&&d.v>0.5))continue;}
          vis.push(d);}}
    vis.sort((a,b)=>a.y-b.y);
    for(const d of vis){
      const[sx,sy]=scr(d.x,d.y),sz=d.s*ppu;
      switch(d.k){
        case K.PINE:drawPine(c,sx,sy,sz,d.v);break;
        case K.OAK:drawOak(c,sx,sy,sz,d.v);break;
        case K.BUSH:drawBush(c,sx,sy,sz,d.v);break;
        case K.HILL:drawHill(c,sx,sy,sz,d.v);break;
        case K.MOUNT:drawMountain(c,sx,sy,sz,false,d.v);break;
        default:drawMountain(c,sx,sy,sz,true,d.v);}}
    // سایه ابرها
    c.fillStyle='rgba(10,25,40,.08)';
    for(let i=0;i<6;i++){const ex=((i*733+this.t*14*(1+i%3*0.4))%(W+900))-450,ey=(i*421)%H;
      c.beginPath();c.ellipse(ex,ey,260+i*40,110+i*18,0,0,7);c.fill();}
    // خط‌چین مسیر لشکرها: مال من (طلایی/سبز)، حمله دشمن به من (قرمز)، جنگ NPCها (کم‌رنگ)
    const S0=this.S,dash=(x0,y0,x1,y1,col,w,al,on,off,doff)=>{const[a,b]=scr(x0,y0),[e,f]=scr(x1,y1);
      c.save();c.globalAlpha=al;c.strokeStyle=col;c.lineWidth=w;c.setLineDash([on,off]);c.lineDashOffset=doff;c.lineCap='round';
      c.beginPath();c.moveTo(a,b);c.lineTo(e,f);c.stroke();c.restore();};
    if(S0){
      for(const m of S0.npcMarches||[])dash(m.x0,m.y0,m.x1,m.y1,m.color,2.5,0.5,8,8,-this.t*40);
      for(const m of S0.marches||[])dash(m.hx,m.hy,m.tx,m.ty,m.returning?'#6fd47a':'#ffd166',Math.max(3,ppu*0.1),0.9,13,9,-this.t*60*(m.returning?-1:1));
      for(const r of S0.incoming||[])dash(r.fx,r.fy,S0.homePos.x,S0.homePos.y,'#ff4d4d',Math.max(4,ppu*0.13),0.6+0.35*Math.sin(this.t*7),13,9,-this.t*70);
      // گنج‌ها و غارها
      const now=Date.now();
      for(const st of S0.sites||[]){
        const[px,py]=scr(st.x,st.y);if(px<-100||px>W+100||py<-100||py>H+100)continue;
        const ready=siteReady(st,now),sz=ppu*1.25;
        c.save();if(!ready)c.globalAlpha=0.45;
        if(sz>=18){
          if(st.kind==='cave')drawCave(c,px,py,sz,this.t);else if(st.kind==='treasure')drawChest(c,px,py,sz,this.t);else drawRuins(c,px,py,sz,this.t);
        }else{const r=Math.max(5,ppu*0.7);c.fillStyle='#7ee7ff';c.strokeStyle='#0b2b3a';c.lineWidth=2;
          c.beginPath();c.moveTo(px,py-r);c.lineTo(px+r,py);c.lineTo(px,py+r);c.lineTo(px-r,py);c.closePath();c.fill();c.stroke();}
        c.restore();
        if(sz>=18&&this.zoom>=0.45)this._label2(c,SITE_KINDS[st.kind].icon+' '+st.name,ready?'⚔'+this._fmt(st.power)+' • Lv'+st.level:'💤 در حال بازسازی',px,py+sz*0.45,'#9be8ff',ppu);}
    }
    // کمپ‌ها و غول آخر فصل
    if(S0){
      for(const k of S0.camps||[]){const[px,py]=scr(k.x,k.y);if(px<-120||px>W+120||py<-120||py>H+120)continue;
        const sz=Math.max(14,ppu*1.3);
        if(ppu*1.3>=14){drawCamp(c,px,py,sz,this.t,'#3f8bd6');
          if(this.zoom>=0.4)this._label2(c,'⛺ کمپ '+(k.cmdIcon||''),'👥'+this._fmt(Object.values(k.army).reduce((a,b)=>a+b,0)),px,py+sz*0.4,'#9bd0ff',ppu);}
        else{c.fillStyle='#3f8bd6';c.strokeStyle='#000';c.lineWidth=1.5;c.beginPath();c.moveTo(px,py-7);c.lineTo(px+7,py+5);c.lineTo(px-7,py+5);c.closePath();c.fill();c.stroke();}}
      if(this.bossOn){const[px,py]=scr(BOSS_POS.x,BOSS_POS.y);
        if(px>-300&&px<W+300&&py>-300&&py<H+300){
          if(ppu>=8){const sz=Math.max(40,ppu*2.2);drawGiant(c,px,py,sz,this.t);
            if(this.zoom>=0.3)this._label2(c,'🗿 غول آخر فصل','نامیرا • ضربه بزن، امتیاز بگیر',px,py+sz*0.45,'#ff9d5c',ppu);}
          else{c.fillStyle='#ff5a28';c.strokeStyle='#000';c.lineWidth=2;c.beginPath();c.arc(px,py,10,0,7);c.fill();c.stroke();c.font='bold 13px Vazirmatn';c.textAlign='center';c.fillStyle='#fff';c.fillText('☠',px,py+5);}}}
    }
    // نام قلمروها وقتی دور هستیم
    if(this.zoom<0.55){
      c.textAlign='center';
      for(let i=0;i<FACTIONS.length;i++){
        const a=(i+0.5)/FACTIONS.length*Math.PI*2-Math.PI/2;
        const fx=WORLD_W/2+Math.cos(a)*WORLD_W*0.30,fy=WORLD_H/2+Math.sin(a)*WORLD_H*0.30;
        const[px,py]=scr(fx,fy);
        c.font=`bold ${Math.min(64,Math.max(16,ppu*3.2))}px Vazirmatn, sans-serif`;
        c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.35)';c.strokeText(FACTIONS[i].icon+' '+FACTIONS[i].name,px,py);
        c.fillStyle=FACTIONS[i].color+'dd';
        c.fillText(FACTIONS[i].icon+' '+FACTIONS[i].name,px,py);}
    }
    if(!this.S){this._vignette(c,W,H);return;}
    // قلعه‌های دشمن
    const near=ppu*1.35>=16;
    for(const tr of this.S.tribes){
      const[px,py]=scr(tr.x,tr.y);
      if(px<-120||px>W+120||py<-120||py>H+120)continue;
      if(near){
        drawCastle(c,px,py,ppu*1.35,tr.color||'#a03a3a',this.t,0,tr.level);
        if(this.zoom>=0.45)this._label2(c,tr.name,'⚔'+this._fmt(tr.power)+' • 🛡Lv'+(tr.wall||0),px,py+ppu*1.35*0.72,'#ffd166',ppu);
      }else{
        c.fillStyle=tr.color||'#a03a3a';c.strokeStyle='rgba(0,0,0,.65)';c.lineWidth=1.5;
        c.beginPath();c.arc(px,py,Math.max(3,ppu*0.8),0,7);c.fill();c.stroke();}}
    // حلقه هایلایت جستجو
    if(this.hl&&performance.now()<this.hl.until){
      const[px,py]=scr(this.hl.x,this.hl.y);
      const r=Math.max(26,ppu*1.6)*(1+Math.sin(this.t*6)*0.2);
      c.strokeStyle='#ffd166';c.lineWidth=4;
      c.beginPath();c.arc(px,py-ppu*0.4,r,0,7);c.stroke();
      c.strokeStyle='rgba(255,209,102,.35)';c.lineWidth=10;
      c.beginPath();c.arc(px,py-ppu*0.4,r,0,7);c.stroke();
    }
    // قلعه خودت
    if(this.S.homePos){
      const[hx,hy]=scr(this.S.homePos.x,this.S.homePos.y);
      const keepLv=this.S.buildings.find(b=>b.type==='keep')?.level||1;
      if(near){
        drawCastle(c,hx,hy,ppu*1.5,'#ffd166',this.t,0,keepLv);
        this._label2(c,'⭐ قلعه شما','⚔'+this._fmt(armyPower(this.S.troops))+' • 👥'+this._fmt((Object.values(this.S.troops).reduce((a,b)=>a+b,0))),hx,hy+ppu*1.5*0.72,'#ffe9a8',ppu);
      }else{
        c.fillStyle='#ffd166';c.strokeStyle='#2a1c05';c.lineWidth=3;
        c.beginPath();c.arc(hx,hy,Math.max(8,ppu*1.4),0,7);c.fill();c.stroke();
        c.fillStyle='#2a1c05';c.font='bold 14px Vazirmatn';c.textAlign='center';c.fillText('★',hx,hy+5);}}
    // لشکرهای در حرکت
    for(const m of this.S.marches||[]){
      const prog=1-(m.travelLeft/m.travelTotal);
      const mx=m.hx+(m.tx-m.hx)*prog,my=m.hy+(m.ty-m.hy)*prog;
      const[px,py]=scr(mx,my),r=Math.max(7,ppu*0.3);
      c.fillStyle='rgba(0,0,0,.3)';c.beginPath();c.ellipse(px,py+4,r*1.3,r*0.45,0,0,7);c.fill();
      c.fillStyle=m.returning?'#46a758':'#e5484d';c.beginPath();c.arc(px,py,r,0,7);c.fill();
      c.fillStyle='#fff';c.font=`bold ${Math.max(10,r*1.2)}px Vazirmatn`;c.textAlign='center';c.fillText(m.returning?'🏳':'⚔',px,py+r*0.4);}
    // دسته‌های سرباز در حال حرکت
    const squad=(x0,y0,x1,y1,prog,color,label,labelBg)=>{
      const mx=x0+(x1-x0)*prog,my=y0+(y1-y0)*prog,[px,py]=scr(mx,my);
      if(px<-80||px>W+80||py<-80||py>H+80)return;
      if(ppu<6){c.fillStyle=color;c.strokeStyle='#000';c.lineWidth=1.5;c.beginPath();c.arc(px,py,6,0,7);c.fill();c.stroke();return;}
      const sz=Math.max(26,ppu*1.15);
      drawSquad(c,px,py,sz,color,x1-x0,this.t);
      if(label&&this.zoom>=0.3){c.font='bold 12px Vazirmatn';const w=c.measureText(label).width+12;
        c.fillStyle=labelBg;c.beginPath();c.roundRect(px-w/2,py+sz*0.3,w,18,9);c.fill();
        c.fillStyle='#fff';c.textAlign='center';c.fillText(label,px,py+sz*0.3+13);}};
    for(const m of this.S.npcMarches||[])squad(m.x0,m.y0,m.x1,m.y1,1-m.left/m.total,m.color,null,'rgba(0,0,0,.6)');
    for(const m of this.S.marches||[]){const lab=(m.returning?'🏳 ':'⚔ ')+this._fmt(Object.values(m.army).reduce((a,b)=>a+b,0));
      squad(m.hx,m.hy,m.tx,m.ty,1-m.travelLeft/m.travelTotal,m.returning?'#46a758':'#f2b84b',lab,m.returning?'rgba(30,110,50,.85)':'rgba(120,80,10,.85)');}
    for(const r of this.S.incoming||[]){
      squad(r.fx,r.fy,this.S.homePos.x,this.S.homePos.y,1-r.left/r.total,'#e5484d','⚠ '+this._fmt(Object.values(r.army).reduce((a,b)=>a+b,0))+' • '+Math.ceil(r.left)+'ث','rgba(150,20,20,.9)');}
    if((this.S.incoming||[]).length&&this.S.homePos){
      const[hx,hy]=scr(this.S.homePos.x,this.S.homePos.y),rr=Math.max(34,ppu*2.2)*(1+0.12*Math.sin(this.t*6));
      c.strokeStyle='rgba(255,70,70,.8)';c.lineWidth=4;c.beginPath();c.arc(hx,hy-ppu*0.3,rr,0,7);c.stroke();}
    this._drawMini(c,W,H);
    this._vignette(c,W,H);
    c.fillStyle='rgba(255,245,220,.75)';c.font='12px Vazirmatn';c.textAlign='center';
    c.fillText('برای جابه‌جایی بکشید • زوم با دو انگشت یا اسکرول • ضربه روی مینی‌مپ = پرش',W/2,H-14);}
  _vignette(c,W,H){
    const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*0.45,W/2,H/2,Math.max(W,H)*0.78);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(10,15,25,.36)');
    c.fillStyle=g;c.fillRect(0,0,W,H);}
  _fmt(n){n=Math.floor(n);if(n>=1e9)return(n/1e9).toFixed(1)+'B';if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n;}
  _label2(c,l1,l2,px,py,color,ppu){
    c.font=`bold ${Math.max(11,ppu*0.36)}px Vazirmatn, sans-serif`;c.textAlign='center';
    const w=Math.max(c.measureText(l1).width,c.measureText(l2).width)+16;
    const lh=Math.max(15,ppu*0.42), h=lh*2+8;
    c.fillStyle='rgba(30,25,12,.80)';c.beginPath();c.roundRect(px-w/2,py,w,h,7);c.fill();
    c.strokeStyle='rgba(255,209,102,.4)';c.lineWidth=1;c.stroke();
    c.fillStyle=color;c.fillText(l1,px,py+lh);
    c.fillStyle='#ffd166';c.fillText(l2,px,py+lh*2+2);}
  _drawMini(c,W,H){
    const mr=this._miniRect(W,H);
    c.fillStyle='rgba(10,14,20,.75)';c.beginPath();c.roundRect(mr.x-5,mr.y-5,mr.w+10,mr.h+10,10);c.fill();
    c.imageSmoothingEnabled=true;c.drawImage(this._bake,mr.x,mr.y,mr.w,mr.h);
    if(this.S){
      for(const tr of this.S.tribes){
        c.fillStyle=tr.color||'#e5484d';
        c.fillRect(mr.x+tr.x/WORLD_W*mr.w-1,mr.y+tr.y/WORLD_H*mr.h-1,2.5,2.5);}
      for(const k of this.S.camps||[]){c.fillStyle='#3f8bd6';c.fillRect(mr.x+k.x/WORLD_W*mr.w-3,mr.y+k.y/WORLD_H*mr.h-3,6,6);}
      if(this.bossOn){c.fillStyle='#ff5a28';c.strokeStyle='#000';c.lineWidth=1;c.beginPath();c.arc(mr.x+BOSS_POS.x/WORLD_W*mr.w,mr.y+BOSS_POS.y/WORLD_H*mr.h,5,0,7);c.fill();c.stroke();}
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
    this.zoom=Math.max(0.85,Math.min(2.8,this.zoom));
    const u=this._ppu()*this.zoom,hw=W/2/u,hh=H/2/u,px=Math.max(0,10.5-hw)+1.5,py=Math.max(0,8.2-hh)+1.2;
    this.ccx=Math.max(13-px,Math.min(13+px,this.ccx));this.ccy=Math.max(9.8-py,Math.min(9.8+py,this.ccy));
    this.scene.draw(c,W,H,u,this.S,this.t,{x:this.ccx,y:this.ccy});}
}
