// وکتورهای دست‌ساز جنگل و کوه — همه با مسیر کنواس، بدون تصویر
export const K={PINE:0,OAK:1,BUSH:2,HILL:3,MOUNT:4,PEAK:5};

const PINE_L=['#3f8a4c','#3a7f48','#47934f','#357a42'];
const PINE_D=['#285f36','#245633','#2e6a3b','#1e4b2c'];
const OAK_D=['#2f6a35','#3a7436','#2b5f3a','#44773a'];
const OAK_M=['#42883f','#4d9143','#3b7a48','#58994a'];
const OAK_L=['#69b05a','#76ba5e','#5ea36a','#82c264'];
const MT=[{lit:'#bcae95',dark:'#80755f'},{lit:'#aeab9d',dark:'#716f67'},{lit:'#bba383',dark:'#7e6a52'}];

function shadow(c,x,y,rx,ry){c.fillStyle='rgba(20,30,10,.24)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();}
function poly(c,pts,fill){c.fillStyle=fill;c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill();}

export function drawPine(c,x,y,s,v){
  const i=(v*4|0)&3,h=s*1.55,w=s*0.6;
  shadow(c,x+s*0.12,y,w*0.95,s*0.13);
  c.fillStyle='#4b3524';c.fillRect(x-s*0.06,y-s*0.3,s*0.12,s*0.3);
  for(let t=0;t<3;t++){
    const by=y-s*0.2-t*h*0.26,tw=w*(1-t*0.27),th=h*0.46;
    poly(c,[x-tw,by,x,by-th,x,by],PINE_L[i]);
    poly(c,[x,by-th,x+tw,by,x,by],PINE_D[i]);}
}
export function drawOak(c,x,y,s,v){
  const i=(v*4|0)&3;
  shadow(c,x+s*0.1,y,s*0.42,s*0.12);
  c.fillStyle='#5a3f2a';c.fillRect(x-s*0.07,y-s*0.42,s*0.14,s*0.42);
  c.fillStyle=OAK_D[i];c.beginPath();c.arc(x,y-s*0.7,s*0.44,0,7);c.fill();
  c.fillStyle=OAK_M[i];c.beginPath();c.arc(x-s*0.07,y-s*0.77,s*0.35,0,7);c.fill();
  c.fillStyle=OAK_L[i];c.beginPath();c.arc(x-s*0.17,y-s*0.86,s*0.19,0,7);c.fill();
}
export function drawBush(c,x,y,s,v){
  shadow(c,x,y,s*0.3,s*0.08);
  c.fillStyle='#3f7d3e';c.beginPath();c.ellipse(x,y-s*0.16,s*0.32,s*0.2,0,0,7);c.fill();
  c.fillStyle='#5aa04f';c.beginPath();c.ellipse(x-s*0.07,y-s*0.22,s*0.2,s*0.13,0,0,7);c.fill();
  if(v>0.62){c.fillStyle=v>0.82?'#ffd76a':'#f08fb0';
    c.fillRect(x+s*0.08,y-s*0.28,s*0.07,s*0.07);c.fillRect(x-s*0.14,y-s*0.2,s*0.06,s*0.06);}
}
export function drawHill(c,x,y,s,v){
  shadow(c,x+s*0.1,y,s*0.95,s*0.14);
  c.fillStyle=v>0.5?'#9aa664':'#8fa05c';
  c.beginPath();c.moveTo(x-s*0.95,y);c.quadraticCurveTo(x-s*0.55,y-s*0.95,x+s*0.02,y-s*0.82);
  c.quadraticCurveTo(x+s*0.6,y-s*0.78,x+s*0.98,y);c.closePath();c.fill();
  c.fillStyle='rgba(45,55,20,.30)';
  c.beginPath();c.moveTo(x+s*0.02,y-s*0.82);c.quadraticCurveTo(x+s*0.6,y-s*0.78,x+s*0.98,y);c.lineTo(x+s*0.12,y);c.closePath();c.fill();
  c.strokeStyle='rgba(255,255,220,.22)';c.lineWidth=Math.max(1,s*0.04);
  c.beginPath();c.moveTo(x-s*0.6,y-s*0.35);c.quadraticCurveTo(x-s*0.35,y-s*0.7,x-s*0.05,y-s*0.7);c.stroke();
}

function peak(c,x,y,s,pal,snow){
  const ax=x+s*0.06,ay=y-s*1.35,bw=s*0.95,mx=x+s*0.08;
  const r1x=ax-s*0.08,r1y=ay+s*0.4,r2x=ax+s*0.03,r2y=ay+s*0.68;
  poly(c,[ax,ay,x-bw,y,mx,y,r2x,r2y,r1x,r1y],pal.lit);
  poly(c,[ax,ay,r1x,r1y,r2x,r2y,mx,y,x+bw,y],pal.dark);
  c.strokeStyle='rgba(0,0,0,.16)';c.lineWidth=Math.max(1,s*0.03);
  c.beginPath();c.moveTo(r1x,r1y);c.lineTo(x-bw*0.35,y);c.moveTo(r2x,r2y);c.lineTo(x+bw*0.3,y);c.stroke();
  if(snow){
    const t=0.42,lx=ax+(x-bw-ax)*t,ly=ay+(y-ay)*t,rx=ax+(x+bw-ax)*t;
    poly(c,[ax,ay,lx,ly,ax-s*0.16,ly-s*0.08,ax-s*0.04,ly+s*0.15,ax+s*0.06,ly-s*0.02],'#f6f9fc');
    poly(c,[ax,ay,ax+s*0.06,ly-s*0.02,ax+s*0.15,ly+s*0.13,ax+s*0.24,ly-s*0.06,rx,ly],'#c3d1e0');}
  c.strokeStyle='rgba(35,26,16,.5)';c.lineWidth=Math.max(1,s*0.035);c.lineJoin='round';
  c.beginPath();c.moveTo(x-bw,y);c.lineTo(ax,ay);c.lineTo(x+bw,y);c.stroke();
}
export function drawMountain(c,x,y,s,snow,v){
  const pal=MT[(v*3|0)%3];
  shadow(c,x+s*0.18,y+s*0.02,s*1.05,s*0.17);
  if(v>0.35)peak(c,x-s*0.7,y,s*0.6,pal,snow&&v>0.6);
  if(v<0.7)peak(c,x+s*0.72,y,s*0.5,pal,false);
  peak(c,x,y,s,pal,snow);
}

// ---------- غار، گنج، خرابه ----------
export function drawCave(c,x,y,s,t){
  shadow(c,x+s*0.1,y,s*1.0,s*0.16);
  poly(c,[x-s*0.95,y,x-s*0.72,y-s*0.55,x-s*0.2,y-s*0.98,x+s*0.35,y-s*0.88,x+s*0.88,y-s*0.42,x+s*0.98,y],'#8a8478');
  poly(c,[x+s*0.1,y-s*0.95,x+s*0.35,y-s*0.88,x+s*0.88,y-s*0.42,x+s*0.98,y,x+s*0.3,y],'rgba(40,35,30,.35)');
  c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=Math.max(1,s*0.03);
  c.beginPath();c.moveTo(x-s*0.7,y-s*0.5);c.lineTo(x-s*0.22,y-s*0.92);c.stroke();
  c.fillStyle='#15100c';c.beginPath();c.moveTo(x-s*0.32,y);c.lineTo(x-s*0.32,y-s*0.3);c.arc(x,y-s*0.3,s*0.32,Math.PI,0);c.lineTo(x+s*0.32,y);c.closePath();c.fill();
  const g=0.45+0.4*Math.sin(t*3);c.fillStyle='rgba(255,160,50,'+g+')';
  c.beginPath();c.arc(x-s*0.1,y-s*0.22,s*0.045,0,7);c.arc(x+s*0.1,y-s*0.22,s*0.045,0,7);c.fill();
  c.fillStyle='#e9e4d2';c.beginPath();c.arc(x+s*0.52,y-s*0.06,s*0.07,0,7);c.fill();c.fillRect(x+s*0.49,y-s*0.06,s*0.06,s*0.06);
}
export function drawChest(c,x,y,s,t){
  const pu=0.5+0.5*Math.sin(t*2.5);
  const gr=c.createRadialGradient(x,y-s*0.3,s*0.1,x,y-s*0.3,s*(0.9+pu*0.3));
  gr.addColorStop(0,'rgba(255,225,120,.55)');gr.addColorStop(1,'rgba(255,225,120,0)');
  c.fillStyle=gr;c.beginPath();c.arc(x,y-s*0.3,s*(0.9+pu*0.3),0,7);c.fill();
  shadow(c,x,y,s*0.6,s*0.12);
  c.fillStyle='#7a4a24';c.beginPath();c.roundRect(x-s*0.5,y-s*0.48,s,s*0.48,s*0.05);c.fill();
  c.fillStyle='#ffd24a';c.beginPath();c.ellipse(x,y-s*0.5,s*0.46,s*0.14,0,0,7);c.fill();
  c.fillStyle='#a8703c';c.beginPath();c.moveTo(x-s*0.5,y-s*0.5);c.quadraticCurveTo(x,y-s*0.98,x+s*0.5,y-s*0.5);c.lineTo(x-s*0.5,y-s*0.5);c.fill();
  c.fillStyle='#e0b13a';c.fillRect(x-s*0.5,y-s*0.5,s,s*0.07);c.fillRect(x-s*0.07,y-s*0.5,s*0.14,s*0.5);
  c.fillStyle='#fff6c8';
  for(let i=0;i<3;i++){const a=t*2+i*2.1,sx=x+Math.cos(a)*s*0.55,sy=y-s*0.55+Math.sin(a*1.3)*s*0.35,r=s*(0.05+0.03*Math.sin(t*5+i));
    c.beginPath();c.moveTo(sx,sy-r*2);c.lineTo(sx+r*0.5,sy-r*0.5);c.lineTo(sx+r*2,sy);c.lineTo(sx+r*0.5,sy+r*0.5);c.lineTo(sx,sy+r*2);c.lineTo(sx-r*0.5,sy+r*0.5);c.lineTo(sx-r*2,sy);c.lineTo(sx-r*0.5,sy-r*0.5);c.closePath();c.fill();}
}
export function drawRuins(c,x,y,s,t){
  shadow(c,x,y,s*0.95,s*0.16);
  c.fillStyle='#bdb5a2';c.beginPath();c.ellipse(x,y-s*0.05,s*0.9,s*0.22,0,0,7);c.fill();
  c.fillStyle='#a49c89';c.beginPath();c.ellipse(x+s*0.1,y,s*0.8,s*0.16,0,0,7);c.fill();
  const col=(cx,h,w)=>{c.fillStyle='#d8d0bc';c.fillRect(cx-w/2,y-h,w,h);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(cx+w*0.1,y-h,w*0.4,h);
    c.fillStyle='#ece6d4';c.fillRect(cx-w*0.65,y-h-s*0.06,w*1.3,s*0.07);};
  col(x-s*0.55,s*0.85,s*0.2);col(x-s*0.1,s*0.6,s*0.2);col(x+s*0.4,s*0.95,s*0.2);
  c.fillStyle='#cfc7b2';c.save();c.translate(x+s*0.15,y-s*0.08);c.rotate(-0.12);c.fillRect(-s*0.3,-s*0.09,s*0.6,s*0.17);c.restore();
  c.fillStyle='#5f8f4a';c.fillRect(x-s*0.65,y-s*0.1,s*0.18,s*0.07);
  const g=0.4+0.4*Math.sin(t*2.2);c.fillStyle='rgba(120,230,255,'+g+')';c.beginPath();c.arc(x-s*0.1,y-s*0.72,s*0.07,0,7);c.fill();
}

// ---------- دسته سرباز در حال راهپیمایی ----------
export function drawSquad(c,x,y,s,color,dirx,t){
  c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(x,y+s*0.1,s*0.8,s*0.2,0,0,7);c.fill();
  const f=dirx<0?-1:1,u=s*0.55;
  const pos=[[-0.62,-0.18],[0,-0.24],[0.62,-0.18],[-0.32,0.1],[0.32,0.1]];
  // پرچم دسته
  const fx=x-f*s*0.05,fy=y-s*0.2;
  c.strokeStyle='#4a3524';c.lineWidth=Math.max(1.5,s*0.05);c.beginPath();c.moveTo(fx,fy);c.lineTo(fx,fy-s*1.15);c.stroke();
  c.fillStyle=color;c.beginPath();c.moveTo(fx,fy-s*1.15);c.lineTo(fx+f*s*0.55,fy-s*1.0+Math.sin(t*6)*s*0.05);c.lineTo(fx,fy-s*0.75);c.closePath();c.fill();
  for(let i=0;i<pos.length;i++){
    const px=x+pos[i][0]*s*f,bob=Math.abs(Math.sin(t*9+i*1.3))*s*0.06,py=y+pos[i][1]*s*0.8-bob;
    c.fillStyle='#3a2f28';c.fillRect(px-u*0.1,py-u*0.18,u*0.08,u*0.2);c.fillRect(px+u*0.02,py-u*0.18,u*0.08,u*0.2);
    c.fillStyle=color;c.fillRect(px-u*0.14,py-u*0.5,u*0.28,u*0.34);
    c.fillStyle='#f0c9a0';c.beginPath();c.arc(px,py-u*0.62,u*0.13,0,7);c.fill();
    c.fillStyle='#8d8d95';c.beginPath();c.arc(px,py-u*0.66,u*0.14,Math.PI,0);c.fill();
    c.strokeStyle='#d8d8de';c.lineWidth=Math.max(1,u*0.05);c.beginPath();c.moveTo(px+f*u*0.2,py-u*0.2);c.lineTo(px+f*u*0.24,py-u*1.0);c.stroke();
    c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.arc(px-f*u*0.2,py-u*0.34,u*0.13,0,7);c.fill();
    c.strokeStyle=color;c.lineWidth=Math.max(1,u*0.05);c.stroke();}
}

// ---------- کمپ نظامی ----------
export function drawCamp(c,x,y,s,t,col){
  shadow(c,x,y+s*0.05,s*1.1,s*0.22);
  c.fillStyle='rgba(120,95,60,.55)';c.beginPath();c.ellipse(x,y,s*1.0,s*0.3,0,0,7);c.fill();
  const tent=(tx,w,h,cl)=>{poly(c,[tx-w,y,tx,y-h,tx+w,y],cl);poly(c,[tx,y-h,tx+w,y,tx+w*0.25,y],'rgba(0,0,0,.22)');poly(c,[tx-w*0.18,y,tx,y-h*0.5,tx+w*0.18,y],'#2a1c10');};
  tent(x-s*0.45,s*0.4,s*0.55,'#d8c9a0');tent(x+s*0.4,s*0.34,s*0.46,col||'#a8342f');
  c.strokeStyle='#4a3524';c.lineWidth=Math.max(1.5,s*0.05);c.beginPath();c.moveTo(x,y+s*0.05);c.lineTo(x,y-s*1.05);c.stroke();
  poly(c,[x,y-s*1.05,x+s*0.5,y-s*0.92+Math.sin(t*6)*s*0.04,x,y-s*0.72],col||'#e5484d');
  const fx=x-s*0.05,fy=y+s*0.22,f=0.7+0.3*Math.sin(t*10);
  c.fillStyle='#5d4126';c.fillRect(fx-s*0.15,fy,s*0.3,s*0.05);
  c.fillStyle='rgba(255,170,60,'+f+')';c.beginPath();c.moveTo(fx-s*0.08,fy);c.quadraticCurveTo(fx,fy-s*0.3*f,fx+s*0.08,fy);c.fill();
  c.fillStyle='rgba(255,230,140,.9)';c.beginPath();c.moveTo(fx-s*0.04,fy);c.quadraticCurveTo(fx,fy-s*0.16*f,fx+s*0.04,fy);c.fill();
}
// ---------- غول سنگی آخر فصل ----------
export function drawGiant(c,x,y,s,t){
  const br=Math.sin(t*1.6)*s*0.02,lv=0.55+0.45*Math.sin(t*3);
  const g=c.createRadialGradient(x,y-s*1.5,s*0.3,x,y-s*1.5,s*3);g.addColorStop(0,'rgba(255,90,40,'+(0.28*lv)+')');g.addColorStop(1,'rgba(255,90,40,0)');
  c.fillStyle=g;c.beginPath();c.arc(x,y-s*1.5,s*3,0,7);c.fill();
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x,y+s*0.05,s*1.5,s*0.3,0,0,7);c.fill();
  // پاها
  for(const dx of[-0.5,0.5]){poly(c,[x+s*dx-s*0.34,y,x+s*dx-s*0.28,y-s*0.9,x+s*dx+s*0.28,y-s*0.9,x+s*dx+s*0.34,y],'#6d655a');poly(c,[x+s*dx,y-s*0.9,x+s*dx+s*0.28,y-s*0.9,x+s*dx+s*0.34,y,x+s*dx+s*0.05,y],'#4c453c');}
  // تنه
  poly(c,[x-s*0.95,y-s*0.85+br,x-s*0.7,y-s*2.2+br,x+s*0.7,y-s*2.2+br,x+s*0.95,y-s*0.85+br],'#7d756a');
  poly(c,[x,y-s*2.2+br,x+s*0.7,y-s*2.2+br,x+s*0.95,y-s*0.85+br,x+s*0.1,y-s*0.85+br],'rgba(0,0,0,.25)');
  c.strokeStyle='rgba(255,120,40,'+(0.55+0.45*lv)+')';c.lineWidth=Math.max(2,s*0.05);c.lineJoin='round';
  c.beginPath();c.moveTo(x-s*0.4,y-s*2.0+br);c.lineTo(x-s*0.2,y-s*1.5+br);c.lineTo(x-s*0.45,y-s*1.2+br);c.moveTo(x+s*0.3,y-s*2.0+br);c.lineTo(x+s*0.15,y-s*1.55+br);c.lineTo(x+s*0.4,y-s*1.1+br);c.stroke();
  c.fillStyle='#5d7a4a';c.beginPath();c.ellipse(x-s*0.5,y-s*2.1+br,s*0.3,s*0.08,0,0,7);c.fill();
  // بازوها و گرز
  poly(c,[x-s*0.7,y-s*2.1+br,x-s*1.25,y-s*1.3,x-s*1.05,y-s*0.7,x-s*0.8,y-s*1.3],'#6d655a');
  const sw=Math.sin(t*1.6)*0.12;c.save();c.translate(x+s*0.75,y-s*2.0+br);c.rotate(-0.5+sw);
  poly(c,[0,0,s*0.5,s*0.1,s*0.55,s*0.45,s*0.1,s*0.4],'#6d655a');
  c.fillStyle='#5d4126';c.fillRect(s*0.3,-s*1.7,s*0.14,s*1.9);c.fillStyle='#4c453c';c.beginPath();c.arc(s*0.37,-s*1.85,s*0.34,0,7);c.fill();
  c.fillStyle='#8a8278';c.beginPath();c.arc(s*0.32,-s*1.9,s*0.2,0,7);c.fill();c.restore();
  // سر
  poly(c,[x-s*0.38,y-s*2.2+br,x-s*0.32,y-s*2.85+br,x+s*0.32,y-s*2.85+br,x+s*0.38,y-s*2.2+br],'#837b70');
  poly(c,[x-s*0.32,y-s*2.85+br,x-s*0.5,y-s*3.25+br,x-s*0.15,y-s*2.9+br],'#e8dfc8');poly(c,[x+s*0.32,y-s*2.85+br,x+s*0.5,y-s*3.25+br,x+s*0.15,y-s*2.9+br],'#e8dfc8');
  c.fillStyle='rgba(255,'+(110+lv*80|0)+',40,1)';c.beginPath();c.arc(x-s*0.15,y-s*2.6+br,s*0.07,0,7);c.arc(x+s*0.15,y-s*2.6+br,s*0.07,0,7);c.fill();
  c.fillStyle='#1a1410';c.fillRect(x-s*0.17,y-s*2.4+br,s*0.34,s*0.07);
}
