import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ProjectSchema} from '../packages/schema/src/project.schema.ts';
import {projectSrt} from '../packages/media/src/subtitles.ts';

test('Vietnamese and Japanese editorial examples retain Unicode text and exact caption timing',async()=>{
  for(const [file,locale,needle] of [
    ['style-d-vi.json','vi-VN','Ranh giới khái quát'],
    ['style-d-ja.json','ja-JP','一般化された境界線']
  ]) {
    const project=ProjectSchema.parse(JSON.parse(await readFile(`examples/${file}`,'utf8')));
    assert.equal(project.locale,locale);
    assert.match(project.scenes[0].subtitles[0].text,new RegExp(needle));
    assert.equal(projectSrt(project),'');
    project.defaults.subtitlesEnabled=true;
    assert.match(projectSrt(project),/^1\n00:00:00,667 --> 00:00:04,333\n/u);
    assert.ok(projectSrt(project).includes(project.scenes[0].subtitles[0].text));
  }
});
