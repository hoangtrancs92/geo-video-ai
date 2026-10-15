import {mkdir,mkdtemp,writeFile,copyFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {preflight} from './preflight.mjs';
import {inspectPixels,assertMapPixels} from './pixels.mjs';
import {runProcess as exec} from './process.mjs';
import {browserOptions} from './browser-options.mjs';
import {renderIdentity} from './render-identity.mjs';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
const runs=path.join(root,'outputs','m0');
await mkdir(runs,{recursive:true});
// Keep failures isolated from previous successful videos and retained evidence.
const out=await mkdtemp(path.join(runs,'run-'));
const report={status:'running',mode:'screenshot-ffmpeg-candidate',frames:[],sentinels:[],errors:[]};
let server,browser;
try {
  console.log(`M0 preflight; run: ${out}`);
  report.preflight=preflight();
  if (report.preflight.status==='blocked') throw new Error('PREFLIGHT_BLOCKED: see checks in report');
  const {createServer}=await import('vite');
  const {chromium}=await import('playwright');
  const {PNG}=await import('pngjs');
  server=await createServer({root,server:{host:'127.0.0.1',port:0},logLevel:'error'});
  await server.listen();
  const port=server.httpServer.address().port;
  const origin=`http://127.0.0.1:${port}`;
  report.webglBackend=process.env.WEBGL_BACKEND || 'default';
  console.log(`M0 starting Chromium; WebGL backend: ${report.webglBackend}`);
  browser=await chromium.launch(browserOptions());
  report.chromium=browser.version();
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  report.webgl=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    const gl=canvas.getContext('webgl2');
    if(!gl) return {supported:false};
    const info=gl.getExtension('WEBGL_debug_renderer_info');
    const result={supported:true,version:gl.getParameter(gl.VERSION),
      renderer:gl.getParameter(info?info.UNMASKED_RENDERER_WEBGL:gl.RENDERER),
      vendor:gl.getParameter(info?info.UNMASKED_VENDOR_WEBGL:gl.VENDOR)};
    gl.getExtension('WEBGL_lose_context')?.loseContext();return result;
  });
  if(!report.webgl.supported) throw new Error(`WEBGL2_UNAVAILABLE:${report.webglBackend}`);
  Object.assign(report, await renderIdentity(pathToFileURL(root + path.sep),
    report.preflight, report.chromium, report.webgl, report.webglBackend));
  console.log(`M0 WebGL2 ready: ${report.webgl.renderer}`);
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(`${origin}/spike/index.html`);
  await page.waitForFunction(()=>Boolean(window.spike),{},{timeout:30000});
  console.log('M0 capturing 100 frames');
  const frames=path.join(out,'frames');await mkdir(frames,{recursive:true});
  for(let n=0;n<100;n++) {
    const begin=performance.now();
    const state=await page.evaluate(n=>window.spike.setFrame(n),n);
    const bytes=await page.screenshot({path:path.join(frames,`${String(n).padStart(4,'0')}.png`),animations:'disabled'});
    const stats=inspectPixels(PNG.sync.read(bytes));
    const evidence={...state,...stats,elapsedMs:performance.now()-begin};
    report.frames.push({...evidence,validated:false});
    assertMapPixels(stats);
    if(report.errors.length) throw new Error(report.errors.join('\n'));
    report.frames[report.frames.length-1].validated=true;
    if([0,25,50,75,99].includes(n)) await copyFile(path.join(frames,`${String(n).padStart(4,'0')}.png`),path.join(out,`sentinel-${n}.png`));
    if(n%10===0) console.log(`M0 ${n}/100`);
  }
  if(new Set(report.frames.map(f=>f.hash)).size<95) throw new Error('FROZEN_OR_DUPLICATE_FRAMES');
  // Seek backwards/out of order: catches stateful animation and stale GPU frames.
  for(const n of [99,50,0,75,25]) {
    await page.evaluate(n=>window.spike.setFrame(n),n);
    const stats=inspectPixels(PNG.sync.read(await page.screenshot({animations:'disabled'})));
    const match=stats.hash===report.frames[n].hash;
    report.sentinels.push({frame:n,match,hash:stats.hash});
    if(!match) throw new Error(`NONDETERMINISTIC_SENTINEL:${n}`);
  }
  await page.evaluate(()=>window.spike.dispose());
  const candidate=path.join(out,'candidate.mp4');
  await exec(process.env.FFMPEG_PATH||'ffmpeg',['-y','-framerate','30','-i',path.join(frames,'%04d.png'),
    '-frames:v','100','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',candidate]);
  report.video=JSON.parse(await exec(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-count_frames','-show_streams','-of','json',candidate]));
  const stream=report.video.streams.find(s=>s.codec_type==='video');
  if(!stream || stream.width!==1080 || stream.height!==1920 || stream.nb_read_frames!=='100' || stream.codec_name!=='h264' || stream.r_frame_rate!=='30/1') throw new Error('INVALID_MP4_METADATA');
  const decoded=path.join(out,'decoded');await mkdir(decoded,{recursive:true});
  await exec(process.env.FFMPEG_PATH||'ffmpeg',['-y','-i',candidate,'-start_number','0',path.join(decoded,'%04d.png')]);
  for(let n=0;n<100;n++) assertMapPixels(inspectPixels(PNG.sync.read(await readFile(path.join(decoded,`${String(n).padStart(4,'0')}.png`)))));
  report.sha256=createHash('sha256').update(await readFile(candidate)).digest('hex');
  await rename(candidate,path.join(out,'spike.mp4'));
  report.status='capture-passed';
  report.note='Mode 2 candidate passed. Remotion comparison and real licensed geographical data still required before the full M0 gate.';
} catch(error) {
  report.status='failed';report.errors.push(String(error));process.exitCode=1;
} finally {
  const cleanup=await Promise.allSettled([browser?.close(),server?.close()]);
  for(const result of cleanup) if(result.status==='rejected') {
    report.errors.push(`CLEANUP_FAILURE: ${result.reason}`);report.status='failed';process.exitCode=1;
  }
  await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(path.join(runs,'latest.json'),JSON.stringify({runDirectory:out,status:report.status},null,2)+'\n');
  console.log(`M0 ${report.status}; report: ${path.join(out,'report.json')}`);
}
