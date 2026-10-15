import {z} from 'zod';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {EvidenceDossierSchema} from './dossier.schema.ts';
import {sha256Bytes} from './review.ts';

const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,54}$/);
export const WorldBankRequestSchema=z.strictObject({
  projectId:id,sourceId:id,indicatorCode:z.string().regex(/^[A-Z0-9.]{2,64}$/),
  countryCodes:z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(4),
  fromYear:z.number().int().min(1960).max(2200),toYear:z.number().int().min(1960).max(2200),
  unit:z.string().trim().min(1),
  priceBasis:z.enum(['nominal','real','ppp','not_applicable']).optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional()
}).superRefine((request,ctx)=>{
  if(request.toYear<request.fromYear||request.toYear-request.fromYear>25)
    ctx.addIssue({code:'custom',path:['toYear'],message:'Year range must be 0–25 years'});
  if(new Set(request.countryCodes).size!==request.countryCodes.length)
    ctx.addIssue({code:'custom',path:['countryCodes'],message:'Duplicate country code'});
});

export function worldBankUrl(rawRequest:unknown) {
  const request=WorldBankRequestSchema.parse(rawRequest);
  const countries=request.countryCodes.join(';');
  const url=new URL(`https://api.worldbank.org/v2/country/${countries}/indicator/${request.indicatorCode}`);
  url.searchParams.set('format','json');url.searchParams.set('source','2');
  url.searchParams.set('date',`${request.fromYear}:${request.toYear}`);
  url.searchParams.set('per_page','1000');
  return url.toString();
}

export async function fetchWorldBank(rawRequest:unknown,fetcher:typeof fetch=fetch) {
  const url=worldBankUrl(rawRequest);
  const response=await fetcher(url,{signal:AbortSignal.timeout(10_000),
    headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error(`WORLD_BANK_HTTP_${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>5_000_000) throw new Error('WORLD_BANK_RESPONSE_TOO_LARGE');
  return {url,bytes};
}

export async function fetchWorldBankWithCurl(rawRequest:unknown) {
  const url=worldBankUrl(rawRequest);
  const {stdout}=await promisify(execFile)('curl',[
    '--fail','--silent','--show-error','--connect-timeout','5','--max-time','10',
    '--max-filesize','5000000','--proto','=https',url
  ],{encoding:'buffer',maxBuffer:5_000_000});
  return {url,bytes:new Uint8Array(stdout)};
}

export function normalizeWorldBank(rawRequest:unknown,bytes:Uint8Array,
  {rawPath,retrievedAt,provenanceKind='official_api'}:{rawPath:string;retrievedAt:string;
    provenanceKind?:'official_api'|'uploaded_file'}) {
  const request=WorldBankRequestSchema.parse(rawRequest);
  const url=worldBankUrl(request);
  const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const payload=JSON.parse(decoded);
  if(!Array.isArray(payload)||payload.length!==2||!Array.isArray(payload[1]))
    throw new Error('WORLD_BANK_RESPONSE_SHAPE');
  const [meta,rows]=payload;
  if(meta?.sourceid!=='2'||meta?.page!==1||
    !Number.isInteger(meta?.pages)||meta.pages!==1||
    !Number.isInteger(meta?.total)||meta.total!==rows.length)
    throw new Error('WORLD_BANK_INCOMPLETE_PAGE');
  if(!rows.length) throw new Error('WORLD_BANK_EMPTY_RESPONSE');
  const countries=new Set(request.countryCodes);
  const seen=new Set<string>();
  let title:string|undefined;
  const observations=rows.map((row,index)=>{
    const iso2=row?.country?.id,iso3=row?.countryiso3code;
    const year=Number(row?.date);
    if(!countries.has(iso2)||typeof iso3!=='string'||!/^[A-Z]{3}$/.test(iso3)||
      row?.indicator?.id!==request.indicatorCode||
      !Number.isInteger(year)||year<request.fromYear||year>request.toYear||
      (row.value!==null&&(typeof row.value!=='number'||!Number.isFinite(row.value))))
      throw new Error(`WORLD_BANK_ROW_INVALID:${index}`);
    const key=`${iso3}-${year}`;
    if(seen.has(key)) throw new Error(`WORLD_BANK_DUPLICATE_OBSERVATION:${key}`);
    seen.add(key);
    if(typeof row.indicator.value!=='string'||!row.indicator.value.trim())
      throw new Error(`WORLD_BANK_INDICATOR_TITLE_MISSING:${index}`);
    if(title&&title!==row.indicator.value) throw new Error('WORLD_BANK_INDICATOR_TITLE_CONFLICT');
    title=row.indicator.value;
    return {id:`${request.sourceId}-${iso3}-${year}`,sourceId:request.sourceId,
      datasetId:'WDI',regionCode:iso3,indicatorCode:request.indicatorCode,
      value:row.value,unit:request.unit,year,
      ...(request.priceBasis?{priceBasis:request.priceBasis}:{}),
      ...(request.currency?{currency:request.currency}:{}),
      ...(meta.lastupdated?{revision:String(meta.lastupdated)}:{}),
      qualityFlags:row.value===null?['missing']:[]};
  });
  return EvidenceDossierSchema.parse({schemaVersion:'1.2',projectId:request.projectId,
    sources:[{id:request.sourceId,kind:provenanceKind,publisher:'World Bank',
      title:`World Development Indicators: ${title}`,url,localPath:rawPath,
      retrievedAt,rawSha256:sha256Bytes(bytes),
      attribution:'World Bank, World Development Indicators; verify underlying data provider and indicator-specific terms'}],
    observations,claims:[],gaps:[{question:'Which claims do these observations support?',
      reason:'Indicator definition, unit, provider rights and comparisons need editorial review.',
      priority:'high'}]});
}
