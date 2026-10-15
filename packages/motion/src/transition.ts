import type {Project} from '../../schema/src/project.schema.ts';
import {sceneAtFrame} from './timeline.ts';

export const FADE_FRAMES=8;

export function transitionAtFrame(project:Project,frame:number):{fromFrame:number;source:'previous'|'current';opacity:number}|null {
  const {scene,sceneFrame}=sceneAtFrame(project,frame);
  if(sceneFrame>=FADE_FRAMES||scene.startFrame===0) return null;
  const previous=project.scenes.find(item=>item.startFrame+item.durationFrames===scene.startFrame);
  if(previous?.transitionOut!=='fade') return null;
  const half=FADE_FRAMES/2;
  return {fromFrame:scene.startFrame-1,
    source:sceneFrame<half?'previous':'current',
    opacity:sceneFrame<half?(half-sceneFrame)/(half+1):(sceneFrame-half+1)/(half+1)};
}

export function assertSupportedTransitions(project:Project):void {
  for(const scene of project.scenes)
    if(scene.transitionOut!=='cut'&&scene.transitionOut!=='fade')
      throw new Error(`TRANSITION_NOT_IMPLEMENTED:${scene.transitionOut}:${scene.id}`);
}
