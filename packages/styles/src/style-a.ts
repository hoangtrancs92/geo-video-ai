import type {Scene} from '../../schema/src/project.schema.ts';

type Color=[number,number,number,number];
export type RegionPaint={fill:Color;line:Color;lineWidth:number};

function rgb(hex:string):[number,number,number] {
  return [1,3,5].map(index=>Number.parseInt(hex.slice(index,index+2),16)) as [number,number,number];
}

export function styleARegionPaint(scene:Scene,featureId:string,progress:number):RegionPaint {
  if(scene.stylePreset!=='A') throw new Error('STYLE_A_SCENE_REQUIRED');
  if(!Number.isFinite(progress)||progress<0||progress>1) throw new Error('INVALID_SCENE_PROGRESS');
  const region=scene.regions.find(item=>item.featureId===featureId);
  const focused=scene.variant==='cinematic-focus';
  if(!region) return focused?
    {fill:[9,28,43,255],line:[55,88,106,255],lineWidth:1}:
    {fill:[22,54,83,255],line:[103,148,177,255],lineWidth:2};
  const alpha=region.effect==='pulse'?180+Math.round(75*Math.sin(progress*Math.PI*2)**2):
    region.effect==='fade'?Math.round(80+175*progress):255;
  const fill=[...rgb(region.fill),alpha] as Color;
  if(focused) return {fill,line:[245,250,255,255],lineWidth:4};
  if(scene.variant==='cinematic-duel') return {fill,line:[...rgb(region.fill),255],lineWidth:3};
  return {fill,line:[158,222,242,255],lineWidth:2};
}
