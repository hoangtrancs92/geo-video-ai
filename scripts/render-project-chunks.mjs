import {open,mkdir,readFile,rm,rename,writeFile,statfs} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {performance} from 'node:perf_hooks';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {totalFrames} from '../packages/motion/src/timeline.ts';
import {assertSupportedTransitions} from '../packages/motion/src/transition.ts';
import {assertRenderableStyles} from '../packages/styles/src/support.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';
import {chunkPlan,objectHash,fileHash,atomicJson,reusableChunk,assertVideo,treeBytes} from './chunks.mjs';
import {runProcess} from './process.mjs';
import {preflight,commandCheck} from './preflight.mjs';
import {inspectAudio,muxAudio,assertAudioTrack} from './audio.mjs';
import {browserEngine,browserOptions} from './browser-options.mjs';
import {webkit} from 'playwright';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{input:{type:'string',short:'i'},output:{type:'string',short:'o'},
  'chunk-frames':{type:'string',default:'150'},resume:{type:'boolean',default:false},
  plan:{type:'boolean',default:false},
  'stop-after-chunks':{type:'string'},'max-disk-gb':{type:'string',default:'8'},
  'max-hours':{type:'string',default:'12'}}});
if(!values.input||!values.output) throw new Error('Usage: npm run video:render:chunks -- --input examples/japan-china-map.json --output outputs/japan-china.mp4');
const input=path.resolve(values.input),output=path.resolve(values.output);
if(!input.startsWith(root+path.sep)||!output.startsWith(path.join(root,'outputs')+path.sep)||path.extname(output)!=='.mp4')
  throw new Error('INPUT_OR_OUTPUT_OUTSIDE_WORKSPACE');
const project=ProjectSchema.parse(JSON.parse(await readFile(input,'utf8')));
const mapAsset=await verifyProjectAssets(project,root);
assertSupportedTransitions(project);
assertRenderableStyles(project);
if(!project.map.geojsonPath||!project.map.attributionText) throw new Error('GEODATA_AND_ATTRIBUTION_REQUIRED');
if(!['local-synthetic','local-dark'].includes(project.map.styleId)) throw new Error('STYLE_NOT_SUPPORTED_YET');
const geo=validateGeoJson(JSON.parse(await readFile(path.join(root,project.map.geojsonPath),'utf8')));
for(const scene of project.scenes) assertFeatureReferences(scene.regions,geo);
const total=totalFrames(project),chunkFrames=Number(values['chunk-frames']),plan=chunkPlan(total,chunkFrames);
const quota=Number(values['max-disk-gb'])*1024**3,limitMs=Number(values['max-hours'])*3600000;
const stop=values['stop-after-chunks']===undefined?Infinity:Number(values['stop-after-chunks']);
if(!Number.isFinite(quota)||quota<256*1024**2||!Number.isFinite(limitMs)||limitMs<=0||
  !(stop===Infinity||Number.isSafeInteger(stop)&&stop>0)) throw new Error('INVALID_RENDER_BUDGET');
if(values.plan){
  console.log(JSON.stringify({status:'planned',input:path.relative(root,input),output:path.relative(root,output),
    frames:total,fps:project.output.fps,durationSeconds:total/project.output.fps,
    chunkFrames,chunks:plan.length,first:plan[0],last:plan.at(-1)},null,2));
  process.exit(0);
}
const work=output+'.work';await mkdir(work,{recursive:true});
const lockPath=path.join(work,'render.lock'),lock=await open(lockPath,'wx');
await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
const started=performance.now(),abort=new AbortController();let canceled=false;
const signal=()=>{canceled=true;abort.abort();};
process.once('SIGINT',signal);process.once('SIGTERM',signal);
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',ffprobe=process.env.FFPROBE_PATH||'ffprobe';
const exec=(bin,args,timeoutMs=900000,onStdout)=>runProcess(bin,args,{timeoutMs,signal:abort.signal,onStdout});
const report={status:'preparing',input:path.relative(root,input),output:path.relative(root,output),
  mapAsset,
  totalFrames:total,fps:project.output.fps,chunks:[],errors:[],newChunksThisAttempt:0,
  maxDiskBytes:quota,maxHours:limitMs/3600000};
async function budget() {
  if(canceled) throw new Error('RENDER_CANCELLED');
  if(performance.now()-started>limitMs) throw new Error('TIME_QUOTA_EXCEEDED');
  const bytes=await treeBytes(work);
  if(bytes>quota) throw new Error(`DISK_QUOTA_EXCEEDED:${bytes}`);
  const fs=await statfs(work);
  if(fs.bavail*fs.bsize<128*1024**2) throw new Error('HOST_DISK_SPACE_LOW');
}
async function probe(file,frames) {
  const metadata=JSON.parse(await exec(ffprobe,['-v','error','-count_frames','-show_streams','-of','json',file]));
  assertVideo(metadata,{frames,width:project.output.width,height:project.output.height,fps:project.output.fps});
  return metadata;
}
try {
  report.preflight=preflight();if(report.preflight.status==='blocked') throw new Error('PREFLIGHT_BLOCKED');
  const audio=await inspectAudio(project,root,ffprobe);
  report.audio={voice:audio.voice?{sha256:audio.voice.sha256,rights:audio.voice.rights}:null,
    music:audio.music?{sha256:audio.music.sha256,rights:audio.music.rights}:null,
    sfx:audio.sfx.map(cue=>({id:cue.id,sha256:cue.sha256,rights:cue.rights}))};
  const sources={};
  for(const file of [path.relative(root,input),project.map.geojsonPath,'package-lock.json',
    'assets/registry.json',...(mapAsset.metadataPath?[mapAsset.metadataPath]:[]),
    'engine/main.ts','engine/index.html','spike/frame-ready.ts',
    'packages/schema/src/project.schema.ts','packages/motion/src/timeline.ts',
    'packages/motion/src/activity.ts','packages/motion/src/route.ts',
    'packages/motion/src/transition.ts',
    'packages/assets/src/registry.ts',
    'packages/styles/src/style-a.ts',
    'packages/styles/src/support.ts',
    'packages/media/src/subtitles.ts',
    'packages/media/src/text-layout.ts',
    'packages/geodata/src/validate.ts',
    'scripts/audio.mjs',
    'scripts/render-project.mjs','scripts/render-project-chunks.mjs','scripts/chunks.mjs',
    'scripts/process.mjs','scripts/preflight.mjs','scripts/browser-options.mjs',
    'scripts/pixels.mjs','scripts/blend-png.mjs'])
    sources[file]=await fileHash(path.join(root,file));
  for(const asset of [audio.voice,audio.music,...audio.sfx])
    if(asset) sources[path.relative(root,asset.path)]=asset.sha256;
  const engine=browserEngine();
  browserOptions();
  const browserVersion=engine==='chromium'&&process.env.CHROME_PATH?
    commandCheck(process.env.CHROME_PATH,['--version']):{ok:true,detail:'playwright-default'};
  if(!browserVersion.ok) throw new Error(`BROWSER_VERSION_FAILED:${browserVersion.detail}`);
  const config={version:1,sources,width:project.output.width,height:project.output.height,
    fps:project.output.fps,total,chunkFrames,backend:process.env.WEBGL_BACKEND||'default',
    node:process.version,browserEngine:engine,browserPath:engine==='chromium'?process.env.CHROME_PATH||null:webkit.executablePath(),
    browserVersion:browserVersion.detail,
    ffmpeg:report.preflight.checks.ffmpeg.detail,ffprobe:report.preflight.checks.ffprobe.detail};
  const identity=objectHash(config);report.identity=identity;
  let prior;
  try {prior=JSON.parse(await readFile(path.join(work,'config.json'),'utf8'));}
  catch(error){if(error.code!=='ENOENT') throw error;}
  if(prior&&(!values.resume||objectHash(prior)!==identity)) throw new Error('RESUME_CONFIG_MISMATCH_OR_RESUME_REQUIRED');
  await atomicJson(path.join(work,'config.json'),config);
  const chunks=path.join(work,'chunks');await mkdir(chunks,{recursive:true});
  let paused=false;
  for(const chunk of plan) {
    await budget();
    const name=String(chunk.id).padStart(5,'0'),video=path.join(chunks,name+'.mp4');
    const cached=values.resume?await reusableChunk(chunks,chunk,identity):false;
    if(cached){await probe(video,chunk.count);report.chunks.push({...cached,reused:true});continue;}
    if(report.newChunksThisAttempt>=stop){paused=true;break;}
    await atomicJson(path.join(work,'progress.json'),{status:'rendering',chunk:chunk.id,
      startFrame:chunk.start,count:chunk.count,totalFrames:total});
    console.log(`Render chunk ${chunk.id+1}/${plan.length}, frames ${chunk.start}–${chunk.start+chunk.count-1}`);
    const stdout=await exec(process.execPath,['scripts/render-project.mjs','--input',input,
      '--output',video,'--start-frame',String(chunk.start),'--frames',String(chunk.count),'--video-only'],
      900000,progress=>process.stdout.write(progress));
    const reportFile=stdout.match(/Project render capture-passed; report: (.+)\r?\n/)?.[1]?.trim();
    if(!reportFile) throw new Error(`CHUNK_REPORT_MISSING:${chunk.id}:${stdout.slice(-400)}`);
    const child=JSON.parse(await readFile(reportFile,'utf8'));
    if(child.status!=='capture-passed'||child.frames!==chunk.count||child.startFrame!==chunk.start)
      throw new Error(`CHUNK_REPORT_INVALID:${chunk.id}`);
    await probe(video,chunk.count);
    const checksum=await fileHash(video);
    if(checksum!==child.sha256) throw new Error(`CHUNK_CHECKSUM_MISMATCH:${chunk.id}`);
    const record={...chunk,identity,status:'verified',sha256:checksum,
      sentinelHashes:child.sentinels.map(s=>({frame:s.frame,hash:s.hash,scene:s.scene})),
      intentionalHoldFrames:child.intentionalHoldFrames||0};
    await atomicJson(path.join(chunks,name+'.json'),record);
    report.chunks.push(record);report.newChunksThisAttempt++;
    await rm(path.dirname(reportFile),{recursive:true,force:true});
    await atomicJson(path.join(work,'report.json'),report);
  }
  if(paused) report.status='checkpointed';
  else {
    const concat=path.join(work,'concat.txt');
    await writeFile(concat,plan.map(c=>`file 'chunks/${String(c.id).padStart(5,'0')}.mp4'`).join('\n')+'\n');
    let candidate=path.join(work,'candidate.mp4');
    await budget();await atomicJson(path.join(work,'progress.json'),{status:'assembling',completedChunks:plan.length,totalFrames:total});
    await exec(ffmpeg,['-y','-f','concat','-safe','1','-i',concat,'-c','copy','-movflags','+faststart',candidate]);
    let mixedAudio=false;
    if(audio.voice||audio.music||audio.sfx.length) {
      const withAudio=path.join(work,'candidate-with-audio.mp4');
      mixedAudio=await muxAudio(candidate,audio,withAudio,{startFrame:0,frames:total,fps:project.output.fps,
        ffmpeg,signal:abort.signal});
      if(mixedAudio) candidate=withAudio;
    }
    report.video=await probe(candidate,total);
    if(mixedAudio) assertAudioTrack(report.video,total,project.output.fps);
    report.sha256=await fileHash(candidate);
    await rename(candidate,output);report.status='capture-passed';
  }
} catch(error) {
  report.status=canceled?'cancelled':'failed';report.errors.push(String(error));process.exitCode=1;
} finally {
  report.attemptElapsedMs=performance.now()-started;
  await atomicJson(path.join(work,'report.json'),report);
  await lock.close();await rm(lockPath,{force:true});
  process.removeListener('SIGINT',signal);process.removeListener('SIGTERM',signal);
  console.log(`Chunked project render ${report.status}; report: ${path.join(work,'report.json')}`);
}
