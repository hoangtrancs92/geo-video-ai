import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {subtitleAtSceneFrame,projectSrt} from '../packages/media/src/subtitles.ts';

const source=JSON.parse(await readFile('examples/style-d-variants.json','utf8'));
const project=ProjectSchema.parse(source);

test('manual subtitle uses half-open scene frames and exports exact project timecodes',()=>{
  const scene=project.scenes[1];
  assert.equal(subtitleAtSceneFrame(scene,19),null);
  assert.equal(subtitleAtSceneFrame(scene,20),'Generalized boundaries need editorial review.');
  assert.equal(subtitleAtSceneFrame(scene,129),'Generalized boundaries need editorial review.');
  assert.equal(subtitleAtSceneFrame(scene,130),null);
  assert.equal(project.defaults.subtitlesEnabled,false);
  assert.equal(projectSrt(project),'');
  const enabled=structuredClone(project);enabled.defaults.subtitlesEnabled=true;
  assert.equal(projectSrt(enabled),'1\n00:00:05,667 --> 00:00:09,333\nGeneralized boundaries need editorial review.\n');
});

test('subtitle schema rejects overlap, out-of-scene timing and excessive lines',()=>{
  for(const mutate of [
    value=>value.scenes[1].subtitles.push({text:'Next line',startFrame:129,endFrame:140}),
    value=>value.scenes[1].subtitles[0].endFrame=151,
    value=>value.scenes[1].subtitles[0].text='one\ntwo\nthree',
    value=>value.scenes[1].subtitles[0].text='x'.repeat(71)]) {
    const candidate=structuredClone(source);mutate(candidate);
    assert.equal(ProjectSchema.safeParse(candidate).success,false);
  }
});
