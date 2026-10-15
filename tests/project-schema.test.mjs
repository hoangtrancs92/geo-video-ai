import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {sceneAtFrame,totalFrames,cameraAtFrame} from '../packages/motion/src/timeline.ts';
const fixture=JSON.parse(await readFile('examples/mixed-acd.json','utf8'));
const parse=modify=>{const v=structuredClone(fixture);modify(v);return ProjectSchema.safeParse(v)};
test('mixed A-C-D fixture validates and frame lookup uses one continuous timeline',()=>{
  const p=ProjectSchema.parse(fixture);assert.equal(totalFrames(p),300);
  for(const [frame,id,local] of [[0,'a',0],[99,'a',99],[100,'c',0],[199,'c',99],[200,'d',0],[299,'d',99]]){
    const v=sceneAtFrame(p,frame);assert.equal(v.scene.id,id);assert.equal(v.sceneFrame,local);
  }
  assert.throws(()=>sceneAtFrame(p,300),/FRAME_OUTSIDE_TIMELINE/);
});
test('schema rejects unknown fields, invalid variant, coordinates, overlaps and unsafe paths',()=>{
  for(const mutate of [
    p=>p.surprise=true,p=>p.scenes[0].variant='unregistered',
    p=>p.scenes[0].variant='cinematic-duel',
    p=>p.scenes[0].variant='route-reveal',
    p=>p.scenes[0].camera.from.center=[35,200],p=>p.scenes[1].startFrame=99,
    p=>p.scenes[1].startFrame=101,p=>p.audio.voiceover='../secret.mp3',
    p=>p.map.geojsonPath='https://example.com/data.geojson',
    p=>p.scenes[0].regions[0].featureId='',
    p=>p.scenes[0].regions[0].extrudeMeters=100,
    p=>p.scenes[0].labels[0].endFrame=101,
    p=>p.scenes[1].camera.to.zoom=Infinity]) {
    assert.equal(parse(mutate).success,false);
  }
});
test('camera interpolation is frame deterministic and chooses shortest longitude arc',()=>{
  const p=ProjectSchema.parse(fixture);
  assert.deepEqual(sceneAtFrame(p,50),sceneAtFrame(p,50));
  const from={center:[179,0],zoom:1,pitch:0,bearing:170};
  const to={center:[-179,0],zoom:2,pitch:0,bearing:-170};
  const middle=cameraAtFrame(from,to,1,3,'linear');
  assert.equal(middle.center[0],-180);assert.equal(middle.bearing,-180);
});
test('music and SFX require rights and frame cues inside the project',()=>{
  const rights={license:'test-generated',attribution:'test fixture'};
  assert.equal(parse(p=>{p.audio.music='assets/music.wav'}).success,false);
  assert.equal(parse(p=>{p.audio.music='assets/music.wav';p.audio.musicRights=rights}).success,true);
  assert.equal(parse(p=>{p.audio.sfx=[{id:'hit',assetPath:'assets/hit.wav',
    startFrame:290,durationFrames:20,rights}]}).success,false);
  assert.equal(parse(p=>{p.audio.sfx=[{id:'hit',assetPath:'assets/hit.wav',
    startFrame:30,durationFrames:15,rights}]}).success,true);
  assert.equal(parse(p=>{p.audio.sfx=[{id:'hit',assetPath:'assets/hit.wav',
    startFrame:30,durationFrames:15}]}).success,false);
});
