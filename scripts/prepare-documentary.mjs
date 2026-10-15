import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {prepareEditions} from '../packages/orchestration/src/prepare.ts';
import {sha256Bytes} from '../packages/evidence/src/review.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {assertRenderableStyles} from '../packages/styles/src/support.ts';
import {assertSupportedTransitions} from '../packages/motion/src/transition.ts';
import {inspectAudio} from './audio.mjs';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{content:{type:'string'},dossier:{type:'string'},
  approval:{type:'string'},'short-template':{type:'string'},
  'long-template':{type:'string'},'output-dir':{type:'string'}}});
if(!values.content||!values.dossier||!values.approval||!values['short-template']||
  !values['long-template']||!values['output-dir'])
  throw new Error('Usage: npm run documentary:prepare -- --content content.json --dossier dossier.json --approval approval.json --short-template short.json --long-template long.json --output-dir outputs/documentaries/id');
function safe(file) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith(root+path.sep)||path.extname(absolute)!=='.json')
    throw new Error('DOCUMENTARY_INPUT_OUTSIDE_ROOT_OR_NOT_JSON');
  return absolute;
}
const files={content:safe(values.content),dossier:safe(values.dossier),
  approval:safe(values.approval),short:safe(values['short-template']),
  long:safe(values['long-template'])};
const outputDir=path.resolve(values['output-dir']);
if(!outputDir.startsWith(path.join(root,'outputs')+path.sep))
  throw new Error('DOCUMENTARY_OUTPUT_OUTSIDE_OUTPUTS');
const bytes=Object.fromEntries(await Promise.all(Object.entries(files).map(async([key,file])=>
  [key,await readFile(file)])));
const raw=Object.fromEntries(Object.entries(bytes).map(([key,value])=>
  [key,JSON.parse(value.toString('utf8'))]));
const hashes=Object.fromEntries(Object.entries(bytes).map(([key,value])=>[key,sha256Bytes(value)]));
const prepared=prepareEditions(raw.content,raw.dossier,raw.approval,
  {contentSha256:hashes.content,dossierSha256:hashes.dossier},
  {short:raw.short,long:raw.long});
await verifyLocalEvidence(prepared.dossier,root);
const editionAssets={};
for(const kind of ['short','long']) {
  const project=prepared.projects[kind];
  assertSupportedTransitions(project);assertRenderableStyles(project);
  const mapAsset=await verifyProjectAssets(project,root);
  if(!['local-synthetic','local-dark'].includes(project.map.styleId)||
    !project.map.geojsonPath||!project.map.attributionText)
    throw new Error(`DOCUMENTARY_MAP_TEMPLATE_NOT_RENDERABLE:${kind}`);
  const geo=validateGeoJson(JSON.parse(await readFile(path.join(root,project.map.geojsonPath),'utf8')));
  for(const scene of project.scenes) assertFeatureReferences(scene.regions,geo);
  const audio=await inspectAudio(project,root);
  const asset=item=>item?{path:path.relative(root,item.path),sha256:item.sha256,
    rights:item.rights}:null;
  editionAssets[kind]={map:mapAsset,audio:{voice:asset(audio.voice),music:asset(audio.music),
    sfx:audio.sfx.map(cue=>({...asset(cue),id:cue.id,startFrame:cue.startFrame,
      durationFrames:cue.durationFrames}))}};
}
const projectBytes={short:Buffer.from(JSON.stringify(prepared.projects.short,null,2)+'\n'),
  long:Buffer.from(JSON.stringify(prepared.projects.long,null,2)+'\n')};
const manifest={schemaVersion:'1.0',projectId:prepared.content.projectId,
  createdAt:new Date().toISOString(),
  inputs:Object.fromEntries(Object.entries(files).map(([key,file])=>
    [key,{path:path.relative(root,file),sha256:hashes[key]}])),
  scriptApproval:{reviewer:prepared.approval.reviewer,
    approvedAt:prepared.approval.approvedAt,note:prepared.approval.note},
  sources:prepared.dossier.sources.map(source=>({id:source.id,title:source.title,
    url:source.url??null,localPath:source.localPath??null,
    rawSha256:source.rawSha256,license:source.license??null,
    attribution:source.attribution??null})),
  editions:Object.fromEntries(['short','long'].map(kind=>[kind,{
    project:`${kind}.json`,projectSha256:sha256Bytes(projectBytes[kind]),
    output:prepared.content.editions[kind].output.filename,
    assets:editionAssets[kind],
    frames:prepared.projects[kind].scenes.at(-1).startFrame+
      prepared.projects[kind].scenes.at(-1).durationFrames,
    styles:[...new Set(prepared.projects[kind].scenes.map(scene=>scene.stylePreset))]
  }]))};
await mkdir(path.dirname(outputDir),{recursive:true});
await mkdir(outputDir);
await Promise.all(['short','long'].map(kind=>writeFile(path.join(outputDir,`${kind}.json`),projectBytes[kind],{flag:'wx'})));
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'prepared_for_render',outputDir:path.relative(root,outputDir),
  editions:manifest.editions},null,2));
