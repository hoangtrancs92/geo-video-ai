import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {projectSrt} from '../packages/media/src/subtitles.ts';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{input:{type:'string',short:'i'},output:{type:'string',short:'o'}}});
if(!values.input||!values.output) throw new Error('Usage: npm run video:subtitles -- --input examples/style-d-variants.json --output outputs/style-d-variants.srt');
const input=path.resolve(values.input),output=path.resolve(values.output);
if(!input.startsWith(root+path.sep)||!output.startsWith(path.join(root,'outputs')+path.sep)||path.extname(output)!=='.srt')
  throw new Error('INPUT_OR_OUTPUT_OUTSIDE_WORKSPACE');
const project=ProjectSchema.parse(JSON.parse(await readFile(input,'utf8')));
await mkdir(path.dirname(output),{recursive:true});
await writeFile(output,projectSrt(project),'utf8');
console.log(JSON.stringify({status:'exported',input:path.relative(root,input),output:path.relative(root,output),
  cues:project.defaults.subtitlesEnabled?project.scenes.reduce((sum,scene)=>sum+scene.subtitles.length,0):0},null,2));
