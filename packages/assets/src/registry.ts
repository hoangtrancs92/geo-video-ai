import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import type {Project} from '../../schema/src/project.schema.ts';

const safePath=z.string().min(1).refine(value=>!value.startsWith('/')&&!value.includes('\\')&&
  value.split('/').every(part=>part!==''&&part!=='.'&&part!=='..'),'Unsafe asset path');
const asset=z.strictObject({path:safePath,kind:z.literal('geojson'),
  sha256:z.string().regex(/^[a-f0-9]{64}$/),sourceId:z.string().min(1),
  license:z.string().min(1),attribution:z.string().min(1),metadataPath:safePath.optional()});
const registrySchema=z.strictObject({schemaVersion:z.literal('1.0'),assets:z.array(asset).min(1)});

export async function verifyProjectAssets(project:Project,root:string) {
  if(!project.map.geojsonPath) throw new Error('GEODATA_PATH_REQUIRED');
  const registry=registrySchema.parse(JSON.parse(await readFile(path.join(root,'assets/registry.json'),'utf8')));
  if(new Set(registry.assets.map(item=>item.path)).size!==registry.assets.length)
    throw new Error('DUPLICATE_ASSET_PATH');
  const entry=registry.assets.find(item=>item.path===project.map.geojsonPath);
  if(!entry) throw new Error(`UNREGISTERED_MAP_ASSET:${project.map.geojsonPath}`);
  const bytes=await readFile(path.join(root,entry.path));
  const actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==entry.sha256) throw new Error(`ASSET_CHECKSUM_MISMATCH:${entry.path}`);
  if(entry.metadataPath) {
    const metadata=JSON.parse(await readFile(path.join(root,entry.metadataPath),'utf8'));
    if(metadata.normalizedSha256!==actual||metadata.sourceId!==entry.sourceId||metadata.license!==entry.license)
      throw new Error(`ASSET_METADATA_MISMATCH:${entry.path}`);
  }
  if(!project.map.attributionText?.trim()) throw new Error('GEODATA_ATTRIBUTION_REQUIRED');
  return {path:entry.path,sha256:actual,sourceId:entry.sourceId,license:entry.license,
    attribution:entry.attribution,metadataPath:entry.metadataPath??null};
}
