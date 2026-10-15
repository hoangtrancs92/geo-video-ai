import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {existsSync} from 'node:fs';
import {runProcess} from '../scripts/process.mjs';

test('real JPN/CHN project plans two contiguous chunks without producing output',async()=>{
  const output='outputs/chunk-plan-test.mp4';
  const raw=await runProcess(process.execPath,['scripts/render-project-chunks.mjs',
    '--input','examples/japan-china-map.json','--output',output,
    '--chunk-frames','150','--plan']);
  const plan=JSON.parse(raw);
  assert.equal(plan.status,'planned');
  assert.equal(plan.frames,300);
  assert.equal(plan.durationSeconds,10);
  assert.equal(plan.chunks,2);
  assert.deepEqual(plan.first,{id:0,start:0,count:150});
  assert.deepEqual(plan.last,{id:1,start:150,count:150});
  assert.equal(existsSync(path.resolve(output+'.work')),false);
  assert.equal(existsSync(path.resolve(output)),false);
});
