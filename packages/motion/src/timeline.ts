import type {Project,Scene,Camera} from '../../schema/src/project.schema.ts';

const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const wrap=(value:number)=>((value+180)%360+360)%360-180;
export function cameraAtFrame(from:Camera,to:Camera,sceneFrame:number,duration:number,easing:'linear'|'easeInOutCubic'):Camera {
  if(!Number.isSafeInteger(sceneFrame)||sceneFrame<0||sceneFrame>=duration||duration<1)
    throw new Error('INVALID_SCENE_FRAME');
  const x=clamp01(sceneFrame/Math.max(1,duration-1));
  const t=easing==='linear'?x:x<0.5?4*x*x*x:1-(-2*x+2)**3/2;
  const lerp=(a:number,b:number)=>a+(b-a)*t;
  return {center:[wrap(from.center[0]+wrap(to.center[0]-from.center[0])*t),
    lerp(from.center[1],to.center[1])],zoom:lerp(from.zoom,to.zoom),
    pitch:lerp(from.pitch,to.pitch),bearing:wrap(from.bearing+wrap(to.bearing-from.bearing)*t)};
}
export function totalFrames(project:Project):number {
  const last=project.scenes.at(-1);
  if(!last) throw new Error('EMPTY_TIMELINE');
  return last.startFrame+last.durationFrames;
}
export function sceneAtFrame(project:Project,frame:number):{scene:Scene;sceneFrame:number;camera:Camera} {
  if(!Number.isSafeInteger(frame)||frame<0||frame>=totalFrames(project)) throw new Error('FRAME_OUTSIDE_TIMELINE');
  let low=0,high=project.scenes.length-1;
  while(low<=high) {
    const mid=(low+high)>>1,scene=project.scenes[mid];
    if(frame<scene.startFrame) high=mid-1;
    else if(frame>=scene.startFrame+scene.durationFrames) low=mid+1;
    else {const sceneFrame=frame-scene.startFrame;
      return {scene,sceneFrame,camera:cameraAtFrame(scene.camera.from,scene.camera.to,
        sceneFrame,scene.durationFrames,scene.camera.easing)};}
  }
  throw new Error('TIMELINE_GAP');
}
