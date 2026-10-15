import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {applyClaimReview,sha256Bytes} from '../packages/evidence/src/review.ts';
import {editorialGate} from '../packages/editorial/src/gate.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{input:{type:'string'},review:{type:'string'},output:{type:'string'}}});
if(!values.input||!values.review||!values.output)
  throw new Error('Usage: npm run evidence:review -- --input dossier.json --review review.json --output outputs/evidence/reviewed.json');
function safe(file) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith(root+path.sep)||path.extname(absolute)!=='.json')
    throw new Error('REVIEW_PATH_OUTSIDE_ROOT_OR_NOT_JSON');
  return absolute;
}
const input=safe(values.input),reviewFile=safe(values.review),output=safe(values.output);
if(!output.startsWith(path.join(root,'outputs')+path.sep)) throw new Error('REVIEW_OUTPUT_OUTSIDE_OUTPUTS');
const inputBytes=await readFile(input);
const dossier=EvidenceDossierSchema.parse(JSON.parse(inputBytes.toString('utf8')));
await verifyLocalEvidence(dossier,root);
const review=JSON.parse(await readFile(reviewFile,'utf8'));
const updated=applyClaimReview(dossier,review,sha256Bytes(inputBytes));
await mkdir(path.dirname(output),{recursive:true});
const outputBytes=Buffer.from(JSON.stringify(updated,null,2)+'\n');
await writeFile(output,outputBytes,{flag:'wx'});
console.log(JSON.stringify({status:'review_recorded',output:path.relative(root,output),
  dossierSha256:sha256Bytes(outputBytes),decisions:review.decisions.length,
  editorialGate:editorialGate(updated)},null,2));
