import test from 'node:test';
import assert from 'node:assert/strict';
import {runProcess} from '../scripts/process.mjs';
test('capture process stdout and propagate encoder failure',async()=>{
  assert.equal(await runProcess(process.execPath,['-e','process.stdout.write("ok")']),'ok');
  await assert.rejects(runProcess(process.execPath,['-e','process.stderr.write("codec missing");process.exit(2)']),/codec missing/);
});
test('stalled encoder is killed and awaited',async()=>{
  await assert.rejects(runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:100}),/PROCESS_TIMEOUT/);
});
test('unbounded stdout is rejected',async()=>{
  await assert.rejects(runProcess(process.execPath,['-e','process.stdout.write("x".repeat(10000))'],{maxOutputBytes:100}),/PROCESS_OUTPUT_LIMIT/);
});
test('cancellation terminates the child process',async()=>{
  const controller=new AbortController();
  const result=runProcess(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:controller.signal});
  controller.abort();await assert.rejects(result,/PROCESS_CANCELLED/);
});
