import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {composeScenes} from '../packages/motion/src/compose.ts';
import {totalFrames} from '../packages/motion/src/timeline.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{base:{type:'string'},scenes:{type:'string'},
  output:{type:'string',short:'o'},id:{type:'string'},title:{type:'string'}}});
if(!values.base||!values.scenes||!values.output||!values.id||!values.title)
  throw new Error('Usage: npm run video:compose -- --base examples/style-a-variants.json --scenes examples/style-a-variants.json#focus,examples/style-c-variants.json#prism,examples/style-d-variants.json#editorial --id my-mix --title "My mix" --output outputs/projects/my-mix.json');
const inside=file=>{const resolved=path.resolve(file);
  if(!resolved.startsWith(root+path.sep)||path.extname(resolved)!=='.json')
    throw new Error('COMPOSITION_PATH_OUTSIDE_WORKSPACE');
  return resolved;};
const load=async file=>ProjectSchema.parse(JSON.parse(await readFile(inside(file),'utf8')));
const output=inside(values.output);
if(!output.startsWith(path.join(root,'outputs')+path.sep)) throw new Error('COMPOSITION_OUTPUT_OUTSIDE_OUTPUTS');
const base=await load(values.base),parts=values.scenes.split(',');
if(parts.length>1000) throw new Error('COMPOSITION_TOO_MANY_SCENES');
const selections=[];
for(const part of parts) {
  const separator=part.lastIndexOf('#');
  if(separator<1||separator===part.length-1) throw new Error(`COMPOSITION_BAD_SELECTION:${part}`);
  selections.push({project:await load(part.slice(0,separator)),sceneId:part.slice(separator+1)});
}
const project=composeScenes(base,selections,values.id,values.title);
await verifyProjectAssets(project,root);
if(!project.map.geojsonPath) throw new Error('COMPOSITION_GEODATA_REQUIRED');
const geo=validateGeoJson(JSON.parse(await readFile(path.join(root,project.map.geojsonPath),'utf8')));
for(const scene of project.scenes) assertFeatureReferences(scene.regions,geo);
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(project,null,2)+'\n',{encoding:'utf8',flag:'wx'});
console.log(JSON.stringify({status:'composed',output:path.relative(root,output),
  projectId:project.projectId,scenes:project.scenes.map(scene=>({id:scene.id,
    style:scene.stylePreset,variant:scene.variant,startFrame:scene.startFrame,durationFrames:scene.durationFrames})),
  frames:totalFrames(project),subtitlesEnabled:project.defaults.subtitlesEnabled},null,2));
