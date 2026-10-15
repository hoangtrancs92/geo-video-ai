import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {prepareEditions} from '../packages/orchestration/src/prepare.ts';
import {assertEditorialSubstance} from '../packages/editorial/src/substance.ts';
import {sha256Bytes} from '../packages/evidence/src/review.ts';
import {runProcess} from '../scripts/process.mjs';

const dossier=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
dossier.gaps=[];
const baseSource=dossier.sources[0],baseClaim=dossier.claims[0];
dossier.sources=Array.from({length:3},(_,index)=>({...baseSource,
  id:index===0?baseSource.id:`synthetic-source-${index}`}));
dossier.claims=Array.from({length:20},(_,index)=>({...baseClaim,
  id:index===0?baseClaim.id:`synthetic-claim-${index}`,
  text:`Synthetic fixture statement ${String.fromCharCode(65+index)}`,
  sourceIds:[dossier.sources[index%3].id],approval:'approved'}));
const shortTemplate=JSON.parse(await readFile('examples/japan-china-map.json','utf8'));
const longTemplate=JSON.parse(await readFile('examples/japan-china-wide.json','utf8'));
const scene=(template,frames,startFrame,index)=>{
  const item=structuredClone(template.scenes[0]);
  item.id=`scene-${index}`;item.startFrame=startFrame;item.durationFrames=frames;
  item.labels=item.labels.map(label=>({...label,endFrame:Math.min(label.endFrame,frames)}));
  return item;
};
const narration=(kind,index,count)=>Array.from({length:count},(_,word)=>
  `sample${String.fromCharCode(97+(word+index)%26)}`).join(' ');
const edition=(kind,seconds,template)=>({kind,title:`${kind} manually reviewed plan`,
  durationTargetSeconds:seconds,
  output:{width:kind==='short'?1080:1920,height:kind==='short'?1920:1080,
    fps:30,format:'mp4',codec:'h264',filename:`reviewed_${kind}_${kind==='short'?'9x16':'16x9'}.mp4`},
  outline:(kind==='short'?[seconds]:[300,300,300]).map((duration,index)=>({
    chapterId:`chapter-${index}`,name:`Source context ${index}`,goal:'Explain evidence',targetSeconds:duration})),
  script:Array.from({length:kind==='short'?2:10},(_,index)=>({
    segmentId:`segment-${index}`,narration:narration(kind,index,kind==='short'?70:140),
    factRefs:[dossier.claims[index].id],targetSeconds:kind==='short'?45:90})),
  scenes:Array.from({length:kind==='short'?2:10},(_,index)=>scene(template,
    (kind==='short'?45:90)*30,index*(kind==='short'?45:90)*30,index)),
  voice:{provider:'none'},
  captions:{enabled:false,language:'en-US',formats:[]}});
const content={schemaVersion:'1.1',projectId:dossier.projectId,
  topic:'Limits of the generalized map',locale:'en-US',
  research:{sources:dossier.sources.map(source=>({id:source.id,url:source.url,fileRef:source.localPath,
    title:source.title,license:source.license,retrievedAt:source.retrievedAt})),
    facts:dossier.claims.map(claim=>({id:claim.id,statement:claim.text,
      sourceIds:claim.sourceIds}))},
  narrative:{thesis:'Explain the map source',keyPoints:['Scale and limits']},
  production:{mode:'review_before_render',defaultTheme:'midnight-blue',
    mixStyles:['A','C','D'],seed:42},
  editions:{short:edition('short',90,shortTemplate),long:edition('long',900,longTemplate)}};
const hashes={contentSha256:'a'.repeat(64),dossierSha256:'b'.repeat(64)};
const approval={projectId:content.projectId,...hashes,reviewer:'Editor A',
  approvedAt:'2026-10-15T00:00:00.000Z',note:'Reviewed script and cited map source.'};
const templates={short:shortTemplate,long:longTemplate};

test('approved content prepares independent short and long render projects',()=>{
  const prepared=prepareEditions(content,dossier,approval,hashes,templates);
  assert.equal(prepared.projects.short.output.width,1080);
  assert.equal(prepared.projects.long.output.width,1920);
  assert.equal(prepared.projects.short.scenes.at(-1).startFrame+prepared.projects.short.scenes.at(-1).durationFrames,2700);
  assert.equal(prepared.projects.long.scenes.at(-1).startFrame+prepared.projects.long.scenes.at(-1).durationFrames,27000);
  assert.equal(prepared.projects.short.audio.voiceover,null);
  assert.equal(prepared.projects.long.defaults.subtitlesEnabled,false);
});

test('preparation rejects thin evidence, narration pacing and citation coverage',()=>{
  const few=structuredClone(dossier);few.claims=few.claims.slice(0,1);
  assert.throws(()=>assertEditorialSubstance(content,few),
    /EDITORIAL_APPROVED_CLAIMS_TOO_FEW/);
  const sparse=structuredClone(content);sparse.editions.short.script[0].narration='Too brief';
  assert.throws(()=>prepareEditions(sparse,dossier,approval,hashes,templates),
    /EDITORIAL_SEGMENT_PACING:short/);
  const uncited=structuredClone(content);
  uncited.editions.long.script.forEach(item=>{item.factRefs=[];});
  assert.throws(()=>prepareEditions(uncited,dossier,approval,hashes,templates),
    /EDITORIAL_EDITION_TOO_THIN:long/);
});

test('stale script approval, changed source metadata and unavailable voice block preparation',()=>{
  assert.throws(()=>prepareEditions(content,dossier,{...approval,contentSha256:'c'.repeat(64)},
    hashes,templates),/SCRIPT_APPROVAL_STALE/);
  const altered=structuredClone(content);altered.research.sources[0].title='Different title';
  assert.throws(()=>prepareEditions(altered,dossier,approval,hashes,templates),
    /CONTENT_SOURCE_SET_MISMATCH/);
  const external=structuredClone(content);external.editions.short.voice={provider:'external',voiceId:'voice1'};
  assert.throws(()=>prepareEditions(external,dossier,approval,hashes,templates),
    /VOICE_PROVIDER_NOT_AVAILABLE/);
  const padded=structuredClone(content);padded.editions.long.script=[{
    segmentId:'one',narration:'One sentence stretched across the whole film',
    factRefs:['map-generalized'],targetSeconds:900}];
  assert.throws(()=>prepareEditions(padded,dossier,approval,hashes,templates),
    /EDITORIAL_PLAN_TOO_THIN/);
});

test('approved manual project produces two immutable render plans with source lineage',
  {timeout:30000},async()=>{
    const dir=await mkdtemp(path.resolve('outputs','documentary-test-'));
    try {
      const contentFile=path.join(dir,'content.json'),dossierFile=path.join(dir,'dossier.json');
      const approvalFile=path.join(dir,'approval.json'),preparedDir=path.join(dir,'prepared');
      const contentBytes=Buffer.from(JSON.stringify(content)),
        dossierBytes=Buffer.from(JSON.stringify(dossier));
      await writeFile(contentFile,contentBytes);await writeFile(dossierFile,dossierBytes);
      await writeFile(approvalFile,JSON.stringify({...approval,
        contentSha256:sha256Bytes(contentBytes),dossierSha256:sha256Bytes(dossierBytes)}));
      await runProcess(process.execPath,['scripts/prepare-documentary.mjs',
        '--content',contentFile,'--dossier',dossierFile,'--approval',approvalFile,
        '--short-template','examples/japan-china-map.json',
        '--long-template','examples/japan-china-wide.json','--output-dir',preparedDir]);
      const manifest=JSON.parse(await readFile(path.join(preparedDir,'manifest.json'),'utf8'));
      assert.equal(manifest.editions.short.frames,2700);
      assert.equal(manifest.editions.long.frames,27000);
      assert.equal(manifest.sources[0].id,'natural-earth-raw');
      assert.equal(manifest.editions.short.assets.map.sourceId,'natural-earth-110m');
      const planned=JSON.parse(await runProcess(process.execPath,[
        'scripts/render-documentary.mjs','--dir',preparedDir,'--plan']));
      assert.equal(planned.status,'planned');
      assert.deepEqual(planned.jobs.map(job=>job.chunks),[18,180]);
      const shortOnly=JSON.parse(await runProcess(process.execPath,[
        'scripts/render-documentary.mjs','--dir',preparedDir,'--edition','short','--plan']));
      assert.deepEqual(shortOnly.jobs.map(job=>job.kind),['short']);
      await writeFile(path.join(preparedDir,'short.json'),'\n',{flag:'a'});
      await assert.rejects(runProcess(process.execPath,[
        'scripts/render-documentary.mjs','--dir',preparedDir,'--plan']),
      /DOCUMENTARY_PROJECT_CHANGED/);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
