// Seeded RNG + value noise for procedural terrain
export function makeRng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

export function makeNoise(seed){
  const rng=makeRng(seed);const P=256;const perm=new Uint8Array(P*2);const vals=new Float32Array(P);
  const p=[...Array(P).keys()];
  for(let i=P-1;i>0;i--){const j=(rng()*(i+1))|0;const t=p[i];p[i]=p[j];p[j]=t;}
  for(let i=0;i<P*2;i++)perm[i]=p[i&(P-1)];
  for(let i=0;i<P;i++)vals[i]=rng();
  const g=(x,y)=>vals[perm[(perm[x&255]+y)&255]];
  const sm=t=>t*t*(3-2*t);
  return(x,y)=>{
    const xi=Math.floor(x)&255,yi=Math.floor(y)&255;
    const xf=x-Math.floor(x),yf=y-Math.floor(y);
    const a=g(xi,yi),b=g(xi+1,yi),c=g(xi,yi+1),d=g(xi+1,yi+1);
    const u=sm(xf),v=sm(yf);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  };
}

export function fbm(noise,x,y,oct=4){let v=0,amp=0.5,f=1;for(let o=0;o<oct;o++){v+=noise(x*f,y*f)*amp;amp*=0.5;f*=2;}return v;}

// deterministic per-tile hash for stable decoration placement
export function hash2(x,y){const s=Math.sin(x*12.9898+y*78.233)*43758.5453;return s-Math.floor(s);}
