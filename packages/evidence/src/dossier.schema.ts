import {z} from 'zod';

const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const text=z.string().trim().min(1);
const sha256=z.string().regex(/^[a-f0-9]{64}$/);
const localPath=z.string().min(1).refine(value=>!value.startsWith('/')&&
  !value.includes('\\')&&!value.includes('://')&&value.split('/').every(part=>
    /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)&&part!=='.'&&part!=='..'),
  'Unsafe local source path');

export const ProvenanceSourceSchema=z.strictObject({
  id,kind:z.enum(['official_api','official_page','uploaded_file','licensed_dataset','manual']),
  publisher:text,title:text,url:z.url().refine(value=>/^https:\/\//.test(value)).optional(),
  localPath:localPath.optional(),retrievedAt:z.iso.datetime(),
  publishedAt:z.iso.datetime().optional(),license:text.optional(),
  attribution:text.optional(),rawSha256:sha256,allowedForCommercial:z.boolean().optional()
}).refine(source=>Boolean(source.url||source.localPath),
  {message:'Source requires URL or local path'});

export const ObservationSchema=z.strictObject({
  id,sourceId:id,datasetId:id.optional(),regionCode:z.string().regex(/^[A-Z0-9_-]{2,16}$/),
  indicatorCode:z.string().regex(/^[A-Z0-9_.-]{2,64}$/),
  value:z.number().finite().nullable(),unit:text,year:z.number().int().min(1800).max(2200).optional(),
  period:text.optional(),priceBasis:z.enum(['nominal','real','ppp','not_applicable']).optional(),
  currency:z.string().regex(/^[A-Z]{3}$/).optional(),methodologyNote:text.optional(),
  revision:text.optional(),qualityFlags:z.array(text)
}).superRefine((item,ctx)=>{
  if(item.year===undefined&&item.period===undefined)
    ctx.addIssue({code:'custom',path:['year'],message:'Observation requires year or period'});
  if(item.currency&&item.priceBasis===undefined)
    ctx.addIssue({code:'custom',path:['priceBasis'],message:'Currency observation requires price basis'});
  if(item.priceBasis&&item.priceBasis!=='not_applicable'&&!item.currency)
    ctx.addIssue({code:'custom',path:['currency'],message:'Monetary price basis requires currency'});
});

export const SupportedClaimSchema=z.strictObject({
  id,text,evidenceIds:z.array(id),sourceIds:z.array(id).min(1),
  claimType:z.enum(['qualitative','quantitative']),
  derivedCalculationId:id.optional(),asOf:text.optional(),qualifiers:z.array(text),
  verdict:z.enum(['supported','uncertain','conflicting','unsupported']),
  approval:z.enum(['draft','needs_research','needs_review','approved','rejected'])
});

export const EvidenceDossierSchema=z.strictObject({
  schemaVersion:z.literal('1.2'),projectId:id,
  sources:z.array(ProvenanceSourceSchema).min(1),
  observations:z.array(ObservationSchema),claims:z.array(SupportedClaimSchema),
  reviewLog:z.array(z.strictObject({
    claimId:id,verdict:z.enum(['supported','uncertain','conflicting','unsupported']),
    approval:z.enum(['needs_research','needs_review','approved','rejected']),
    reason:text,reviewer:text,reviewedAt:z.iso.datetime(),
    inputSha256:sha256
  })).optional(),
  gapReviewLog:z.array(z.strictObject({question:text,reason:text,reviewer:text,
    reviewedAt:z.iso.datetime(),inputSha256:sha256})).optional(),
  gaps:z.array(z.strictObject({question:text,reason:text,
    priority:z.enum(['high','medium','low'])}))
}).superRefine((dossier,ctx)=>{
  const sourceIds=new Set<string>(),observationIds=new Set<string>(),claimIds=new Set<string>();
  for(const [index,source] of dossier.sources.entries()) {
    if(sourceIds.has(source.id)) ctx.addIssue({code:'custom',path:['sources',index,'id'],message:'Duplicate source ID'});
    sourceIds.add(source.id);
  }
  for(const [index,item] of dossier.observations.entries()) {
    if(observationIds.has(item.id)) ctx.addIssue({code:'custom',path:['observations',index,'id'],message:'Duplicate observation ID'});
    observationIds.add(item.id);
    if(!sourceIds.has(item.sourceId)) ctx.addIssue({code:'custom',path:['observations',index,'sourceId'],message:'Unknown source ID'});
  }
  const observations=new Map(dossier.observations.map(item=>[item.id,item]));
  for(const [index,claim] of dossier.claims.entries()) {
    if(claimIds.has(claim.id)) ctx.addIssue({code:'custom',path:['claims',index,'id'],message:'Duplicate claim ID'});
    claimIds.add(claim.id);
    for(const sourceId of claim.sourceIds) if(!sourceIds.has(sourceId))
      ctx.addIssue({code:'custom',path:['claims',index,'sourceIds'],message:`Unknown source: ${sourceId}`});
    for(const evidenceId of claim.evidenceIds) {
      const item=observations.get(evidenceId);
      if(!item) ctx.addIssue({code:'custom',path:['claims',index,'evidenceIds'],message:`Unknown observation: ${evidenceId}`});
      else if(!claim.sourceIds.includes(item.sourceId)) ctx.addIssue({code:'custom',path:['claims',index,'sourceIds'],
        message:`Observation source missing from claim: ${item.sourceId}`});
      else if(claim.claimType==='quantitative'&&claim.approval==='approved'&&item.value===null)
        ctx.addIssue({code:'custom',path:['claims',index,'evidenceIds'],
          message:`Approved quantitative claim cites missing value: ${evidenceId}`});
    }
    if(claim.claimType==='quantitative'&&claim.evidenceIds.length===0)
      ctx.addIssue({code:'custom',path:['claims',index,'evidenceIds'],message:'Quantitative claim requires observations'});
    if(claim.claimType==='qualitative'&&/\d/.test(claim.text))
      ctx.addIssue({code:'custom',path:['claims',index,'claimType'],message:'Digit-bearing claim requires quantitative evidence review'});
    if(claim.approval==='approved'&&claim.verdict!=='supported')
      ctx.addIssue({code:'custom',path:['claims',index,'approval'],message:'Only supported claims can be approved'});
  }
  for(const [index,entry] of (dossier.reviewLog??[]).entries()) {
    if(!claimIds.has(entry.claimId)) ctx.addIssue({code:'custom',path:['reviewLog',index,'claimId'],
      message:'Review refers to unknown claim'});
    if(entry.approval==='approved'&&entry.verdict!=='supported')
      ctx.addIssue({code:'custom',path:['reviewLog',index,'approval'],
        message:'Review approval requires supported verdict'});
  }
  for(const [index,entry] of (dossier.gapReviewLog??[]).entries())
    if(entry.reason.length<20) ctx.addIssue({code:'custom',path:['gapReviewLog',index,'reason'],
      message:'Gap resolution needs a concrete rationale'});
});

export type EvidenceDossier=z.infer<typeof EvidenceDossierSchema>;
export type Observation=z.infer<typeof ObservationSchema>;
