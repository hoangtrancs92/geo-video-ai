import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {previewFrame,previewProjectPath} from '../packages/motion/src/preview.ts';

const project=ProjectSchema.parse(JSON.parse(await readFile('examples/japan-china-map.json','utf8')));

test('preview maps fade frames to the same source frames and brightness as export',()=>{
  const boundary=project.scenes[1].startFrame;
  assert.deepEqual(previewFrame(project,boundary),{
    sceneId:project.scenes[1].id,style:'C',variant:project.scenes[1].variant,
    sourceFrame:boundary-1,opacity:4/5});
  assert.equal(previewFrame(project,boundary+3).sourceFrame,boundary-1);
  assert.equal(previewFrame(project,boundary+4).sourceFrame,boundary+4);
  assert.equal(previewFrame(project,boundary+8).opacity,1);
});

test('preview accepts only local fixture or composed project JSON paths',()=>{
  assert.equal(previewProjectPath('outputs/projects/acd-composed.json'),'/outputs/projects/acd-composed.json');
  assert.equal(previewProjectPath('examples/style-d-variants.json'),'/examples/style-d-variants.json');
  for(const path of ['../secrets.json','outputs/other.json','examples/../../secret.json',
    'https://example.org/project.json','outputs/projects/name%2fsecret.json'])
    assert.throws(()=>previewProjectPath(path),/PREVIEW_PROJECT_PATH_INVALID/);
});
