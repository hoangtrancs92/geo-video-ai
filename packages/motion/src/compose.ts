import {ProjectSchema,type Project,type Scene} from '../../schema/src/project.schema.ts';
import {assertRenderableStyles} from '../../styles/src/support.ts';
import {assertSupportedTransitions} from './transition.ts';

export type SceneSelection={project:Project;sceneId:string};

export function composeScenes(base:Project,selections:readonly SceneSelection[],projectId:string,title:string):Project {
  if(!selections.length) throw new Error('COMPOSITION_EMPTY');
  let startFrame=0;
  const scenes:Scene[]=selections.map(({project,sceneId},index)=>{
    if(JSON.stringify(project.output)!==JSON.stringify(base.output)||project.locale!==base.locale||
      JSON.stringify(project.map)!==JSON.stringify(base.map)||
      JSON.stringify(project.audio)!==JSON.stringify(base.audio))
      throw new Error(`COMPOSITION_INCOMPATIBLE_SOURCE:${project.projectId}`);
    const source=project.scenes.find(scene=>scene.id===sceneId);
    if(!source) throw new Error(`COMPOSITION_SCENE_MISSING:${project.projectId}:${sceneId}`);
    const prefix=`scene-${index}-`;
    const scene:Scene={...structuredClone(source),id:prefix+source.id.slice(0,64-prefix.length),
      startFrame,transitionOut:index===selections.length-1?'cut':'fade'};
    startFrame+=scene.durationFrames;
    return scene;
  });
  const result=ProjectSchema.parse({...structuredClone(base),projectId,title,scenes});
  assertRenderableStyles(result);assertSupportedTransitions(result);
  return result;
}
