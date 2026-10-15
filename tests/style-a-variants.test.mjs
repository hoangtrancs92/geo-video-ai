import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {styleARegionPaint} from '../packages/styles/src/style-a.ts';
import {routePath} from '../packages/motion/src/route.ts';

const project=ProjectSchema.parse(JSON.parse(await readFile('examples/style-a-variants.json','utf8')));
const [focus,duel,route]=project.scenes;

test('A demo contains three contiguous 100-frame scenes with distinct camera and visual plans',()=>{
  assert.deepEqual(project.scenes.map(s=>[s.variant,s.startFrame,s.durationFrames]),[
    ['cinematic-focus',0,100],['cinematic-duel',100,100],['route-reveal',200,100]]);
  for(const scene of project.scenes) assert.notDeepEqual(scene.camera.from,scene.camera.to);
  assert.equal(focus.regions.length,1);
  assert.equal(duel.regions.length,2);
  assert.equal(route.routes[0].effect,'reveal');
});

test('focus dims the other country, duel colors both borders, route reveals by frame',()=>{
  const focusJapan=styleARegionPaint(focus,'JPN',.5);
  const focusChina=styleARegionPaint(focus,'CHN',.5);
  assert.ok(focusJapan.fill[0]>focusChina.fill[0]);
  assert.ok(focusJapan.lineWidth>focusChina.lineWidth);
  assert.deepEqual(styleARegionPaint(duel,'JPN',.5).line.slice(0,3),[244,63,110]);
  assert.deepEqual(styleARegionPaint(duel,'CHN',.5).line.slice(0,3),[56,200,237]);
  const start=routePath(route.routes[0].from,route.routes[0].to,0,true);
  const end=routePath(route.routes[0].from,route.routes[0].to,1,true);
  assert.ok(start.length<end.length);
  assert.notDeepEqual(styleARegionPaint(route,'CHN',.5).fill,focusChina.fill);
  assert.deepEqual(styleARegionPaint(focus,'JPN',.5),styleARegionPaint(focus,'JPN',.5));
  assert.throws(()=>styleARegionPaint(focus,'JPN',NaN),/INVALID_SCENE_PROGRESS/);
});
