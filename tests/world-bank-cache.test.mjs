import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fetchWorldBankCached} from '../packages/evidence/src/world-bank-cache.ts';
import {worldBankUrl} from '../packages/evidence/src/world-bank.ts';

const request={projectId:'cache-test',sourceId:'wdi',indicatorCode:'NY.GDP.MKTP.CD',
  countryCodes:['JP'],fromYear:2020,toYear:2020,unit:'USD'};
const payload=input=>new TextEncoder().encode(JSON.stringify([
  {page:1,pages:1,total:1,sourceid:'2'},[{
    country:{id:input.countryCodes[0]},
    countryiso3code:input.countryCodes[0]==='JP'?'JPN':'CHN',
    indicator:{id:input.indicatorCode,value:'GDP (current US$)'},
    date:'2020',value:100}]]));
test('World Bank cache pins bytes, reuses fresh response and enforces daily quota',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'world-bank-cache-'));
  const now=new Date('2026-10-15T00:00:00.000Z');let calls=0;
  const fetcher=async input=>{calls++;return {url:worldBankUrl(input),
    bytes:payload(input)};};
  try {
    const first=await fetchWorldBankCached(request,root,{fetcher,now,maxRequestsPerDay:1});
    assert.equal(first.mode,'direct_api');
    const again=await fetchWorldBankCached(request,root,{fetcher,now,maxRequestsPerDay:1});
    assert.equal(again.mode,'cache');assert.equal(calls,1);
    await assert.rejects(fetchWorldBankCached(request,root,{fetcher,
      now:new Date(now.getTime()+1000),ttlMs:0,maxRequestsPerDay:1}),
    /WORLD_BANK_DAILY_QUOTA_EXCEEDED/);
    const files=await readdir(path.join(root,'outputs','cache','world-bank'));
    const raw=files.find(file=>/^[a-f0-9]{64}\.json$/.test(file));
    await writeFile(path.join(root,'outputs','cache','world-bank',raw),'tampered');
    await assert.rejects(fetchWorldBankCached(request,root,{fetcher,now}),
      /WORLD_BANK_CACHE_HASH_MISMATCH/);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('concurrent cache misses cannot exceed one-request quota',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'world-bank-quota-'));
  try {
    const fetcher=async input=>({url:worldBankUrl(input),
      bytes:payload(input)});
    const options={fetcher,now:new Date('2026-10-15T00:00:00.000Z'),maxRequestsPerDay:1};
    const results=await Promise.allSettled([
      fetchWorldBankCached(request,root,options),
      fetchWorldBankCached({...request,countryCodes:['CN']},root,options)]);
    assert.equal(results.filter(item=>item.status==='fulfilled').length,1);
    assert.match(results.find(item=>item.status==='rejected').reason.message,
      /WORLD_BANK_DAILY_QUOTA_EXCEEDED/);
  } finally {await rm(root,{recursive:true,force:true});}
});
