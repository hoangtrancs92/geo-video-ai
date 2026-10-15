import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {sha256Bytes} from './review.ts';
import {worldBankUrl,fetchWorldBankWithCurl,normalizeWorldBank} from './world-bank.ts';

async function optionalJson(file:string) {
  try {return JSON.parse(await readFile(file,'utf8'));}
  catch(error) {if((error as NodeJS.ErrnoException).code==='ENOENT') return null;throw error;}
}
export async function fetchWorldBankCached(rawRequest:unknown,root:string,{
  fetcher=fetchWorldBankWithCurl,now=new Date(),ttlMs=24*3600000,maxRequestsPerDay=20
}={}) {
  const url=worldBankUrl(rawRequest),key=sha256Bytes(new TextEncoder().encode(url));
  if(!Number.isFinite(ttlMs)||ttlMs<0||!Number.isSafeInteger(maxRequestsPerDay)||
    maxRequestsPerDay<1) throw new Error('WORLD_BANK_CACHE_CONFIG_INVALID');
  const dir=path.join(root,'outputs','cache','world-bank');
  await mkdir(dir,{recursive:true});
  const rawFile=path.join(dir,`${key}.json`),metaFile=path.join(dir,`${key}.meta.json`),
    metadata=await optionalJson(metaFile);
  if(metadata&&metadata.url===url&&metadata.sha256&&
    Number.isFinite(Date.parse(metadata.retrievedAt))&&
    now.getTime()-Date.parse(metadata.retrievedAt)>=0&&
    now.getTime()-Date.parse(metadata.retrievedAt)<=ttlMs) {
    try {
      const bytes=await readFile(rawFile);
      if(sha256Bytes(bytes)!==metadata.sha256) throw new Error('WORLD_BANK_CACHE_HASH_MISMATCH');
      return {url,bytes,retrievedAt:metadata.retrievedAt,mode:'cache' as const};
    } catch(error) {if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;}
  }
  const quotaFile=path.join(dir,'quota.json'),lockPath=path.join(dir,'quota.lock');
  let lock;
  for(let attempt=0;attempt<100;attempt++) {
    try {lock=await open(lockPath,'wx');break;}
    catch(error) {
      if((error as NodeJS.ErrnoException).code!=='EEXIST') throw error;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
  }
  if(!lock) throw new Error('WORLD_BANK_QUOTA_LOCK_TIMEOUT');
  try {
    const quota=await optionalJson(quotaFile)??{requests:[]};
    const cutoff=now.getTime()-24*3600000;
    const requests=(quota.requests as string[]).filter(value=>
      Number.isFinite(Date.parse(value))&&Date.parse(value)>cutoff);
    if(requests.length>=maxRequestsPerDay) throw new Error('WORLD_BANK_DAILY_QUOTA_EXCEEDED');
    requests.push(now.toISOString());
    const quotaTemp=path.join(dir,`quota-${process.pid}.tmp`);
    await writeFile(quotaTemp,JSON.stringify({requests},null,2)+'\n');
    await rename(quotaTemp,quotaFile);
  } finally {await lock.close();await unlink(lockPath);}
  const fetched=await fetcher(rawRequest);
  if(fetched.url!==url||fetched.bytes.byteLength>5_000_000)
    throw new Error('WORLD_BANK_FETCH_RESPONSE_INVALID');
  const bytes=Buffer.from(fetched.bytes),retrievedAt=now.toISOString();
  normalizeWorldBank(rawRequest,bytes,{rawPath:`outputs/cache/world-bank/${key}.json`,
    retrievedAt});
  const rawTemp=path.join(dir,`${key}-${randomUUID()}.tmp`);
  await writeFile(rawTemp,bytes);await rename(rawTemp,rawFile);
  const metaTemp=path.join(dir,`${key}-${randomUUID()}.meta.tmp`);
  await writeFile(metaTemp,JSON.stringify({url,sha256:sha256Bytes(bytes),retrievedAt},null,2)+'\n');
  await rename(metaTemp,metaFile);
  return {url,bytes,retrievedAt,mode:'direct_api' as const};
}
