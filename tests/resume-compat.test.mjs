import test from 'node:test';
import assert from 'node:assert/strict';
import {fileHash,objectHash} from '../scripts/chunks.mjs';
import {resumeIdentity} from '../scripts/resume-compat.mjs';

test('existing benchmark can resume after only the mkdir maintenance fix',async()=>{
  const prior={chromium:'pinned',total:9000,sources:{'scripts/scale-spike.mjs':'44b4bd8f8ed268b57cc8e2dd035c4de929b68f649d6d99eca1d3b7f5217324e1','spike/main.ts':'stable','scripts/browser-options.mjs':'stable'}};
  const current=structuredClone(prior);
  current.sources['scripts/scale-spike.mjs']=await fileHash('scripts/scale-spike.mjs');
  const result=resumeIdentity(prior,current,true);
  assert.equal(result.compatiblePatch,true);
  assert.equal(result.identity,objectHash(prior));
  assert.throws(()=>resumeIdentity(prior,current,false),/RESUME_REQUIRED/);
  for(const mutate of [c=>c.chromium='different',c=>c.total=300,c=>c.sources['spike/main.ts']='different',
    c=>c.sources['scripts/browser-options.mjs']='different']) {
    const changed=structuredClone(current);mutate(changed);
    assert.throws(()=>resumeIdentity(prior,changed,true),/RESUME_CONFIG_MISMATCH/);
  }
});
