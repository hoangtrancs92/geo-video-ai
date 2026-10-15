import type {Project,Scene} from '../../schema/src/project.schema.ts';

export function subtitleAtSceneFrame(scene:Scene,sceneFrame:number):string|null {
  if(!Number.isSafeInteger(sceneFrame)||sceneFrame<0||sceneFrame>=scene.durationFrames)
    throw new Error('INVALID_SCENE_FRAME');
  return scene.subtitles.find(item=>sceneFrame>=item.startFrame&&sceneFrame<item.endFrame)?.text??null;
}

function timecode(frame:number,fps:number):string {
  const ms=Math.round(frame*1000/fps);
  const hours=Math.floor(ms/3600000),minutes=Math.floor(ms/60000)%60,
    seconds=Math.floor(ms/1000)%60,millis=ms%1000;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:`+
    `${String(seconds).padStart(2,'0')},${String(millis).padStart(3,'0')}`;
}

export function projectSrt(project:Project):string {
  if(!project.defaults.subtitlesEnabled) return '';
  const cues=project.scenes.flatMap(scene=>scene.subtitles.map(item=>({
    start:scene.startFrame+item.startFrame,end:scene.startFrame+item.endFrame,text:item.text})));
  return cues.map((cue,index)=>`${index+1}\n${timecode(cue.start,project.output.fps)} --> `+
    `${timecode(cue.end,project.output.fps)}\n${cue.text}\n`).join('\n');
}
