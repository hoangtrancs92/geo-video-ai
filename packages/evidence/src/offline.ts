import {createHash} from 'node:crypto';
import {readFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import type {EvidenceDossier} from './dossier.schema.ts';

export async function verifyLocalEvidence(dossier:EvidenceDossier,root:string) {
  const verified=[];
  for(const source of dossier.sources) {
    if(!source.localPath) throw new Error(`OFFLINE_SOURCE_BYTES_REQUIRED:${source.id}`);
    const file=path.resolve(root,source.localPath);
    if(!file.startsWith(path.resolve(root)+path.sep)) throw new Error(`SOURCE_OUTSIDE_ROOT:${source.id}`);
    const actualPath=await realpath(file),base=await realpath(root);
    if(!actualPath.startsWith(base+path.sep)) throw new Error(`SOURCE_SYMLINK_OUTSIDE_ROOT:${source.id}`);
    const bytes=await readFile(actualPath);
    const actual=createHash('sha256').update(bytes).digest('hex');
    if(actual!==source.rawSha256) throw new Error(`SOURCE_CHECKSUM_MISMATCH:${source.id}`);
    verified.push({id:source.id,path:source.localPath,sha256:actual,bytes:bytes.length});
  }
  return verified;
}

export function approvedFacts(dossier:EvidenceDossier) {
  return dossier.claims.filter(claim=>claim.verdict==='supported'&&claim.approval==='approved')
    .map(claim=>({id:claim.id,statement:claim.text,sourceIds:claim.sourceIds,
      ...(claim.asOf?{asOf:claim.asOf}:{})}));
}
