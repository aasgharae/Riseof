// ساختمان‌های داخل قلعه — هرکدام ۵ مرحله ظاهری دارند (Lv 1-5، 6-12، 13-20، 21-29، 30)
import{drawFlag}from'./castles.js';
export const tierOf=l=>l>=30?4:l>=21?3:l>=13?2:l>=6?1:0;
export const TIER_NAMES=['روستایی','شهری','سنگی','سلطنتی','افسانه‌ای'];
const PAL=[
 {wall:'#c9a06b',wallS:'#a87f4c',trim:'#6d431f',roof:'#c8a24f',roofS:'#a07f36',win:'#3a2f28',stone:'#a79c86'},
 {wall:'#eadfc6',wallS:'#cdbf9f',trim:'#8a5a33',roof:'#b8452f',roofS:'#8e3222',win:'#ffd98a',stone:'#b3a992'},
 {wall:'#c3bba8',wallS:'#9d957f',trim:'#6e6757',roof:'#4f6f94',roofS:'#38526f',win:'#ffd98a',stone:'#a9a18d'},
 {wall:'#ece7dc',wallS:'#c8c1b2',trim:'#b88a2a',roof:'#7a3b8f',roofS:'#582a69',win:'#ffe3a0',stone:'#d8d2c4'},
 {wall:'#f6f1e4',wallS:'#d9d1bd',trim:'#e0b13a',roof:'#e3b53c',roofS:'#b58a24',win:'#fff2b8',stone:'#efe8d4'}];
export const palOf=l=>PAL[tierOf(l)];
const TIER_COL=['#b07a48','#c9ced6','#7fb2e5','#c58bff','#ffd166'];

function glow(c,x,y,r,col){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(255,220,120,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();}
function smoke(c,x,y,s,t,seed=0,n=3){for(let i=0;i<n;i++){const p=(t*0.3+i/n+seed)%1;c.fillStyle='rgba(235,235,235,'+(0.5*(1-p))+')';
  c.beginPath();c.arc(x+Math.sin(p*6+seed*9)*s*0.1+p*s*0.18,y-p*s*0.85,s*(0.06+p*0.13),0,7);c.fill();}}
function walls(c,x,y,w,h,pal,tier){
  c.fillStyle=pal.wall;c.fillRect(x-w/2,y-h,w,h);
  c.fillStyle='rgba(0,0,0,.15)';c.fillRect(x+w*0.12,y-h,w*0.38,h);
  c.strokeStyle='rgba(0,0,0,.10)';c.lineWidth=1;const rows=tier>=2?5:2;
  for(let i=1;i<rows;i++){c.beginPath();c.moveTo(x-w/2,y-h*i/rows);c.lineTo(x+w/2,y-h*i/rows);c.stroke();}
  if(tier===0){c.strokeStyle=pal.trim;c.lineWidth=Math.max(1.5,w*0.035);c.beginPath();
    c.moveTo(x-w/2,y-h);c.lineTo(x-w/2,y);c.moveTo(x+w/2,y-h);c.lineTo(x+w/2,y);c.moveTo(x,y-h);c.lineTo(x,y);c.moveTo(x-w/2,y-h*0.5);c.lineTo(x+w/2,y-h*0.5);c.stroke();}
  c.fillStyle='rgba(0,0,0,.22)';c.fillRect(x-w/2,y-h*0.07,w,h*0.07);}
function gable(c,x,y,w,rh,pal,tier){
  c.fillStyle=pal.roof;c.beginPath();c.moveTo(x-w*0.6,y);c.lineTo(x,y-rh);c.lineTo(x+w*0.6,y);c.closePath();c.fill();
  c.fillStyle=pal.roofS;c.beginPath();c.moveTo(x,y-rh);c.lineTo(x+w*0.6,y);c.lineTo(x+w*0.08,y);c.closePath();c.fill();
  if(tier>=1){c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1;for(let i=1;i<5;i++){const yy=y-rh*i/5,hw=w*0.6*(1-i/5);c.beginPath();c.moveTo(x-hw,yy);c.lineTo(x+hw,yy);c.stroke();}}
  c.strokeStyle=tier>=3?pal.trim:'rgba(0,0,0,.35)';c.lineWidth=Math.max(1.5,w*0.03);c.beginPath();c.moveTo(x-w*0.6,y);c.lineTo(x,y-rh);c.lineTo(x+w*0.6,y);c.stroke();
  if(tier>=4){c.fillStyle='#fff2b8';c.beginPath();c.arc(x,y-rh-w*0.03,w*0.05,0,7);c.fill();}}
function win(c,x,y,w,pal,t,i=0){
  c.fillStyle='#2a2118';c.fillRect(x-w*0.6,y-w*0.75,w*1.2,w*1.5);
  const lit=pal.win!=='#3a2f28';c.fillStyle=lit?pal.win:'#5b4a3a';if(lit)c.globalAlpha=0.8+0.2*Math.sin(t*3+i*2);
  c.fillRect(x-w*0.45,y-w*0.6,w*0.9,w*1.2);c.globalAlpha=1;
  c.fillStyle='rgba(0,0,0,.4)';c.fillRect(x-w*0.04,y-w*0.6,w*0.08,w*1.2);c.fillRect(x-w*0.45,y-w*0.03,w*0.9,w*0.06);}
function door(c,x,y,w,h,pal,arch){
  c.fillStyle='#3a2a1c';c.beginPath();c.moveTo(x-w/2,y);c.lineTo(x-w/2,y-h+w/2);if(arch)c.arc(x,y-h+w/2,w/2,Math.PI,0);else{c.lineTo(x-w/2,y-h);c.lineTo(x+w/2,y-h);}c.lineTo(x+w/2,y);c.closePath();c.fill();
  c.strokeStyle=pal.trim;c.lineWidth=Math.max(1.5,w*0.1);c.stroke();
  c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-h+w/2);c.stroke();}
export function tower(c,x,y,w,h,pal,tier,t,flagCol){
  c.fillStyle=pal.stone;c.fillRect(x-w/2,y-h,w,h);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(x+w*0.1,y-h,w*0.4,h);
  c.strokeStyle='rgba(0,0,0,.1)';c.lineWidth=1;for(let i=1;i<6;i++){c.beginPath();c.moveTo(x-w/2,y-h*i/6);c.lineTo(x+w/2,y-h*i/6);c.stroke();}
  c.fillStyle='#1f1812';c.beginPath();c.roundRect(x-w*0.09,y-h*0.7,w*0.18,w*0.4,w*0.09);c.fill();
  if(tier>=1){const rh=w*(tier>=3?1.5:1.0);
    c.fillStyle=pal.roof;c.beginPath();c.moveTo(x-w*0.68,y-h);c.lineTo(x,y-h-rh);c.lineTo(x+w*0.68,y-h);c.closePath();c.fill();
    c.fillStyle=pal.roofS;c.beginPath();c.moveTo(x,y-h-rh);c.lineTo(x+w*0.68,y-h);c.lineTo(x+w*0.1,y-h);c.closePath();c.fill();
    if(flagCol)drawFlag(c,x,y-h-rh,w*0.7,w*0.8,flagCol,t);
    if(tier>=4){c.fillStyle='#ffe58a';c.beginPath();c.arc(x,y-h-rh-w*0.04,w*0.1,0,7);c.fill();}
  }else{const n=4,cw=w/(n*1.5);for(let i=0;i<n;i++){c.fillStyle=pal.stone;c.fillRect(x-w/2+i*cw*1.5,y-h-cw*0.9,cw,cw*0.9);}}}
export function scaffold(c,x,y,w,h,t){
  c.strokeStyle='#8a5a33';c.lineWidth=Math.max(2,w*0.03);
  for(const px of[-w*0.55,w*0.55]){c.beginPath();c.moveTo(x+px,y+w*0.05);c.lineTo(x+px,y-h);c.stroke();}
  for(let i=1;i<=3;i++){c.beginPath();c.moveTo(x-w*0.6,y-h*i/3.2);c.lineTo(x+w*0.6,y-h*i/3.2);c.stroke();}
  c.strokeStyle='#a97b4f';c.beginPath();c.moveTo(x-w*0.55,y);c.lineTo(x+w*0.55,y-h*0.62);c.moveTo(x+w*0.55,y);c.lineTo(x-w*0.55,y-h*0.62);c.stroke();
  c.fillStyle='rgba(200,170,120,.35)';c.fillRect(x-w*0.55,y-h*0.35,w*1.1,h*0.2);
  for(let i=0;i<4;i++){const p=(t*0.8+i/4)%1;c.fillStyle='rgba(220,200,160,'+(0.5*(1-p))+')';c.beginPath();c.arc(x-w*0.4+i*w*0.27+Math.sin(p*7+i)*w*0.05,y-p*h*0.5,w*(0.05+p*0.07),0,7);c.fill();}}
function badge(c,px,py,s,level){
  const tier=tierOf(level),txt='Lv '+level;c.font='bold '+Math.max(11,s*0.17)+'px Vazirmatn, sans-serif';
  const w=c.measureText(txt).width+s*0.22,h=s*0.24;
  c.fillStyle='rgba(15,18,28,.85)';c.beginPath();c.roundRect(px-w/2,py,w,h,h/2);c.fill();
  c.strokeStyle=TIER_COL[tier];c.lineWidth=Math.max(1.5,s*0.03);c.stroke();
  c.fillStyle=TIER_COL[tier];c.textAlign='center';c.fillText(txt,px,py+h*0.72);}

// ---------- انواع ساختمان ----------
function keep(c,px,py,s,tier,t,pal){
  const w=s*(1.2+0.08*tier),h=s*(0.8+0.1*tier);
  if(tier>=2){tower(c,px-w*0.3,py-h*0.45,s*0.27,s*(1.0+0.08*tier),pal,tier,t,null);tower(c,px+w*0.3,py-h*0.45,s*0.27,s*(1.0+0.08*tier),pal,tier,t,null);}
  walls(c,px,py,w,h,{...pal,wall:pal.stone},Math.max(2,tier));
  const n=7,cw=w/(n*1.6);for(let i=0;i<n;i++){c.fillStyle=pal.stone;c.fillRect(px-w/2+i*cw*1.6+cw*0.3,py-h-cw*0.9,cw,cw*0.9);}
  door(c,px,py,w*0.26,h*0.55,pal,true);
  for(const dx of[-0.36,0.36])win(c,px+w*dx,py-h*0.55,w*0.06,pal,t,dx*5);
  const tw=s*0.52,th=s*(1.2+0.22*tier);
  tower(c,px,py-h*0.3,tw,th,pal,Math.max(1,tier),t,'#e5484d');
  if(tier>=1){tower(c,px-w*0.52,py,s*0.3,s*(0.95+0.12*tier),pal,tier,t,'#ffd166');tower(c,px+w*0.52,py,s*0.3,s*(0.95+0.12*tier),pal,tier,t,'#ffd166');}
  if(tier>=2){c.fillStyle=pal.stone;c.fillRect(px-s*1.12,py-s*0.2,s*2.24,s*0.2);c.fillStyle='rgba(0,0,0,.15)';c.fillRect(px-s*1.12,py-s*0.2,s*2.24,s*0.04);
    for(let i=0;i<9;i++){c.fillStyle=pal.stone;c.fillRect(px-s*1.12+i*s*0.27,py-s*0.31,s*0.15,s*0.12);}
    door(c,px,py,s*0.34,s*0.3,pal,true);}
  if(tier>=3){for(const dx of[-0.85,0.85])drawFlag(c,px+s*dx,py-s*0.3,s*0.24,s*0.3,'#ffd166',t);}
  if(tier>=4){glow(c,px,py-h-th*0.4,s*1.2,'rgba(255,224,130,.35)');
    for(let i=0;i<5;i++){const a=t*1.5+i*1.26;c.fillStyle='rgba(255,240,160,.9)';c.beginPath();c.arc(px+Math.cos(a)*s*0.9,py-h*0.9+Math.sin(a*1.3)*s*0.5,s*0.03,0,7);c.fill();}}}

function farm(c,px,py,s,tier,t,pal){
  const crop=['#d9b64e','#e0c050','#e8c84a','#f0d058','#ffe070'][tier];
  c.fillStyle='rgba(120,90,40,.45)';c.beginPath();c.roundRect(px-s*1.0,py-s*0.18,s*1.15,s*0.62,s*0.1);c.fill();
  for(let r=0;r<4;r++){c.fillStyle=crop;for(let i=0;i<9;i++){const sw=Math.sin(t*2+i+r)*s*0.012;c.fillRect(px-s*0.95+i*s*0.125+sw,py-s*0.12+r*s*0.13,s*0.07,s*0.1);}}
  c.strokeStyle='#6d431f';c.lineWidth=Math.max(1.5,s*0.025);c.beginPath();c.moveTo(px-s*1.02,py+s*0.46);c.lineTo(px+s*0.16,py+s*0.46);for(let i=0;i<=6;i++){c.moveTo(px-s*1.02+i*s*0.2,py+s*0.46);c.lineTo(px-s*1.02+i*s*0.2,py+s*0.36);}c.stroke();
  const bw=s*(0.62+0.04*tier),bh=s*(0.42+0.05*tier),bx=px+s*0.2;
  walls(c,bx,py-s*0.05,bw,bh,pal,tier);gable(c,bx,py-s*0.05-bh,bw*1.05,s*0.34,pal,tier);
  door(c,bx,py-s*0.05,bw*0.34,bh*0.7,pal,false);
  c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1.5;c.beginPath();c.moveTo(bx-bw*0.17,py-s*0.05);c.lineTo(bx+bw*0.17,py-s*0.05-bh*0.7);c.moveTo(bx+bw*0.17,py-s*0.05);c.lineTo(bx-bw*0.17,py-s*0.05-bh*0.7);c.stroke();
  if(tier>=1){const mx=px+s*0.88,mh=s*(0.65+0.1*tier);
    c.fillStyle=pal.stone;c.beginPath();c.moveTo(mx-s*0.15,py);c.lineTo(mx-s*0.09,py-mh);c.lineTo(mx+s*0.09,py-mh);c.lineTo(mx+s*0.15,py);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.15)';c.fillRect(mx,py-mh,s*0.1,mh);
    c.fillStyle=pal.roof;c.beginPath();c.moveTo(mx-s*0.13,py-mh);c.lineTo(mx,py-mh-s*0.26);c.lineTo(mx+s*0.13,py-mh);c.closePath();c.fill();
    c.save();c.translate(mx,py-mh-s*0.04);c.rotate(t*(0.8+tier*0.25));
    for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.strokeStyle='#5d4126';c.lineWidth=s*0.045;c.beginPath();c.moveTo(0,0);c.lineTo(s*(0.36+0.03*tier),0);c.stroke();c.fillStyle='rgba(255,255,255,.82)';c.fillRect(s*0.09,-s*0.075,s*0.27,s*0.15);}c.restore();}
  if(tier>=2){c.fillStyle='#c9ced6';c.fillRect(px+s*0.62,py-s*0.62,s*0.15,s*0.62);c.fillStyle='#8d96a3';c.beginPath();c.arc(px+s*0.695,py-s*0.62,s*0.075,Math.PI,0);c.fill();}
  c.strokeStyle='#5d4126';c.lineWidth=s*0.03;c.beginPath();c.moveTo(px-s*1.08,py+s*0.12);c.lineTo(px-s*1.08,py-s*0.22);c.moveTo(px-s*1.18,py-s*0.12);c.lineTo(px-s*0.98,py-s*0.12);c.stroke();
  c.fillStyle='#e8c46a';c.beginPath();c.arc(px-s*1.08,py-s*0.26,s*0.05,0,7);c.fill();
  if(tier>=3)drawFlag(c,bx,py-s*0.05-bh-s*0.34,s*0.26,s*0.3,'#ffd166',t);}

function lumber(c,px,py,s,tier,t,pal){
  const hw=s*(0.7+0.05*tier),hh=s*(0.42+0.04*tier),bx=px-s*0.15;
  walls(c,bx,py-s*0.05,hw,hh,pal,tier);gable(c,bx,py-s*0.05-hh,hw*1.08,s*0.34,pal,tier);
  c.fillStyle='#2a1c10';c.fillRect(bx-hw*0.32,py-s*0.05-hh*0.78,hw*0.64,hh*0.78);
  c.fillStyle='#b88a5a';c.fillRect(bx-hw*0.26,py-s*0.05-hh*0.28,hw*0.52,hh*0.1);
  c.save();c.translate(bx,py-s*0.05-hh*0.5);c.rotate(t*5);c.fillStyle='#cfd6dd';c.beginPath();
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,r=i%2?s*0.14:s*0.19;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.fill();c.restore();
  const stacks=2+tier;for(let k=0;k<stacks;k++)for(let i=0;i<Math.min(3,k+1);i++){
    c.fillStyle='#b88555';c.beginPath();c.roundRect(px+s*0.38+(k%3)*s*0.0,py-s*0.08-k*s*0.11-i*0+0,s*0.4,s*0.1,3);c.fill();
    c.fillStyle='#8a5a33';c.beginPath();c.arc(px+s*0.78,py-s*0.03-k*s*0.11,s*0.05,0,7);c.fill();}
  c.fillStyle='#7a5230';c.beginPath();c.ellipse(px-s*0.78,py+s*0.04,s*0.1,s*0.045,0,0,7);c.fill();c.fillStyle='#d8b27a';c.beginPath();c.ellipse(px-s*0.78,py+s*0.02,s*0.1,s*0.04,0,0,7);c.fill();
  if(tier>=2){const wx=px-s*0.78,wy=py-s*0.32;c.save();c.translate(wx,wy);c.rotate(-t*0.9);
    c.strokeStyle='#5d4126';c.lineWidth=s*0.04;c.beginPath();c.arc(0,0,s*0.24,0,7);c.stroke();
    for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.fillStyle='#8a5a33';c.fillRect(s*0.02,-s*0.035,s*0.24,s*0.07);}c.restore();
    c.fillStyle='rgba(90,160,220,.8)';c.beginPath();c.ellipse(wx,py+s*0.05,s*0.2,s*0.06,0,0,7);c.fill();}
  if(tier>=1)smoke(c,bx+hw*0.28,py-s*0.05-hh-s*0.2,s,t,0.2);
  if(tier>=3)drawFlag(c,bx,py-s*0.05-hh-s*0.34,s*0.24,s*0.28,'#46a758',t);}

function quarry(c,px,py,s,tier,t,pal){
  const layers=2+Math.min(tier,3);
  for(let i=0;i<layers;i++){const k=1-i*0.2;c.fillStyle=['#bdb5a2','#aaa28f','#978f7d','#857e6d','#756e5f'][i];c.beginPath();c.ellipse(px,py-s*0.02+i*s*0.04,s*0.78*k,s*0.34*k,0,0,7);c.fill();}
  const rock=(x,y,r,l)=>{c.fillStyle=l?'#a6adb4':'#8d9196';c.beginPath();c.moveTo(x-r,y);c.lineTo(x-r*0.4,y-r);c.lineTo(x+r*0.5,y-r*0.9);c.lineTo(x+r,y);c.closePath();c.fill();
    c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.moveTo(x-r*0.4,y-r);c.lineTo(x+r*0.5,y-r*0.9);c.lineTo(x+r*0.15,y-r*0.35);c.closePath();c.fill();};
  rock(px-s*0.5,py-s*0.1,s*0.17);rock(px+s*0.42,py-s*0.06,s*0.2,1);rock(px,py-s*0.3,s*0.14);
  for(let i=0;i<2+tier;i++){c.fillStyle=pal.stone;c.fillRect(px-s*0.95+(i%3)*s*0.2,py+s*0.12-Math.floor(i/3)*s*0.11,s*0.19,s*0.1);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(px-s*0.95+(i%3)*s*0.2+s*0.1,py+s*0.12-Math.floor(i/3)*s*0.11,s*0.09,s*0.1);}
  const mh=s*(0.8+0.1*tier);c.fillStyle=pal.trim;c.fillRect(px+s*0.55,py-mh,s*0.1,mh);
  c.save();c.translate(px+s*0.6,py-mh);const sw=Math.sin(t*0.9)*0.25;c.rotate(sw);
  c.strokeStyle=pal.trim;c.lineWidth=s*0.065;c.beginPath();c.moveTo(0,0);c.lineTo(-s*0.75,0);c.stroke();
  c.strokeStyle='#2a2118';c.lineWidth=1.5;c.beginPath();c.moveTo(-s*0.75,0);c.lineTo(-s*0.75,s*0.34+Math.sin(t*1.8)*s*0.04);c.stroke();
  c.fillStyle=pal.stone;c.fillRect(-s*0.83,s*0.34+Math.sin(t*1.8)*s*0.04,s*0.16,s*0.12);c.restore();
  if(tier>=2){c.fillStyle='#8a5a33';c.fillRect(px-s*0.55,py-s*0.35,s*0.22,s*0.35);c.fillStyle=pal.roof;c.beginPath();c.moveTo(px-s*0.6,py-s*0.35);c.lineTo(px-s*0.44,py-s*0.55);c.lineTo(px-s*0.28,py-s*0.35);c.closePath();c.fill();}
  if(tier>=3)drawFlag(c,px-s*0.44,py-s*0.55,s*0.22,s*0.26,'#c9ced6',t);}

function mine(c,px,py,s,tier,t,pal,gold){
  c.fillStyle=gold?'#8a8154':'#7d8288';c.beginPath();c.moveTo(px-s*0.75,py);c.lineTo(px-s*0.5,py-s*0.7);c.lineTo(px-s*0.1,py-s*0.95);c.lineTo(px+s*0.4,py-s*0.78);c.lineTo(px+s*0.75,py);c.closePath();c.fill();
  c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.moveTo(px-s*0.1,py-s*0.95);c.lineTo(px+s*0.4,py-s*0.78);c.lineTo(px+s*0.75,py);c.lineTo(px+s*0.1,py);c.closePath();c.fill();
  c.fillStyle='rgba(255,255,255,.2)';c.beginPath();c.moveTo(px-s*0.5,py-s*0.7);c.lineTo(px-s*0.1,py-s*0.95);c.lineTo(px-s*0.2,py-s*0.6);c.closePath();c.fill();
  c.fillStyle='#120c08';c.beginPath();c.moveTo(px-s*0.2,py);c.lineTo(px-s*0.2,py-s*0.3);c.arc(px,py-s*0.3,s*0.2,Math.PI,0);c.lineTo(px+s*0.2,py);c.closePath();c.fill();
  c.strokeStyle=pal.trim;c.lineWidth=s*0.06;c.beginPath();c.moveTo(px-s*0.23,py);c.lineTo(px-s*0.23,py-s*0.32);c.lineTo(px+s*0.23,py-s*0.32);c.lineTo(px+s*0.23,py);c.stroke();
  if(tier>=3){c.fillStyle=pal.trim;c.fillRect(px-s*0.26,py-s*0.5,s*0.52,s*0.07);}
  const fl=0.6+0.4*Math.sin(t*8);glow(c,px-s*0.27,py-s*0.36,s*0.18,'rgba(255,190,80,'+(0.5*fl)+')');c.fillStyle='rgba(255,180,60,'+fl+')';c.beginPath();c.arc(px-s*0.27,py-s*0.36,s*0.035,0,7);c.fill();
  c.strokeStyle='#4a3524';c.lineWidth=2;c.beginPath();c.moveTo(px-s*0.9,py+s*0.12);c.lineTo(px+s*0.15,py+s*0.12);c.stroke();
  for(let i=0;i<9;i++){c.beginPath();c.moveTo(px-s*0.88+i*s*0.12,py+s*0.1);c.lineTo(px-s*0.88+i*s*0.12,py+s*0.16);c.stroke();}
  const cx=px-s*0.9+Math.abs(((t*0.35)%2)-1)*s*0.9;
  c.fillStyle=pal.trim;c.fillRect(cx,py-s*0.04,s*0.26,s*0.15);c.fillStyle='#2e3338';c.beginPath();c.arc(cx+s*0.06,py+s*0.13,s*0.045,0,7);c.arc(cx+s*0.2,py+s*0.13,s*0.045,0,7);c.fill();
  c.fillStyle=gold?'#ffd166':'#aab2ba';for(let i=0;i<3;i++){c.beginPath();c.arc(cx+s*(0.06+i*0.07),py-s*0.07,s*0.04,0,7);c.fill();}
  if(gold){const gl=0.5+Math.sin(t*3)*0.5;c.fillStyle='rgba(255,209,102,'+gl+')';c.beginPath();c.arc(px-s*0.4,py-s*0.4,s*0.04,0,7);c.arc(px+s*0.45,py-s*0.25,s*0.035,0,7);c.fill();}
  if(tier>=1){const hx=px+s*0.78,hh=s*0.42;walls(c,hx,py,s*0.46,hh,pal,tier);gable(c,hx,py-hh,s*0.5,s*0.26,pal,tier);smoke(c,hx+s*0.1,py-hh-s*0.12,s,t,gold?0.5:0.1);}
  if(tier>=3)drawFlag(c,px-s*0.1,py-s*0.95,s*0.28,s*0.34,gold?'#ffd166':'#c9ced6',t);
  if(tier>=4&&gold)glow(c,px,py-s*0.5,s*1.0,'rgba(255,209,102,.3)');}

function barracks(c,px,py,s,tier,t,pal){
  c.fillStyle='rgba(150,120,80,.4)';c.beginPath();c.roundRect(px-s*0.95,py-s*0.12,s*1.9,s*0.55,s*0.1);c.fill();
  const bw=s*(0.95+0.06*tier),bh=s*(0.5+0.06*tier),bx=px-s*0.2;
  walls(c,bx,py-s*0.1,bw,bh,pal,tier);gable(c,bx,py-s*0.1-bh,bw*1.06,s*(0.36+0.04*tier),pal,tier);
  door(c,bx,py-s*0.1,bw*0.22,bh*0.65,pal,true);
  win(c,bx-bw*0.3,py-s*0.1-bh*0.55,bw*0.06,pal,t,1);win(c,bx+bw*0.3,py-s*0.1-bh*0.55,bw*0.06,pal,t,2);
  drawFlag(c,bx,py-s*0.1-bh-s*(0.36+0.04*tier),s*0.34,s*0.4,'#46a758',t);
  if(tier>=2){tower(c,bx+bw*0.62,py-s*0.1,s*0.26,s*(0.8+0.08*tier),pal,tier,t,'#46a758');}
  if(tier>=3){c.fillStyle=pal.trim;c.fillRect(bx-bw*0.5,py-s*0.1-bh*0.94,bw,s*0.04);}
  const dx=px+s*0.58;
  c.strokeStyle='#5d4126';c.lineWidth=s*0.05;c.beginPath();c.moveTo(dx,py+s*0.3);c.lineTo(dx,py-s*0.12);c.moveTo(dx-s*0.14,py);c.lineTo(dx+s*0.14,py);c.stroke();
  c.fillStyle='#c8a265';c.beginPath();c.arc(dx,py-s*0.2,s*0.065,0,7);c.fill();
  c.strokeStyle='rgba(255,255,255,.65)';c.lineWidth=2;const a=-0.6+Math.sin(t*4)*0.9;c.beginPath();c.arc(dx,py-s*0.05,s*0.2,a-0.5,a+0.5);c.stroke();
  c.strokeStyle='#5d4126';c.lineWidth=s*0.03;c.beginPath();c.moveTo(px-s*0.95,py+s*0.3);c.lineTo(px-s*0.95,py+s*0.02);c.moveTo(px-s*1.05,py+s*0.12);c.lineTo(px-s*0.78,py+s*0.12);c.stroke();
  c.strokeStyle='#d8d8de';c.lineWidth=2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(px-s*0.9+i*s*0.07,py+s*0.12);c.lineTo(px-s*0.9+i*s*0.07,py-s*0.1);c.stroke();}}

function muster(c,px,py,s,tier,t,pal){
  c.fillStyle='rgba(150,120,75,.45)';c.beginPath();c.roundRect(px-s*1.0,py-s*0.45,s*2.0,s*0.85,s*0.12);c.fill();
  c.strokeStyle='rgba(120,95,60,.5)';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(px-s*0.9,py-s*0.35+i*s*0.15);c.lineTo(px+s*0.9,py-s*0.35+i*s*0.15);c.stroke();}
  const tent=(x,wd,ht,col)=>{c.fillStyle=col;c.beginPath();c.moveTo(x-wd,py-s*0.05);c.lineTo(x,py-s*0.05-ht);c.lineTo(x+wd,py-s*0.05);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.moveTo(x,py-s*0.05-ht);c.lineTo(x+wd,py-s*0.05);c.lineTo(x+wd*0.3,py-s*0.05);c.closePath();c.fill();
    c.fillStyle='#2a1c10';c.beginPath();c.moveTo(x-wd*0.2,py-s*0.05);c.lineTo(x,py-s*0.05-ht*0.45);c.lineTo(x+wd*0.2,py-s*0.05);c.closePath();c.fill();};
  const n=2+Math.min(tier,3),cols=['#a8342f','#3f5d8a','#a8342f','#3f5d8a','#a8342f'];
  for(let i=0;i<n;i++){const x=px+(i-(n-1)/2)*s*(1.5/n)*1.15;tent(x,s*0.2,s*(0.36+0.04*(i%2)),cols[i]);}
  if(tier>=2){c.fillStyle='#e8d9a8';c.beginPath();c.moveTo(px-s*0.38,py-s*0.38);c.lineTo(px,py-s*0.95);c.lineTo(px+s*0.38,py-s*0.38);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.moveTo(px,py-s*0.95);c.lineTo(px+s*0.38,py-s*0.38);c.lineTo(px+s*0.1,py-s*0.38);c.closePath();c.fill();
    c.fillStyle=pal.trim;c.fillRect(px-s*0.38,py-s*0.4,s*0.76,s*0.06);}
  c.strokeStyle='#5d4126';c.lineWidth=s*0.06;const ph=s*(1.0+0.12*tier);c.beginPath();c.moveTo(px+s*0.8,py+s*0.1);c.lineTo(px+s*0.8,py-ph);c.stroke();
  drawFlag(c,px+s*0.8,py-ph,s*(0.5+0.06*tier),s*(0.6+0.06*tier),tier>=4?'#ffd166':'#e5484d',t);
  c.fillStyle='#8a5a33';c.beginPath();c.roundRect(px-s*0.85,py-s*0.1,s*0.3,s*0.2,4);c.fill();c.fillStyle='#e8dcc2';c.fillRect(px-s*0.8,py-s*0.12,s*0.2,s*0.05);
  const pu=(Math.sin(t*4)+1)/2;c.strokeStyle='rgba(255,209,102,'+(0.7-pu*0.6)+')';c.lineWidth=2;c.beginPath();c.arc(px-s*0.7,py-s*0.05,s*(0.2+pu*0.25),0,7);c.stroke();
  if(tier>=3)for(const dx of[-0.95,0.95])drawFlag(c,px+s*dx,py-s*0.5,s*0.22,s*0.3,'#ffd166',t);}

function hospital(c,px,py,s,tier,t,pal){
  const w=s*(1.0+0.07*tier),h=s*(0.72+0.07*tier),bx=px;
  const hp={...pal,wall:'#f3efe4',wallS:'#d8d3c4'};
  if(tier>=1){walls(c,bx-w*0.72,py,w*0.5,h*0.72,hp,tier);gable(c,bx-w*0.72,py-h*0.72,w*0.52,s*0.26,pal,tier);walls(c,bx+w*0.72,py,w*0.5,h*0.72,hp,tier);gable(c,bx+w*0.72,py-h*0.72,w*0.52,s*0.26,pal,tier);}
  walls(c,bx,py,w,h,hp,tier);
  if(tier>=3){c.fillStyle=pal.roof;c.beginPath();c.arc(bx,py-h,w*0.32,Math.PI,0);c.fill();c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.arc(bx,py-h,w*0.32,-Math.PI/2,0);c.lineTo(bx,py-h);c.fill();}
  else gable(c,bx,py-h,w*1.05,s*0.4,{...pal,roof:tier>=1?'#6f87a6':'#c9b37a',roofS:tier>=1?'#566d8a':'#a8935c'},tier);
  c.fillStyle='#d83b3b';const cy=py-h*0.62,a=s*0.34,b=s*0.1;c.fillRect(bx-a/2,cy-b/2,a,b);c.fillRect(bx-b/2,cy-a/2,b,a);
  win(c,bx-w*0.32,py-h*0.3,w*0.06,{...pal,win:'#cfe8ff'},t,1);win(c,bx+w*0.32,py-h*0.3,w*0.06,{...pal,win:'#cfe8ff'},t,2);
  door(c,bx,py,w*0.2,h*0.38,pal,true);
  drawFlag(c,bx+w*0.5,py-h-s*0.12,s*0.26,s*0.34,'#ffffff',t);
  if(tier>=2){c.fillStyle='rgba(90,160,220,.9)';c.beginPath();c.ellipse(bx+w*0.95,py+s*0.1,s*0.2,s*0.07,0,0,7);c.fill();c.fillStyle='#cfe8ff';c.fillRect(bx+w*0.95-s*0.02,py-s*0.12,s*0.04,s*0.2);
    const p=(t*0.9)%1;c.fillStyle='rgba(180,220,255,'+(1-p)+')';c.beginPath();c.arc(bx+w*0.95,py-s*0.12+p*s*0.2,s*0.025,0,7);c.fill();}
  for(let i=0;i<3;i++){c.fillStyle=['#e86a8a','#ffd166','#fff'][i];c.beginPath();c.arc(bx-w*0.62+i*s*0.12,py+s*0.12+(i%2)*s*0.04,s*0.035,0,7);c.fill();}
  if(tier>=4)glow(c,bx,py-h*0.6,s*0.9,'rgba(160,255,200,.25)');}

function wallGate(c,px,py,s,tier,t,pal){
  const w=s*(1.15+0.05*tier),h=s*(0.55+0.12*tier);
  if(tier===0){c.fillStyle='#8a5a33';for(let i=0;i<9;i++){const x=px-w/2+i*w/8;c.fillStyle=i%2?'#8a5a33':'#9c6a3d';c.beginPath();c.moveTo(x-w*0.05,py);c.lineTo(x-w*0.05,py-h*0.85);c.lineTo(x,py-h);c.lineTo(x+w*0.05,py-h*0.85);c.lineTo(x+w*0.05,py);c.closePath();c.fill();}
    c.fillStyle='#5d4126';c.fillRect(px-w*0.12,py-h*0.7,w*0.24,h*0.7);}
  else{walls(c,px,py,w,h,{...pal,wall:pal.stone},Math.max(2,tier));
    const n=7,cw=w/(n*1.6);for(let i=0;i<n;i++){c.fillStyle=pal.stone;c.fillRect(px-w/2+i*cw*1.6+cw*0.3,py-h-cw*0.9,cw,cw*0.9);}
    door(c,px,py,w*0.24,h*0.7,pal,true);
    if(tier>=2){tower(c,px-w*0.5,py,s*0.3,h*1.35,pal,tier,t,tier>=3?'#e5484d':null);tower(c,px+w*0.5,py,s*0.3,h*1.35,pal,tier,t,tier>=3?'#e5484d':null);}
    if(tier>=3){c.fillStyle='#3b3f46';for(let i=0;i<5;i++)c.fillRect(px-w*0.1+i*w*0.04,py-h*0.7,w*0.012,h*0.7);}
    if(tier>=4)for(const dx of[-0.28,0.28]){const fl=0.7+0.3*Math.sin(t*9+dx*9);glow(c,px+w*dx,py-h*0.95,s*0.2,'rgba(255,170,60,'+(0.6*fl)+')');c.fillStyle='rgba(255,170,60,'+fl+')';c.beginPath();c.arc(px+w*dx,py-h*0.95,s*0.045,0,7);c.fill();}}}

export function drawBuilding(c,type,px,py,s,level,t,opts={}){
  const tier=tierOf(level),pal=PAL[tier];
  c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(px,py+s*0.05,s*(0.85+0.04*tier),s*0.2,0,0,7);c.fill();
  c.save();
  if(type==='keep')keep(c,px,py,s,tier,t,pal);
  else if(type==='farm')farm(c,px,py,s,tier,t,pal);
  else if(type==='lumber')lumber(c,px,py,s,tier,t,pal);
  else if(type==='quarry')quarry(c,px,py,s,tier,t,pal);
  else if(type==='ironmine')mine(c,px,py,s,tier,t,pal,false);
  else if(type==='goldmine')mine(c,px,py,s,tier,t,pal,true);
  else if(type==='barracks')barracks(c,px,py,s,tier,t,pal);
  else if(type==='muster')muster(c,px,py,s,tier,t,pal);
  else if(type==='hospital')hospital(c,px,py,s,tier,t,pal);
  else if(type==='wall')wallGate(c,px,py,s,tier,t,pal);
  else{walls(c,px,py,s*0.6,s*0.4,pal,tier);gable(c,px,py-s*0.4,s*0.64,s*0.3,pal,tier);}
  if(opts.up)scaffold(c,px,py,s*1.2,s*(type==='keep'?1.6:1.0),t);
  c.restore();
  badge(c,px,py+s*0.22,s,level);}
