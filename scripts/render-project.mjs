import {readFile,writeFile,mkdir,mkdtemp,copyFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {totalFrames,sceneAtFrame} from '../packages/motion/src/timeline.ts';
import {sceneHasMotion} from '../packages/motion/src/activity.ts';
import {transitionAtFrame,assertSupportedTransitions} from '../packages/motion/src/transition.ts';
import {assertRenderableStyles} from '../packages/styles/src/support.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {verifyProjectAssets} from '../packages/assets/src/registry.ts';
import {preflight} from './preflight.mjs';
import {runProcess} from './process.mjs';
import {browserEngine,browserOptions} from './browser-options.mjs';
import {inspectPixels} from './pixels.mjs';
import {dimPng} from './blend-png.mjs';
import {assertVideo,fileHash,atomicJson} from './chunks.mjs';
import {inspectAudio,muxAudio,assertAudioTrack} from './audio.mjs';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const {values}=parseArgs({options:{input:{type:'string',short:'i'},output:{type:'string',short:'o'},frames:{type:'string'},'start-frame':{type:'string',default:'0'},'sample-frames':{type:'string'},'video-only':{type:'boolean',default:false}}});
if(!values.input||!values.output) throw new Error('Usage: npm run video:render -- --input examples/mixed-acd.json --output outputs/mixed-acd.mp4');
const input=path.resolve(values.input),output=path.resolve(values.output);
if(!input.startsWith(root+path.sep)||!output.startsWith(path.join(root,'outputs')+path.sep)||
  path.extname(output)!=='.mp4') throw new Error('INPUT_OR_OUTPUT_OUTSIDE_WORKSPACE');
const project=ProjectSchema.parse(JSON.parse(await readFile(input,'utf8')));
const mapAsset=await verifyProjectAssets(project,root);
assertSupportedTransitions(project);
assertRenderableStyles(project);
if(!project.map.geojsonPath||!project.map.attributionText) throw new Error('GEODATA_AND_ATTRIBUTION_REQUIRED');
if(!['local-synthetic','local-dark'].includes(project.map.styleId)) throw new Error('STYLE_NOT_SUPPORTED_YET');
const geo=validateGeoJson(JSON.parse(await readFile(path.join(root,project.map.geojsonPath),'utf8')));
for(const scene of project.scenes) assertFeatureReferences(scene.regions,geo);
const startFrame=Number(values['start-frame']);
if(values['sample-frames']!==undefined&&(values.frames!==undefined||startFrame!==0)) throw new Error('SAMPLE_FRAMES_CANNOT_MIX_WITH_RANGE');
const samples=values['sample-frames']?.split(',').map(Number);
if(samples&&(!samples.length||samples.length>30||samples.some(n=>!Number.isSafeInteger(n)||n<0||n>=totalFrames(project))||
  new Set(samples).size!==samples.length)) throw new Error('INVALID_SAMPLE_FRAMES');
const count=samples?.length??(values.frames===undefined?totalFrames(project)-startFrame:Number(values.frames));
if(!samples&&(!Number.isSafeInteger(startFrame)||startFrame<0||startFrame>=totalFrames(project)||
   !Number.isSafeInteger(count)||count<1||count>Math.min(900,totalFrames(project)-startFrame))) throw new Error('INVALID_FRAME_COUNT_OR_ONE_SHOT_LIMIT');
const report={status:'preparing',input:path.relative(root,input),output:path.relative(root,output),frames:count,startFrame,
  browserEngine:browserEngine(),
  mapAsset,
  sampleFrames:samples??null,totalProjectFrames:totalFrames(project),
  partial:Boolean(samples)||startFrame!==0||count!==totalFrames(project),errors:[],sentinels:[]};
await mkdir(path.dirname(output),{recursive:true});
const run=await mkdtemp(path.join(path.dirname(output),'render-run-'));
let browser;
try {
  if(samples&&(project.audio.voiceover||project.audio.music||project.audio.sfx.length)&&
    !values['video-only']) throw new Error('AUDIO_SPARSE_SAMPLES_UNSUPPORTED');
  const audio=await inspectAudio(project,root);
  report.audio={voice:audio.voice?{sha256:audio.voice.sha256,rights:audio.voice.rights}:null,
    music:audio.music?{sha256:audio.music.sha256,rights:audio.music.rights}:null,
    sfx:audio.sfx.map(cue=>({id:cue.id,sha256:cue.sha256,rights:cue.rights})),
    videoOnly:values['video-only']};
  report.preflight=preflight();if(report.preflight.status==='blocked') throw new Error('PREFLIGHT_BLOCKED');
  const {build}=await import('vite'),playwright=await import('playwright'),{PNG}=await import('pngjs');
  const bundle=path.join(run,'bundle');
  await build({root,logLevel:'error',base:'/',build:{target:'esnext',outDir:bundle,
    emptyOutDir:true,rollupOptions:{input:path.join(root,'engine/index.html')}}});
  const origin='http://engine.local';
  const engine=browserEngine();
  browser=await playwright[engine].launch(browserOptions());
  report.browser={engine,version:browser.version()};
  if(engine==='chromium') report.chromium=browser.version();
  const page=await browser.newPage({viewport:{width:project.output.width,height:project.output.height},deviceScaleFactor:1});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin||url.pathname.includes('..')) {await route.abort();return;}
    const relative=url.pathname.slice(1),built=path.resolve(bundle,relative),source=path.resolve(root,relative);
    const file=relative.startsWith('engine/')||relative.startsWith('assets/index-')?built:source;
    if(!(file.startsWith(bundle+path.sep)||file.startsWith(root+path.sep))) {await route.abort();return;}
    try {
      const ext=path.extname(file),contentType=ext==='.html'?'text/html':ext==='.js'?'text/javascript':
        ext==='.css'?'text/css':ext==='.json'||ext==='.geojson'?'application/json':'application/octet-stream';
      await route.fulfill({status:200,contentType,body:await readFile(file)});
    } catch {await route.fulfill({status:404,body:'Not found'});}
  });
  await page.goto(`${origin}/engine/index.html?project=/${path.relative(root,input).split(path.sep).join('/')}`);
  await page.waitForFunction(()=>Boolean(window.engine),{},{timeout:30000});
  const frames=path.join(run,'frames');await mkdir(frames);
  let previousHash,previousScene,identicalRun=0;report.intentionalHoldFrames=0;report.blendedFrames=0;
  for(let n=0;n<count;n++) {
    const frame=samples?.[n]??startFrame+n;
    const transition=transitionAtFrame(project,frame);
    let previousPng;
    if(transition?.source==='previous') {
      await page.evaluate(fromFrame=>window.engine.setFrame(fromFrame),transition.fromFrame);
      previousPng=await page.screenshot({animations:'disabled'});
    }
    const state=await page.evaluate(frame=>window.engine.setFrame(frame),frame);
    const frameFile=path.join(frames,String(n).padStart(4,'0')+'.png');
    let png=await page.screenshot({animations:'disabled'});
    if(transition) {
      const source=transition.source==='previous'?previousPng:png;
      const sourceStats=inspectPixels(PNG.sync.read(source));
      if(sourceStats.blackFraction>.95||sourceStats.cyanFraction+sourceStats.pinkFraction<.0002)
        throw new Error(`INVALID_TRANSITION_SOURCE:${frame}`);
      png=dimPng(source,transition.opacity);report.blendedFrames++;
    }
    await writeFile(frameFile,png);
    const stats=inspectPixels(PNG.sync.read(png));
    if(!transition&&(stats.blackFraction>.95||stats.cyanFraction+stats.pinkFraction<.0002)) throw new Error(`INVALID_MAP_PIXELS:${n}`);
    if(pageErrors.length) throw new Error(pageErrors.join('\n'));
    const scene=sceneAtFrame(project,frame).scene;
    identicalRun=scene.id===previousScene&&stats.hash===previousHash?identicalRun+1:0;
    if(identicalRun>0&&!sceneHasMotion(scene)) report.intentionalHoldFrames++;
    previousHash=stats.hash;previousScene=scene.id;
    if(sceneHasMotion(scene)&&identicalRun>=30) throw new Error(`FROZEN_CAPTURE:${frame}`);
    if(samples||n===0||n===count-1||project.scenes.some(s=>s.startFrame===frame)) {
      report.sentinels.push({...state,...stats});
      await copyFile(path.join(frames,String(n).padStart(4,'0')+'.png'),path.join(run,`sentinel-${frame}.png`));
    }
    if(n%30===0) console.log(`Project frame ${frame}/${totalFrames(project)} (${state.style})`);
  }
  await page.evaluate(()=>window.engine.dispose());
  let candidate=path.join(run,'candidate.mp4');
  await runProcess(process.env.FFMPEG_PATH||'ffmpeg',['-y','-framerate',String(project.output.fps),
    '-i',path.join(frames,'%04d.png'),'-frames:v',String(count),'-an','-c:v','libx264',
    '-crf',project.output.quality==='high'?'18':'23','-pix_fmt','yuv420p','-movflags','+faststart',candidate],{timeoutMs:900000});
  let mixedAudio=false;
  if(!values['video-only']&&(audio.voice||audio.music||audio.sfx.length)) {
    const withAudio=path.join(run,'candidate-with-audio.mp4');
    mixedAudio=await muxAudio(candidate,audio,withAudio,{startFrame,frames:count,fps:project.output.fps});
    if(mixedAudio) candidate=withAudio;
  }
  report.video=JSON.parse(await runProcess(process.env.FFPROBE_PATH||'ffprobe',
    ['-v','error','-count_frames','-show_streams','-of','json',candidate]));
  assertVideo(report.video,{frames:count,width:project.output.width,height:project.output.height,fps:project.output.fps});
  if(mixedAudio) assertAudioTrack(report.video,count,project.output.fps);
  const decoded=path.join(run,'decoded');await mkdir(decoded);
  await runProcess(process.env.FFMPEG_PATH||'ffmpeg',['-y','-i',candidate,'-start_number','0',path.join(decoded,'%04d.png')],{timeoutMs:900000});
  for(let n=0;n<count;n++) {
    const stats=inspectPixels(PNG.sync.read(await readFile(path.join(decoded,String(n).padStart(4,'0')+'.png'))));
    if(!transitionAtFrame(project,samples?.[n]??startFrame+n)&&
      (stats.blackFraction>.95||stats.cyanFraction+stats.pinkFraction<.0002)) throw new Error(`INVALID_DECODED_PIXELS:${n}`);
  }
  report.sha256=await fileHash(candidate);
  await rename(candidate,output);report.status='capture-passed';
  await rm(frames,{recursive:true,force:true});await rm(decoded,{recursive:true,force:true});
} catch(error) {report.status='failed';report.errors.push(String(error));process.exitCode=1;}
finally {
  const cleanup=await Promise.allSettled([browser?.close()]);
  for(const result of cleanup) if(result.status==='rejected') {report.status='failed';report.errors.push(`CLEANUP:${result.reason}`);process.exitCode=1;}
  await atomicJson(path.join(run,'report.json'),report);
  console.log(`Project render ${report.status}; report: ${path.join(run,'report.json')}`);
}
