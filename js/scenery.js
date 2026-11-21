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
