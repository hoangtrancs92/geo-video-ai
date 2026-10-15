import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchWorldBank,normalizeWorldBank,worldBankUrl} from '../packages/evidence/src/world-bank.ts';
import {editorialGate} from '../packages/editorial/src/gate.ts';

const request={projectId:'economy-demo',sourceId:'wb-gdp',indicatorCode:'NY.GDP.MKTP.CD',
  countryCodes:['JP','CN'],fromYear:2020,toYear:2020,unit:'current US dollars',
  priceBasis:'nominal',currency:'USD'};
const response=[{page:1,pages:1,total:2,sourceid:'2',lastupdated:'2026-10-01'},[
  {country:{id:'JP'},countryiso3code:'JPN',indicator:{id:'NY.GDP.MKTP.CD',value:'GDP (current US$)'},
    date:'2020',value:100},
  {country:{id:'CN'},countryiso3code:'CHN',indicator:{id:'NY.GDP.MKTP.CD',value:'GDP (current US$)'},
    date:'2020',value:null}
]];
const bytes=payload=>new TextEncoder().encode(JSON.stringify(payload));

test('World Bank adapter uses fixed official host and preserves raw-data lineage',async()=>{
  const url=worldBankUrl(request);
  assert.equal(new URL(url).hostname,'api.worldbank.org');
  assert.equal(new URL(url).searchParams.get('source'),'2');
  let called='';
  const fetched=await fetchWorldBank(request,async input=>{
    called=input;return new Response(bytes(response),{status:200});
  });
  assert.equal(called,url);
  const dossier=normalizeWorldBank(request,fetched.bytes,{rawPath:'outputs/evidence/raw.json',
    retrievedAt:'2026-10-15T00:00:00.000Z'});
  assert.equal(dossier.observations.length,2);
  assert.equal(dossier.observations[0].value,100);
  assert.equal(dossier.observations[0].currency,'USD');
  assert.equal(dossier.observations[1].value,null);
  assert.deepEqual(dossier.observations[1].qualityFlags,['missing']);
  assert.equal(dossier.sources[0].allowedForCommercial,undefined);
  assert.match(dossier.sources[0].rawSha256,/^[a-f0-9]{64}$/);
  assert.equal(editorialGate(dossier).status,'needs_research');
});

test('World Bank adapter rejects incomplete pages, alien rows and unsafe request scope',()=>{
  const options={rawPath:'outputs/evidence/raw.json',retrievedAt:'2026-10-15T00:00:00.000Z'};
  assert.throws(()=>worldBankUrl({...request,indicatorCode:'../../private'}));
  assert.throws(()=>worldBankUrl({...request,toYear:2050}));
  assert.throws(()=>normalizeWorldBank(request,bytes([{...response[0],pages:2},response[1]]),options),
    /INCOMPLETE_PAGE/);
  const alien=structuredClone(response);alien[1][0].country.id='US';
  assert.throws(()=>normalizeWorldBank(request,bytes(alien),options),/ROW_INVALID/);
  const duplicate=structuredClone(response);duplicate[1][1].country.id='JP';
  duplicate[1][1].countryiso3code='JPN';
  assert.throws(()=>normalizeWorldBank(request,bytes(duplicate),options),/DUPLICATE_OBSERVATION/);
});
