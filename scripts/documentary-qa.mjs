import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';
import {sha256Bytes} from '../packages/evidence/src/review.ts';
import {assertVideo,fileHash,atomicJson} from './chunks.mjs';
import {assertAudioTrack} from './audio.mjs';
import {analyzeAudio} from './audio-qa.mjs';
import {runProcess} from './process.mjs';

export async function auditDocumentary(root,dir,{ffprobe=process.env.FFPROBE_PATH||'ffprobe',
  ffmpeg=process.env.FFMPEG_PATH||'ffmpeg'}={}) {
  const absolute=path.resolve(dir);
  if(!absolute.startsWith(path.join(root,'outputs')+path.sep))
    throw new Error('DOCUMENTARY_QA_DIR_OUTSIDE_OUTPUTS');
  const manifest=JSON.parse(await readFile(path.join(absolute,'manifest.json'),'utf8'));
  if(manifest.schemaVersion!=='1.0'||!manifest.editions?.short||!manifest.editions?.long)
    throw new Error('DOCUMENTARY_QA_MANIFEST_INVALID');
  for(const [key,item] of Object.entries(manifest.inputs??{})) {
    const file=path.resolve(root,item.path);
    if(!file.startsWith(root+path.sep)||sha256Bytes(await readFile(file))!==item.sha256)
      throw new Error(`DOCUMENTARY_QA_INPUT_CHANGED:${key}`);
  }
  const dossier=EvidenceDossierSchema.parse(JSON.parse(await readFile(
    path.resolve(root,manifest.inputs.dossier.path),'utf8')));
  await verifyLocalEvidence(dossier,root);
  let renderStatus=null;
  try {renderStatus=JSON.parse(await readFile(path.join(absolute,'render-status.json'),'utf8'));}
  catch(error) {if(error.code!=='ENOENT') throw error;}
  const editions={};
  for(const kind of ['short','long']) {
    const item=manifest.editions[kind];
    if(item.project!==`${kind}.json`||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*\.mp4$/.test(item.output))
      throw new Error(`DOCUMENTARY_QA_EDITION_MANIFEST_INVALID:${kind}`);
    const projectFile=path.join(absolute,item.project),
      bytes=await readFile(projectFile);
    if(sha256Bytes(bytes)!==item.projectSha256)
      throw new Error(`DOCUMENTARY_QA_PROJECT_CHANGED:${kind}`);
    const project=ProjectSchema.parse(JSON.parse(bytes.toString('utf8')));
    const expectedFrames=project.scenes.at(-1).startFrame+project.scenes.at(-1).durationFrames;
    if(expectedFrames!==item.frames) throw new Error(`DOCUMENTARY_QA_FRAME_MANIFEST_MISMATCH:${kind}`);
    const output=path.join(absolute,item.output);
    try {await stat(output);} catch(error) {
      if(error.code==='ENOENT') {editions[kind]={status:'missing_mp4',frames:expectedFrames};continue;}
      throw error;
    }
    const result={status:'failed',frames:expectedFrames,output:path.relative(root,output),issues:[]};
    try {
      const hash=await fileHash(output);
      if(renderStatus?.editions?.[kind]?.status!=='completed'||
        renderStatus.editions[kind].sha256!==hash)
        throw new Error('RENDER_STATUS_OR_HASH_MISMATCH');
      const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-count_frames',
        '-show_streams','-show_format','-of','json',output],{timeoutMs:900000}));
      assertVideo(probe,{frames:expectedFrames,width:project.output.width,
        height:project.output.height,fps:project.output.fps});
      const expectsAudio=Boolean(project.audio.voiceover||project.audio.music||project.audio.sfx.length);
      const tracks=probe.streams.filter(stream=>stream.codec_type==='audio');
      if(expectsAudio) {
        assertAudioTrack(probe,expectedFrames,project.output.fps);
        result.audio=await analyzeAudio(output,{ffprobe,ffmpeg});
        if(result.audio.status!=='pass') throw new Error('AUDIO_QA_NEEDS_REVIEW');
      } else if(tracks.length) throw new Error('UNEXPECTED_AUDIO_TRACK');
      result.status='technical_pass';result.sha256=hash;
    } catch(error) {result.issues.push(String(error));}
    editions[kind]=result;
  }
  const bothPass=['short','long'].every(kind=>editions[kind].status==='technical_pass');
  return {schemaVersion:'1.0',projectId:manifest.projectId,
    status:bothPass?'awaiting_human_review':'incomplete_or_failed',
    editions,remaining:{visualReview:true,humanAudioReview:true,
      editorialApprovalCheck:true,sustainedBenchmark:true},
    note:'A technical pass does not certify editorial quality, listening, territorial accuracy or target-machine benchmark.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
  const {values}=parseArgs({options:{dir:{type:'string'}}});
  if(!values.dir) throw new Error('Usage: npm run documentary:qa -- --dir outputs/documentaries/id');
  const dir=path.resolve(values.dir),report=await auditDocumentary(root,dir,
    {ffprobe:process.env.FFPROBE_PATH||path.join(root,'tools','ffprobe')});
  await atomicJson(path.join(dir,'qa-report.json'),report);
  console.log(JSON.stringify(report,null,2));
  if(report.status!=='awaiting_human_review') process.exitCode=2;
}
