type Position=[number,number];

// A frame-defined visual arc in map coordinates. The bend is illustrative,
// and each prefix is computed from the frame rather than wall-clock time.
export function routePath(from:Position,to:Position,progress:number,curved=true):Position[] {
  if(!Number.isFinite(progress)) throw new Error('INVALID_ROUTE_PROGRESS');
  const p=Math.max(0,Math.min(1,progress));
  if(p===0) return [];
  const steps=64,deltaLon=((to[0]-from[0]+540)%360)-180;
  const bend=curved?Math.min(7,Math.abs(deltaLon)*0.16+Math.abs(to[1]-from[1])*0.25):0;
  const at=(t:number):Position=>[from[0]+deltaLon*t,
    from[1]+(to[1]-from[1])*t+bend*Math.sin(Math.PI*t)];
  const count=Math.floor(p*steps),points=Array.from({length:count+1},(_,i)=>at(i/steps));
  if(count<steps&&p>count/steps) points.push(at(p));
  return points;
}
