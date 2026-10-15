import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {runProcess} from '../scripts/process.mjs';
import {analyzeAudio} from '../scripts/audio-qa.mjs';

test('audio QA measures loudness and flags a long silent tail',
  {timeout:30000},async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'map-audio-qa-'));
    try {
      const good=path.join(dir,'good.wav'),silentTail=path.join(dir,'silent-tail.wav');
      await runProcess('ffmpeg',['-y','-f','lavfi','-i','sine=frequency=440:duration=2',
        '-c:a','pcm_s16le',good]);
      await runProcess('ffmpeg',['-y','-i',good,'-af','apad=pad_dur=3',
        '-c:a','pcm_s16le',silentTail]);
      const options={ffprobe:path.resolve('tools/ffprobe'),maxSilenceSeconds:2};
      const clean=await analyzeAudio(good,options);
      assert.equal(clean.status,'pass');
      assert.ok(Number.isFinite(clean.integratedLufs));
      const padded=await analyzeAudio(silentTail,options);
      assert.equal(padded.status,'needs_audio_review');
      assert.ok(padded.issues.includes('AUDIO_LONG_SILENCE'));
    } finally {await rm(dir,{recursive:true,force:true});}
  });
