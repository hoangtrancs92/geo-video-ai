import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {runProcess} from './process.mjs';

export async function analyzeAudio(file,{ffmpeg='ffmpeg',ffprobe=process.env.FFPROBE_PATH||'ffprobe',
  minLufs=-30,maxLufs=-8,maxTruePeakDb=-1,maxSilenceSeconds=2}={}) {
  const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams','-show_format',
    '-of','json',file]));
  if(probe.streams?.filter(stream=>stream.codec_type==='audio').length!==1)
    throw new Error('AUDIO_QA_REQUIRES_ONE_TRACK');
  const duration=Number(probe.format?.duration);
  if(!Number.isFinite(duration)||duration<=0) throw new Error('AUDIO_QA_INVALID_DURATION');
  let loudnessLog='';
  await runProcess(ffmpeg,['-hide_banner','-nostats','-i',file,'-vn',
    '-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
    '-f','null','-'],{timeoutMs:900000,onStderr:chunk=>{loudnessLog+=chunk;}});
  const block=loudnessLog.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
  if(!block) throw new Error('AUDIO_QA_LOUDNESS_UNAVAILABLE');
  const measured=JSON.parse(block),integratedLufs=Number(measured.input_i),
    truePeakDb=Number(measured.input_tp);
  let silenceLog='';
  await runProcess(ffmpeg,['-hide_banner','-nostats','-i',file,'-vn',
    '-af','silencedetect=noise=-45dB:d=0.25','-f','null','-'],
  {timeoutMs:900000,onStderr:chunk=>{silenceLog+=chunk;}});
  const starts=[...silenceLog.matchAll(/silence_start: ([\d.]+)/g)].map(match=>Number(match[1]));
  const ends=[...silenceLog.matchAll(/silence_end: ([\d.]+)/g)].map(match=>Number(match[1]));
  const gaps=starts.map((start,index)=>({startSeconds:start,
    endSeconds:ends[index]??duration,
    durationSeconds:(ends[index]??duration)-start}));
  const issues=[];
  if(!Number.isFinite(integratedLufs)||integratedLufs<minLufs) issues.push('AUDIO_TOO_QUIET');
  if(integratedLufs>maxLufs) issues.push('AUDIO_TOO_LOUD');
  if(!Number.isFinite(truePeakDb)||truePeakDb>maxTruePeakDb) issues.push('AUDIO_TRUE_PEAK_TOO_HIGH');
  if(gaps.some(gap=>gap.durationSeconds>maxSilenceSeconds)) issues.push('AUDIO_LONG_SILENCE');
  return {status:issues.length?'needs_audio_review':'pass',durationSeconds:duration,
    integratedLufs,truePeakDb,silenceGaps:gaps,thresholds:{minLufs,maxLufs,
      maxTruePeakDb,maxSilenceSeconds},issues};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
  const {values}=parseArgs({options:{input:{type:'string'},output:{type:'string'}}});
  if(!values.input) throw new Error('Usage: npm run audio:qa -- --input outputs/video.mp4 [--output outputs/video-audio-qa.json]');
  const input=path.resolve(values.input);
  if(!input.startsWith(root+path.sep)) throw new Error('AUDIO_QA_INPUT_OUTSIDE_ROOT');
  const report={input:path.relative(root,input),...await analyzeAudio(input)};
  if(values.output) {
    const output=path.resolve(values.output);
    if(!output.startsWith(path.join(root,'outputs')+path.sep)||path.extname(output)!=='.json')
      throw new Error('AUDIO_QA_OUTPUT_OUTSIDE_OUTPUTS');
    await mkdir(path.dirname(output),{recursive:true});
    await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  }
  console.log(JSON.stringify(report,null,2));
  if(report.status!=='pass') process.exitCode=2;
}
