import {Map as LibreMap} from 'maplibre-gl';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {GeoJsonLayer,ArcLayer,PathLayer,ScatterplotLayer} from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {sceneAtFrame,totalFrames} from '../packages/motion/src/timeline.ts';
import {routePath} from '../packages/motion/src/route.ts';
import {styleARegionPaint} from '../packages/styles/src/style-a.ts';
import {subtitleAtSceneFrame} from '../packages/media/src/subtitles.ts';
import {textLayoutIssues,type TextBox} from '../packages/media/src/text-layout.ts';
import {validateGeoJson,assertFeatureReferences} from '../packages/geodata/src/validate.ts';
import {awaitFrame,withDeadline} from '../spike/frame-ready.ts';

const style=document.createElement('style');style.textContent=`
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#091727;color:#f4f8ff;font-family:Arial,"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif}
html[lang="ja-JP"] body{font-family:"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif}
#map,#vignette,#overlay{position:absolute;inset:0}#vignette{pointer-events:none;background:linear-gradient(180deg,rgba(4,11,24,.88),transparent 29%,transparent 68%,rgba(4,11,24,.85))}
#overlay{pointer-events:none;box-sizing:border-box;padding:6% 7%;display:flex;flex-direction:column}
#eyebrow{font-size:clamp(16px,2.4vw,40px);font-weight:700;letter-spacing:.18em;color:#7ee3f8;text-transform:uppercase}
h1{margin:.4em 0 0;max-width:90%;font-size:clamp(38px,6.5vw,100px);line-height:1.05;text-shadow:0 3px 15px #06101f}
h1,.card,#subtitle,footer{overflow-wrap:anywhere}
#cards{margin:auto 0 0;display:flex;gap:20px;flex-wrap:wrap}.card{background:rgba(8,25,45,.9);border:2px solid #7ee3f8;border-radius:18px;padding:22px;min-width:28%;font-size:clamp(18px,2.5vw,36px)}.card strong,.card span{display:block}.card span{margin-top:10px;color:#7ee3f8;font-size:1.3em}.card small{display:block;margin-top:14px;font-size:.48em;color:#c4d7e5}
#cards[data-variant="editorial-card"]{width:88%;margin:auto auto 3%;}#cards[data-variant="editorial-card"] .card{box-sizing:border-box;width:100%;padding:34px;border-width:3px;box-shadow:0 20px 60px #020a16;font-size:clamp(20px,3vw,42px)}
#overlay[data-variant="editorial-card"] footer{margin-top:0}
#overlay[data-caption="on"] #cards[data-variant="editorial-card"]{margin-bottom:25%}
#labels{position:absolute;inset:0}.label{position:absolute;padding:8px 14px;border:2px solid #7ee3f8;border-radius:8px;background:#091727;color:#fff;font-weight:700;font-size:clamp(20px,2.8vw,44px);white-space:nowrap;transform:translate(-50%,-50%)}
#subtitle{position:absolute;left:max(7%,var(--safe-margin));right:max(7%,var(--safe-margin));bottom:max(7%,var(--safe-margin));box-sizing:border-box;padding:14px 20px;border-radius:12px;background:rgba(3,13,27,.94);color:#fff;text-align:center;font-size:clamp(25px,3.4vw,48px);font-weight:700;line-height:1.25;white-space:pre-line;text-shadow:0 2px 8px #020a16}
#subtitle:empty{display:none}
footer{margin-top:auto;font-size:clamp(14px,1.5vw,24px);color:#e4ecf5;text-shadow:0 2px 5px #091727}
@media (min-aspect-ratio:4/3){
  #overlay{padding:4% 5%}#eyebrow{max-width:48%;font-size:clamp(18px,1.5vw,28px)}
  h1{max-width:48%;font-size:clamp(38px,4vw,78px)}#cards{max-width:42%}
  .card{min-width:65%}footer{font-size:clamp(13px,1vw,20px)}
  #cards[data-variant="editorial-card"]{width:42%;margin:auto auto 1% 0}
  #overlay[data-caption="on"] #cards[data-variant="editorial-card"]{margin-bottom:12%}
  #subtitle{left:max(12%,var(--safe-margin));right:max(12%,var(--safe-margin));font-size:clamp(22px,2vw,38px)}
}
`;document.head.append(style);
const projectPath=new URLSearchParams(location.search).get('project');
if(!projectPath||!/^\/[A-Za-z0-9_./-]+\.json$/.test(projectPath)||projectPath.includes('..')) throw new Error('INVALID_PROJECT_PATH');
const project=ProjectSchema.parse(await (await fetch(projectPath)).json());
document.documentElement.lang=project.locale;
if(!project.map.geojsonPath||!project.map.attributionText) throw new Error('GEODATA_AND_ATTRIBUTION_REQUIRED');
if(!['local-synthetic','local-dark'].includes(project.map.styleId)) throw new Error('STYLE_NOT_SUPPORTED_YET');
const geo=validateGeoJson(await (await fetch('/'+project.map.geojsonPath)).json());
for(const scene of project.scenes) assertFeatureReferences(scene.regions,geo);
const errors:string[]=[];
const map=new LibreMap({container:'map',interactive:false,attributionControl:false,
  center:project.scenes[0].camera.from.center,zoom:project.scenes[0].camera.from.zoom,
  fadeDuration:0,canvasContextAttributes:{antialias:true,preserveDrawingBuffer:true},
  style:{version:8,sources:{regions:{type:'geojson',data:geo as any}},layers:[
    {id:'background',type:'background',paint:{'background-color':project.map.projection==='globe'?'#0A3B66':'#091727'}},
    {id:'ground',type:'fill',source:'regions',paint:{'fill-color':'#163653'}},
    {id:'outline',type:'line',source:'regions',paint:{'line-color':'#6794b1','line-width':2}}
  ]}});
map.on('error',event=>errors.push(event.error.message));
map.getCanvas().addEventListener('webglcontextlost',()=>errors.push('WEBGL_CONTEXT_LOST'));
let deckPasses=0;
const overlay=new MapboxOverlay({interleaved:true,layers:[],onAfterRender:()=>deckPasses++,onError:(e:Error)=>errors.push(e.message)});
const ready=(async()=>{
  await withDeadline(map.once('load'),15000,'MAP_LOAD_TIMEOUT');
  if(!map.getCanvas().getContext('webgl2')) throw new Error('WEBGL2_UNAVAILABLE');
  if(project.map.projection==='globe') map.setProjection({type:'globe'});
  map.addControl(overlay);
  await withDeadline(document.fonts.ready,15000,'FONT_LOAD_TIMEOUT');
})();
void ready.catch(e=>errors.push(String(e)));
const el=(id:string)=>document.getElementById(id)!;
el('overlay').style.setProperty('--safe-margin',`${project.defaults.safeMarginsPx}px`);
const intersects=(a:DOMRect,b:DOMRect)=>a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom;
const textBox=(node:HTMLElement,name:string):TextBox=>{
  const bounds=node.getBoundingClientRect();
  return {name,left:bounds.left,top:bounds.top,right:bounds.right,bottom:bounds.bottom,
    contentWidth:node.scrollWidth,clientWidth:node.clientWidth,
    contentHeight:node.scrollHeight,clientHeight:node.clientHeight};
};
const rgb=(hex:string)=>hex.slice(1).match(/../g)!.map(value=>parseInt(value,16));
let busy=false;
async function setFrame(frame:number) {
  if(busy) throw new Error('CONCURRENT_FRAME_REQUEST');busy=true;
  try {
    await ready;
    const {scene,sceneFrame,camera}=sceneAtFrame(project,frame), progress=sceneFrame/Math.max(1,scene.durationFrames-1);
    const regionById=new Map(scene.regions.map(r=>[r.featureId,r]));
    const extruded=scene.stylePreset==='C';
    const layers:any[]=[new GeoJsonLayer({id:'engine-regions',data:geo,filled:true,stroked:true,
      extruded,updateTriggers:{getFillColor:[frame],getLineColor:[scene.id],
        getLineWidth:[scene.id],getElevation:[frame]},getFillColor:(f:any)=>{
        if(scene.stylePreset==='A') return styleARegionPaint(scene,f.properties.featureId,progress).fill;
        const region=regionById.get(f.properties.featureId);
        if(!region) return [22,54,83,255];
        const color=rgb(region.fill);
        const opacity=region.effect==='pulse'?180+Math.round(75*Math.sin(progress*Math.PI*2)**2):
          region.effect==='rise'?Math.round(120+135*progress):255;
        return [...color,opacity];
      },getLineColor:(f:any)=>scene.stylePreset==='A'?
        styleARegionPaint(scene,f.properties.featureId,progress).line:[158,222,242,255],
      getLineWidth:(f:any)=>scene.stylePreset==='A'?
        styleARegionPaint(scene,f.properties.featureId,progress).lineWidth:2,
      lineWidthUnits:'pixels',
      getElevation:(f:any)=>{
        const region=regionById.get(f.properties.featureId);
        return extruded?(region?.extrudeMeters||0)*(region?.effect==='rise'?progress:1):0;
      },material:extruded?{ambient:0.28,diffuse:0.72,shininess:24,specularColor:[55,105,140]}:false})];
    const arcs=scene.routes.filter(route=>route.effect==='arc');
    if(arcs.length) layers.push(new ArcLayer({id:'engine-routes',data:arcs,
      getSourcePosition:(r:any)=>r.from,getTargetPosition:(r:any)=>r.to,
      getSourceColor:(r:any)=>rgb(r.color),
      getTargetColor:[255,255,255],getWidth:4}));
    const paths=scene.routes.filter(route=>route.effect!=='arc').map(route=>({route,
      path:routePath(route.from,route.to,route.effect==='reveal'?progress:1,route.effect==='reveal')}))
      .filter(item=>item.path.length>1);
    if(paths.length) {
      layers.push(new PathLayer({id:'engine-route-halo',data:paths,getPath:(item:any)=>item.path,
        getColor:(item:any)=>[...rgb(item.route.color),65],getWidth:18,widthUnits:'pixels',
        billboard:true,capRounded:true,jointRounded:true}));
      layers.push(new PathLayer({id:'engine-route-core',data:paths,getPath:(item:any)=>item.path,
        getColor:(item:any)=>[...rgb(item.route.color),255],getWidth:4,widthUnits:'pixels',
        billboard:true,capRounded:true,jointRounded:true}));
      const tips=paths.filter(item=>item.route.effect==='reveal').map(item=>item.path.at(-1));
      if(tips.length) layers.push(new ScatterplotLayer({id:'engine-route-tips',data:tips,
        getPosition:(point:any)=>point,getFillColor:[255,255,255,255],getRadius:7,
        radiusUnits:'pixels',stroked:true,getLineColor:[30,170,220,255],
        getLineWidth:2,lineWidthUnits:'pixels'}));
    }
    await awaitFrame({subscribe:listener=>{map.on('render',listener);return()=>map.off('render',listener);},
      status:()=>({assetsReady:Boolean(map.isStyleLoaded()&&map.areTilesLoaded()),deckPasses,error:errors.join('\n')||undefined}),
      repaint:()=>map.triggerRepaint(),update:()=>{map.jumpTo(camera);overlay.setProps({layers});}},frame);
    el('eyebrow').textContent=`${scene.stylePreset} · ${scene.variant}`+
      (project.map.projection==='globe'?' · globe':'')+
      (scene.stylePreset==='C'?' · height illustrative':
        scene.stylePreset==='A'&&scene.routes.length?' · visual route':'');
    el('title').textContent=scene.title;
    el('overlay').dataset.variant=scene.variant;
    const subtitle=project.defaults.subtitlesEnabled?subtitleAtSceneFrame(scene,sceneFrame):null;
    el('overlay').dataset.caption=subtitle?'on':'off';
    el('subtitle').textContent=subtitle??'';
    el('cards').dataset.variant=scene.variant;
    el('cards').replaceChildren(...scene.cards.map(card=>{
      const div=document.createElement('div');div.className='card';
      const heading=document.createElement('strong');heading.textContent=card.heading;
      const value=document.createElement('span');value.textContent=card.value;
      const source=document.createElement('small');source.textContent=`Source: ${card.source}`;
      div.append(heading,value,source);return div;
    }));
    el('labels').replaceChildren(...scene.labels.filter(label=>sceneFrame>=label.startFrame&&sceneFrame<label.endFrame).map(label=>{
      const div=document.createElement('div');div.className='label';div.textContent=label.text;
      const point=map.project(label.position);div.style.left=`${point.x}px`;div.style.top=`${point.y}px`;return div;
    }));
    el('attribution').textContent=project.map.attributionText!;
    const textNodes=[el('eyebrow'),el('title'),...Array.from(el('cards').querySelectorAll<HTMLElement>('.card,.card strong,.card span,.card small')),
      el('attribution'),...(subtitle?[el('subtitle')]:[])];
    const issues=textLayoutIssues(textNodes.map((node,index)=>textBox(node,`${node.id||node.className||node.tagName.toLowerCase()}-${index}`)),
      project.output.width,project.output.height);
    if(issues.length) throw new Error(`TEXT_LAYOUT_OVERFLOW:${issues.join(',')}`);
    if(subtitle) {
      const box=el('subtitle').getBoundingClientRect(),safe=project.defaults.safeMarginsPx;
      if(box.left<safe||box.right>project.output.width-safe||box.top<safe||
        box.bottom>project.output.height-safe) throw new Error('SUBTITLE_OUTSIDE_SAFE_AREA');
      if(intersects(box,el('cards').getBoundingClientRect())||
        intersects(box,el('attribution').getBoundingClientRect()))
        throw new Error('SUBTITLE_LAYOUT_OVERLAP');
    }
    return {frame,scene:scene.id,style:scene.stylePreset,deckPasses};
  } finally {busy=false;}
}
Object.assign(window,{engine:{setFrame,totalFrames:totalFrames(project),dispose:()=>{overlay.finalize();map.remove();}}});
