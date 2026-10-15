import {readFile,mkdir,writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {runProcess} from './process.mjs';
import {fileHash} from './chunks.mjs';

const root=path.resolve(import.meta.dirname,'..');
function inRoot(file,base=root) {
  const absolute=path.resolve(file);
  if(!absolute.startsWith(base+path.sep)) throw new Error('SPEECH_PATH_OUTSIDE_ROOT');
  return absolute;
}
function stamp(seconds) {
  const ms=Math.round(seconds*1000),h=Math.floor(ms/3600000),
    m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:`+
    `${String(s).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;
}
function assStamp(seconds) {
  const cs=Math.round(seconds*100),h=Math.floor(cs/360000),
    m=Math.floor(cs/6000)%60,s=Math.floor(cs/100)%60;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.`+
    String(cs%100).padStart(2,'0');
}
export function captionsFromMeasuredCues(cues,{width=1920,height=1080}={}) {
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||
    width<320||height<320||width>3840||height>3840)
    throw new Error('SPEECH_INVALID_CAPTION_CANVAS');
  const srt=cues.map((cue,index)=>`${index+1}\n${stamp(cue.startSeconds)} --> `+
    `${stamp(cue.endSeconds)}\n${cue.text}\n`).join('\n');
  const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\n`+
    '\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, '+
    'OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, '+
    'Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n'+
    `Style: Default,Arial,${width<height?64:48},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,1,2,80,80,${width<height?180:60},1\n`+
    '\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n';
  const ass=header+cues.map(cue=>`Dialogue: 0,${assStamp(cue.startSeconds)},`+
    `${assStamp(cue.endSeconds)},Default,,0,0,0,,${cue.text.replace(/\\/g,'\\\\')
      .replace(/[{}]/g,'')}`).join('\n')+'\n';
  return {srt,ass};
}
export async function assembleSpeech(manifest,outputDir,{ffmpeg='ffmpeg',
  ffprobe=process.env.FFPROBE_PATH||'ffprobe',say='/usr/bin/say'}={}) {
  if(!manifest||!Array.isArray(manifest.segments)||!manifest.segments.length||
    !Number.isFinite(manifest.targetSeconds)||manifest.targetSeconds<=0||
    !manifest.rights?.license||!manifest.rights?.attribution)
    throw new Error('SPEECH_INVALID_MANIFEST_OR_RIGHTS');
  if(!['imported','macos_say'].includes(manifest.provider)) throw new Error('SPEECH_PROVIDER_UNAVAILABLE');
  if(manifest.output&&(!Number.isSafeInteger(manifest.output.width)||
    !Number.isSafeInteger(manifest.output.height))) throw new Error('SPEECH_INVALID_CAPTION_CANVAS');
  const ids=new Set(),files=[],cues=[];let cursor=0;
  const output=inRoot(outputDir,path.join(root,'outputs'));
  await mkdir(output,{recursive:true});
  for(const [index,item] of manifest.segments.entries()) {
    if(typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(item.id)||ids.has(item.id)||
      typeof item.text!=='string'||!item.text.trim()||item.text.length>1200)
      throw new Error(`SPEECH_INVALID_SEGMENT:${index}`);
    ids.add(item.id);
    let file;
    if(manifest.provider==='macos_say') {
      if(!/^[A-Za-z0-9 _-]{1,80}$/.test(manifest.voiceId??''))
        throw new Error('SPEECH_INVALID_VOICE_ID');
      if(manifest.rateWpm!==undefined&&(!Number.isInteger(manifest.rateWpm)||
        manifest.rateWpm<80||manifest.rateWpm>250)) throw new Error('SPEECH_INVALID_RATE');
      file=path.join(output,`segment-${String(index).padStart(4,'0')}.aiff`);
      await runProcess(say,['-v',manifest.voiceId,
        ...(manifest.rateWpm?['-r',String(manifest.rateWpm)]:[]),
        '-o',file,'--',item.text],{timeoutMs:120000});
    } else {
      if(typeof item.assetPath!=='string') throw new Error(`SPEECH_ASSET_REQUIRED:${item.id}`);
      file=await realpath(inRoot(item.assetPath));
      if(!file.startsWith(root+path.sep)) throw new Error('SPEECH_ASSET_OUTSIDE_ROOT');
    }
    const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams',
      '-show_format','-of','json',file]));
    if(probe.streams?.filter(stream=>stream.codec_type==='audio').length!==1)
      throw new Error(`SPEECH_ONE_AUDIO_STREAM_REQUIRED:${item.id}`);
    let duration=Number(probe.format?.duration);
    if(!Number.isFinite(duration)||duration<=0) throw new Error(`SPEECH_INVALID_DURATION:${item.id}`);
    if(item.targetSeconds!==undefined) {
      if(!Number.isFinite(item.targetSeconds)||item.targetSeconds<=0)
        throw new Error(`SPEECH_INVALID_SEGMENT_TARGET:${item.id}`);
      const tempo=duration/item.targetSeconds;
      if(tempo<.7||tempo>1.3) throw new Error(`SPEECH_SEGMENT_TEMPO_OUT_OF_RANGE:${item.id}:${tempo}`);
      const timed=path.join(output,`segment-${String(index).padStart(4,'0')}-timed.wav`);
      await runProcess(ffmpeg,['-y','-i',file,'-af',
        `atempo=${tempo},apad=whole_dur=${item.targetSeconds},atrim=duration=${item.targetSeconds}`,
        '-c:a','pcm_s16le',timed],{timeoutMs:120000});
      file=timed;duration=item.targetSeconds;
    }
    files.push({id:item.id,file,duration,sha256:await fileHash(file)});
    cues.push({id:item.id,text:item.text.trim().replace(/\s+/g,' '),
      startSeconds:cursor,endSeconds:cursor+duration});
    cursor+=duration;
  }
  if(cursor>manifest.targetSeconds+.02) throw new Error(`SPEECH_EXCEEDS_TARGET:${cursor}`);
  if(manifest.targetSeconds-cursor>2) throw new Error('SPEECH_EXCESSIVE_SILENT_TAIL');
  const args=['-y'];for(const file of files) args.push('-i',file.file);
  const pads=files.map((_,index)=>`[${index}:a:0]aresample=48000,`+
    `aformat=channel_layouts=mono,asetpts=PTS-STARTPTS[a${index}]`);
  const joined=files.map((_,index)=>`[a${index}]`).join('')+
    `concat=n=${files.length}:v=0:a=1,apad=whole_dur=${manifest.targetSeconds},`+
    `atrim=duration=${manifest.targetSeconds},volume=-2dB[out]`;
  const wav=path.join(output,'voice.wav');
  await runProcess(ffmpeg,[...args,'-filter_complex',[...pads,joined].join(';'),
    '-map','[out]','-c:a','pcm_s16le',wav],{timeoutMs:900000});
  const actual=JSON.parse(await runProcess(ffprobe,['-v','error','-show_format','-of','json',wav]));
  if(Math.abs(Number(actual.format?.duration)-manifest.targetSeconds)>.03)
    throw new Error('SPEECH_FINAL_DURATION_MISMATCH');
  const {srt,ass}=captionsFromMeasuredCues(cues,manifest.output);
  await writeFile(path.join(output,'captions.srt'),srt);
  await writeFile(path.join(output,'captions.ass'),ass);
  const report={status:'audio_assembled',provider:manifest.provider,
    rights:manifest.rights,targetSeconds:manifest.targetSeconds,
    measuredSpeechSeconds:cursor,voicePath:path.relative(root,wav),
    voiceSha256:await fileHash(wav),captionsPath:path.relative(root,path.join(output,'captions.srt')),
    assPath:path.relative(root,path.join(output,'captions.ass')),
    captionsEnabled:false,alignment:manifest.segments.some(item=>item.targetSeconds!==undefined)?
      'segment_target_duration':'segment_audio_duration',
    captionCanvas:manifest.output??{width:1920,height:1080},
    segments:files.map((file,index)=>({...cues[index],assetSha256:file.sha256}))};
  await writeFile(path.join(output,'speech-report.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  process.chdir(root);
  const {values}=parseArgs({options:{manifest:{type:'string'},'output-dir':{type:'string'}}});
  if(!values.manifest||!values['output-dir'])
    throw new Error('Usage: npm run speech:assemble -- --manifest path.json --output-dir outputs/speech/id');
  const input=inRoot(values.manifest);
  const manifest=JSON.parse(await readFile(input,'utf8'));
  console.log(JSON.stringify(await assembleSpeech(manifest,values['output-dir']),null,2));
}
