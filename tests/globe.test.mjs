import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';

const project=ProjectSchema.parse(JSON.parse(await readFile('examples/earth-globe-intro.json','utf8')));

test('globe intro uses pinned whole-world geometry and two verified country IDs',async()=>{
  assert.equal(project.map.projection,'globe');
  assert.equal(project.defaults.subtitlesEnabled,false);
  const asset=await verifyProjectAssets(project,process.cwd());
  assert.equal(asset.sourceId,'natural-earth-110m');
  const world=validateGeoJson(JSON.parse(await readFile(asset.path,'utf8')));
  assert.equal(world.features.length,177);
  assertFeatureReferences(project.scenes[0].regions,world);
});

test('globe proof rejects unsupported extruded or infographic scenes',()=>{
  const changed=structuredClone(project);
  changed.scenes[0].stylePreset='C';changed.scenes[0].variant='country-prism';
  changed.scenes[0].regions[0].extrudeMeters=500000;
  assert.equal(ProjectSchema.safeParse(changed).success,false);
});
