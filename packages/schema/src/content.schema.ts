import {z} from 'zod';
import {SceneSchema} from './project.schema.ts';

const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const text=z.string().trim().min(1);
const safeFile=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const localRef=z.string().min(1).refine(value=>!value.includes('\\')&&
  !value.startsWith('/')&&!value.includes('://')&&
  value.split('/').every(part=>/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(part)&&part!=='.'&&part!=='..'),
  'Unsafe relative asset path');
const locale=z.enum(['vi-VN','ja-JP','en-US']);
const style=z.enum(['A','C','D']);
const duration=z.number().finite().positive();

const SourceSchema=z.strictObject({id,url:z.url().refine(value=>/^https?:\/\//.test(value)).optional(),
  fileRef:localRef.optional(),
  title:text.optional(),license:text.optional(),retrievedAt:z.iso.datetime().optional()})
  .refine(source=>Boolean(source.url||source.fileRef),{message:'Source needs URL or local file reference'});
const FactSchema=z.strictObject({id,statement:text,sourceIds:z.array(id).min(1),
  asOf:text.optional(),confidence:z.enum(['high','medium','low']).optional()});
const ProductionSchema=z.strictObject({mode:z.enum(['auto','review_before_render']),
  defaultTheme:text,mixStyles:z.array(style).min(1).max(3),seed:z.number().int().safe()});

const EditionSchema=z.strictObject({kind:z.enum(['short','long']),title:text,
  durationTargetSeconds:duration,
  output:z.strictObject({width:z.number().int(),height:z.number().int(),fps:z.literal(30),
    format:z.literal('mp4'),codec:z.literal('h264'),filename:safeFile}),
  hook:text.optional(),
  outline:z.array(z.strictObject({chapterId:id,name:text,goal:text,targetSeconds:duration})).min(1),
  script:z.array(z.strictObject({segmentId:id,narration:text,factRefs:z.array(id),
    targetSeconds:duration})).min(1),
  scenes:z.array(SceneSchema).min(1),
  voice:z.strictObject({provider:z.enum(['local','external','none']),
    voiceId:id.optional(),assetPath:localRef.optional(),
    rights:z.strictObject({license:text,attribution:text}).optional()}),
  captions:z.strictObject({enabled:z.boolean(),language:locale,
    formats:z.array(z.enum(['srt','ass']))})
}).superRefine((edition,ctx)=>{
  const limits=edition.kind==='short'?{min:90,max:180,width:1080,height:1920,suffix:'_short_9x16.mp4'}:
    {min:900,max:1200,width:1920,height:1080,suffix:'_long_16x9.mp4'};
  if(edition.durationTargetSeconds<limits.min||edition.durationTargetSeconds>limits.max)
    ctx.addIssue({code:'custom',path:['durationTargetSeconds'],message:'Edition duration outside required range'});
  if(edition.output.width!==limits.width||edition.output.height!==limits.height)
    ctx.addIssue({code:'custom',path:['output'],message:'Edition aspect and resolution mismatch'});
  if(!edition.output.filename.endsWith(limits.suffix))
    ctx.addIssue({code:'custom',path:['output','filename'],message:'Edition filename suffix mismatch'});
  let next=0;
  for(const [index,scene] of edition.scenes.entries()) {
    if(scene.startFrame!==next) ctx.addIssue({code:'custom',path:['scenes',index,'startFrame'],
      message:scene.startFrame<next?'Scene overlap':'Timeline gap'});
    next=scene.startFrame+scene.durationFrames;
  }
  if(Math.abs(next-Math.round(edition.durationTargetSeconds*30))>1)
    ctx.addIssue({code:'custom',path:['scenes'],message:'Scene frames do not match edition duration'});
  for(const key of ['outline','script'] as const) {
    const seconds=edition[key].reduce((sum,item)=>sum+item.targetSeconds,0);
    if(Math.abs(seconds-edition.durationTargetSeconds)>1/30)
      ctx.addIssue({code:'custom',path:[key],message:'Segment timing does not match edition duration'});
  }
  if(edition.voice.provider!=='none'&&!edition.voice.assetPath&&!edition.voice.voiceId)
    ctx.addIssue({code:'custom',path:['voice'],message:'Voice needs an asset or voice ID'});
  if(edition.voice.provider==='local'&&(!edition.voice.assetPath||!edition.voice.rights))
    ctx.addIssue({code:'custom',path:['voice'],message:'Local voice needs asset and rights'});
  if(edition.captions.enabled&&!edition.captions.formats.length)
    ctx.addIssue({code:'custom',path:['captions','formats'],message:'Enabled captions need a format'});
});

export const CreateProjectRequestSchema=z.strictObject({schemaVersion:z.literal('1.1'),
  projectId:id,topic:text,locale,
  research:z.strictObject({facts:z.array(FactSchema),sources:z.array(SourceSchema)}).optional(),
  narrative:z.strictObject({thesis:text,keyPoints:z.array(text).min(1),
    exclusions:z.array(text).optional()}).optional(),
  production:ProductionSchema,
  editionSettings:z.strictObject({short:z.strictObject({durationTargetSeconds:duration,
    width:z.literal(1080),height:z.literal(1920),fps:z.literal(30)}),
    long:z.strictObject({durationTargetSeconds:duration,
      width:z.literal(1920),height:z.literal(1080),fps:z.literal(30)})})
}).superRefine((request,ctx)=>{
  if(request.editionSettings.short.durationTargetSeconds<90||request.editionSettings.short.durationTargetSeconds>180)
    ctx.addIssue({code:'custom',path:['editionSettings','short','durationTargetSeconds'],message:'Short duration outside range'});
  if(request.editionSettings.long.durationTargetSeconds<900||request.editionSettings.long.durationTargetSeconds>1200)
    ctx.addIssue({code:'custom',path:['editionSettings','long','durationTargetSeconds'],message:'Long duration outside range'});
});

export const ContentProjectSchema=z.strictObject({schemaVersion:z.literal('1.1'),
  projectId:id,topic:text,locale,
  research:z.strictObject({facts:z.array(FactSchema).min(1),sources:z.array(SourceSchema).min(1)}),
  narrative:z.strictObject({thesis:text,keyPoints:z.array(text).min(1),
    exclusions:z.array(text).optional()}),
  production:ProductionSchema,
  editions:z.strictObject({short:EditionSchema,long:EditionSchema})
}).superRefine((project,ctx)=>{
  const sourceIds=new Set<string>(),factIds=new Set<string>();
  for(const [index,source] of project.research.sources.entries()) {
    if(sourceIds.has(source.id)) ctx.addIssue({code:'custom',path:['research','sources',index,'id'],message:'Duplicate source ID'});
    sourceIds.add(source.id);
  }
  for(const [index,fact] of project.research.facts.entries()) {
    if(factIds.has(fact.id)) ctx.addIssue({code:'custom',path:['research','facts',index,'id'],message:'Duplicate fact ID'});
    factIds.add(fact.id);
    for(const sourceId of fact.sourceIds) if(!sourceIds.has(sourceId))
      ctx.addIssue({code:'custom',path:['research','facts',index,'sourceIds'],message:`Unknown source: ${sourceId}`});
  }
  for(const kind of ['short','long'] as const) {
    const edition=project.editions[kind];
    if(edition.kind!==kind) ctx.addIssue({code:'custom',path:['editions',kind,'kind'],message:'Edition kind mismatch'});
    for(const [index,segment] of edition.script.entries()) for(const factRef of segment.factRefs)
      if(!factIds.has(factRef)) ctx.addIssue({code:'custom',path:['editions',kind,'script',index,'factRefs'],
        message:`Unknown fact: ${factRef}`});
  }
  if(project.editions.short.script.map(s=>s.narration).join('\n')===
    project.editions.long.script.map(s=>s.narration).join('\n'))
    ctx.addIssue({code:'custom',path:['editions'],message:'Short and long scripts must differ'});
});

export type CreateProjectRequest=z.infer<typeof CreateProjectRequestSchema>;
export type ContentProject=z.infer<typeof ContentProjectSchema>;
