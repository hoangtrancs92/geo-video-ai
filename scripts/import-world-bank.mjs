import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {normalizeWorldBank,worldBankUrl} from '../packages/evidence/src/world-bank.ts';
import {fetchWorldBankCached} from '../packages/evidence/src/world-bank-cache.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{request:{type:'string'},raw:{type:'string'},
  'raw-input':{type:'string'},output:{type:'string'}}});
if(!values.request||!values.output||Boolean(values.raw)===Boolean(values['raw-input']))
  throw new Error('Usage: npm run evidence:worldbank -- --request request.json (--raw outputs/evidence/raw.json | --raw-input existing-raw.json) --output outputs/evidence/dossier.json');
function safe(file,output=false) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith((output?path.join(root,'outputs'):root)+path.sep)||
    path.extname(absolute)!=='.json') throw new Error('WORLD_BANK_UNSAFE_PATH');
  return absolute;
}
const requestFile=safe(values.request),rawFile=safe(values.raw??values['raw-input'],Boolean(values.raw)),
  output=safe(values.output,true);
if(rawFile===output) throw new Error('WORLD_BANK_RAW_OUTPUT_COLLISION');
const request=JSON.parse(await readFile(requestFile,'utf8'));
const fetched=values.raw?await fetchWorldBankCached(request,root):null;
const bytes=fetched?.bytes??await readFile(rawFile);
if(bytes.byteLength>5_000_000) throw new Error('WORLD_BANK_RESPONSE_TOO_LARGE');
const url=fetched?.url??worldBankUrl(request);
const dossier=normalizeWorldBank(request,bytes,{rawPath:path.relative(root,rawFile),
  retrievedAt:fetched?.retrievedAt??new Date().toISOString(),
  provenanceKind:values.raw?'official_api':'uploaded_file'});
if(values.raw) await mkdir(path.dirname(rawFile),{recursive:true});
await mkdir(path.dirname(output),{recursive:true});
if(values.raw) await writeFile(rawFile,bytes,{flag:'wx'});
await writeFile(output,JSON.stringify(dossier,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'imported_pending_review',url,
  retrievalMode:fetched?.mode??'offline_raw_input',
  output:path.relative(root,output),rawPath:path.relative(root,rawFile),
  observations:dossier.observations.length,rawSha256:dossier.sources[0].rawSha256},null,2));
