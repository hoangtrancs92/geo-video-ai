import test from 'node:test';
import assert from 'node:assert/strict';
import {routePath} from '../packages/motion/src/route.ts';

test('route reveal grows by frame progress and keeps exact endpoints',()=>{
  const from=[139.6917,35.6895],to=[116.4074,39.9042];
  assert.deepEqual(routePath(from,to,0),[]);
  const half=routePath(from,to,0.5),full=routePath(from,to,1);
  assert.deepEqual(half[0],from);
  assert.deepEqual(full[0],from);
  assert.ok(Math.abs(full.at(-1)[0]-to[0])<1e-10);
  assert.ok(Math.abs(full.at(-1)[1]-to[1])<1e-10);
  assert.ok(half.length<full.length);
  assert.ok(half.at(-1)[1]>(from[1]+to[1])/2);
  assert.deepEqual(routePath(from,to,0.5),half);
  assert.deepEqual(routePath(from,to,2),full);
  assert.throws(()=>routePath(from,to,NaN),/INVALID_ROUTE_PROGRESS/);
});
