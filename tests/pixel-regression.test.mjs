import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PNG} from 'pngjs';
import {inspectPixels,assertMapPixels} from '../scripts/pixels.mjs';

test('actual SwiftShader frame contains both map and shaded deck geometry',()=>{
  const png=PNG.sync.read(readFileSync(new URL('./fixtures/swiftshader-frame-0.png',import.meta.url)));
  const stats=inspectPixels(png);
  assert.equal(stats.blackFraction,0);
  assert.ok(stats.cyanFraction > .02);
  assert.ok(stats.pinkFraction > .002);
  assert.doesNotThrow(()=>assertMapPixels(stats));
});

test('shading tolerance still rejects absent overlay and unrelated colors',()=>{
  for(const color of [[9,23,39],[255,255,255],[128,128,128],[220,120,40],[56,200,237],[40,10,20]]) {
    const data=Buffer.alloc(100*100*4);
    for(let i=0;i<10000;i++) data.set(i%2?[56,200,237,255]:[...color,255],i*4);
    const stats=inspectPixels({data,width:100,height:100});
    assert.equal(stats.pinkFraction,0,`unexpected rose detection: ${color}`);
    assert.throws(()=>assertMapPixels(stats),/MISSING_MAP_OR_DECK_OVERLAY/);
  }
});
