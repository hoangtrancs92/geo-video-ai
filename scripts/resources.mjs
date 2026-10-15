import os from 'node:os';
import {runProcess} from './process.mjs';
export async function resources(browser) {
  const result={nodeRssBytes:process.memoryUsage().rss,hostFreeBytes:os.freemem(),hostTotalBytes:os.totalmem(),
    browserRssBytes:null,browserCpuSeconds:null,vramBytes:null,vramNote:'No portable VRAM measurement; SwiftShader uses CPU memory.'};
  let session;
  try {
    session=await browser.newBrowserCDPSession();
    const {processInfo}=await session.send('SystemInfo.getProcessInfo');
    result.browserCpuSeconds=processInfo.reduce((sum,p)=>sum+p.cpuTime,0);
    const ids=processInfo.map(p=>p.id).filter(id=>Number.isSafeInteger(id)&&id>0);
    if(ids.length) {
      const output=await runProcess('ps',['-o','rss=','-p',ids.join(',')],{timeoutMs:5000});
      const values=output.trim().split(/\s+/).map(Number);
      if(values.length && values.every(Number.isFinite)) result.browserRssBytes=values.reduce((a,b)=>a+b,0)*1024;
    }
  } catch(error) {result.measurementWarning=String(error);}
  finally {try {await session?.detach();}catch(error){result.detachWarning=String(error);}}
  return result;
}
