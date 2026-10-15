import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {loadDossier,safeJson} from './workflow-actions.mjs';
import {ApprovedExcerptProvider} from '../packages/editorial/src/provider.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{dossier:{type:'string'},output:{type:'string'}}});
if(!values.dossier) throw new Error('Usage: npm run scripts:write -- --dossier path.json [--output outputs/editorial-draft.json]');
const loaded=await loadDossier(root,values.dossier);
const draft=ApprovedExcerptProvider.draft(loaded.dossier,loaded.hash);
if(values.output) {
  const output=safeJson(root,values.output,false);
  if(!output.startsWith(path.join(root,'outputs')+path.sep)) throw new Error('EDITORIAL_OUTPUT_OUTSIDE_OUTPUTS');
  await mkdir(path.dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(draft,null,2));
