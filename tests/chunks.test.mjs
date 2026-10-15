import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {chunkPlan,reusableChunk,fileHash,atomicJson,assertVideo,treeBytes} from '../scripts/chunks.mjs';
import {spikeState} from '../spike/state.ts';

test('chunk plan covers all frames exactly once including remainder',()=>{
  const plan=chunkPlan(9010,150);assert.equal(plan.length,61);assert.equal(plan.at(-1).count,10);
  assert.deepEqual(plan.flatMap(c=>Array.from({length:c.count},(_,i)=>c.start+i)),Array.from({length:9010},(_,i)=>i));
  for(const [total,size] of [[0,1],[36001,1],[100,0],[100,301],[NaN,1]]) assert.throws(()=>chunkPlan(total,size));
});
test('scale state is independent of chunk boundaries and remains continuous at turnaround',()=>{
  const state=spikeState(150,'scale');spikeState(10000,'scale');assert.deepEqual(spikeState(150,'scale'),state);
  assert.deepEqual(spikeState(598,'scale'),spikeState(600,'scale'));
  assert.ok(Math.abs(spikeState(599,'scale').camera.zoom-spikeState(600,'scale').camera.zoom)<.001);
  assert.throws(()=>spikeState(-1,'scale'));
});
test('resume trusts only matching identity, verified record and actual checksum',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'map-chunk-test-'));
  try {
    const chunk={id:0,start:0,count:100}, file=path.join(dir,'00000.mp4');
    assert.equal(await reusableChunk(dir,chunk,'id'),false);
    // Storage fixture only: does not claim to be a render/video test.
    await writeFile(file,'storage-test-bytes');
    const record={identity:'id',...chunk,status:'verified',sha256:await fileHash(file)};
    await atomicJson(path.join(dir,'00000.json'),record);
    assert.deepEqual(await reusableChunk(dir,chunk,'id'),record);
    assert.equal(await reusableChunk(dir,chunk,'different-build'),false);
    assert.equal(await reusableChunk(dir,{...chunk,count:99},'id'),false);
    await writeFile(file,'corrupt');assert.equal(await reusableChunk(dir,chunk,'id'),false);
    assert.ok(await treeBytes(dir)>0);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test('video QA rejects wrong codec, duration, resolution and frame count',()=>{
  const stream={codec_type:'video',codec_name:'h264',width:1080,height:1920,pix_fmt:'yuv420p',r_frame_rate:'30/1',nb_read_frames:'150',duration:'5'};
  const expected={frames:150,width:1080,height:1920};
  assert.doesNotThrow(()=>assertVideo({streams:[stream]},expected));
  for(const change of [{duration:'4'},{duration:'N/A'},{nb_read_frames:'149'},{codec_name:'vp9'},{width:1920}])
    assert.throws(()=>assertVideo({streams:[{...stream,...change}]},expected),/VIDEO_QA_FAILED/);
});
