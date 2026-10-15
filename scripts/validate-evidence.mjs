import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence,approvedFacts} from '../packages/evidence/src/offline.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{input:{type:'string',short:'i'}}});
if(!values.input) throw new Error('Usage: npm run evidence:validate -- --input examples/evidence-map-dossier.json');
const file=path.resolve(values.input);
if(!file.startsWith(root+path.sep)||path.extname(file)!=='.json') throw new Error('EVIDENCE_INPUT_OUTSIDE_ROOT');
const bytes=await readFile(file),dossier=EvidenceDossierSchema.parse(JSON.parse(bytes.toString('utf8')));
const sources=await verifyLocalEvidence(dossier,root);
console.log(JSON.stringify({status:'valid',projectId:dossier.projectId,
  snapshotSha256:createHash('sha256').update(bytes).digest('hex'),
  sources,observations:dossier.observations.length,claims:dossier.claims.length,
  approvedFacts:approvedFacts(dossier).length,gaps:dossier.gaps.length},null,2));
