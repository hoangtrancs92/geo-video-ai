import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {atomicJson} from './chunks.mjs';

const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
const {values}=parseArgs({options:{scale:{type:'boolean',default:false}}});
await mkdir('outputs/verification',{recursive:true});
const out=await mkdtemp(path.resolve('outputs/verification/run-'));
const report={status:'running',steps:[],scope:'Mode 2 repeatability and chunk recovery',
  limitations:['Remotion comparison remains pending.', 'Synthetic geometry; not country data.',
    'This command does not certify the complete M0 milestone.']};
const reportPath=path.join(out,'report.json');
let active,signal;
const cancel=name=>{signal=name;active?.kill(name);};
const interrupt=()=>cancel('SIGINT'),terminate=()=>cancel('SIGTERM');
process.once('SIGINT',interrupt);process.once('SIGTERM',terminate);
async function run(name,script,args=[]) {
  if(signal) throw new Error('VERIFICATION_CANCELLED');
  const step={name,script,args,status:'running'};report.steps.push(step);
  await atomicJson(reportPath,report);
  console.log(`\nVerification: ${name}`);
  const result=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd:root,stdio:['ignore','pipe','inherit']});
    active=child;let tail='';
    child.stdout.on('data',bytes=>{process.stdout.write(bytes);tail=(tail+bytes).slice(-64000);});
    child.once('error',reject);
    child.once('close',(code,exitSignal)=>resolve({code,exitSignal,tail}));
  });
  active=undefined;
  Object.assign(step,{status:result.code===0?'passed':'failed',exitCode:result.code,signal:result.exitSignal});
  await atomicJson(reportPath,report);
  if(result.code!==0) throw new Error(`STEP_FAILED:${name}`);
  return result.tail;
}
try {
  const runs=[];
  for(const name of ['first browser capture','second browser capture']) {
    const output=await run(name,'scripts/capture.mjs');
    const file=output.match(/M0 capture-passed; report: (.+)\r?\n/)?.[1];
    if(!file) throw new Error('CAPTURE_REPORT_NOT_FOUND');
    runs.push(path.dirname(file.trim()));
  }
  report.runs=runs;
  await run('compare complete runs','scripts/compare-runs.mjs',runs);
  await run('restart and resume chunks','scripts/checkpoint-smoke.mjs');
  if(values.scale) {
    const destination=path.join(out,'scale');
    await run('five minute sustained benchmark','scripts/scale-spike.mjs',
      ['--frames','9000','--chunk-frames','150','--output',destination]);
    report.benchmark=JSON.parse(await readFile(path.join(destination,'report.json'),'utf8'));
  } else report.limitations.push('M0b scale benchmark not requested; run with --scale to measure 9000 frames.');
  report.status='checks-passed';
} catch(error) {
  report.status=signal?'cancelled':'failed';report.error=String(error);process.exitCode=1;
} finally {
  await atomicJson(reportPath,report);
  process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',terminate);
  console.log(`Verification ${report.status}; report: ${reportPath}`);
}
