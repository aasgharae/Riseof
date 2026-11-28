// نمای داخل قلعه: زمین نقاشی‌شده، جاده، حیاط، دیوار، کوه و جنگل، کارگران و ساختمان‌های چندمرحله‌ای
import{makeNoise,fbm,hash2,makeRng}from'./noise.js';
import{drawBuilding,tierOf,palOf,tower}from'./buildings.js';
import{drawPine,drawOak,drawBush,drawHill,drawMountain}from'./scenery.js';

const BX0=-5,BY0=-4,BW=36,BH=29,BR=34;          // ناحیه پخته‌شده (واحد شبکه) و پیکسل به ازای هر واحد
const CX0=2.4,CX1=23.6,CY0=2.7,CY1=17.5;           // حصار حیاط
const GATE={x:13,y:17.5};
const HAULERS={farm:['wheat','#c9a94d'],lumber:['log','#4d7a3e'],quarry:['stone','#8a8d93'],ironmine:['ore','#5e6c7a']};

function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1;let t=((px-ax)*dx+(py-ay)*dy)/l;t=Math.max(0,Math.min(1,t));return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));}
const bez=(e,u)=>{const a=1-u;return[a*a*e.ax+2*a*u*e.cx+u*u*e.bx,a*a*e.ay+2*a*u*e.cy+u*u*e.by];};

export class CastleScene{
  constructor(){this.sig='';this.bg=null;}
  // ---------- ساخت ----------
  _sig(S){return S.buildings.map(b=>b.id+':'+Math.floor(b.level/5)).join('|');}
  _edge(a,b,k=null){
    const ax=a.x,ay=a.y+0.55,bx=b.x,by=b.y+0.55,len0=Math.hypot(bx-ax,by-ay);
    const kk=k??(hash2(a.x*7+b.y,b.x*3+a.y)-0.5)*0.45;
    const cx=(ax+bx)/2-(by-ay)*kk,cy=(ay+by)/2+(bx-ax)*kk;
    const e={ax,ay,bx,by,cx,cy,len:0};let px=ax,py=ay;
    for(let i=1;i<=12;i++){const[x,y]=bez(e,i/12);e.len+=Math.hypot(x-px,y-py);px=x;py=y;}
    return e;}
  _build(S){
    this.sig=this._sig(S);
    const B=this.B={};for(const b of S.buildings)B[b.id]=b;
    const keep=S.buildings.find(b=>b.type==='keep'),muster=S.buildings.find(b=>b.type==='muster');
    this.keep=keep;
    // --- جاده‌ها ---
    this.edges=[];this.edgeOf={};
    const road=(a,b,k)=>{const e=this._edge(a,b,k);this.edges.push(e);this.edgeOf[a.id+'>'+b.id]=e;return e;};
    for(const b of S.buildings){if(b===keep||b.type==='muster'||b.type==='wall')continue;road(keep,b);}
    if(muster){for(const b of S.buildings)if(b.type==='barracks')road(b,muster);
      road(muster,{id:'gate',x:GATE.x,y:GATE.y-0.55},0);
      road({id:'gate',x:GATE.x,y:GATE.y-0.55},{id:'out',x:GATE.x,y:GATE.y+4.2},0);}
    // --- حوض ---
    this.pond=null;
    for(const[x,y]of[[8.6,9.6],[17.8,9.4],[19.6,15.6],[7.2,15.4],[4.4,12.2]]){
      if(S.buildings.every(b=>Math.hypot(b.x-x,b.y-y)>3.2)&&this.edges.every(e=>{for(let i=0;i<=10;i++){const[ex,ey]=bez(e,i/10);if(Math.hypot(ex-x,ey-y)<1.7)return false;}return true;})){this.pond={x,y,rx:1.5,ry:0.95};break;}}
    // --- اشیای ثابت: درخت، بوته، صخره، کوه ---
    const rng=makeRng(9001),objs=[];
    const near=(x,y,r)=>S.buildings.some(b=>Math.hypot(b.x-x,(b.y-y)*1.2)<r)||this.edges.some(e=>{for(let i=0;i<=8;i++){const[ex,ey]=bez(e,i/8);if(Math.hypot(ex-x,ey-y)<0.95)return true;}return false;})
      ||(this.pond&&Math.hypot((x-this.pond.x)/(this.pond.rx+0.6),(y-this.pond.y)/(this.pond.ry+0.6))<1)||Math.hypot(x-keep.x,(y-keep.y-0.9)*1.4)<3;
    for(let i=0;i<110;i++){const x=CX0+0.8+rng()*(CX1-CX0-1.6),y=CY0+1+rng()*(CY1-CY0-2);
      if(near(x,y,2.5))continue;const r=rng();
      objs.push({x,y,k:r<0.34?'oak':r<0.55?'pine':r<0.88?'bush':'rock',s:0.7+rng()*0.5,v:rng()});}
    for(let gy=BY0+0.6;gy<BY0+BH-0.5;gy+=0.8)for(let gx=BX0+0.6;gx<BX0+BW-0.5;gx+=0.8){
      const x=gx+rng()*0.6,y=gy+rng()*0.5;
      if(x>CX0-0.9&&x<CX1+0.9&&y>CY0-0.5&&y<CY1+2.8)continue;
      if(y<1.6)continue;if(rng()>0.8)continue;
      objs.push({x,y,k:rng()<0.65?'pine':'oak',s:0.95+rng()*0.75,v:rng()});}
    for(let x=BX0+0.5;x<BX0+BW;x+=2.3){objs.push({x:x+rng()*0.8,y:-0.6+rng()*0.5,k:'peak',s:1.5+rng()*0.9,v:rng()});objs.push({x:x+1.1+rng()*0.8,y:1.1+rng()*0.5,k:rng()<0.5?'mount':'peak',s:1.1+rng()*0.7,v:rng()});}
    this.objs=objs;
    // --- حصار: قطعه‌های دیوار ---
    const walls=[];
    for(let x=CX0+0.6;x<CX1;x+=1.15)walls.push({x,y:CY0,v:0,k:'wall'});
    for(let x=CX0+0.6;x<CX1;x+=1.15)if(Math.abs(x-GATE.x)>2.0)walls.push({x,y:CY1,v:0,k:'wall'});
    for(let y=CY0+1.1;y<CY1;y+=1.05){walls.push({x:CX0,y,v:1,k:'wall'});walls.push({x:CX1,y,v:1,k:'wall'});}
    for(const[x,y]of[[CX0,CY0],[CX1,CY0],[CX0,CY1],[CX1,CY1],[GATE.x-2.2,CY1],[GATE.x+2.2,CY1]])walls.push({x,y,k:'wtower'});
    this.walls=walls;
    // --- گوسفندها ---
    this.sheep=[];let si=0;for(const b of S.buildings)if(b.type==='farm')for(let i=0;i<3;i++)this.sheep.push({x:b.x-2.4+i*0.5,y:b.y+1.7+(i%2)*0.4,ph:si++*1.7,r:0.5});
    // --- کارگران ---
    const ws=[];let seed=0;const E=(a,b)=>this.edgeOf[a.id+'>'+b.id];
    for(const b of S.buildings){
      const L=b.level,tier=tierOf(L);
      if(HAULERS[b.type]&&E(keep,b)){const n=1+(L>=8)+(L>=16)+(L>=25),[load,col]=HAULERS[b.type],e=E(keep,b);
        for(let i=0;i<n;i++)ws.push({m:'haul',e,rev:true,load,col,role:b.type,v:0.85+hash2(seed,i)*0.35,dwell:1.3,off:seed*1.3+i*4.1});seed++;}
      else if(b.type==='barracks'&&muster&&E(b,muster)){const n=1+(L>=10)+(L>=20),e=E(b,muster);
        for(let i=0;i<n;i++)ws.push({m:'haul',e,rev:false,load:null,col:'#3f7a4a',role:'soldier',v:1.0,dwell:0.9,off:seed*2.1+i*3.3});seed++;
        ws.push({m:'drill',x:b.x+1.6,y:b.y+0.9,col:'#3f7a4a',role:'soldier',off:seed});}
      else if(b.type==='muster'){const bar=S.buildings.find(x=>x.id==='bar-3');const e=bar&&E(bar,muster);
        if(e)ws.push({m:'haul',e,rev:true,load:'scroll',col:'#7a4fa0',role:'noble',v:1.1,dwell:1.0,off:3});}
      else if(b.type==='hospital'&&E(keep,b)){const n=1+(L>=15)+(L>=28),e=E(keep,b);
        for(let i=0;i<n;i++)ws.push({m:'haul',e,rev:true,load:'medbox',col:'#f0f0f0',role:'nurse',v:0.8,dwell:1.4,off:5+i*5});}
      else if(b.type==='wall'){const n=1+tier;for(let i=0;i<n;i++)ws.push({m:'patrol',x0:CX0+1.4,x1:CX1-1.4,y:CY0+0.55,v:0.8,col:'#4a5a78',role:'guard',off:i*9});}
      else if(b.type==='keep'){const n=2+tier;
        for(let i=0;i<n;i++)ws.push({m:'loop',cx:keep.x,cy:keep.y+1.0,rx:2.6,ry:1.5,v:0.55,ph:i*6.28/n,col:'#4a5a78',role:'guard'});
        const vc=['#8a5a33','#5b7aa8','#a8553a'];
        for(let i=0;i<3;i++)ws.push({m:'loop',cx:keep.x,cy:keep.y+1.3,rx:1.5+i*0.9,ry:0.9+i*0.35,v:0.35+i*0.1,ph:i*2.1,col:vc[i],role:'villager',dir:i%2?-1:1});
        if(tier>=2)ws.push({m:'loop',cx:keep.x,cy:keep.y+1.2,rx:1.9,ry:1.0,v:0.3,ph:3,col:'#7a3b8f',role:'noble'});}
    }
    for(const u of S.upgrades||[]){const b=B[u.id];if(!b)continue;
      ws.push({m:'build',x:b.x-1.2,y:b.y+0.5,col:'#c98a2b',role:'builder',off:0},{m:'build',x:b.x+1.2,y:b.y+0.55,col:'#8a5a33',role:'builder',off:1.1});}
    this.workers=ws;this.upSig=(S.upgrades||[]).map(u=>u.id).join(',');
    this._bake(S);
  }
  // ---------- نقاشی زمین (یک‌بار) ----------
  _bake(S){
    const cv=document.createElement('canvas');cv.width=BW*BR;cv.height=BH*BR;const g=cv.getContext('2d');
    const lw=BW*4,lh=BH*4,lo=document.createElement('canvas');lo.width=lw;lo.height=lh;
    const lg=lo.getContext('2d'),img=lg.createImageData(lw,lh),d=img.data,n1=makeNoise(4242),n2=makeNoise(777);
    for(let y=0;y<lh;y++)for(let x=0;x<lw;x++){
      const gx=BX0+x/4,gy=BY0+y/4,a=fbm(n1,gx*0.16,gy*0.16,4),b=fbm(n2,gx*0.7,gy*0.7,3);
      const ox=Math.max(CX0-gx,gx-CX1,0),oy=Math.max(CY0-gy,gy-CY1,0),out=Math.min(1,Math.hypot(ox,oy)/1.4);
      const top=Math.max(0,Math.min(1,(1.9-gy)/2.2));
      let r=104+a*58+(b-0.5)*20,gg=148+a*44+(b-0.5)*16,bb=70+a*26;
      r=r*(1-out*0.38)+top*20;gg=gg*(1-out*0.3)-top*14;bb=bb*(1-out*0.3)-top*6;
      const o=(y*lw+x)*4;d[o]=r;d[o+1]=gg;d[o+2]=bb;d[o+3]=255;}
    lg.putImageData(img,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(lo,0,0,cv.width,cv.height);
    const P=(x,y)=>[(x-BX0)*BR,(y-BY0)*BR],rng=makeRng(31337);
    // سبزه و گل
    for(let i=0;i<1400;i++){const x=CX0+rng()*(CX1-CX0),y=CY0+rng()*(CY1-CY0),[px,py]=P(x,y),r=rng();
      if(r<0.7){g.strokeStyle='rgba(50,95,40,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(px,py);g.lineTo(px-2,py-6);g.moveTo(px,py);g.lineTo(px+2,py-5);g.stroke();}
      else{g.fillStyle=['#fff6c8','#f7b6d0','#ffd76a','#ffffff'][(rng()*4)|0];g.beginPath();g.arc(px,py,1.8,0,7);g.fill();}}
    // جاده‌ها
    g.lineCap='round';g.lineJoin='round';
    for(const pass of[[BR*0.62,'#8c7350'],[BR*0.5,'#c5a572'],[BR*0.24,'rgba(225,200,150,.55)']]){
      g.lineWidth=pass[0];g.strokeStyle=pass[1];
      for(const e of this.edges){const[ax,ay]=P(e.ax,e.ay),[cx,cy]=P(e.cx,e.cy),[bx,by]=P(e.bx,e.by);g.beginPath();g.moveTo(ax,ay);g.quadraticCurveTo(cx,cy,bx,by);g.stroke();}}
    for(const e of this.edges)for(let i=0;i<e.len*5;i++){const[x,y]=bez(e,rng()),[px,py]=P(x+(rng()-0.5)*0.4,y+(rng()-0.5)*0.4);g.fillStyle=rng()<0.5?'rgba(120,100,70,.6)':'rgba(235,220,185,.6)';g.beginPath();g.arc(px,py,1.2+rng()*1.5,0,7);g.fill();}
    // میدان سنگفرش جلوی قلعه
    const k=this.keep;if(k){const[px,py]=P(k.x,k.y+0.9);
      g.fillStyle='#9d9078';g.beginPath();g.ellipse(px,py,2.7*BR,1.75*BR,0,0,7);g.fill();
      g.fillStyle='#cdbfa0';g.beginPath();g.ellipse(px,py,2.55*BR,1.62*BR,0,0,7);g.fill();
      g.strokeStyle='rgba(120,105,80,.45)';g.lineWidth=1.5;
      for(let r=0.35;r<1;r+=0.22){g.beginPath();g.ellipse(px,py,2.5*BR*r,1.6*BR*r,0,0,7);g.stroke();}
      for(let i=0;i<22;i++){const a=i/22*Math.PI*2;g.beginPath();g.moveTo(px+Math.cos(a)*0.3*BR,py+Math.sin(a)*0.2*BR);g.lineTo(px+Math.cos(a)*2.5*BR,py+Math.sin(a)*1.6*BR);g.stroke();}}
    // حوض
    const pd=this.pond;if(pd){const[px,py]=P(pd.x,pd.y);
      g.fillStyle='#c9bf94';g.beginPath();g.ellipse(px,py,(pd.rx+0.32)*BR,(pd.ry+0.28)*BR,0,0,7);g.fill();
      const gr=g.createRadialGradient(px,py,0,px,py,pd.rx*BR);gr.addColorStop(0,'#4f9fc7');gr.addColorStop(1,'#2f77a3');
      g.fillStyle=gr;g.beginPath();g.ellipse(px,py,pd.rx*BR,pd.ry*BR,0,0,7);g.fill();
      g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=2;g.beginPath();g.ellipse(px-8,py-5,pd.rx*BR*0.45,pd.ry*BR*0.35,0,3.4,5.6);g.stroke();
      for(let i=0;i<9;i++){const a=rng()*6.28,rx=px+Math.cos(a)*(pd.rx+0.18)*BR,ry=py+Math.sin(a)*(pd.ry+0.15)*BR;
        g.strokeStyle='#4f7d3a';g.lineWidth=2;g.beginPath();g.moveTo(rx,ry);g.lineTo(rx-1,ry-10);g.moveTo(rx,ry);g.lineTo(rx+3,ry-8);g.stroke();}}
    this.bg=cv;
  }
  // ---------- موقعیت کارگر در لحظه t ----------
  _wpos(w,t){
    if(w.m==='haul'){const L=w.e.len,tg=L/w.v,cyc=2*tg+2*w.dwell,s=(t+w.off)%cyc;let u,loaded=false,moving=true;
      if(s<tg){u=s/tg;loaded=true;}else if(s<tg+w.dwell){u=1;moving=false;}else if(s<2*tg+w.dwell){u=1-(s-tg-w.dwell)/tg;}else{u=0;moving=false;}
      const uu=w.rev?1-u:u,[x,y]=bez(w.e,uu),[x2,y2]=bez(w.e,Math.min(1,Math.max(0,uu+(w.rev?-0.02:0.02)*(s<tg||s>=tg+w.dwell?1:-1))));
      const fwd=(s<tg)?1:(s>=tg+w.dwell&&s<2*tg+w.dwell?-1:0);
      const[xa,ya]=bez(w.e,Math.min(1,uu+0.03)),[xb,yb]=bez(w.e,Math.max(0,uu-0.03));
      let dx=(w.rev?-1:1)*(xa-xb)*(fwd||1);
      return{x,y,dx,moving,loaded:loaded&&w.load};}
    if(w.m==='loop'){const dir=w.dir||1,om=w.v/w.rx*dir,a=om*t+w.ph;return{x:w.cx+Math.cos(a)*w.rx,y:w.cy+Math.sin(a)*w.ry,dx:-Math.sin(a)*dir,moving:true,loaded:false};}
    if(w.m==='patrol'){const L=w.x1-w.x0,p=((t*w.v+w.off)/L)%2,u=p<1?p:2-p;return{x:w.x0+L*u,y:w.y,dx:p<1?1:-1,moving:true,loaded:false};}
    if(w.m==='drill'||w.m==='build')return{x:w.x,y:w.y,dx:w.m==='build'?(w.off?-1:1):1,moving:false,loaded:false,act:w.m};
    return{x:0,y:0,dx:1};}
  // ---------- رسم ----------
  draw(c,W,H,u,S,t,cam){
    if(this._sig(S)!==this.sig||(S.upgrades||[]).map(x=>x.id).join(',')!==this.upSig)this._build(S);
    const sx=x=>W/2+(x-cam.x)*u,sy=y=>H/2+(y-cam.y)*u;
    c.fillStyle='#2d4727';c.fillRect(0,0,W,H);
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
    c.drawImage(this.bg,0,0,this.bg.width,this.bg.height,sx(BX0),sy(BY0),BW*u,BH*u);
    const pd=this.pond;
    if(pd){c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.5;
      for(let i=0;i<3;i++){const p=(t*0.3+i/3)%1;c.globalAlpha=1-p;c.beginPath();c.ellipse(sx(pd.x+Math.sin(i*2)*0.4),sy(pd.y+Math.cos(i*3)*0.2),pd.rx*u*0.7*p+4,pd.ry*u*0.7*p+2,0,0,7);c.stroke();}c.globalAlpha=1;}
    const vis=(x,y,m=3)=>{const px=sx(x),py=sy(y);return px>-u*m&&px<W+u*m&&py>-u*m*1.6&&py<H+u*m;};
    const items=[],wtier=tierOf(this.B['wall-1']?.level||1),wpal=palOf(this.B['wall-1']?.level||1);
    for(const o of this.objs)if(vis(o.x,o.y,2.5))items.push({y:o.y,o});
    for(const w of this.walls)if(vis(w.x,w.y,2))items.push({y:w.y+(w.k==='wtower'?0.02:0),o:w});
    for(const b of S.buildings)items.push({y:b.y+0.3,b});
    items.push({y:GATE.y+0.05,gate:true});
    for(const w of this.workers){const p=this._wpos(w,t);if(vis(p.x,p.y,1))items.push({y:p.y+0.01,w,p});}
    for(const s of this.sheep){const a=t*0.25+s.ph,x=s.x+Math.cos(a)*s.r,y=s.y+Math.sin(a*1.3)*s.r*0.5;if(vis(x,y,1))items.push({y,sheep:{x,y,a}});}
    items.sort((a,b)=>a.y-b.y);
    const ups=new Set((S.upgrades||[]).map(x=>x.id));
    for(const it of items){
      if(it.o){const o=it.o,px=sx(o.x),py=sy(o.y),sz=o.s*u*(o.k==='pine'||o.k==='oak'?1.15:1);
        switch(o.k){case'pine':drawPine(c,px,py,sz,o.v);break;case'oak':drawOak(c,px,py,sz,o.v);break;case'bush':drawBush(c,px,py,sz*0.9,o.v);break;
          case'rock':drawHill(c,px,py,sz*0.28,o.v);break;case'mount':drawMountain(c,px,py,sz*1.5,false,o.v);break;case'peak':drawMountain(c,px,py,sz*1.5,true,o.v);break;
          case'wall':this._wallPiece(c,px,py,u,wtier,wpal,o.v,t);break;
          case'wtower':tower(c,px,py,u*0.62,u*(0.95+0.17*wtier),wpal,Math.max(1,wtier),t,wtier>=3?'#e5484d':null);break;}}
      else if(it.b){const b=it.b;drawBuilding(c,b.type,sx(b.x),sy(b.y)+u*0.35,u*2.25,b.level,t,{up:ups.has(b.id)});}
      else if(it.gate){drawBuilding(c,'wall',sx(GATE.x),sy(GATE.y)+u*0.2,u*2.0,this.B['wall-1']?.level||1,t,{});}
      else if(it.w)this._worker(c,sx(it.p.x),sy(it.p.y),u,it.w,it.p,t);
      else if(it.sheep){const px=sx(it.sheep.x),py=sy(it.sheep.y),r=u*0.2;
        c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.ellipse(px,py+r*0.5,r*1.1,r*0.35,0,0,7);c.fill();
        c.fillStyle='#f4f1e8';c.beginPath();c.ellipse(px,py-r*0.5,r,r*0.7,0,0,7);c.fill();c.beginPath();c.arc(px-r*0.5,py-r*0.8,r*0.5,0,7);c.fill();
        c.fillStyle='#3a3530';c.beginPath();c.arc(px+(Math.cos(it.sheep.a)>0?r*0.85:-r*0.85),py-r*0.55,r*0.32,0,7);c.fill();}
    }
    // نور خورشید و سایه ابرها
    c.fillStyle='rgba(10,25,15,.06)';
    for(let i=0;i<5;i++){const ex=((i*811+t*12*(1+i%3*0.4))%(W+1000))-500,ey=(i*377)%H;c.beginPath();c.ellipse(ex,ey,300+i*40,120+i*20,0,0,7);c.fill();}
    const sg=c.createLinearGradient(0,0,W,H);sg.addColorStop(0,'rgba(255,238,190,.16)');sg.addColorStop(0.5,'rgba(255,238,190,0)');sg.addColorStop(1,'rgba(20,30,60,.14)');
    c.fillStyle=sg;c.fillRect(0,0,W,H);
    const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*0.45,W/2,H/2,Math.max(W,H)*0.78);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(8,14,10,.4)');
    c.fillStyle=vg;c.fillRect(0,0,W,H);
  }
  _wallPiece(c,px,py,u,tier,pal,vert,t){
    const w=u*(vert?0.62:1.2),h=u*(0.5+0.14*tier);
    if(tier===0){for(let i=0;i<6;i++){const x=px-w/2+i*w/5;c.fillStyle=i%2?'#8a5a33':'#9c6a3d';c.beginPath();c.moveTo(x-w*0.09,py);c.lineTo(x-w*0.09,py-h*0.85);c.lineTo(x,py-h);c.lineTo(x+w*0.09,py-h*0.85);c.lineTo(x+w*0.09,py);c.closePath();c.fill();}
      c.strokeStyle='#5d4126';c.lineWidth=2;c.beginPath();c.moveTo(px-w/2,py-h*0.35);c.lineTo(px+w/2,py-h*0.35);c.stroke();return;}
    c.fillStyle=pal.stone;c.fillRect(px-w/2,py-h,w,h);c.fillStyle='rgba(0,0,0,.16)';c.fillRect(px-w/2,py-h*0.12,w,h*0.12);c.fillRect(px+w*0.15,py-h,w*0.35,h);
    c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=1;for(let i=1;i<4;i++){c.beginPath();c.moveTo(px-w/2,py-h*i/4);c.lineTo(px+w/2,py-h*i/4);c.stroke();}
    const n=3,cw=w/(n*1.7);for(let i=0;i<n;i++){c.fillStyle=pal.stone;c.fillRect(px-w/2+i*cw*1.7+cw*0.35,py-h-cw*0.85,cw,cw*0.85);}
    if(tier>=3){c.fillStyle=pal.trim;c.fillRect(px-w/2,py-h,w,h*0.06);}
    if(tier>=4&&!vert){const f=0.6+0.4*Math.sin(t*8+px);c.fillStyle='rgba(255,170,60,'+f+')';c.beginPath();c.arc(px,py-h-u*0.12,u*0.05,0,7);c.fill();}}
  _worker(c,px,py,u,w,p,t){
    const h=u*0.72,dir=p.dx<0?-1:1,sw=p.moving?Math.sin(t*9+w.off):0,bob=p.moving?Math.abs(Math.sin(t*9+w.off))*h*0.05:0,y=py-bob;
    c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.ellipse(px,py+h*0.02,h*0.28,h*0.08,0,0,7);c.fill();
    c.strokeStyle='#3a2f28';c.lineWidth=Math.max(1.5,h*0.09);c.lineCap='round';
    c.beginPath();c.moveTo(px-h*0.07,y-h*0.32);c.lineTo(px-h*0.07+sw*h*0.12,y);c.moveTo(px+h*0.07,y-h*0.32);c.lineTo(px+h*0.07-sw*h*0.12,y);c.stroke();
    c.fillStyle=w.col;c.beginPath();c.roundRect(px-h*0.14,y-h*0.7,h*0.28,h*0.42,h*0.07);c.fill();
    if(w.role==='noble'){c.fillStyle='rgba(0,0,0,.2)';c.fillRect(px-h*0.14,y-h*0.5,h*0.28,h*0.22);}
    c.fillStyle='#f0c9a0';c.beginPath();c.arc(px,y-h*0.82,h*0.13,0,7);c.fill();
    const hat=w.role;
    if(hat==='farm'){c.fillStyle='#e8c860';c.beginPath();c.ellipse(px,y-h*0.9,h*0.24,h*0.06,0,0,7);c.fill();c.beginPath();c.arc(px,y-h*0.9,h*0.12,Math.PI,0);c.fill();}
    else if(hat==='lumber'){c.fillStyle='#3f6a32';c.beginPath();c.arc(px,y-h*0.86,h*0.14,Math.PI,0);c.fill();}
    else if(hat==='quarry'||hat==='ironmine'||hat==='builder'){c.fillStyle='#f2c230';c.beginPath();c.arc(px,y-h*0.86,h*0.15,Math.PI,0);c.fill();c.fillRect(px-h*0.17,y-h*0.87,h*0.34,h*0.04);}
    else if(hat==='soldier'||hat==='guard'){c.fillStyle='#9aa0aa';c.beginPath();c.arc(px,y-h*0.86,h*0.15,Math.PI,0);c.fill();
      if(hat==='guard'){c.fillStyle='#d23b3b';c.fillRect(px-h*0.02,y-h*1.08,h*0.04,h*0.1);}}
    else if(hat==='nurse'){c.fillStyle='#fff';c.beginPath();c.arc(px,y-h*0.88,h*0.14,Math.PI,0);c.fill();c.fillStyle='#d83b3b';c.fillRect(px-h*0.02,y-h*0.98,h*0.04,h*0.08);c.fillRect(px-h*0.04,y-h*0.96,h*0.08,h*0.03);}
    else if(hat==='noble'){c.fillStyle='#ffd166';c.fillRect(px-h*0.11,y-h*1.02,h*0.22,h*0.07);for(let i=0;i<3;i++)c.fillRect(px-h*0.11+i*h*0.09,y-h*1.08,h*0.04,h*0.07);}
    else{c.fillStyle='#6d4a2b';c.beginPath();c.arc(px,y-h*0.88,h*0.13,Math.PI,0);c.fill();}
    // ابزار و بار
    const hx=px+dir*h*0.2,hy=y-h*0.5;
    if(hat==='soldier'||hat==='guard'){c.strokeStyle='#d8d8de';c.lineWidth=Math.max(1,h*0.045);c.beginPath();c.moveTo(hx,y-h*0.1);c.lineTo(hx,y-h*1.15);c.stroke();
      c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(px-dir*h*0.17,y-h*0.5,h*0.11,0,7);c.fill();c.strokeStyle=w.col;c.stroke();}
    if(p.act==='drill'){const a=Math.sin(t*5)*0.8;c.strokeStyle='#e8e8ee';c.lineWidth=Math.max(1.5,h*0.05);c.beginPath();c.moveTo(hx,hy);c.lineTo(hx+Math.cos(a-1.2)*h*0.6*dir,hy+Math.sin(a-1.2)*h*0.6);c.stroke();
      c.fillStyle='#8a5a33';c.fillRect(px+dir*h*0.7,y-h*0.7,h*0.22,h*0.7);c.fillStyle='#c8a265';c.beginPath();c.arc(px+dir*h*0.81,y-h*0.78,h*0.12,0,7);c.fill();}
    if(p.act==='build'){const a=Math.sin(t*7+w.off*3);c.strokeStyle='#5d4126';c.lineWidth=Math.max(1.5,h*0.06);c.beginPath();c.moveTo(hx,hy);c.lineTo(hx+dir*h*0.3,hy-h*0.35-a*h*0.2);c.stroke();
      c.fillStyle='#8d9196';c.fillRect(hx+dir*h*0.22,hy-h*0.45-a*h*0.2,h*0.2,h*0.12);
      if(a>0.85){c.fillStyle='rgba(255,220,120,.9)';c.beginPath();c.arc(hx+dir*h*0.4,hy+h*0.1,h*0.06,0,7);c.fill();}}
    if(p.loaded){const bx=px-dir*h*0.05,by=y-h*0.78;
      if(p.loaded==='wheat'){c.fillStyle='#d9c27a';c.beginPath();c.arc(bx-dir*h*0.15,by,h*0.2,0,7);c.fill();c.strokeStyle='#8a6a2a';c.lineWidth=1;c.stroke();}
      else if(p.loaded==='log'){c.fillStyle='#8a5a33';c.save();c.translate(bx,by-h*0.05);c.rotate(-0.4*dir);c.fillRect(-h*0.32,-h*0.06,h*0.64,h*0.12);c.fillStyle='#d8b27a';c.beginPath();c.arc(h*0.32*dir,0,h*0.06,0,7);c.fill();c.restore();}
      else if(p.loaded==='stone'){c.fillStyle='#a6adb4';c.fillRect(bx-h*0.16,by-h*0.12,h*0.3,h*0.24);c.fillStyle='rgba(255,255,255,.3)';c.fillRect(bx-h*0.16,by-h*0.12,h*0.3,h*0.07);}
      else if(p.loaded==='ore'){c.fillStyle='#4e555c';c.fillRect(bx-h*0.16,by-h*0.12,h*0.3,h*0.24);c.fillStyle='#cfd6dd';c.beginPath();c.arc(bx,by-h*0.02,h*0.04,0,7);c.fill();}
      else if(p.loaded==='gold'){c.fillStyle='#ffd166';for(let i=0;i<3;i++){c.beginPath();c.arc(bx-h*0.1+i*h*0.1,by-(i%2)*h*0.07,h*0.08,0,7);c.fill();}}
      else if(p.loaded==='medbox'){c.fillStyle='#fff';c.fillRect(bx-h*0.15,by-h*0.12,h*0.3,h*0.24);c.fillStyle='#d83b3b';c.fillRect(bx-h*0.02,by-h*0.1,h*0.04,h*0.2);c.fillRect(bx-h*0.1,by-h*0.02,h*0.2,h*0.04);}
      else if(p.loaded==='scroll'){c.fillStyle='#f4ead0';c.fillRect(bx-h*0.1,by-h*0.14,h*0.2,h*0.28);c.fillStyle='#b8452f';c.fillRect(bx-h*0.1,by-h*0.02,h*0.2,h*0.04);}}
  }
  // ---------- لمس ساختمان ----------
  hit(S,cx,cy,W,H,u,cam){
    const sx=x=>W/2+(x-cam.x)*u,sy=y=>H/2+(y-cam.y)*u,s=u*2.25;let best=null,bd=1e9;
    for(const b of S.buildings){const px=sx(b.x),py=sy(b.y)+u*0.35,dx=cx-px,dy=cy-py;
      if(Math.abs(dx)<s*0.95&&dy>-s*1.5&&dy<s*0.35){const d=Math.abs(dy+s*0.5)+Math.abs(dx)*0.6;if(d<bd){bd=d;best=b;}}}
    return best?{kind:'building',b:best}:null;}
}
