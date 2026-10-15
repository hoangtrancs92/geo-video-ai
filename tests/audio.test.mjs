import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runProcess} from '../scripts/process.mjs';
import {inspectVoice,muxVoice,assertVoiceTrack,inspectAudio,muxAudio} from '../scripts/audio.mjs';
import {assertVideo} from '../scripts/chunks.mjs';

const ffprobe=process.env.FFPROBE_PATH||path.resolve('tools/ffprobe');
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';

test('voice rights, timing and final AAC stream are verified against real local media',
  {skip:!existsSync(ffprobe),timeout:30000},async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'map-audio-'));
    try {
      const video=path.join(dir,'silent.mp4'),audio=path.join(dir,'voice.wav');
      const output=path.join(dir,'with-voice.mp4');
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','color=c=blue:s=320x320:r=30:d=1',
        '-an','-c:v','libx264','-pix_fmt','yuv420p',video]);
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=440:duration=1',
        '-c:a','pcm_s16le',audio]);
      const project={output:{fps:30},scenes:[{startFrame:0,durationFrames:30}],
        audio:{voiceover:'voice.wav',music:null,voiceRights:{license:'test-generated',attribution:'test'}}};
      const source=await inspectVoice(project,dir,ffprobe);
      assert.match(source.sha256,/^[a-f0-9]{64}$/);
      await muxVoice(video,source.path,output,{startFrame:0,frames:30,fps:30,ffmpeg});
      const metadata=JSON.parse(await runProcess(ffprobe,['-v','error','-count_frames',
        '-show_streams','-of','json',output]));
      assertVideo(metadata,{frames:30,width:320,height:320,fps:30});
      assertVoiceTrack(metadata,30,30);
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=220:duration=1',
        '-c:a','pcm_s16le',path.join(dir,'music.wav')]);
      const withMusic={...project,audio:{...project.audio,music:'music.wav',duckingDb:-12,
        musicGainDb:-18,musicRights:{license:'test-generated',attribution:'test fixture'}}};
      const mixed=path.join(dir,'with-voice-music.mp4');
      const assets=await inspectAudio(withMusic,dir,ffprobe);
      assert.equal(await muxAudio(video,assets,mixed,{startFrame:0,frames:30,fps:30,ffmpeg}),true);
      const mixMetadata=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams',
        '-of','json',mixed]));
      assertVoiceTrack(mixMetadata,30,30);
      await assert.rejects(inspectVoice({...project,audio:{...project.audio,music:'music.wav'}},dir,ffprobe),
        /MUSIC_RIGHTS_REQUIRED/);
      await assert.rejects(inspectVoice({...project,audio:{...project.audio,voiceRights:undefined}},dir,ffprobe),
        /VOICE_RIGHTS_REQUIRED/);
      await assert.rejects(inspectVoice({...project,scenes:[{startFrame:0,durationFrames:60}]},dir,ffprobe),
        /VOICE_DURATION_MISMATCH/);
    } finally {await rm(dir,{recursive:true,force:true});}
  });

test('licensed SFX is mixed at its frame cue and remains silent outside the cue',
  {skip:!existsSync(ffprobe),timeout:30000},async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'map-sfx-'));
    try {
      const video=path.join(dir,'silent.mp4'),sfx=path.join(dir,'tone.wav');
      const output=path.join(dir,'with-sfx.mp4'),pcm=path.join(dir,'decoded.pcm');
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','color=c=blue:s=320x320:r=30:d=3',
        '-an','-c:v','libx264','-pix_fmt','yuv420p',video]);
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=880:duration=0.5',
        '-c:a','pcm_s16le',sfx]);
      const rights={license:'test-generated',attribution:'test fixture'};
      const project={output:{fps:30},scenes:[{startFrame:0,durationFrames:90}],
        audio:{voiceover:null,music:null,duckingDb:-12,sfx:[{
          id:'cue',assetPath:'tone.wav',startFrame:30,durationFrames:15,gainDb:-6,rights}]}};
      const assets=await inspectAudio(project,dir,ffprobe);
      assert.equal(assets.sfx.length,1);
      assert.equal(await muxAudio(video,assets,output,{startFrame:0,frames:90,fps:30,ffmpeg}),true);
      const metadata=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams',
        '-of','json',output]));
      assertVoiceTrack(metadata,90,30);
      await runProcess(ffmpeg,['-y','-i',output,'-vn','-ac','1','-ar','8000',
        '-f','s16le',pcm]);
      const samples=await readFile(pcm);
      const rms=(start,end)=>{
        let sum=0,count=0;
        for(let n=Math.floor(start*8000);n<Math.floor(end*8000);n++) {
          const value=samples.readInt16LE(n*2)/32768;sum+=value*value;count++;
        }
        return Math.sqrt(sum/count);
      };
      assert.ok(rms(0.2,0.7)<0.003);
      assert.ok(rms(1.1,1.4)>0.01);
      assert.ok(rms(1.8,2.4)<0.003);
      await assert.rejects(inspectAudio({...project,audio:{...project.audio,
        sfx:[{...project.audio.sfx[0],rights:null}]}},dir,ffprobe),/SFX_RIGHTS_REQUIRED/);
    } finally {await rm(dir,{recursive:true,force:true});}
  });

test('SFX crossing a video chunk boundary is mixed once on the final timeline',
  {skip:!existsSync(ffprobe),timeout:30000},async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'map-sfx-chunk-'));
    try {
      for(const index of [0,1]) await runProcess(ffmpeg,['-y','-f','lavfi','-i',
        'color=c=blue:s=320x320:r=30:d=1','-an','-c:v','libx264','-pix_fmt','yuv420p',
        path.join(dir,`chunk-${index}.mp4`)]);
      const concat=path.join(dir,'concat.txt'),joined=path.join(dir,'joined.mp4');
      await writeFile(concat,"file 'chunk-0.mp4'\nfile 'chunk-1.mp4'\n");
      await runProcess(ffmpeg,['-y','-f','concat','-safe','1','-i',concat,'-c','copy',joined]);
      const cue=path.join(dir,'cue.wav'),output=path.join(dir,'mixed.mp4');
      await runProcess(ffmpeg,['-y','-f','lavfi','-i','sine=frequency=660:duration=0.666667',
        '-c:a','pcm_s16le',cue]);
      const project={output:{fps:30},scenes:[{startFrame:0,durationFrames:60}],
        audio:{voiceover:null,music:null,duckingDb:-12,sfx:[{id:'boundary',assetPath:'cue.wav',
          startFrame:25,durationFrames:20,gainDb:-6,
          rights:{license:'test-generated',attribution:'test fixture'}}]}};
      const assets=await inspectAudio(project,dir,ffprobe);
      await muxAudio(joined,assets,output,{startFrame:0,frames:60,fps:30,ffmpeg});
      const metadata=JSON.parse(await runProcess(ffprobe,['-v','error','-count_frames',
        '-show_streams','-of','json',output]));
      assertVideo(metadata,{frames:60,width:320,height:320,fps:30});
      assertVoiceTrack(metadata,60,30);
    } finally {await rm(dir,{recursive:true,force:true});}
  });
