import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CreateProjectRequestSchema,ContentProjectSchema} from '../packages/schema/src/content.schema.ts';

const base=JSON.parse(await readFile('examples/japan-china-map.json','utf8'));
const scene=(frames)=>({...structuredClone(base.scenes[0]),startFrame:0,durationFrames:frames,
  labels:base.scenes[0].labels.map(label=>({...label,endFrame:frames}))});
const edition=(kind,seconds)=>({kind,title:`${kind} editorial plan`,durationTargetSeconds:seconds,
  output:{width:kind==='short'?1080:1920,height:kind==='short'?1920:1080,fps:30,
    format:'mp4',codec:'h264',filename:`geography_${kind}_${kind==='short'?'9x16':'16x9'}.mp4`},
  outline:[{chapterId:'chapter-1',name:'Context',goal:'Explain the source',targetSeconds:seconds}],
  script:[{segmentId:'segment-1',narration:`${kind} narration for a manual editorial review`,
    factRefs:['fact-1'],targetSeconds:seconds}],
  scenes:[scene(seconds*30)],voice:{provider:'none'},
  captions:{enabled:false,language:'en-US',formats:[]}});
const project={schemaVersion:'1.1',projectId:'manual-geography',topic:'Japan and China map depiction',
  locale:'en-US',research:{sources:[{id:'source-1',url:'https://example.org/map',title:'Map source'}],
    facts:[{id:'fact-1',statement:'The map source depicts generalized boundaries.',sourceIds:['source-1']}]},
  narrative:{thesis:'Explain the limits of the map depiction',keyPoints:['Source and scale']},
  production:{mode:'review_before_render',defaultTheme:'midnight-blue',mixStyles:['A','C','D'],seed:42},
  editions:{short:edition('short',90),long:edition('long',900)}};

test('request DTO allows research still pending, but enforces both edition settings',()=>{
  const request={schemaVersion:'1.1',projectId:'manual-geography',topic:'Japan and China',
    locale:'en-US',research:{facts:[],sources:[]},production:project.production,
    editionSettings:{short:{durationTargetSeconds:150,width:1080,height:1920,fps:30},
      long:{durationTargetSeconds:1080,width:1920,height:1080,fps:30}}};
  assert.equal(CreateProjectRequestSchema.safeParse(request).success,true);
  assert.equal(CreateProjectRequestSchema.safeParse({...request,editions:project.editions}).success,false);
  assert.equal(CreateProjectRequestSchema.safeParse({...request,editionSettings:{...request.editionSettings,
    long:{...request.editionSettings.long,durationTargetSeconds:600}}}).success,false);
});

test('normalized two-edition contract validates dimensions, timing and fact lineage',()=>{
  assert.equal(ContentProjectSchema.safeParse(project).success,true);
  const bad=mutate=>{const value=structuredClone(project);mutate(value);
    assert.equal(ContentProjectSchema.safeParse(value).success,false);};
  bad(p=>p.editions.long.output.width=1080);
  bad(p=>p.editions.long.scenes[0].durationFrames=26998);
  bad(p=>p.editions.short.script[0].factRefs=['missing']);
  bad(p=>p.research.facts[0].sourceIds=['missing']);
  bad(p=>p.editions.long.kind='short');
  bad(p=>p.editions.long.script[0].narration=p.editions.short.script[0].narration);
});
