import {readFile} from 'node:fs/promises';
import {fileHash,atomicJson,objectHash,assertVideo} from './chunks.mjs';
import path from 'node:path';

export function compareReports(a,b) {
  const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  for (const report of [a,b]) {
    if(report?.status!=='capture-passed'||!Array.isArray(report.frames)||report.frames.length!==100)
      throw new Error('TWO_SUCCESSFUL_100_FRAME_RUNS_REQUIRED');
    if(!sha(report.sha256)||report.frames.some(f=>!sha(f.hash)||f.validated!==true))
      throw new Error('MISSING_VALIDATED_FRAME_EVIDENCE');
    if(new Set(report.frames.map(f=>f.hash)).size<95) throw new Error('FROZEN_OR_DUPLICATE_FRAMES');
    if(!Array.isArray(report.sentinels)||[0,25,50,75,99].some(frame=>
      !report.sentinels.some(s=>s.frame===frame&&s.match===true&&s.hash===report.frames[frame]?.hash)))
      throw new Error('MISSING_SENTINEL_EVIDENCE');
    assertVideo(report.video,{frames:100,width:1080,height:1920});
    if(report.identity && (!report.config || objectHash(report.config)!==report.identity))
      throw new Error('INVALID_RENDER_IDENTITY');
  }
  const mismatches=[];
  for(let n=0;n<100;n++) {
    if(a.frames[n].frame!==n||b.frames[n].frame!==n) throw new Error('INVALID_FRAME_SEQUENCE');
    if(a.frames[n].hash!==b.frames[n].hash) mismatches.push(n);
  }
  return {status:mismatches.length?'different':'pixel-identical',comparedFrames:100,mismatches,
    environmentMatch:Boolean(a.chromium&&a.webgl?.renderer&&a.webgl?.supported&&b.webgl?.supported&&
      a.chromium===b.chromium&&a.webgl.renderer===b.webgl.renderer),
    buildMatch:Boolean(a.identity&&b.identity&&a.identity===b.identity),
    encodedBytesMatch:a.sha256===b.sha256};
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(import.meta.dirname,'compare-runs.mjs')) {
  const dirs=process.argv.slice(2).map(d=>path.resolve(d));
  if(dirs.length!==2||dirs[0]===dirs[1]) throw new Error('Usage: npm run spike:compare -- <run-A> <different-run-B>');
  const reports=[];
  for(const dir of dirs) {
    const report=JSON.parse(await readFile(path.join(dir,'report.json'),'utf8'));
    if(await fileHash(path.join(dir,'spike.mp4'))!==report.sha256) throw new Error(`ARTIFACT_CHECKSUM_MISMATCH:${dir}`);
    reports.push(report);
  }
  const result={...compareReports(...reports),runs:dirs};
  await atomicJson(path.join(dirs[1],'repeat-comparison.json'),result);
  console.log(JSON.stringify(result,null,2));
  if(result.status!=='pixel-identical'||!result.environmentMatch||!result.buildMatch) process.exitCode=1;
}
