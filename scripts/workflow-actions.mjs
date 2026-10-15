import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {realpathSync} from 'node:fs';
import {readFile,writeFile,mkdir,readdir,rename,appendFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn} from 'node:child_process';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {applyClaimReview,sha256Bytes} from '../packages/evidence/src/review.ts';
import {draftScriptBrief} from '../packages/editorial/src/draft.ts';
import {ApprovedExcerptProvider,assertEditorialDraftGrounded} from '../packages/editorial/src/provider.ts';
import {ContentProjectSchema} from '../packages/schema/src/content.schema.ts';
import {assertContentMatchesDossier} from '../packages/editorial/src/gate.ts';
import {ScriptApprovalSchema,assertScriptReady} from '../packages/orchestration/src/prepare.ts';
import {runProcess} from './process.mjs';
import {auditDocumentary} from './documentary-qa.mjs';
import {assembleSpeech} from './speech.mjs';

const idPattern=/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
function jobDir(root,id) {
  if(!idPattern.test(id)) throw new Error('WORKFLOW_INVALID_PROJECT_ID');
  return path.join(root,'outputs','workflow',id);
}
export function safeJson(root,value,mustExist=true) {
  if(typeof value!=='string') throw new Error('WORKFLOW_JSON_PATH_REQUIRED');
  const file=path.resolve(root,value);
  if(!file.startsWith(root+path.sep)||path.extname(file)!=='.json')
    throw new Error('WORKFLOW_JSON_PATH_OUTSIDE_ROOT');
  if(mustExist&&!realpathSync(file).startsWith(realpathSync(root)+path.sep))
    throw new Error('WORKFLOW_JSON_SYMLINK_OUTSIDE_ROOT');
  return file;
}
export async function loadDossier(root,value) {
  const file=safeJson(root,value),bytes=await readFile(file);
  const dossier=EvidenceDossierSchema.parse(JSON.parse(bytes.toString('utf8')));
  await verifyLocalEvidence(dossier,root);
  return {dossier,hash:sha256Bytes(bytes),file:path.relative(root,file)};
}
export async function loadState(root,id) {
  return JSON.parse(await readFile(path.join(jobDir(root,id),'state.json'),'utf8'));
}
export async function loadEvents(root,id) {
  const file=path.join(jobDir(root,id),'events.ndjson');
  const data=await readFile(file,'utf8').catch(error=>error.code==='ENOENT'?'':Promise.reject(error));
  return data.trim()?data.trim().split('\n').map(line=>JSON.parse(line)):[];
}
async function recordEvent(dir,action,before,state,actor='system') {
  await appendFile(path.join(dir,'events.ndjson'),JSON.stringify({
    at:new Date().toISOString(),action,actor,from:before?.status??null,to:state.status,
    gates:state.gates
  })+'\n');
}
async function saveState(root,id,state,action,actor) {
  const dir=jobDir(root,id),temp=path.join(dir,`state-${randomUUID()}.tmp`),
    previous=await loadState(root,id);
  await writeFile(temp,JSON.stringify(state,null,2)+'\n');
  await rename(temp,path.join(dir,'state.json'));
  await recordEvent(dir,action,previous,state,actor);
}
export async function intake(root,dossierPath) {
  const loaded=await loadDossier(root,dossierPath),id=loaded.dossier.projectId,
    dir=jobDir(root,id),brief=draftScriptBrief(loaded.dossier);
  await mkdir(dir,{recursive:true});
  const state={projectId:id,dossierPath:loaded.file,dossierSha256:loaded.hash,
    status:brief.status,createdAt:new Date().toISOString(),
    gates:{evidence:brief.status==='needs_research'?'needs_research':'ready_for_writing',
      scripts:'awaiting_human_script',audio:'pending',render:'pending',qa:'pending'}};
  await writeFile(path.join(dir,'state.json'),JSON.stringify(state,null,2)+'\n',{flag:'wx'});
  await writeFile(path.join(dir,'script-brief.json'),JSON.stringify(brief,null,2)+'\n',{flag:'wx'});
  await recordEvent(dir,'intake',null,state);
  return state;
}
export async function listJobs(root) {
  const base=path.join(root,'outputs','workflow');
  const names=await readdir(base).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error));
  const items=[];
  for(const name of names) if(idPattern.test(name)) {
    try {items.push(await loadState(root,name));}
    catch(error) {if(error.code!=='ENOENT') throw error;}
  }
  return items;
}
export async function currentDossier(root,id) {
  const state=await loadState(root,id),loaded=await loadDossier(root,state.dossierPath);
  if(loaded.hash!==state.dossierSha256) throw new Error('DOSSIER_CHANGED_SINCE_INTAKE');
  return loaded;
}
export async function reviewEvidence(root,id,review) {
  const state=await loadState(root,id);
  if(state.gates.scripts==='approved') throw new Error('REVIEW_AFTER_SCRIPT_APPROVAL_FORBIDDEN');
  const loaded=await currentDossier(root,id),updated=applyClaimReview(
    loaded.dossier,review,loaded.hash);
  const dir=jobDir(root,id),next=(state.reviewCount??0)+1;
  const file=path.join(dir,`dossier-reviewed-${next}.json`),
    bytes=Buffer.from(JSON.stringify(updated,null,2)+'\n');
  await writeFile(file,bytes,{flag:'wx'});
  const brief=draftScriptBrief(updated);
  await writeFile(path.join(dir,`script-brief-${next}.json`),JSON.stringify(brief,null,2)+'\n',{flag:'wx'});
  const nextState={...state,dossierPath:path.relative(root,file),dossierSha256:sha256Bytes(bytes),
    reviewCount:next,briefPath:path.relative(root,path.join(dir,`script-brief-${next}.json`)),
    status:brief.status,gates:{...state.gates,
      evidence:brief.status==='needs_research'?'needs_research':'ready_for_writing'}};
  await saveState(root,id,nextState,'evidence_reviewed',review.reviewer);
  return {state:nextState,brief};
}
export async function getBrief(root,id) {
  const state=await loadState(root,id);
  return JSON.parse(await readFile(state.briefPath?
    path.resolve(root,state.briefPath):path.join(jobDir(root,id),'script-brief.json'),'utf8'));
}
export async function generateNarrationDraft(root,id) {
  const state=await loadState(root,id),loaded=await currentDossier(root,id);
  const draft=ApprovedExcerptProvider.draft(loaded.dossier,loaded.hash);
  assertEditorialDraftGrounded(loaded.dossier,draft);
  const file=path.join(jobDir(root,id),`narration-draft-${loaded.hash.slice(0,12)}.json`);
  try {await writeFile(file,JSON.stringify(draft,null,2)+'\n',{flag:'wx'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
  const nextState={...state,draftPath:path.relative(root,file)};
  await saveState(root,id,nextState,'narration_draft_generated');
  return draft;
}
export async function getNarrationDraft(root,id) {
  const state=await loadState(root,id);
  if(!state.draftPath) throw new Error('NARRATION_DRAFT_NOT_GENERATED');
  const loaded=await currentDossier(root,id),draft=JSON.parse(await readFile(
    path.resolve(root,state.draftPath),'utf8'));
  if(draft.dossierSha256!==loaded.hash) throw new Error('NARRATION_DRAFT_STALE');
  return assertEditorialDraftGrounded(loaded.dossier,draft);
}
function scriptCheck(content,dossier) {
  try {assertScriptReady(ContentProjectSchema.parse(content),dossier);
    return {status:'ready_for_review',reason:null};}
  catch(error) {return {status:'needs_revision',reason:error.message};}
}
export async function getScriptDraft(root,id) {
  const state=await loadState(root,id);
  if(!state.scriptDraftPath) throw new Error('SCRIPT_DRAFT_NOT_FOUND');
  const loaded=await currentDossier(root,id),bytes=await readFile(
    safeJson(root,state.scriptDraftPath));
  if(sha256Bytes(bytes)!==state.scriptDraftSha256) throw new Error('SCRIPT_DRAFT_CHANGED');
  const content=JSON.parse(bytes.toString('utf8'));
  return {content,path:state.scriptDraftPath,sha256:state.scriptDraftSha256,
    check:state.scriptDraftDossierSha256!==loaded.hash?
      {status:'needs_revision',reason:'SCRIPT_DRAFT_DOSSIER_CHANGED'}:
      scriptCheck(content,loaded.dossier)};
}
export async function saveScriptDraft(root,id,input) {
  const state=await loadState(root,id);
  if(state.gates.scripts==='approved') throw new Error('SCRIPTS_ALREADY_APPROVED');
  if((input.expectedSha256??null)!==(state.scriptDraftSha256??null))
    throw new Error('SCRIPT_DRAFT_STALE');
  const loaded=await currentDossier(root,id),content=input.content;
  if(!content||typeof content!=='object'||Array.isArray(content)||
    content.projectId!==id||content.schemaVersion!=='1.1'||
    !Array.isArray(content.editions?.short?.script)||
    !Array.isArray(content.editions?.long?.script))
    throw new Error('SCRIPT_DRAFT_SHAPE_OR_PROJECT_MISMATCH');
  const bytes=Buffer.from(JSON.stringify(content,null,2)+'\n'),hash=sha256Bytes(bytes);
  if(hash===state.scriptDraftSha256&&loaded.hash===state.scriptDraftDossierSha256)
    return getScriptDraft(root,id);
  const file=path.join(jobDir(root,id),`script-draft-${hash.slice(0,16)}.json`);
  try {await writeFile(file,bytes,{flag:'wx'});}
  catch(error) {if(error.code!=='EEXIST') throw error;}
  const nextState={...state,scriptDraftPath:path.relative(root,file),scriptDraftSha256:hash,
    scriptDraftDossierSha256:loaded.hash,
    gates:{...state.gates,scripts:'draft'}};
  await saveState(root,id,nextState,'script_draft_saved');
  return {content,path:nextState.scriptDraftPath,sha256:hash,
    check:scriptCheck(content,loaded.dossier)};
}
export async function approveScripts(root,id,input) {
  const state=await loadState(root,id),loaded=await currentDossier(root,id);
  if(state.gates.scripts==='approved') throw new Error('SCRIPTS_ALREADY_APPROVED');
  if((await getBrief(root,id)).status!=='ready_for_writing')
    throw new Error('SCRIPT_BRIEF_NEEDS_RESEARCH');
  const contentFile=safeJson(root,input.contentPath),bytes=await readFile(contentFile);
  const content=ContentProjectSchema.parse(JSON.parse(bytes.toString('utf8')));
  assertScriptReady(content,loaded.dossier);
  const approval=ScriptApprovalSchema.parse({projectId:id,contentSha256:sha256Bytes(bytes),
    dossierSha256:loaded.hash,reviewer:input.reviewer,
    approvedAt:new Date().toISOString(),note:input.note});
  const dir=jobDir(root,id);
  await writeFile(path.join(dir,'script-approval.json'),JSON.stringify(approval,null,2)+'\n',{flag:'wx'});
  const nextState={...state,contentPath:path.relative(root,contentFile),
    contentSha256:approval.contentSha256,status:'scripts_approved',
    gates:{...state.gates,scripts:'approved'}};
  await saveState(root,id,nextState,'scripts_approved',input.reviewer);
  return {state:nextState,approval};
}
export async function assembleApprovedSpeech(root,id,input) {
  const state=await loadState(root,id);
  if(state.gates.scripts!=='approved') throw new Error('SCRIPTS_NOT_APPROVED');
  const kind=input.edition;
  if(!['short','long'].includes(kind)) throw new Error('INVALID_EDITION');
  const contentBytes=await readFile(safeJson(root,state.contentPath));
  if(sha256Bytes(contentBytes)!==state.contentSha256) throw new Error('CONTENT_CHANGED_AFTER_APPROVAL');
  const content=ContentProjectSchema.parse(JSON.parse(contentBytes.toString('utf8'))),
    edition=content.editions[kind];
  if(edition.voice.provider!=='local') throw new Error('EDITION_HAS_NO_LOCAL_VOICE');
  const manifestFile=safeJson(root,input.manifestPath),manifest=JSON.parse(await readFile(manifestFile,'utf8'));
  if(manifest.targetSeconds!==edition.durationTargetSeconds||
    manifest.output?.width!==edition.output.width||
    manifest.output?.height!==edition.output.height||
    manifest.rights?.license!==edition.voice.rights?.license||
    manifest.rights?.attribution!==edition.voice.rights?.attribution||
    manifest.segments?.length!==edition.script.length||
    edition.script.some((segment,index)=>manifest.segments[index]?.id!==segment.segmentId||
      manifest.segments[index]?.text!==segment.narration))
    throw new Error('SPEECH_MANIFEST_DOES_NOT_MATCH_APPROVED_SCRIPT');
  const output=path.join(root,'outputs','speech',id,kind),expected=path.relative(root,path.join(output,'voice.wav'));
  if(edition.voice.assetPath!==expected) throw new Error('SPEECH_OUTPUT_PATH_NOT_IN_APPROVED_SCRIPT');
  const report=await assembleSpeech(manifest,path.relative(root,output),
    {ffprobe:process.env.FFPROBE_PATH||path.join(root,'tools','ffprobe')});
  const nextState={...state,gates:{...state.gates,
    audio:{...(typeof state.gates.audio==='object'?state.gates.audio:{}),[kind]:'assembled'}}};
  await saveState(root,id,nextState,`audio_assembled_${kind}`);
  return {state:nextState,report};
}
export async function prepareWorkflow(root,id,input) {
  const state=await loadState(root,id);
  if(state.gates.scripts!=='approved') throw new Error('SCRIPTS_NOT_APPROVED');
  await currentDossier(root,id);
  const templates=['shortTemplate','longTemplate'].map(key=>safeJson(root,input[key]));
  const output=path.join(root,'outputs','documentaries',id);
  const result=JSON.parse(await runProcess(process.execPath,[
    path.join(root,'scripts','prepare-documentary.mjs'),
    '--content',path.resolve(root,state.contentPath),'--dossier',path.resolve(root,state.dossierPath),
    '--approval',path.join(jobDir(root,id),'script-approval.json'),
    '--short-template',templates[0],'--long-template',templates[1],
    '--output-dir',output],{timeoutMs:120000,
      env:{...process.env,FFPROBE_PATH:process.env.FFPROBE_PATH||path.join(root,'tools','ffprobe')}}));
  const nextState={...state,status:'prepared_for_render',
    gates:{...state.gates,render:'prepared'}};
  await saveState(root,id,nextState,'projects_prepared');
  return {state:nextState,prepared:result};
}
export async function renderPlan(root,id,input={}) {
  const state=await loadState(root,id);
  if(!['prepared','rendering','completed','failed','partial_success'].includes(state.gates.render))
    throw new Error('DOCUMENTARY_NOT_PREPARED');
  const edition=input.edition??'both';
  if(!['short','long','both'].includes(edition)) throw new Error('INVALID_EDITION');
  const chunkFrames=input.chunkFrames??150;
  if(!Number.isSafeInteger(chunkFrames)||chunkFrames<30||chunkFrames>300)
    throw new Error('INVALID_CHUNK_FRAMES');
  return JSON.parse(await runProcess(process.execPath,[
    path.join(root,'scripts','render-documentary.mjs'),
    '--dir',path.join(root,'outputs','documentaries',id),'--edition',edition,
    '--chunk-frames',String(chunkFrames),'--plan'],
  {timeoutMs:120000}));
}

export async function startRender(root,id,input={}) {
  const plan=await renderPlan(root,id,input),state=await loadState(root,id);
  const dir=jobDir(root,id),jobFile=path.join(dir,'render-job.json');
  try {
    const previous=JSON.parse(await readFile(jobFile,'utf8'));
    if(previous.status==='running') {
      try {process.kill(previous.pid,0);throw new Error('RENDER_ALREADY_RUNNING');}
      catch(error) {if(error.code!=='ESRCH') throw error;}
    }
  } catch(error) {if(error.code!=='ENOENT') throw error;}
  const edition=input.edition??'both',chunkFrames=input.chunkFrames??150;
  const log=createWriteStream(path.join(dir,'render.log'),{flags:'a'});
  const child=spawn(process.execPath,[path.join(root,'scripts','render-documentary.mjs'),
    '--dir',path.join(root,'outputs','documentaries',id),'--edition',edition,
    '--chunk-frames',String(chunkFrames),'--resume'],{cwd:root,stdio:['ignore','pipe','pipe'],
      env:{...process.env,FFPROBE_PATH:process.env.FFPROBE_PATH||path.join(root,'tools','ffprobe')}});
  child.on('error',error=>log.write(`RENDER_PROCESS_ERROR:${error.message}\n`));
  child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  const job={status:'running',pid:child.pid,edition,chunkFrames,
    startedAt:new Date().toISOString()};
  await writeFile(jobFile,JSON.stringify(job,null,2)+'\n');
  await saveState(root,id,{...state,status:'rendering',gates:{...state.gates,render:'rendering'}},
    'render_started');
  child.on('close',async code=>{
    log.end();
    try {
      const renderStatus=JSON.parse(await readFile(path.join(root,'outputs','documentaries',id,
        'render-status.json'),'utf8'));
      const latest=await loadState(root,id);
      const status=code===0&&renderStatus.status==='completed'?'completed':
        code===0?'partial_success':'failed';
      await writeFile(jobFile,JSON.stringify({...job,status,exitCode:code,
        finishedAt:new Date().toISOString()},null,2)+'\n');
      await saveState(root,id,{...latest,status,gates:{...latest.gates,render:status}},
        `render_${status}`);
    } catch(error) {
      await writeFile(jobFile,JSON.stringify({...job,status:'failed',exitCode:code,
        error:String(error),finishedAt:new Date().toISOString()},null,2)+'\n');
      try {
        const latest=await loadState(root,id);
        await saveState(root,id,{...latest,status:'failed',
          gates:{...latest.gates,render:'failed'}},'render_failed');
      } catch { /* Render job file retains the failure for recovery. */ }
    }
  });
  return {status:'running',pid:child.pid,plan};
}

export async function runTechnicalQa(root,id) {
  const state=await loadState(root,id);
  if(!['prepared','rendering','completed','failed','partial_success'].includes(state.gates.render))
    throw new Error('DOCUMENTARY_NOT_PREPARED');
  const dir=path.join(root,'outputs','documentaries',id),report=await auditDocumentary(root,dir,
    {ffprobe:process.env.FFPROBE_PATH||path.join(root,'tools','ffprobe')});
  await writeFile(path.join(dir,'qa-report.json'),JSON.stringify(report,null,2)+'\n');
  await saveState(root,id,{...state,gates:{...state.gates,qa:report.status}},'technical_qa_run');
  return report;
}
