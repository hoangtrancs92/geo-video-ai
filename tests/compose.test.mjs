import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {composeScenes} from '../packages/motion/src/compose.ts';
import {totalFrames} from '../packages/motion/src/timeline.ts';

const load=async name=>ProjectSchema.parse(JSON.parse(await readFile(`examples/${name}.json`,'utf8')));
const [a,c,d,wide]=await Promise.all(['style-a-variants','style-c-variants',
  'style-d-variants','japan-china-wide'].map(load));
const selections=[{project:a,sceneId:'focus'},{project:c,sceneId:'prism'},
  {project:d,sceneId:'editorial'}];

test('composition reindexes A/C/D scenes and keeps subtitle pause from base',()=>{
  const mixed=composeScenes(a,selections,'new-mix','New mix');
  assert.deepEqual(mixed.scenes.map(scene=>[scene.stylePreset,scene.startFrame,scene.durationFrames,scene.transitionOut]),[
    ['A',0,100,'fade'],['C',100,150,'fade'],['D',250,150,'cut']]);
  assert.equal(totalFrames(mixed),400);
  assert.equal(mixed.defaults.subtitlesEnabled,false);
  assert.equal(a.scenes[0].startFrame,0);
  assert.equal(d.scenes[1].startFrame,150);
});

test('composition rejects missing scenes and incompatible aspect ratio',()=>{
  assert.throws(()=>composeScenes(a,[{project:a,sceneId:'missing'}],'bad','Bad'),/COMPOSITION_SCENE_MISSING/);
  assert.throws(()=>composeScenes(a,[{project:wide,sceneId:wide.scenes[0].id}],'bad','Bad'),
    /COMPOSITION_INCOMPATIBLE_SOURCE/);
});
