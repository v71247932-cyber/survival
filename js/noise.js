// js/noise.js — Simple Perlin Noise 2D
export function createNoise() {
  const src = Array.from({length:256},(_,i)=>i);
  let s = 1337;
  for (let i=255;i>0;i--) {
    s=(s*16807)%2147483647;
    const j=s%(i+1);
    [src[i],src[j]]=[src[j],src[i]];
  }
  const p = new Uint8Array(512);
  for (let i=0;i<512;i++) p[i]=src[i&255];

  const fade = t=>t*t*t*(t*(t*6-15)+10);
  const lerp = (a,b,t)=>a+t*(b-a);
  const grad = (h,x,y) => {
    switch(h&3){case 0:return x+y;case 1:return -x+y;case 2:return x-y;default:return -x-y;}
  };
  return {
    noise2D(x,y) {
      const X=Math.floor(x)&255, Y=Math.floor(y)&255;
      x-=Math.floor(x); y-=Math.floor(y);
      const u=fade(x), v=fade(y);
      const a=p[X]+Y, b=p[X+1]+Y;
      return lerp(
        lerp(grad(p[a],x,y),grad(p[b],x-1,y),u),
        lerp(grad(p[a+1],x,y-1),grad(p[b+1],x-1,y-1),u),v
      );
    },
    octave(x,y,octs=4,persist=0.5,lac=2) {
      let val=0,amp=1,freq=1,max=0;
      for(let i=0;i<octs;i++){val+=this.noise2D(x*freq,y*freq)*amp;max+=amp;amp*=persist;freq*=lac;}
      return val/max;
    }
  };
}
