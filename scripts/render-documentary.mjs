import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';
import {sha256Bytes} from '../packages/evidence/src/review.ts';
import {chunkPlan,atomicJson,fileHash} from './chunks.mjs';
import {runProcess} from './process.mjs';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{dir:{type:'string'},edition:{type:'string',default:'both'},
  resume:{type:'boolean',default:false},plan:{type:'boolean',default:false},
  'chunk-frames':{type:'string',default:'150'}}});
if(!values.dir||!['short','long','both'].includes(values.edition))
  throw new Error('Usage: npm run documentary:render -- --dir outputs/documentaries/id [--edition short|long|both] [--resume] [--plan]');
const dir=path.resolve(values.dir);
if(!dir.startsWith(path.join(root,'outputs')+path.sep)) throw new Error('DOCUMENTARY_DIR_OUTSIDE_OUTPUTS');
const manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'));
if(manifest.schemaVersion!=='1.0'||!manifest.editions?.short||!manifest.editions?.long)
  throw new Error('DOCUMENTARY_MANIFEST_INVALID');
for(const [key,item] of Object.entries(manifest.inputs)) {
  const file=path.resolve(root,item.path);
  if(!file.startsWith(root+path.sep)||sha256Bytes(await readFile(file))!==item.sha256)
    throw new Error(`DOCUMENTARY_INPUT_CHANGED:${key}`);
}
const dossier=EvidenceDossierSchema.parse(JSON.parse(await readFile(
  path.resolve(root,manifest.inputs.dossier.path),'utf8')));
await verifyLocalEvidence(dossier,root);
const selected=values.edition==='both'?['short','long']:[values.edition];
const chunkFrames=Number(values['chunk-frames']);
const jobs=[];
for(const kind of selected) {
  const item=manifest.editions[kind];
  if(item.project!==`${kind}.json`||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$/.test(item.output))
    throw new Error(`DOCUMENTARY_EDITION_MANIFEST_INVALID:${kind}`);
  const file=path.join(dir,item.project),bytes=await readFile(file);
  if(sha256Bytes(bytes)!==item.projectSha256)
    throw new Error(`DOCUMENTARY_PROJECT_CHANGED:${kind}`);
  const project=ProjectSchema.parse(JSON.parse(bytes.toString('utf8')));
  const currentMap=await verifyProjectAssets(project,root);
  if(currentMap.sha256!==item.assets?.map?.sha256)
    throw new Error(`DOCUMENTARY_MAP_ASSET_CHANGED:${kind}`);
  for(const asset of [item.assets?.audio?.voice,item.assets?.audio?.music,
    ...(item.assets?.audio?.sfx??[])]) if(asset) {
    const file=path.resolve(root,asset.path);
    if(!file.startsWith(root+path.sep)||await fileHash(file)!==asset.sha256)
      throw new Error(`DOCUMENTARY_AUDIO_ASSET_CHANGED:${kind}`);
  }
  const frames=project.scenes.at(-1).startFrame+project.scenes.at(-1).durationFrames;
  if(frames!==item.frames) throw new Error(`DOCUMENTARY_FRAME_MANIFEST_MISMATCH:${kind}`);
  jobs.push({kind,input:file,output:path.join(dir,item.output),frames,
    fps:project.output.fps,chunks:chunkPlan(frames,chunkFrames).length});
}
if(values.plan) {
  console.log(JSON.stringify({status:'planned',jobs:jobs.map(job=>({kind:job.kind,
    frames:job.frames,fps:job.fps,chunks:job.chunks,output:path.relative(root,job.output)}))},null,2));
  process.exit(0);
}
const statusPath=path.join(dir,'render-status.json');
let status={projectId:manifest.projectId,editions:{}};
try {status=JSON.parse(await readFile(statusPath,'utf8'));} catch(error) {if(error.code!=='ENOENT') throw error;}
for(const job of jobs) {
  const previous=status.editions[job.kind];
  if(values.resume&&previous?.status==='completed') {
    try {if(previous.sha256===await fileHash(job.output)) continue;}
    catch(error) {if(error.code!=='ENOENT') throw error;}
  }
  status.editions[job.kind]={status:'rendering',startedAt:new Date().toISOString()};
  await atomicJson(statusPath,status);
  try {
    await runProcess(process.execPath,['scripts/render-project-chunks.mjs',
      '--input',job.input,'--output',job.output,'--chunk-frames',String(chunkFrames),
      ...(values.resume?['--resume']:[])],{timeoutMs:48*3600000,maxOutputBytes:8*1024*1024,
      onStdout:chunk=>process.stdout.write(chunk)});
    status.editions[job.kind]={status:'completed',completedAt:new Date().toISOString(),
      output:path.relative(root,job.output),sha256:await fileHash(job.output),
      frames:job.frames,fps:job.fps};
  } catch(error) {
    status.editions[job.kind]={status:'failed',failedAt:new Date().toISOString(),
      error:String(error)};
    process.exitCode=1;
  }
  await atomicJson(statusPath,status);
}
const states=['short','long'].map(kind=>status.editions[kind]?.status??'pending');
status.status=states.every(item=>item==='completed')?'completed':
  states.includes('completed')?'partial_success':'failed';
await atomicJson(statusPath,status);
console.log(JSON.stringify({status:status.status,editions:status.editions},null,2));
