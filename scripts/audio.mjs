import path from 'node:path';
import {realpath} from 'node:fs/promises';
import {fileHash} from './chunks.mjs';
import {runProcess} from './process.mjs';

async function inspectFile(assetPath,root,ffprobe) {
  const base=await realpath(root),candidate=path.resolve(root,assetPath);
  if(!candidate.startsWith(path.resolve(root)+path.sep)) throw new Error('AUDIO_OUTSIDE_WORKSPACE');
  const file=await realpath(candidate);
  if(!file.startsWith(base+path.sep)) throw new Error('AUDIO_OUTSIDE_WORKSPACE');
  const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams','-show_format',
    '-of','json',file]));
  const streams=probe.streams?.filter(stream=>stream.codec_type==='audio')??[];
  if(streams.length!==1) throw new Error('AUDIO_REQUIRES_ONE_STREAM');
  const duration=Number(probe.format?.duration??streams[0].duration);
  if(!Number.isFinite(duration)||duration<=0) throw new Error('AUDIO_INVALID_DURATION');
  return {path:file,sha256:await fileHash(file),durationSeconds:duration};
}

export async function inspectAudio(project,root,ffprobe=process.env.FFPROBE_PATH||'ffprobe') {
  const expectedFrames=project.scenes.at(-1).startFrame+project.scenes.at(-1).durationFrames;
  const expectedSeconds=expectedFrames/project.output.fps;
  let voice=null,music=null;
  if(project.audio.voiceover) {
    if(!project.audio.voiceRights) throw new Error('VOICE_RIGHTS_REQUIRED');
    voice={...await inspectFile(project.audio.voiceover,root,ffprobe),
      rights:project.audio.voiceRights};
    if(Math.abs(voice.durationSeconds-expectedSeconds)>Math.max(.05,1/project.output.fps))
      throw new Error(`VOICE_DURATION_MISMATCH:${voice.durationSeconds}:${expectedSeconds}`);
  }
  if(project.audio.music) {
    if(!project.audio.musicRights) throw new Error('MUSIC_RIGHTS_REQUIRED');
    music={...await inspectFile(project.audio.music,root,ffprobe),
      rights:project.audio.musicRights,gainDb:project.audio.musicGainDb??-18};
    if(music.durationSeconds+0.05<expectedSeconds)
      throw new Error(`MUSIC_TOO_SHORT:${music.durationSeconds}:${expectedSeconds}`);
  }
  const sfx=[];
  for(const cue of project.audio.sfx??[]) {
    if(!cue.rights) throw new Error(`SFX_RIGHTS_REQUIRED:${cue.id}`);
    const file=await inspectFile(cue.assetPath,root,ffprobe);
    if(file.durationSeconds+0.05<cue.durationFrames/project.output.fps)
      throw new Error(`SFX_TOO_SHORT:${cue.id}`);
    sfx.push({...file,id:cue.id,startFrame:cue.startFrame,
      durationFrames:cue.durationFrames,gainDb:cue.gainDb??-6,rights:cue.rights});
  }
  return {voice,music,sfx,duckingDb:project.audio.duckingDb};
}

export async function muxAudio(video,assets,output,{startFrame,frames,fps,
  ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',signal}={}) {
  const endFrame=startFrame+frames,duration=frames/fps;
  if(!Number.isSafeInteger(startFrame)||startFrame<0||!Number.isSafeInteger(frames)||frames<1||
    !Number.isFinite(fps)||fps<1) throw new Error('INVALID_AUDIO_SEGMENT');
  const args=['-y','-i',video],filters=[],labels=[];
  let index=1;
  function add(file,startSeconds,endSeconds,delaySeconds,gainDb) {
    args.push('-i',file.path);
    const label=`a${index}`;
    const delayMs=Math.round(delaySeconds*1000);
    filters.push(`[${index}:a:0]atrim=start=${startSeconds}:end=${endSeconds},`+
      `asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,`+
      `volume=${gainDb}dB,adelay=${delayMs}:all=1[${label}]`);
    labels.push(`[${label}]`);index++;
  }
  if(assets.voice) add(assets.voice,startFrame/fps,endFrame/fps,0,0);
  if(assets.music) add(assets.music,startFrame/fps,endFrame/fps,0,
    assets.music.gainDb+(assets.voice?assets.duckingDb:0));
  for(const cue of assets.sfx) {
    const overlapStart=Math.max(startFrame,cue.startFrame),
      overlapEnd=Math.min(endFrame,cue.startFrame+cue.durationFrames);
    if(overlapStart<overlapEnd)
      add(cue,(overlapStart-cue.startFrame)/fps,(overlapEnd-cue.startFrame)/fps,
        (overlapStart-startFrame)/fps,cue.gainDb);
  }
  if(!labels.length) return false;
  const mixed=labels.length===1?`${labels[0]}anull[mix]`:
    `${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0[mix]`;
  filters.push(mixed,`[mix]apad=whole_dur=${duration},atrim=duration=${duration},`+
    'alimiter=limit=0.95,aresample=48000[aout]');
  await runProcess(ffmpeg,[...args,'-filter_complex',filters.join(';'),
    '-map','0:v:0','-map','[aout]','-c:v','copy','-c:a','aac','-b:a','192k',
    '-t',String(duration),'-movflags','+faststart',output],{timeoutMs:900000,signal});
  return true;
}

export function assertAudioTrack(metadata,frames,fps) {
  const streams=metadata.streams?.filter(stream=>stream.codec_type==='audio')??[];
  if(streams.length!==1||streams[0].codec_name!=='aac') throw new Error('AUDIO_QA_MISSING_TRACK');
  const duration=Number(streams[0].duration);
  if(!Number.isFinite(duration)||Math.abs(duration-frames/fps)>.12)
    throw new Error('AUDIO_QA_DURATION_MISMATCH');
}

// Keep the original helpers for callers that only import a single voice file.
export async function inspectVoice(project,root,ffprobe) {
  return (await inspectAudio(project,root,ffprobe)).voice;
}
export async function muxVoice(video,audio,output,options) {
  return muxAudio(video,{voice:{path:audio},music:null,sfx:[],duckingDb:0},output,options);
}
export const assertVoiceTrack=assertAudioTrack;
