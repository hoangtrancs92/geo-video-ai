import {z} from 'zod';

const finite = z.number().finite();
const frame = z.number().int().nonnegative();
const positiveFrames = z.number().int().positive();
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const position = z.tuple([finite.min(-180).max(180), finite.min(-85).max(85)]);
const localAsset = z.string().min(1).refine(value => !value.includes('\\') &&
  !value.startsWith('/') && !value.includes('://') &&
  value.split('/').every(part => part !== '' && part !== '.' && part !== '..'),
  'Asset must be a safe relative path');
const audioRights=z.strictObject({license:z.string().trim().min(1),
  attribution:z.string().trim().min(1)});
const camera = z.strictObject({center:position,zoom:finite.min(0).max(22),
  pitch:finite.min(0).max(85),bearing:finite.min(-180).max(180)});
const move = z.strictObject({from:camera,to:camera,
  easing:z.enum(['linear','easeInOutCubic'])});
const region = z.strictObject({featureId:id,fill:color,
  effect:z.enum(['solid','pulse','fade','rise']).default('solid'),
  extrudeMeters:finite.min(0).max(1000000).optional()});
const route = z.strictObject({id,from:position,to:position,color,
  effect:z.enum(['arc','path','reveal']).default('path')});
const label = z.strictObject({text:z.string().min(1).max(160),position,
  startFrame:frame,endFrame:positiveFrames});
const card = z.strictObject({heading:z.string().min(1).max(100),
  value:z.string().min(1).max(160),source:z.string().min(1).max(200)});
const subtitle = z.strictObject({text:z.string().trim().min(1).max(180).refine(value=>
  value.split('\n').length<=2&&value.split('\n').every(line=>line.length<=70&&line.trim().length>0),
  'Subtitle must use at most two non-empty lines of 70 characters'),
  startFrame:frame,endFrame:positiveFrames});
export const variantRegistry = {
  A:['cinematic-focus','cinematic-duel','route-reveal'],
  C:['country-prism','comparison-heights','floating-islands'],
  D:['split-comparison','editorial-card','timeline-panel']
} as const;
export const SceneSchema = z.strictObject({
  id,startFrame:frame,durationFrames:positiveFrames,stylePreset:z.enum(['A','C','D']),
  variant:z.string().min(1),title:z.string().min(1).max(160),camera:move,
  regions:z.array(region).max(100).default([]),routes:z.array(route).max(100).default([]),
  labels:z.array(label).max(100).default([]),cards:z.array(card).max(20).default([]),
  subtitles:z.array(subtitle).max(1000).default([]),
  transitionOut:z.enum(['cut','fade','slide','map-match']).default('cut')
}).superRefine((scene,ctx) => {
  if (!(variantRegistry[scene.stylePreset] as readonly string[]).includes(scene.variant))
    ctx.addIssue({code:'custom',path:['variant'],message:'Variant is not registered for this preset'});
  if(scene.variant==='cinematic-focus'&&!scene.regions.length)
    ctx.addIssue({code:'custom',path:['regions'],message:'Cinematic focus needs a region'});
  if(scene.variant==='cinematic-duel'&&new Set(scene.regions.map(r=>r.featureId)).size<2)
    ctx.addIssue({code:'custom',path:['regions'],message:'Cinematic duel needs two regions'});
  if(scene.variant==='route-reveal'&&!scene.routes.some(r=>r.effect==='reveal'))
    ctx.addIssue({code:'custom',path:['routes'],message:'Route reveal needs a reveal route'});
  if(scene.variant==='country-prism'&&!scene.regions.some(r=>r.extrudeMeters&&r.extrudeMeters>0))
    ctx.addIssue({code:'custom',path:['regions'],message:'Country prism needs a positive extrusion'});
  if(scene.variant==='comparison-heights'&&
    new Set(scene.regions.filter(r=>r.extrudeMeters&&r.extrudeMeters>0).map(r=>r.featureId)).size<2)
    ctx.addIssue({code:'custom',path:['regions'],message:'Height comparison needs two extruded regions'});
  if(scene.variant==='editorial-card'&&scene.cards.length!==1)
    ctx.addIssue({code:'custom',path:['cards'],message:'Editorial card needs exactly one sourced card'});
  for (const [index,item] of scene.labels.entries())
    if (item.startFrame >= item.endFrame || item.endFrame > scene.durationFrames)
      ctx.addIssue({code:'custom',path:['labels',index],message:'Label frames must fit inside the scene'});
  let previousSubtitleEnd=0;
  for (const [index,item] of scene.subtitles.entries()) {
    if(item.startFrame<previousSubtitleEnd||item.startFrame>=item.endFrame||item.endFrame>scene.durationFrames)
      ctx.addIssue({code:'custom',path:['subtitles',index],message:'Subtitles must be ordered, disjoint and inside the scene'});
    previousSubtitleEnd=item.endFrame;
  }
  if (scene.stylePreset !== 'C' && scene.regions.some(r=>r.extrudeMeters !== undefined))
    ctx.addIssue({code:'custom',path:['regions'],message:'Extrusion is only supported by preset C'});
});
export const ProjectSchema = z.strictObject({
  schemaVersion:z.literal('1.0'),projectId:id,title:z.string().min(1).max(160),
  output:z.strictObject({width:z.number().int().min(320).max(4096),
    height:z.number().int().min(320).max(4096),fps:z.number().int().min(1).max(60),
    codec:z.literal('h264'),quality:z.enum(['draft','high'])}),
  locale:z.enum(['vi-VN','ja-JP','en-US']),
  map:z.strictObject({styleId:z.string().min(1).max(100),attribution:z.literal(true),
    projection:z.enum(['mercator','globe']),geojsonPath:localAsset.optional(),
    attributionText:z.string().min(1).max(200).optional()}),
  defaults:z.strictObject({theme:z.string().min(1).max(100),
    motion:z.enum(['calm','balanced','energetic']),safeMarginsPx:z.number().int().nonnegative(),
    subtitlesEnabled:z.boolean().default(false)}),
  audio:z.strictObject({voiceover:localAsset.nullable(),music:localAsset.nullable(),
    duckingDb:finite.min(-60).max(0),musicGainDb:finite.min(-60).max(6).default(-18),
    voiceRights:audioRights.optional(),musicRights:audioRights.optional(),
    sfx:z.array(z.strictObject({id,assetPath:localAsset,startFrame:frame,
      durationFrames:positiveFrames,gainDb:finite.min(-60).max(6).default(-6),
      rights:audioRights})).max(100).default([])}),
  scenes:z.array(SceneSchema).min(1).max(1000)
}).superRefine((project,ctx) => {
  const ids=new Set<string>();let previousEnd=0;
  for(const [index,scene] of project.scenes.entries()) {
    if(ids.has(scene.id)) ctx.addIssue({code:'custom',path:['scenes',index,'id'],message:'Duplicate scene ID'});
    ids.add(scene.id);
    if(scene.startFrame !== previousEnd) ctx.addIssue({code:'custom',path:['scenes',index,'startFrame'],
      message:scene.startFrame < previousEnd?'Scene overlap':'Timeline gap'});
    previousEnd=scene.startFrame+scene.durationFrames;
    if(!Number.isSafeInteger(previousEnd)) ctx.addIssue({code:'custom',path:['scenes',index],message:'Frame total exceeds safe integer'});
  }
  if(project.defaults.safeMarginsPx*2 >= Math.min(project.output.width,project.output.height))
    ctx.addIssue({code:'custom',path:['defaults','safeMarginsPx'],message:'Safe margins leave no visible content'});
  if(project.map.projection==='globe'&&project.scenes.some(scene=>scene.stylePreset!=='A'))
    ctx.addIssue({code:'custom',path:['map','projection'],message:'Globe proof currently supports preset A scenes only'});
  if(project.audio.voiceover&&!project.audio.voiceRights)
    ctx.addIssue({code:'custom',path:['audio','voiceRights'],message:'Imported voice requires rights metadata'});
  if(project.audio.music&&!project.audio.musicRights)
    ctx.addIssue({code:'custom',path:['audio','musicRights'],message:'Music requires rights metadata'});
  const sfxIds=new Set<string>();
  for(const [index,cue] of project.audio.sfx.entries()) {
    if(sfxIds.has(cue.id)) ctx.addIssue({code:'custom',path:['audio','sfx',index,'id'],message:'Duplicate SFX ID'});
    sfxIds.add(cue.id);
    if(cue.startFrame+cue.durationFrames>previousEnd)
      ctx.addIssue({code:'custom',path:['audio','sfx',index],message:'SFX cue exceeds project timeline'});
  }
});
export type Project = z.infer<typeof ProjectSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Camera = z.infer<typeof camera>;
