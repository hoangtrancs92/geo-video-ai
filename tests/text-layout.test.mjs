import test from 'node:test';
import assert from 'node:assert/strict';
import {textLayoutIssues} from '../packages/media/src/text-layout.ts';

const box={name:'title',left:40,top:30,right:500,bottom:170,
  contentWidth:460,clientWidth:460,contentHeight:140,clientHeight:140};

test('text layout accepts wrapped text that fits its box',()=>{
  assert.deepEqual(textLayoutIssues([box],1080,1920),[]);
});

test('text layout rejects clipped text and offscreen boxes',()=>{
  assert.deepEqual(textLayoutIssues([
    {...box,name:'subtitle',contentWidth:481},
    {...box,name:'card',bottom:1930}
  ],1080,1920),['subtitle:clipped','card:outside']);
});
