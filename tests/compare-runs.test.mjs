import test from 'node:test';
import assert from 'node:assert/strict';
import {compareReports} from '../scripts/compare-runs.mjs';
import {objectHash} from '../scripts/chunks.mjs';
function evidence() {
  const frames=Array.from({length:100},(_,frame)=>({frame,hash:objectHash(frame),validated:true}));
  const config={sources:{scene:'pinned-fixture'},chromium:'pinned'};
  return {status:'capture-passed',frames,chromium:'pinned',webgl:{renderer:'software',supported:true},
    sha256:objectHash('video'),config,identity:objectHash(config),
    sentinels:[0,25,50,75,99].map(frame=>({frame,match:true,hash:frames[frame].hash})),
    video:{streams:[{codec_type:'video',codec_name:'h264',width:1080,height:1920,
      pix_fmt:'yuv420p',r_frame_rate:'30/1',nb_read_frames:'100',duration:'3.333333'}]}};
}
test('full repeat comparison reports exact differing frames',()=>{
  const a=evidence(),b=structuredClone(a);
  assert.equal(compareReports(a,b).status,'pixel-identical');
  assert.equal(compareReports(a,b).buildMatch,true);
  b.frames[73].hash=objectHash('different');assert.deepEqual(compareReports(a,b).mismatches,[73]);
  assert.throws(()=>compareReports(a,{...b,status:'failed'}),/TWO_SUCCESSFUL/);
});
test('missing hashes, validation, sentinels and corrupt metadata cannot pass comparison',()=>{
  const a=evidence();
  for(const mutate of [b=>delete b.frames[3].hash,b=>delete b.sha256,b=>delete b.frames[3].validated,
    b=>b.sentinels.pop(),b=>b.sentinels[0].hash=objectHash('wrong'),
    b=>b.video.streams[0].duration='2',b=>b.config.sources.scene='modified',
    b=>b.frames.forEach(f=>f.hash=objectHash('frozen'))]) {
    const b=structuredClone(a);mutate(b);assert.throws(()=>compareReports(a,b));
  }
  assert.throws(()=>compareReports(a,{status:'capture-passed'}),/TWO_SUCCESSFUL/);
});
test('legacy reports remain comparable but cannot certify matching builds',()=>{
  const a=evidence(),b=evidence();delete a.config;delete a.identity;
  assert.equal(compareReports(a,b).buildMatch,false);
  delete a.chromium;delete b.chromium;
  assert.equal(compareReports(a,b).environmentMatch,false);
});
test('same browser and pixels do not certify changed source inputs',()=>{
  const a=evidence(),b=evidence();b.config.sources.scene='other';b.identity=objectHash(b.config);
  const result=compareReports(a,b);
  assert.equal(result.status,'pixel-identical');assert.equal(result.environmentMatch,true);
  assert.equal(result.buildMatch,false);
});
