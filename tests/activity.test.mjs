import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {sceneHasMotion} from '../packages/motion/src/activity.ts';
const p=ProjectSchema.parse(JSON.parse(await readFile('examples/japan-china-map.json','utf8')));
test('motion gate distinguishes A pulse/C rise from deliberate static D card',()=>{
  assert.equal(sceneHasMotion(p.scenes[0]),true);
  assert.equal(sceneHasMotion(p.scenes[1]),true);
  assert.equal(sceneHasMotion(p.scenes[2]),false);
});
