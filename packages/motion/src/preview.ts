import type {Project} from '../../schema/src/project.schema.ts';
import {sceneAtFrame} from './timeline.ts';
import {transitionAtFrame} from './transition.ts';

export function previewProjectPath(value:string):string {
  if(!/^(?:examples|outputs\/projects)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.json$/.test(value))
    throw new Error('PREVIEW_PROJECT_PATH_INVALID');
  return `/${value}`;
}

export function previewFrame(project:Project,frame:number) {
  const scene=sceneAtFrame(project,frame).scene;
  const transition=transitionAtFrame(project,frame);
  return {sceneId:scene.id,style:scene.stylePreset,variant:scene.variant,
    sourceFrame:transition?.source==='previous'?transition.fromFrame:frame,
    opacity:transition?.opacity??1};
}
