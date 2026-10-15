import test from 'node:test';
import assert from 'node:assert/strict';
import {awaitFrame,withDeadline} from '../spike/frame-ready.ts';

function fixture(update = () => {}) {
  const listeners=new Set();
  const state={assetsReady:true,deckPasses:0};
  return {state,listeners,emit:()=>{for(const fn of [...listeners]) fn();},
    driver:{subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},
      status:()=>({...state}),update,repaint:()=>{}}};
}
test('stale deck callbacks and unloaded assets cannot complete a frame',async()=>{
  const f=fixture();let resolved=false;
  const task=awaitFrame(f.driver,4).then(()=>{resolved=true;});
  f.emit();f.emit();await Promise.resolve();assert.equal(resolved,false);
  f.state.deckPasses=1;f.emit();
  f.emit();await Promise.resolve();assert.equal(resolved,false);
  f.state.assetsReady=false;f.state.deckPasses=2;f.emit();
  f.state.assetsReady=true;f.state.deckPasses=3;f.emit();
  await Promise.resolve();assert.equal(resolved,false);
  f.state.deckPasses=4;f.emit();await task;
  assert.equal(resolved,true);assert.equal(f.listeners.size,0);
});
test('synchronous update error removes listener and cancels deadline',async()=>{
  const f=fixture(()=>{throw new Error('BAD_LAYER');});
  await assert.rejects(awaitFrame(f.driver,8),/BAD_LAYER/);
  assert.equal(f.listeners.size,0);
});
test('context loss fails the frame and removes its listener',async()=>{
  const f=fixture();const task=awaitFrame(f.driver,9);
  f.state.error='WEBGL_CONTEXT_LOST';f.emit();
  await assert.rejects(task,/WEBGL_CONTEXT_LOST/);assert.equal(f.listeners.size,0);
});
test('stalled renderer times out with frame number and cleans up',async()=>{
  const f=fixture();await assert.rejects(awaitFrame(f.driver,42,5),/FRAME_READY_TIMEOUT:42/);
  assert.equal(f.listeners.size,0);
});
test('already failed renderer never updates',async()=>{
  let updates=0;const f=fixture(()=>updates++);f.state.error='ASSET_FAILURE';
  await assert.rejects(awaitFrame(f.driver,0),/ASSET_FAILURE/);
  assert.equal(updates,0);assert.equal(f.listeners.size,0);
});
test('startup deadline covers promises that never resolve',async()=>{
  await assert.rejects(withDeadline(new Promise(()=>{}),5,'MAP_LOAD_TIMEOUT'),/MAP_LOAD_TIMEOUT/);
  assert.equal(await withDeadline(Promise.resolve(7),50,'UNEXPECTED'),7);
});
