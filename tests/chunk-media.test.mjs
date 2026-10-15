import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runProcess} from '../scripts/process.mjs';
import {assertVideo,atomicJson,fileHash,reusableChunk} from '../scripts/chunks.mjs';
const ffmpeg=process.env.FFMPEG_PATH||'ffmpeg';
const ffprobe=process.env.FFPROBE_PATH||path.resolve('tools/ffprobe');
const source=path.resolve('docs/evidence/m0/spike.mp4');
test('existing M0 video splits, verifies stored chunks and concatenates to 100 frames',
  {skip:!existsSync(source)||!existsSync(ffprobe),timeout:120000},async()=>{
    const dir=await mkdtemp(path.join(os.tmpdir(),'map-real-chunk-'));
    try {
      for(let id=0;id<2;id++) {
        const file=path.join(dir,`${String(id).padStart(5,'0')}.mp4`);
        await runProcess(ffmpeg,['-y','-i',source,'-vf',`trim=start_frame=${id*50}:end_frame=${id*50+50},setpts=PTS-STARTPTS`,
          '-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',file]);
        const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-count_frames','-show_streams','-of','json',file]));
        assertVideo(probe,{frames:50,width:1080,height:1920});
        await atomicJson(path.join(dir,`${String(id).padStart(5,'0')}.json`),
          {status:'verified',identity:'real-m0-reencode-test',start:id*50,count:50,sha256:await fileHash(file)});
      }
      assert.ok(await reusableChunk(dir,{id:0,start:0,count:50},'real-m0-reencode-test'));
      assert.ok(await reusableChunk(dir,{id:1,start:50,count:50},'real-m0-reencode-test'));
      await writeFile(path.join(dir,'concat.txt'),"file '00000.mp4'\nfile '00001.mp4'\n");
      const output=path.join(dir,'joined.mp4');
      await runProcess(ffmpeg,['-y','-f','concat','-safe','1','-i',path.join(dir,'concat.txt'),'-c','copy',output]);
      const probe=JSON.parse(await runProcess(ffprobe,['-v','error','-count_frames','-show_streams','-of','json',output]));
      assertVideo(probe,{frames:100,width:1080,height:1920});
    } finally {await rm(dir,{recursive:true,force:true});}
  });
