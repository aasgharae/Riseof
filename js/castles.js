// Custom castle drawing used both on the world map and inside the castle view.
// All shapes are hand-drawn with canvas paths — no emoji, no stock images.

export function drawFlag(c, x, y, w, h, color, t){
  // wavy banner on a pole
  c.strokeStyle='#3b2b20'; c.lineWidth=Math.max(1.5,w*0.12);
  c.beginPath(); c.moveTo(x,y-h); c.lineTo(x,y); c.stroke();
  c.fillStyle=color;
  c.beginPath();
  const ph=h*0.62, pw=w*1.05;
  c.moveTo(x, y-h);
  for(let i=0;i<=6;i++){
    const u=i/6;
    c.lineTo(x+u*pw, y-h+Math.sin(t*3+u*4)*h*0.06 + u*ph*0.12);
  }
  for(let i=6;i>=0;i--){
    const u=i/6;
    c.lineTo(x+u*pw, y-h+ph+Math.sin(t*3+u*4+1)*h*0.06);
  }
  c.closePath(); c.fill();
  // darker edge
  c.fillStyle='rgba(0,0,0,.18)';
  c.beginPath();
  c.moveTo(x+pw*0.55, y-h);
  c.lineTo(x+pw, y-h+ph);
  c.lineTo(x+pw*0.55, y-h+ph);
  c.closePath(); c.fill();
}

export function drawTower(c, x, y, s, opts={}){
  const bodyW=s, bodyH=s*1.5, roof=s*0.9;
  c.fillStyle='rgba(0,0,0,.25)';
  c.beginPath(); c.ellipse(x, y+2, s*0.55, s*0.2, 0, 0, 7); c.fill();
  c.fillStyle=opts.body||'#8d8578';
  c.fillRect(x-s/2, y-bodyH, s, bodyH);
  c.fillStyle=opts.shade||'rgba(0,0,0,.18)';
  c.fillRect(x+s*0.15, y-bodyH, s*0.35, bodyH);
  c.strokeStyle='rgba(0,0,0,.12)'; c.lineWidth=1;
  for(let i=1;i<4;i++){c.beginPath();c.moveTo(x-s/2, y-bodyH*i/4);c.lineTo(x+s/2, y-bodyH*i/4);c.stroke();}
  const cw=s/4.5;
  for(let i=0;i<4;i++){c.fillStyle=opts.body||'#8d8578';c.fillRect(x-s/2+i*cw*1.35, y-bodyH-cw, cw, cw);}
  if(opts.roof!==false){
    c.fillStyle=opts.roofColor||'#a03a3a';
    c.beginPath(); c.moveTo(x-s*0.62, y-bodyH);
    c.lineTo(x, y-bodyH-roof); c.lineTo(x+s*0.62, y-bodyH); c.closePath(); c.fill();
    c.fillStyle='rgba(0,0,0,.15)';
    c.beginPath(); c.moveTo(x, y-bodyH-roof); c.lineTo(x+s*0.62, y-bodyH); c.lineTo(x+s*0.1, y-bodyH); c.closePath(); c.fill();
  }
  c.fillStyle='#2a2118';
  c.beginPath(); c.roundRect(x-s*0.12, y-bodyH*0.6, s*0.24, s*0.34, s*0.12); c.fill();
}

// level shield badge above the castle (سطح قلعه)
function drawLevelBadge(c, x, y, s, level){
  if(!level)return;
  const w=s*0.9, h=s*0.42;
  c.fillStyle='rgba(15,20,30,.85)';
  c.beginPath(); c.roundRect(x-w/2, y-h, w, h, h*0.3); c.fill();
  c.strokeStyle='#ffd166'; c.lineWidth=Math.max(1,s*0.03); c.stroke();
  c.fillStyle='#ffd166';
  c.font=`bold ${Math.max(9,s*0.26)}px Vazirmatn, sans-serif`;
  c.textAlign='center'; c.textBaseline='middle';
  c.fillText('Lv '+level, x, y-h/2+1);
  c.textBaseline='alphabetic';
}

export function drawCastle(c, x, y, s, color, t, power=0, level=0, skin=null){
  const w=s, h=s*0.62;
  c.fillStyle='rgba(0,0,0,.3)';
  c.beginPath(); c.ellipse(x, y+h*0.12, s*0.72, s*0.2, 0, 0, 7); c.fill();

  // curtain wall
  const wallH=h*0.55;
  c.fillStyle=skin?.wall||'#9a9284';
  c.fillRect(x-w*0.55, y-wallH, w*1.1, wallH);
  c.fillStyle='rgba(0,0,0,.15)';
  c.fillRect(x+w*0.1, y-wallH, w*0.45, wallH);
  const cw=w*0.09;
  for(let i=0;i<6;i++){c.fillStyle=skin?.wall||'#9a9284';c.fillRect(x-w*0.55+i*cw*1.5, y-wallH-cw*0.8, cw, cw*0.8);}
  // gate
  c.fillStyle='#4a3524';
  c.beginPath();
  c.moveTo(x-w*0.16, y); c.lineTo(x-w*0.16, y-wallH*0.55);
  c.arc(x, y-wallH*0.55, w*0.16, Math.PI, 0);
  c.lineTo(x+w*0.16, y); c.closePath(); c.fill();
  c.strokeStyle='#2b1f14'; c.lineWidth=1;
  for(let i=1;i<4;i++){c.beginPath();c.moveTo(x-w*0.16+i*w*0.08, y);c.lineTo(x-w*0.16+i*w*0.08, y-wallH*0.55);c.stroke();}

  // main keep
  const kw=s*0.5, kh=h*1.15;
  c.fillStyle=skin?.keep||'#a89f90';
  c.fillRect(x-kw/2, y-kh-wallH*0.35, kw, kh);
  c.fillStyle='rgba(0,0,0,.12)';
  c.fillRect(x+kw*0.12, y-kh-wallH*0.35, kw*0.38, kh);
  for(let i=0;i<3;i++){c.fillStyle=skin?.keep||'#a89f90';c.fillRect(x-kw/2+i*kw*0.4, y-kh-wallH*0.35-kw*0.16, kw*0.22, kw*0.16);}

  // corner towers with faction-colored roofs
  drawTower(c, x-w*0.55, y-wallH*0.55, s*0.28, {body:skin?.wall,shade:skin?.shade,roofColor:color});
  drawTower(c, x+w*0.55, y-wallH*0.55, s*0.28, {body:skin?.wall,shade:skin?.shade,roofColor:color});

  // flag on keep
  drawFlag(c, x, y-kh-wallH*0.35-kw*0.16, s*0.5, s*0.55, color, t);

  // level badge above the flag area
  drawLevelBadge(c, x, y-kh-wallH*0.35-kw*0.16-s*0.6, s, level);

  // power badge below
  if(power>0){
    c.fillStyle='rgba(0,0,0,.65)';
    c.beginPath(); c.roundRect(x-s*0.75, y+s*0.16, s*1.5, s*0.34, s*0.15); c.fill();
    c.fillStyle='#ffd166'; c.font=`bold ${Math.max(10,s*0.26)}px Vazirmatn, sans-serif`;
    c.textAlign='center'; c.textBaseline='middle';
    c.fillText('⚔'+power, x, y+s*0.33);
    c.textBaseline='alphabetic';
  }
}

export function drawTree(c, x, y, s, kind, t){
  if(kind===0){
    c.fillStyle='#5d4037'; c.fillRect(x-s*0.08, y-s*0.3, s*0.16, s*0.3);
    c.fillStyle='#2e5d34';
    for(let i=0;i<3;i++){
      const yy=y-s*0.3-i*s*0.22, ww=s*(0.5-i*0.11);
      c.beginPath(); c.moveTo(x-ww, yy); c.lineTo(x, yy-s*0.34); c.lineTo(x+ww, yy); c.closePath(); c.fill();
    }
  }else{
    c.fillStyle='#5d4037'; c.fillRect(x-s*0.07, y-s*0.25, s*0.14, s*0.25);
    c.fillStyle='#3b6e3f';
    c.beginPath(); c.arc(x, y-s*0.42, s*0.34, 0, 7); c.fill();
    c.fillStyle='#4f8a50';
    c.beginPath(); c.arc(x-s*0.12, y-s*0.5, s*0.2, 0, 7); c.fill();
  }
}
