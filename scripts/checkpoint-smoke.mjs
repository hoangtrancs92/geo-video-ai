import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
await mkdir('outputs/m0b',{recursive:true});
const out=await mkdtemp(path.resolve('outputs/m0b/checkpoint-smoke-'));
const args=['scripts/scale-spike.mjs','--frames','100','--chunk-frames','50','--output',out];
const run=extra=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[...args,...extra],{stdio:'inherit'});
  child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(`SMOKE_CHILD_EXIT:${code}`)));
});
console.log('M0b smoke: checkpoint after chunk 1, restart browser, resume chunk 2.');
await run(['--stop-after-chunks','1']);
const first=JSON.parse(await readFile(path.join(out,'report.json')));
if(first.status!=='checkpointed'||first.chunks.length!==1) throw new Error('CHECKPOINT_NOT_SAVED');
await run(['--resume']);
const second=JSON.parse(await readFile(path.join(out,'report.json')));
if(second.status!=='capture-passed'||second.chunks.length!==2||second.chunks[0].reused!==true||
  second.chunks[0].sha256!==first.chunks[0].sha256||second.renderedFramesThisAttempt!==50) throw new Error('RESUME_PROOF_FAILED');
console.log(`M0b smoke passed (not scale benchmark): ${out}`);
