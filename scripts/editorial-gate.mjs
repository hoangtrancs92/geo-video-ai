import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {ContentProjectSchema} from '../packages/schema/src/content.schema.ts';
import {editorialGate,assertContentMatchesDossier} from '../packages/editorial/src/gate.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{dossier:{type:'string'},content:{type:'string'}}});
if(!values.dossier) throw new Error('Usage: npm run editorial:gate -- --dossier examples/evidence-map-dossier.json [--content path.json]');
const load=async file=>{const absolute=path.resolve(file);
  if(!absolute.startsWith(root+path.sep)||path.extname(absolute)!=='.json')
    throw new Error('EDITORIAL_INPUT_OUTSIDE_ROOT');
  return JSON.parse(await readFile(absolute,'utf8'));};
const dossier=EvidenceDossierSchema.parse(await load(values.dossier));
await verifyLocalEvidence(dossier,root);
const gate=editorialGate(dossier);
if(values.content) {
  const content=ContentProjectSchema.parse(await load(values.content));
  assertContentMatchesDossier(dossier,content);
  console.log(JSON.stringify({status:'ready_for_human_review',projectId:content.projectId,
    shortScenes:content.editions.short.scenes.length,longScenes:content.editions.long.scenes.length},null,2));
} else console.log(JSON.stringify({projectId:dossier.projectId,...gate},null,2));
