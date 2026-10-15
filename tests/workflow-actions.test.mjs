import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Readable} from 'node:stream';
import {readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {intake,currentDossier,getBrief,reviewEvidence,approveScripts,
  prepareWorkflow,renderPlan,loadState,generateNarrationDraft,
  getNarrationDraft,runTechnicalQa,assembleApprovedSpeech,
  saveScriptDraft,getScriptDraft} from '../scripts/workflow-actions.mjs';
import {auditDocumentary} from '../scripts/documentary-qa.mjs';
import {runProcess} from '../scripts/process.mjs';
import {handleWorkflowRequest} from '../scripts/workflow-server.mjs';

async function api(method,url,payload) {
  const request=Readable.from(payload===undefined?[]:[JSON.stringify(payload)]);
  request.method=method;request.url=url;
  const response={status:0,body:'',writeHead(status){this.status=status},
    end(value){this.body=String(value??'')}};
  await handleWorkflowRequest(root,request,response);
  return {status:response.status,body:JSON.parse(response.body)};
}

const root=process.cwd(),shortTemplate=JSON.parse(await readFile('examples/japan-china-map.json','utf8')),
  longTemplate=JSON.parse(await readFile('examples/japan-china-wide.json','utf8'));
function scene(template,seconds,index) {
  const item=structuredClone(template.scenes[0]);
  item.id=`scene-${index}`;item.startFrame=index*seconds*30;
  item.durationFrames=seconds*30;
  item.labels=item.labels.map(label=>({...label,endFrame:Math.min(label.endFrame,seconds*30)}));
  return item;
}
function edition(kind,template) {
  const count=kind==='short'?2:10,segmentSeconds=kind==='short'?45:90;
  return {kind,title:`Synthetic ${kind} edition`,durationTargetSeconds:count*segmentSeconds,
    output:{width:kind==='short'?1080:1920,height:kind==='short'?1920:1080,
      fps:30,format:'mp4',codec:'h264',filename:`synthetic_${kind}_${kind==='short'?'9x16':'16x9'}.mp4`},
    outline:(kind==='short'?[90]:[300,300,300]).map((seconds,index)=>({
      chapterId:`chapter-${index}`,name:`Synthetic chapter ${index}`,goal:'Explain cited evidence',
      targetSeconds:seconds})),
    script:Array.from({length:count},(_,index)=>({segmentId:`segment-${index}`,
      narration:Array.from({length:kind==='short'?70:140},(_,word)=>
        `sample${String.fromCharCode(97+(word+index)%26)}`).join(' '),
      factRefs:[`claim-${index}`],targetSeconds:segmentSeconds})),
    scenes:Array.from({length:count},(_,index)=>scene(template,segmentSeconds,index)),
    voice:{provider:'none'},captions:{enabled:false,language:'en-US',formats:[]}};
}
test('review, approve, prepare and plan preserve exact dossier and content versions',
  {timeout:30000},async()=>{
    const id=`workflow-test-${process.pid}`,
      dir=path.join(root,'outputs','workflow',id),
      renderDir=path.join(root,'outputs','documentaries',id),
      input=path.join(root,'outputs','evidence',`${id}.json`),
      contentFile=path.join(root,'outputs','evidence',`${id}-content.json`),
      speechManifest=path.join(root,'outputs','evidence',`${id}-speech.json`),
      speechDir=path.join(root,'outputs','speech',id);
    await mkdir(path.dirname(input),{recursive:true});
    try {
      const dossier=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
      dossier.projectId=id;dossier.gaps=[];
      const baseSource=dossier.sources[0],baseClaim=dossier.claims[0];
      dossier.sources=[baseSource,{...baseSource,id:'second-source'},
        {...baseSource,id:'third-source'}];
      dossier.claims=Array.from({length:20},(_,index)=>({...baseClaim,
        id:`claim-${index}`,text:`Synthetic reviewed statement ${String.fromCharCode(65+index)}`,
        sourceIds:[dossier.sources[index%3].id],approval:'needs_review'}));
      await writeFile(input,JSON.stringify(dossier));
      const state=await intake(root,path.relative(root,input));
      assert.equal(state.status,'needs_research');
      assert.equal((await generateNarrationDraft(root,id)).status,'needs_research');
      await assert.rejects(approveScripts(root,id,{contentPath:'missing.json'}),
        /SCRIPT_BRIEF_NEEDS_RESEARCH/);
      const review={projectId:id,inputSha256:state.dossierSha256,reviewer:'Synthetic Editor',
        reviewedAt:'2026-10-15T00:00:00.000Z',decisions:dossier.claims.map(claim=>({
          claimId:claim.id,verdict:'supported',approval:'approved',
          reason:'Synthetic source checked for workflow test.'}))};
      await assert.rejects(reviewEvidence(root,id,{...review,inputSha256:'0'.repeat(64)}),
        /REVIEW_STALE_DOSSIER/);
      const reviewed=await reviewEvidence(root,id,review);
      assert.equal(reviewed.brief.status,'ready_for_writing');
      assert.equal((await getBrief(root,id)).long.factCards.length,20);
      await assert.rejects(getNarrationDraft(root,id),/NARRATION_DRAFT_STALE/);
      const narration=await generateNarrationDraft(root,id);
      assert.equal(narration.status,'draft_for_human_review');
      assert.equal((await getNarrationDraft(root,id)).long.segments.length,20);
      const latest=(await currentDossier(root,id)).dossier;
      const short=edition('short',shortTemplate),long=edition('long',longTemplate);
      const voiceRights={license:'test-generated',attribution:'synthetic fixture'};
      short.voice={provider:'local',assetPath:`outputs/speech/${id}/short/voice.wav`,
        rights:voiceRights};
      const content={schemaVersion:'1.1',projectId:id,topic:'Synthetic map source test',
        locale:'en-US',research:{sources:latest.sources.map(source=>({
          id:source.id,url:source.url,fileRef:source.localPath,title:source.title,
          license:source.license,retrievedAt:source.retrievedAt})),
          facts:latest.claims.map(claim=>({id:claim.id,statement:claim.text,
            sourceIds:claim.sourceIds}))},
        narrative:{thesis:'Synthetic map source caveat',keyPoints:['Synthetic source context']},
        production:{mode:'review_before_render',defaultTheme:'midnight-blue',
          mixStyles:['A','C','D'],seed:42},
        editions:{short,long}};
      await writeFile(contentFile,JSON.stringify(content));
      const draftResponse=await api('POST',`/api/documentaries/${id}/scripts/draft`,
        {content,expectedSha256:null});
      assert.equal(draftResponse.status,200);
      const draft=draftResponse.body;
      assert.equal(draft.check.status,'ready_for_review');
      assert.equal((await getScriptDraft(root,id)).sha256,draft.sha256);
      assert.equal((await api('GET',`/api/documentaries/${id}/scripts/draft`)).body.sha256,
        draft.sha256);
      await assert.rejects(saveScriptDraft(root,id,{content,expectedSha256:null}),
        /SCRIPT_DRAFT_STALE/);
      const incomplete=structuredClone(content);
      incomplete.editions.long.script[0].narration='';
      const incompleteDraft=await saveScriptDraft(root,id,{content:incomplete,
        expectedSha256:draft.sha256});
      assert.equal(incompleteDraft.check.status,'needs_revision');
      await assert.rejects(approveScripts(root,id,{contentPath:incompleteDraft.path,
        reviewer:'Synthetic Editor',note:'Cannot approve unfinished narration.'}),
      /Too small|too_small/);
      const thin=structuredClone(content);thin.editions.long.script[0].narration='Too short';
      const thinDraft=await saveScriptDraft(root,id,{content:thin,
        expectedSha256:incompleteDraft.sha256});
      assert.match(thinDraft.check.reason,/EDITORIAL_SEGMENT_PACING:long/);
      const restored=await saveScriptDraft(root,id,{content,
        expectedSha256:thinDraft.sha256});
      assert.equal(restored.check.status,'ready_for_review');
      await approveScripts(root,id,{contentPath:restored.path,
        reviewer:'Synthetic Editor',note:'Synthetic script checked for integration testing.'});
      const clips=[];
      for(let index=0;index<2;index++) {
        const clip=path.join(root,'outputs','evidence',`${id}-clip-${index}.wav`);
        clips.push(clip);
        await runProcess('ffmpeg',['-y','-f','lavfi','-i',
          `sine=frequency=${300+index*100}:duration=45`,'-c:a','pcm_s16le',clip]);
      }
      const audioManifest={provider:'imported',targetSeconds:90,rights:voiceRights,
        output:{width:1080,height:1920},
        segments:short.script.map((segment,index)=>({id:segment.segmentId,
          text:segment.narration,assetPath:path.relative(root,clips[index])}))};
      await writeFile(speechManifest,JSON.stringify(audioManifest));
      await assert.rejects(assembleApprovedSpeech(root,id,{edition:'short',
        manifestPath:path.relative(root,contentFile)}),
      /SPEECH_MANIFEST_DOES_NOT_MATCH_APPROVED_SCRIPT/);
      const assembled=await assembleApprovedSpeech(root,id,{edition:'short',
        manifestPath:path.relative(root,speechManifest)});
      assert.equal(assembled.report.targetSeconds,90);
      assert.deepEqual(assembled.report.captionCanvas,{width:1080,height:1920});
      assert.equal(assembled.state.gates.audio.short,'assembled');
      await assert.rejects(reviewEvidence(root,id,review),/REVIEW_AFTER_SCRIPT_APPROVAL_FORBIDDEN/);
      const prepared=await prepareWorkflow(root,id,{shortTemplate:'examples/japan-china-map.json',
        longTemplate:'examples/japan-china-wide.json'});
      assert.equal(prepared.state.gates.render,'prepared');
      const plan=await renderPlan(root,id);
      assert.deepEqual(plan.jobs.map(job=>job.frames),[2700,27000]);
      const qa=await auditDocumentary(root,renderDir);
      assert.equal(qa.status,'incomplete_or_failed');
      assert.equal(qa.editions.short.status,'missing_mp4');
      assert.equal(qa.editions.long.status,'missing_mp4');
      assert.equal((await runTechnicalQa(root,id)).status,'incomplete_or_failed');
      await assert.rejects(renderPlan(root,id,{chunkFrames:0}),/INVALID_CHUNK_FRAMES/);
      assert.equal((await loadState(root,id)).status,'prepared_for_render');
      const modified={...content,topic:'Changed after approval'};
      await writeFile(path.join(root,restored.path),JSON.stringify(modified));
      await assert.rejects(renderPlan(root,id),/DOCUMENTARY_INPUT_CHANGED/);
      await assert.rejects(auditDocumentary(root,renderDir),/DOCUMENTARY_QA_INPUT_CHANGED/);
    } finally {
      await rm(input,{force:true});await rm(contentFile,{force:true});
      await rm(speechManifest,{force:true});
      for(let index=0;index<2;index++) await rm(path.join(root,'outputs','evidence',
        `${id}-clip-${index}.wav`),{force:true});
      await rm(speechDir,{recursive:true,force:true});
      await rm(dir,{recursive:true,force:true});await rm(renderDir,{recursive:true,force:true});
    }
  });
