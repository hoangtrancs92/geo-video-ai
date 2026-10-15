import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {validateGeoJson} from '../packages/geodata/src/validate.ts';
import {featureBounds,fitMercatorBounds} from '../packages/geodata/src/bounds.ts';
import {atomicJson} from './chunks.mjs';

export const sourceUrl='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const sha=data=>createHash('sha256').update(data).digest('hex');
const root=path.resolve(import.meta.dirname,'..');
const codeOf=feature=>{
  const p=feature.properties||{};
  for(const field of ['ADM0_A3','ISO_A3','SOV_A3'])
    if(p[field]==='JPN'||p[field]==='CHN') return p[field];
  if(p.ADMIN==='Japan') return 'JPN';
  if(p.ADMIN==='China') return 'CHN';
  return null;
};
export function selectCountries(source) {
  if(source?.type!=='FeatureCollection'||!Array.isArray(source.features)) throw new Error('INVALID_NATURAL_EARTH_SOURCE');
  const found=new Map();
  for(const feature of source.features) {
    const code=codeOf(feature);if(!code) continue;
    if(found.has(code)) throw new Error(`DUPLICATE_COUNTRY:${code}`);
    found.set(code,{type:'Feature',id:code,
      properties:{featureId:code,name:code==='JPN'?'Japan':'China',sourceId:'natural-earth-110m',
        boundaryBasis:'Natural Earth de facto 110m'},geometry:feature.geometry});
  }
  for(const code of ['JPN','CHN']) if(!found.has(code)) throw new Error(`MISSING_COUNTRY:${code}`);
  const output={type:'FeatureCollection',features:['JPN','CHN'].map(code=>found.get(code))};
  validateGeoJson(output);
  return output;
}
async function importData(values) {
  let bytes;
  if(values.download) {
    const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
  } else if(values.source) bytes=await readFile(path.resolve(values.source));
  else throw new Error('Use --download or --source <local Natural Earth GeoJSON>');
  if(bytes.length>5*1024*1024) throw new Error('SOURCE_TOO_LARGE');
  const source=JSON.parse(bytes.toString('utf8'));
  const subset=selectCountries(source);
  const outDir=path.join(root,'assets/geodata');await mkdir(path.join(outDir,'source'),{recursive:true});
  const raw=path.join(outDir,'source/ne_110m_admin_0_countries.geojson');
  const output=path.join(outDir,'natural-earth-jpn-chn.geojson');
  const normalized=Buffer.from(JSON.stringify(subset)+'\n');
  await writeFile(raw,bytes);await writeFile(output,normalized);
  const manifest={sourceId:'natural-earth-110m',sourceUrl,license:'Public domain',
    licenseUrl:'https://github.com/nvkelso/natural-earth-vector/blob/master/LICENSE.md',
    sourceDescription:'Natural Earth 1:110m Admin 0 countries, de facto boundary depiction',
    boundaryCaveat:'Generalized cartography. Territorial status and disputed boundaries require editorial review.',
    retrievedAt:new Date().toISOString(),rawSha256:sha(bytes),normalizedSha256:sha(normalized),
    rawBytes:bytes.length,normalizedBytes:normalized.length,featureIds:['JPN','CHN'],
    sourceMode:values.download?'download':'local-file'};
  await atomicJson(path.join(outDir,'natural-earth-jpn-chn.manifest.json'),manifest);
  const example=JSON.parse(await readFile(path.join(root,'examples/mixed-acd.json'),'utf8'));
  example.projectId='japan-china-map-proof';example.title='Japan and China — map geometry proof';
  example.map.styleId='local-dark';
  example.map.geojsonPath='assets/geodata/natural-earth-jpn-chn.geojson';
  example.map.attributionText='Map data: Natural Earth 110m · boundaries for illustration';
  const scenes=example.scenes;
  scenes[0].variant='route-reveal';scenes[0].title='Japan and China';scenes[0].regions=[{featureId:'JPN',fill:'#F43F6E',effect:'pulse'},
    {featureId:'CHN',fill:'#38C8ED',effect:'solid'}];
  scenes[0].routes=[{id:'tokyo-beijing-illustrative',from:[139.6917,35.6895],
    to:[116.4074,39.9042],color:'#9BEFFF',effect:'reveal'}];
  scenes[0].labels=[{text:'Tokyo',position:[139.6917,35.6895],startFrame:25,endFrame:100},
    {text:'Beijing',position:[116.4074,39.9042],startFrame:35,endFrame:100}];
  scenes[0].transitionOut='fade';
  scenes[1].title='Illustrative extrusion';scenes[1].regions=[{featureId:'CHN',fill:'#38C8ED',
    effect:'rise',extrudeMeters:500000}];scenes[1].labels=[];
  scenes[1].transitionOut='fade';
  scenes[2].title='Map source and scale';scenes[2].cards=[{heading:'Map data',value:'Natural Earth 110m',
    source:'Natural Earth; generalized de facto boundaries'}];
  const bounds=featureBounds(subset);
  for(const scene of scenes) {
    const box=scene.id==='d'?{left:90,right:990,top:350,bottom:1100}:
      {left:90,right:990,top:380,bottom:1450};
    const fitted=fitMercatorBounds(bounds,{width:1080,height:1920},box,scene.id==='c'?0.55:0.35);
    for(const point of [scene.camera.from,scene.camera.to]) {
      point.center=fitted.center;point.zoom=fitted.zoom;
    }
  }
  scenes[0].camera.to.zoom+=0.12;
  await atomicJson(path.join(root,'examples/japan-china-map.json'),example);
  const wide=structuredClone(example);wide.projectId='japan-china-wide-proof';
  wide.title='Japan and China — widescreen layout proof';
  wide.output.width=1920;wide.output.height=1080;
  for(const scene of wide.scenes) {
    const box=scene.id==='d'?{left:680,right:1840,top:180,bottom:880}:
      {left:700,right:1840,top:220,bottom:900};
    const fitted=fitMercatorBounds(bounds,{width:1920,height:1080},box,scene.id==='c'?0.45:0.3);
    for(const point of [scene.camera.from,scene.camera.to]) {
      point.center=fitted.center;point.zoom=fitted.zoom;
    }
  }
  wide.scenes[0].camera.to.zoom+=0.12;
  await atomicJson(path.join(root,'examples/japan-china-wide.json'),wide);
  console.log(JSON.stringify({status:'imported',output:path.relative(root,output),
    example:'examples/japan-china-map.json',exampleWide:'examples/japan-china-wide.json',...manifest},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const {values}=parseArgs({options:{download:{type:'boolean',default:false},source:{type:'string'}}});
  if(values.download&&values.source) throw new Error('Choose exactly one source mode');
  await importData(values);
}
