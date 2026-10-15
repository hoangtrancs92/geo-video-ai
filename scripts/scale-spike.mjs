import {mkdir,readFile,writeFile,appendFile,rm,rename,open,statfs} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {performance} from 'node:perf_hooks';
import {preflight} from './preflight.mjs';
import {browserOptions} from './browser-options.mjs';
import {runProcess} from './process.mjs';
import {inspectPixels,assertMapPixels} from './pixels.mjs';
import {chunkPlan,fileHash,atomicJson,treeBytes,reusableChunk,assertVideo} from './chunks.mjs';
import {resources} from './resources.mjs';
import {resumeIdentity} from './resume-compat.mjs';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{frames:{type:'string',default:'9000'},'chunk-frames':{type:'string',default:'150'},
  output:{type:'string',default:'outputs/m0b/benchmark'},resume:{type:'boolean',default:false},
  'stop-after-chunks':{type:'string'},'max-disk-gb':{type:'string',default:'8'},'max-hours':{type:'string',default:'8'}}});
const total=Number(values.frames),size=Number(values['chunk-frames']),plan=chunkPlan(total,size);
const quota=Number(values['max-disk-gb'])*1024**3,limitMs=Number(values['max-hours'])*3600000;
const stop=values['stop-after-chunks']===undefined?Infinity:Number(values['stop-after-chunks']);
if(!Number.isFinite(quota)||quota<256*1024**2||!Number.isFinite(limitMs)||limitMs<=0||!(stop===Infinity||Number.isSafeInteger(stop)&&stop>0)) throw new Error('INVALID_BUDGET');
const out=path.resolve(values.output);
if(!out.startsWith(path.join(root,'outputs')+path.sep)) throw new Error('OUTPUT_MUST_BE_UNDER_OUTPUTS');
await mkdir(out,{recursive:true});
const lockPath=path.join(out,'render.lock');
// Fail closed on a stale lock; never delete a lock belonging to another renderer.
const lock=await open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid}));
const started=performance.now(),abort=new AbortController();
const report={status:'preparing',kind:total>=5400&&total<=9000?'scale-benchmark':'smoke-only',
  totalFrames:total,fps:30,durationSeconds:total/30,chunks:[],errors:[],resourceSamples:[],
  memoryPolicy:'One PNG plus decoded pixels at a time; at most one chunk PNG directory and one QA directory.',
  syntheticWorkload:true,narration:'none: technical benchmark only',maxDiskBytes:quota};
let server,browser,paused=false,peakBytes=0,renderedFrames=0,captureMs=0,newChunks=0;
const canceled=()=>{abort.abort();void browser?.close().catch(()=>{});};
process.once('SIGINT',canceled);process.once('SIGTERM',canceled);
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg',ffprobe=process.env.FFPROBE_PATH||'ffprobe';
const exec=(bin,args)=>runProcess(bin,args,{timeoutMs:900000,signal:abort.signal});
const budget=async(reserve=0)=>{
  if(abort.signal.aborted) throw new Error('RENDER_CANCELLED');
  if(performance.now()-started>limitMs) throw new Error('TIME_QUOTA_EXCEEDED');
  const used=await treeBytes(out);peakBytes=Math.max(peakBytes,used);
  if(used+reserve>quota) throw new Error(`DISK_QUOTA_EXCEEDED:${used}+${reserve}>${quota}`);
  const fs=await statfs(out);if(fs.bavail*fs.bsize<reserve+128*1024**2) throw new Error('HOST_DISK_SPACE_LOW');
};
const progress=async(stage,chunk,frame)=>{
  await atomicJson(path.join(out,'progress.json'),{stage,chunk,frame,totalFrames:total,completedChunks:report.chunks.length,
    elapsedMs:performance.now()-started,renderedFramesThisAttempt:renderedFrames});
};
const probe=async(file,frames)=>{
  const metadata=JSON.parse(await exec(ffprobe,['-v','error','-count_frames','-show_streams','-of','json',file]));
  assertVideo(metadata,{frames,width:1080,height:1920});return metadata;
};
try {
  report.preflight=preflight();if(report.preflight.status==='blocked') throw new Error('PREFLIGHT_BLOCKED');
  const {createServer}=await import('vite'),{chromium}=await import('playwright'),{PNG}=await import('pngjs');
  const sources=['spike/main.ts','spike/state.ts','spike/camera.ts','spike/frame-ready.ts','spike/index.html',
    'scripts/scale-spike.mjs','scripts/chunks.mjs','scripts/browser-options.mjs','scripts/pixels.mjs','package-lock.json'];
  const hashes={};for(const file of sources) hashes[file]=await fileHash(file);
  const config={version:1,total,size,width:1080,height:1920,fps:30,backend:process.env.WEBGL_BACKEND||'default',sources:hashes,
    ffmpeg:report.preflight.checks.ffmpeg.detail,ffprobe:report.preflight.checks.ffprobe.detail,node:process.version};
  console.log(`M0b ${report.kind}: ${total} frames, ${plan.length} chunks; ${out}`);
  server=await createServer({root,server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  browser=await chromium.launch(browserOptions());config.chromium=browser.version();
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  report.webgl=await page.evaluate(()=>{
    const gl=document.createElement('canvas').getContext('webgl2');if(!gl) return {supported:false};
    const ext=gl.getExtension('WEBGL_debug_renderer_info');const result={supported:true,renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)};
    gl.getExtension('WEBGL_lose_context')?.loseContext();return result;
  });
  if(!report.webgl.supported) throw new Error('WEBGL2_UNAVAILABLE');
  config.renderer=report.webgl.renderer;
  let prior;
  try {prior=JSON.parse(await readFile(path.join(out,'config.json'),'utf8'));}catch(error){if(error.code!=='ENOENT') throw error;}
  const compatibility=resumeIdentity(prior,config,values.resume);
  const identity=compatibility.identity;report.identity=identity;report.config=config;
  if(compatibility.compatiblePatch) {
    report.resumeCompatibility={...compatibility,note:'Only the scratch/QA mkdir fix changed; verified chunk identity is preserved.'};
    console.log('M0b resuming verified chunks across the scratch/QA mkdir maintenance fix.');
  } else await atomicJson(path.join(out,'config.json'),config);
  const chunks=path.join(out,'chunks');await mkdir(chunks,{recursive:true});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(`${origin}/spike/index.html?workload=scale`);
  await page.waitForFunction(()=>Boolean(window.spike),{},{timeout:30000});
  // Replace only our transient scratch directories. Completed chunks stay immutable.
  const scratch=path.join(out,'scratch'),qa=path.join(out,'qa');
  for(const chunk of plan) {
    await budget();
    const name=String(chunk.id).padStart(5,'0'),video=path.join(chunks,name+'.mp4');
    const cached=values.resume?await reusableChunk(chunks,chunk,identity):false;
    if(cached){await probe(video,chunk.count);report.chunks.push({...cached,reused:true});console.log(`M0b reused ${name}`);continue;}
    if(newChunks>=stop){paused=true;break;}
    await rm(scratch,{recursive:true,force:true});await rm(qa,{recursive:true,force:true});await mkdir(scratch,{recursive:true});
    const record={...chunk,identity,status:'rendering',captureMs:0,firstHash:null,lastHash:null,maxBlack:0};
    const chunkStart=performance.now();let previousHash,identicalRun=0;
    await writeFile(path.join(chunks,name+'.frames.jsonl'),'');
    for(let local=0;local<chunk.count;local++) {
      const frame=chunk.start+local;await budget(16*1024**2);
      const begin=performance.now();await page.evaluate(n=>window.spike.setFrame(n),frame);
      const bytes=await page.screenshot({path:path.join(scratch,String(local).padStart(4,'0')+'.png'),animations:'disabled'});
      const stats=inspectPixels(PNG.sync.read(bytes));assertMapPixels(stats);
      if(pageErrors.length) throw new Error(pageErrors.join('\n'));
      identicalRun=stats.hash===previousHash?identicalRun+1:0;previousHash=stats.hash;
      if(identicalRun>=30) throw new Error(`FROZEN_CAPTURE:${frame}`);
      record.firstHash??=stats.hash;record.lastHash=stats.hash;record.maxBlack=Math.max(record.maxBlack,stats.blackFraction);
      const elapsed=performance.now()-begin;record.captureMs+=elapsed;captureMs+=elapsed;renderedFrames++;
      await appendFile(path.join(chunks,name+'.frames.jsonl'),JSON.stringify({frame,...stats,elapsedMs:elapsed})+'\n');
      if(local%30===0){await progress('rendering',chunk.id,frame);console.log(`M0b frame ${frame}/${total} chunk ${chunk.id+1}/${plan.length}`);}
    }
    await progress('encoding',chunk.id,chunk.start+chunk.count-1);
    await budget(chunk.count*1080*1920*4*1.1);
    const candidate=path.join(chunks,name+'.candidate.mp4');
    await exec(ffmpeg,['-y','-framerate','30','-i',path.join(scratch,'%04d.png'),'-frames:v',String(chunk.count),
      '-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',candidate]);
    await probe(candidate,chunk.count);
    await progress('verifying',chunk.id,chunk.start+chunk.count-1);
    await budget(chunk.count*1080*1920*4*1.1);await mkdir(qa,{recursive:true});
    await exec(ffmpeg,['-y','-i',candidate,'-start_number','0',path.join(qa,'%04d.png')]);
    for(let n=0;n<chunk.count;n++) {
      if(abort.signal.aborted) throw new Error('RENDER_CANCELLED');
      assertMapPixels(inspectPixels(PNG.sync.read(await readFile(path.join(qa,String(n).padStart(4,'0')+'.png')))));
    }
    await budget();
    const sample=await resources(browser);report.resourceSamples.push({chunk:chunk.id,...sample});
    record.sha256=await fileHash(candidate);record.status='verified';record.elapsedMs=performance.now()-chunkStart;
    await rename(candidate,video);await atomicJson(path.join(chunks,name+'.json'),record);
    report.chunks.push(record);newChunks++;
    await rm(scratch,{recursive:true,force:true});await rm(qa,{recursive:true,force:true});
    await atomicJson(path.join(out,'report.json'),report);
  }
  if(paused) {report.status='checkpointed';console.log('M0b checkpoint saved; resume with identical settings plus --resume');}
  else {
    const concat=path.join(out,'concat.txt');
    await writeFile(concat,plan.map(c=>`file 'chunks/${String(c.id).padStart(5,'0')}.mp4'`).join('\n')+'\n');
    await progress('assembling',plan.length-1,total-1);await budget(await treeBytes(chunks));
    const candidate=path.join(out,'candidate.mp4');
    await exec(ffmpeg,['-y','-f','concat','-safe','1','-i',concat,'-c','copy','-movflags','+faststart',candidate]);
    report.video=await probe(candidate,total);report.sha256=await fileHash(candidate);
    await rename(candidate,path.join(out,'benchmark.mp4'));report.status='capture-passed';
    report.qa='Every chunk decoded and pixel-checked in full; final stream-copy concat metadata verified.';
  }
} catch(error) {
  report.status=abort.signal.aborted?'canceled':'failed';report.errors.push(String(error));process.exitCode=1;
} finally {
  const cleanup=await Promise.allSettled([browser?.close(),server?.close()]);
  for(const r of cleanup) if(r.status==='rejected') {report.errors.push(`CLEANUP:${r.reason}`);report.status='failed';process.exitCode=1;}
  report.attemptElapsedMs=performance.now()-started;report.peakWorkspaceBytes=peakBytes;
  report.renderedFramesThisAttempt=renderedFrames;report.captureMsThisAttempt=captureMs;
  report.projected20MinCaptureSeconds=renderedFrames?captureMs/renderedFrames*36000/1000:null;
  report.projectionNote='Capture-only extrapolation; excludes encoding/QA/startup, not a measured 20-minute render. Synthetic workload only.';
  report.storageBytes=await treeBytes(out);
  await atomicJson(path.join(out,'report.json'),report);
  await lock.close();await rm(lockPath,{force:true});
  process.removeListener('SIGINT',canceled);process.removeListener('SIGTERM',canceled);
  console.log(`M0b ${report.status}; report: ${path.join(out,'report.json')}`);
}
