import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {assertRenderableStyles} from '../packages/styles/src/support.ts';

const base=ProjectSchema.parse(JSON.parse(await readFile('examples/japan-china-map.json','utf8')));
test('renderer accepts implemented styles and rejects schema-reserved variants',()=>{
  assert.doesNotThrow(()=>assertRenderableStyles(base));
  for(const [index,variant] of [[1,'floating-islands'],
    [2,'timeline-panel']]) {
    const project=structuredClone(base);project.scenes[index].variant=variant;
    assert.doesNotThrow(()=>ProjectSchema.parse(project));
    assert.throws(()=>assertRenderableStyles(project),/STYLE_VARIANT_NOT_IMPLEMENTED/);
  }
});
test('editorial card requires one sourced card',()=>{
  const project=structuredClone(base);project.scenes[2].variant='editorial-card';
  assert.doesNotThrow(()=>assertRenderableStyles(ProjectSchema.parse(project)));
  project.scenes[2].cards=[];
  assert.equal(ProjectSchema.safeParse(project).success,false);
});
test('height comparison requires two explicitly extruded regions',()=>{
  const project=structuredClone(base);project.scenes[1].variant='comparison-heights';
  assert.equal(ProjectSchema.safeParse(project).success,false);
  project.scenes[1].regions.push({featureId:'JPN',fill:'#F43F6E',effect:'rise',extrudeMeters:250000});
  assert.doesNotThrow(()=>assertRenderableStyles(ProjectSchema.parse(project)));
});
