import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraAtFrame,ease} from '../spike/camera.ts';
import {inspectPixels,assertMapPixels} from '../scripts/pixels.mjs';
import {commandCheck} from '../scripts/preflight.mjs';
const a={center:[179,10],zoom:3,pitch:0,bearing:170};
const b={center:[-179,20],zoom:5,pitch:50,bearing:-170};
test('camera endpoints, shortest antimeridian and bearing arcs',()=>{
  assert.deepEqual(cameraAtFrame(a,b,0,101),a);
  assert.deepEqual(cameraAtFrame(a,b,100,101),b);
  assert.deepEqual(cameraAtFrame(a,b,50,101),{center:[-180,15],zoom:4,pitch:25,bearing:-180});
});
test('out of order evaluation has no hidden state',()=>{
  const first=cameraAtFrame(a,b,25,100);
  cameraAtFrame(a,b,99,100);
  assert.deepEqual(cameraAtFrame(a,b,25,100),first);
  assert.equal(new Set(Array.from({length:100},(_,n)=>JSON.stringify(cameraAtFrame(a,b,n,100)))).size,100);
});
test('easing clamps and is monotonic',()=>{
  assert.equal(ease(-1),0);assert.equal(ease(2),1);
  for(let i=1;i<=100;i++) assert.ok(ease(i/100)>=ease((i-1)/100));
});
test('invalid frame indexes fail',()=>{
  for(const n of [-1,100,NaN,.5]) assert.throws(()=>cameraAtFrame(a,b,n,100));
});
test('pixel gate catches black map even when title and footer are white',()=>{
  const data=Buffer.alloc(100*100*4,255);
  for(let y=20;y<80;y++) for(let x=10;x<90;x++) {
    const i=(y*100+x)*4;data[i]=0;data[i+1]=0;data[i+2]=0;
  }
  assert.throws(()=>assertMapPixels(inspectPixels({data,width:100,height:100})),/BLACK_FRAME/);
});
test('nonblack background alone cannot pass map plus deck gate',()=>{
  assert.throws(()=>assertMapPixels(inspectPixels({data:Buffer.alloc(400,200),width:10,height:10})),/MISSING_MAP_OR_DECK_OVERLAY|BLACK_FRAME/);
});
test('valid distinct map and deck colors pass; truncated image rejected',()=>{
  const data=Buffer.alloc(400);
  for(let i=0;i<100;i++) data.set(i%2?[244,63,110,255]:[56,200,237,255],i*4);
  assert.doesNotThrow(()=>assertMapPixels(inspectPixels({data,width:10,height:10})));
  assert.throws(()=>inspectPixels({data:Buffer.alloc(3),width:1,height:1}));
});
test('missing executable reports failure without throwing',()=>{
  assert.equal(commandCheck('/definitely-not-installed-map-video').ok,false);
  assert.equal(commandCheck(process.execPath).ok,true);
});
