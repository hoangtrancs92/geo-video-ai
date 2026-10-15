import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateGeoJson} from '../packages/geodata/src/validate.ts';
import {atomicJson} from './chunks.mjs';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const rawPath=path.join(root,'assets/geodata/source/ne_110m_admin_0_countries.geojson');
const subsetManifest=JSON.parse(await readFile(path.join(root,'assets/geodata/natural-earth-jpn-chn.manifest.json'),'utf8'));
const raw=await readFile(rawPath);
const sha=value=>createHash('sha256').update(value).digest('hex');
if(sha(raw)!==subsetManifest.rawSha256) throw new Error('WORLD_SOURCE_CHECKSUM_MISMATCH');
const source=JSON.parse(raw.toString('utf8'));
if(source.type!=='FeatureCollection'||!Array.isArray(source.features)) throw new Error('WORLD_SOURCE_INVALID');
const features=source.features.map((feature,index)=>{
  const admin=feature.properties?.ADMIN;
  const featureId=admin==='Japan'?'JPN':admin==='China'?'CHN':`NE-${String(index).padStart(3,'0')}`;
  return {type:'Feature',id:featureId,
    properties:{featureId,name:admin||featureId,sourceId:'natural-earth-110m',
      boundaryBasis:'Natural Earth de facto 110m'},geometry:feature.geometry};
});
const world=validateGeoJson({type:'FeatureCollection',features});
for(const id of ['JPN','CHN']) if(world.features.filter(feature=>feature.properties.featureId===id).length!==1)
  throw new Error(`WORLD_FEATURE_MISSING_OR_DUPLICATE:${id}`);
const bytes=Buffer.from(JSON.stringify(world)+'\n');
const output=path.join(root,'assets/geodata/natural-earth-world.geojson');
const manifestPath=path.join(root,'assets/geodata/natural-earth-world.manifest.json');
const manifest={sourceId:subsetManifest.sourceId,sourceUrl:subsetManifest.sourceUrl,
  license:subsetManifest.license,licenseUrl:subsetManifest.licenseUrl,
  sourceDescription:subsetManifest.sourceDescription,
  boundaryCaveat:subsetManifest.boundaryCaveat,retrievedAt:subsetManifest.retrievedAt,
  rawSha256:subsetManifest.rawSha256,normalizedSha256:sha(bytes),rawBytes:raw.length,
  normalizedBytes:bytes.length,featureCount:world.features.length,sourceMode:'pinned-local'};
await writeFile(output,bytes);
await atomicJson(manifestPath,manifest);
console.log(JSON.stringify({status:'imported',output:path.relative(root,output),
  manifest:path.relative(root,manifestPath),...manifest},null,2));
