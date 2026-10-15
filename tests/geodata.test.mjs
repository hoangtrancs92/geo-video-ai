import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
test('local fixture geometry and scene feature IDs resolve',async()=>{
  const project=ProjectSchema.parse(JSON.parse(await readFile('examples/mixed-acd.json','utf8')));
  const geo=validateGeoJson(JSON.parse(await readFile(project.map.geojsonPath,'utf8')));
  for(const scene of project.scenes) assert.doesNotThrow(()=>assertFeatureReferences(scene.regions,geo));
  assert.throws(()=>assertFeatureReferences([{featureId:'JPN'}],geo),/UNKNOWN_FEATURE_ID/);
});
test('rejects malformed geometry and duplicate IDs',async()=>{
  const geo=JSON.parse(await readFile('assets/geodata/synthetic-regions.geojson','utf8'));
  geo.features[0].geometry.coordinates[0].at(-1)[0]=123.5;
  assert.throws(()=>validateGeoJson(geo),/INVALID_GEOMETRY/);
  geo.features[0].geometry.coordinates[0].at(-1)[0]=123;
  geo.features[1].properties.featureId='DEMO-1';
  assert.throws(()=>validateGeoJson(geo),/INVALID_OR_DUPLICATE_FEATURE_ID/);
});
