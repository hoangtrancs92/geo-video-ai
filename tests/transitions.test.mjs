import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {transitionAtFrame,assertSupportedTransitions} from '../packages/motion/src/transition.ts';
import {blendPng,dimPng} from '../scripts/blend-png.mjs';

const project=ProjectSchema.parse(JSON.parse(await readFile('examples/japan-china-map.json','utf8')));
test('mixed-scene fade is frame-defined and works across chunk boundaries',()=>{
  assert.equal(transitionAtFrame(project,99),null);
  assert.deepEqual(transitionAtFrame(project,100),{fromFrame:99,source:'previous',opacity:4/5});
  assert.deepEqual(transitionAtFrame(project,103),{fromFrame:99,source:'previous',opacity:1/5});
  assert.deepEqual(transitionAtFrame(project,104),{fromFrame:99,source:'current',opacity:1/5});
  assert.deepEqual(transitionAtFrame(project,107),{fromFrame:99,source:'current',opacity:4/5});
  assert.equal(transitionAtFrame(project,108),null);
  assert.deepEqual(transitionAtFrame(project,200),{fromFrame:199,source:'previous',opacity:4/5});
  assertSupportedTransitions(project);
  const unsupported=structuredClone(project);unsupported.scenes[0].transitionOut='slide';
  assert.throws(()=>assertSupportedTransitions(unsupported),/TRANSITION_NOT_IMPLEMENTED/);
});

test('PNG blending and fade preserve dimensions and reject invalid opacity',()=>{
  const png=color=>{const image=new PNG({width:2,height:1});
    for(let i=0;i<image.data.length;i+=4) image.data.set([...color,255],i);
    return PNG.sync.write(image);};
  const red=png([200,0,0]),blue=png([0,0,200]);
  const half=PNG.sync.read(blendPng(red,blue,0.5));
  assert.deepEqual([...half.data.subarray(0,4)],[100,0,100,255]);
  assert.equal(half.width,2);assert.equal(half.height,1);
  assert.throws(()=>blendPng(red,blue,-0.1),/INVALID_BLEND_ALPHA/);
  assert.deepEqual([...PNG.sync.read(dimPng(red,0)).data.subarray(0,4)],[3,13,27,255]);
  assert.deepEqual([...PNG.sync.read(dimPng(red,1)).data.subarray(0,4)],[200,0,0,255]);
  assert.throws(()=>dimPng(red,1.1),/INVALID_FADE_OPACITY/);
});
