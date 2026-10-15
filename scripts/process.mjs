import {spawn} from 'node:child_process';

export function runProcess(binary,args,{timeoutMs=120000,maxOutputBytes=2*1024*1024,
  signal,onStdout,onStderr,env=process.env}={}) {
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) {reject(new Error('PROCESS_CANCELLED'));return;}
    const child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],env});
    let stdout='',stderr='',bytes=0,failure;
    const fail=error=>{failure ??= error;child.kill('SIGKILL');};
    const cancel=()=>fail(new Error('PROCESS_CANCELLED'));
    signal?.addEventListener('abort',cancel,{once:true});
    const timer=setTimeout(()=>fail(new Error(`PROCESS_TIMEOUT:${binary}`)),timeoutMs);
    child.stdout.on('data',data=>{
      bytes+=data.length;
      if(bytes>maxOutputBytes) fail(new Error(`PROCESS_OUTPUT_LIMIT:${binary}`));
      else {stdout+=data;onStdout?.(data.toString());}
    });
    child.stderr.on('data',data=>{stderr=(stderr+data).slice(-16000);onStderr?.(data.toString());});
    child.on('error',error=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(error);});
    child.on('close',(code,exitSignal)=>{
      clearTimeout(timer);
      signal?.removeEventListener('abort',cancel);
      if(failure) reject(failure);
      else if(code!==0) reject(new Error(`${binary} exit ${code} (${exitSignal}): ${stderr}`));
      else resolve(stdout);
    });
  });
}
