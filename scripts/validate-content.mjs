import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {CreateProjectRequestSchema,ContentProjectSchema} from '../packages/schema/src/content.schema.ts';

const {values}=parseArgs({options:{input:{type:'string',short:'i'}}});
if(!values.input) throw new Error('Usage: npm run content:validate -- --input examples/content-request.json');
const input=path.resolve(values.input),raw=JSON.parse(await readFile(input,'utf8'));
if(raw.schemaVersion!=='1.1') throw new Error('CONTENT_SCHEMA_VERSION_UNSUPPORTED');
const isProject=Object.hasOwn(raw,'editions');
const content=isProject?ContentProjectSchema.parse(raw):CreateProjectRequestSchema.parse(raw);
const result=isProject?{status:'valid-content-project',projectId:content.projectId,
  shortFrames:Math.round(content.editions.short.durationTargetSeconds*30),
  longFrames:Math.round(content.editions.long.durationTargetSeconds*30)}:
  {status:content.research?.facts.length?'request-valid-needs-editorial-plan':'needs_research',
    projectId:content.projectId,shortSeconds:content.editionSettings.short.durationTargetSeconds,
    longSeconds:content.editionSettings.long.durationTargetSeconds,
    note:'A request is not a script or a renderable content project.'};
console.log(JSON.stringify(result,null,2));
