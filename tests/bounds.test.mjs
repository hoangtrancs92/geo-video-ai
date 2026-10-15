import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {featureBounds,fitMercatorBounds} from '../packages/geodata/src/bounds.ts';
test('fit keeps both countries within content width and moves map above lower card',async()=>{
  const geo=JSON.parse(await readFile('assets/geodata/natural-earth-jpn-chn.geojson'));
  const bounds=featureBounds(geo),viewport={width:1080,height:1920};
  assert.ok(bounds[0]<75&&bounds[2]>145);
  const a=fitMercatorBounds(bounds,viewport,{left:90,right:990,top:380,bottom:1450},.35);
  const d=fitMercatorBounds(bounds,viewport,{left:90,right:990,top:350,bottom:1100},.35);
  assert.ok(a.zoom<3.2&&a.zoom>2.5);
  assert.ok(d.center[1]<a.center[1]);
  assert.throws(()=>fitMercatorBounds(bounds,viewport,{left:0,right:1200,top:0,bottom:1000}));
});

test('widescreen scene is independently fitted to right-side map area',async()=>{
  const geo=JSON.parse(await readFile('assets/geodata/natural-earth-jpn-chn.geojson'));
  const wide=JSON.parse(await readFile('examples/japan-china-wide.json','utf8'));
  const portrait=JSON.parse(await readFile('examples/japan-china-map.json','utf8'));
  assert.deepEqual([wide.output.width,wide.output.height],[1920,1080]);
  assert.notDeepEqual(wide.scenes[0].camera.from.center,portrait.scenes[0].camera.from.center);
  const [west,south,east,north]=featureBounds(geo);
  const mercator=lat=>(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
  for(const scene of [wide.scenes[0],wide.scenes[2]]) {
    const camera=scene.camera.from,world=512*2**camera.zoom;
    const x=lon=>960+(lon-camera.center[0])/360*world;
    const y=lat=>540+(mercator(lat)-mercator(camera.center[1]))*world;
    assert.ok(x(west)>650&&x(east)<1900);
    assert.ok(y(north)>130&&y(south)<950);
  }
});
