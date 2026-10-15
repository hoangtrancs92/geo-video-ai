import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';

const root=process.cwd();
const project=ProjectSchema.parse(JSON.parse(await readFile('examples/japan-china-wide.json','utf8')));

test('registered Natural Earth bytes match the pinned source metadata',async()=>{
  const result=await verifyProjectAssets(project,root);
  assert.equal(result.sourceId,'natural-earth-110m');
  assert.equal(result.sha256,'558f3eda35cf13afaaa6f26d947d96b1bc26f4060654592d172714a49c6c09a1');
  assert.equal(result.license,'Public domain');
});

test('unregistered or modified map bytes fail before rendering',async()=>{
  const unknown=structuredClone(project);unknown.map.geojsonPath='assets/geodata/unlisted.geojson';
  await assert.rejects(verifyProjectAssets(unknown,root),/UNREGISTERED_MAP_ASSET/);
  const scratch=await mkdtemp(path.join(os.tmpdir(),'asset-registry-'));
  try {
    await mkdir(path.join(scratch,'assets/geodata'),{recursive:true});
    await copyFile('assets/registry.json',path.join(scratch,'assets/registry.json'));
    await writeFile(path.join(scratch,project.map.geojsonPath),'{}');
    await assert.rejects(verifyProjectAssets(project,scratch),/ASSET_CHECKSUM_MISMATCH/);
  } finally {await rm(scratch,{recursive:true,force:true});}
});
