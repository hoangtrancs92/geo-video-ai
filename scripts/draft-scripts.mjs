import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {draftScriptBrief} from '../packages/editorial/src/draft.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{dossier:{type:'string'},output:{type:'string'}}});
if(!values.dossier) throw new Error('Usage: npm run scripts:draft -- --dossier path.json [--output outputs/brief.json]');
function safe(file,extension,base=root) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith(base+path.sep)||path.extname(absolute)!==extension)
    throw new Error('SCRIPT_PATH_OUTSIDE_ALLOWED_ROOT_OR_WRONG_EXTENSION');
  return absolute;
}
const dossier=EvidenceDossierSchema.parse(JSON.parse(await readFile(safe(values.dossier,'.json'),'utf8')));
await verifyLocalEvidence(dossier,root);
const brief=draftScriptBrief(dossier);
if(values.output) {
  const output=safe(values.output,'.json',path.join(root,'outputs'));
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(brief,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(brief,null,2));
