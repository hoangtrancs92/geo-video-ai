import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {importObservations} from '../packages/evidence/src/import.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{data:{type:'string'},source:{type:'string'},
  output:{type:'string'},'project-id':{type:'string'}}});
if(!values.data||!values.source||!values.output||!values['project-id'])
  throw new Error('Usage: npm run evidence:import -- --data assets/data/observations.csv --source assets/data/source.json --project-id sample --output outputs/evidence/sample.json');
function safe(file) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith(root+path.sep)) throw new Error('IMPORT_PATH_OUTSIDE_ROOT');
  return absolute;
}
const data=safe(values.data),sourceFile=safe(values.source),output=safe(values.output);
if(!output.startsWith(path.join(root,'outputs')+path.sep)||path.extname(output)!=='.json')
  throw new Error('IMPORT_OUTPUT_OUTSIDE_OUTPUTS');
const source=JSON.parse(await readFile(sourceFile,'utf8'));
const dossier=importObservations({projectId:values['project-id'],source,
  sourceBytes:await readFile(data),extension:path.extname(data),sourcePath:path.relative(root,data)});
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(dossier,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'imported_pending_review',output:path.relative(root,output),
  sourceId:dossier.sources[0].id,sourceSha256:dossier.sources[0].rawSha256,
  observations:dossier.observations.length,approvedClaims:0},null,2));
