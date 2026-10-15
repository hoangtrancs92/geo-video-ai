import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {assembleSpeech} from '../scripts/speech.mjs';
import {runProcess} from '../scripts/process.mjs';

test('imported voice segments produce measured cues and a target-length track',
  {timeout:30000},async()=>{
    const dir=await mkdtemp(path.resolve('outputs','speech-test-'));
    try {
      const clips=path.join(dir,'clips');await mkdir(clips);
      for(let index=0;index<2;index++) await runProcess('ffmpeg',['-y','-f','lavfi','-i',
        `sine=frequency=${300+index*100}:duration=0.5`,'-c:a','pcm_s16le',
        path.join(clips,`${index}.wav`)]);
      const manifest={provider:'imported',targetSeconds:1.5,
        output:{width:1080,height:1920},
        rights:{license:'test-generated',attribution:'synthetic fixture'},
        segments:[0,1].map(index=>({id:`s${index}`,text:`Line ${index}`,
          assetPath:path.relative(process.cwd(),path.join(clips,`${index}.wav`))}))};
      const report=await assembleSpeech(manifest,path.relative(process.cwd(),path.join(dir,'render')),
        {ffprobe:path.resolve('tools/ffprobe')});
      assert.equal(report.captionsEnabled,false);
      assert.equal(report.segments[1].startSeconds,0.5);
      assert.equal(report.measuredSpeechSeconds,1);
      const srt=await readFile(path.join(dir,'render','captions.srt'),'utf8');
      assert.match(srt,/00:00:00,500 --> 00:00:01,000/);
      const ass=await readFile(path.join(dir,'render','captions.ass'),'utf8');
      assert.match(ass,/Dialogue: 0,0:00:00\.50,0:00:01\.00/);
      assert.match(ass,/PlayResX: 1080\nPlayResY: 1920/);
      const probe=JSON.parse(await runProcess(path.resolve('tools/ffprobe'),
        ['-v','error','-show_format','-of','json',path.join(dir,'render','voice.wav')]));
      assert.ok(Math.abs(Number(probe.format.duration)-1.5)<.02);
      await assert.rejects(assembleSpeech({...manifest,targetSeconds:.8},
        path.relative(process.cwd(),path.join(dir,'too-short')),
        {ffprobe:path.resolve('tools/ffprobe')}),/SPEECH_EXCEEDS_TARGET/);
      await assert.rejects(assembleSpeech({...manifest,targetSeconds:4},
        path.relative(process.cwd(),path.join(dir,'too-long')),
        {ffprobe:path.resolve('tools/ffprobe')}),/SPEECH_EXCESSIVE_SILENT_TAIL/);
      const timed={...manifest,targetSeconds:1.2,segments:manifest.segments.map(item=>({
        ...item,targetSeconds:0.6}))};
      const timedReport=await assembleSpeech(timed,
        path.relative(process.cwd(),path.join(dir,'timed')),
        {ffprobe:path.resolve('tools/ffprobe')});
      assert.equal(timedReport.alignment,'segment_target_duration');
      assert.equal(timedReport.segments[1].startSeconds,0.6);
      await assert.rejects(assembleSpeech({...timed,segments:timed.segments.map(item=>({
        ...item,targetSeconds:1}))},path.relative(process.cwd(),path.join(dir,'bad-tempo')),
      {ffprobe:path.resolve('tools/ffprobe')}),/SPEECH_SEGMENT_TEMPO_OUT_OF_RANGE/);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
