import type {Scene} from '../../schema/src/project.schema.ts';
export function sceneHasMotion(scene:Scene):boolean {
  const a=scene.camera.from,b=scene.camera.to;
  if(a.zoom!==b.zoom||a.pitch!==b.pitch||a.bearing!==b.bearing||
    a.center[0]!==b.center[0]||a.center[1]!==b.center[1]) return true;
  if(scene.regions.some(r=>r.effect==='pulse'||r.effect==='rise'||r.effect==='fade')) return true;
  if(scene.routes.some(r=>r.effect==='reveal')) return true;
  if(scene.labels.some(l=>l.startFrame>0||l.endFrame<scene.durationFrames)) return true;
  return false;
}
