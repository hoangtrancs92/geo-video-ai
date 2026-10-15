import type {Project} from '../../schema/src/project.schema.ts';

const renderable={A:new Set(['cinematic-focus','cinematic-duel','route-reveal']),
  C:new Set(['country-prism','comparison-heights']),D:new Set(['split-comparison','editorial-card'])};

export function assertRenderableStyles(project:Project):void {
  for(const scene of project.scenes)
    if(!renderable[scene.stylePreset].has(scene.variant))
      throw new Error(`STYLE_VARIANT_NOT_IMPLEMENTED:${scene.stylePreset}:${scene.variant}:${scene.id}`);
}
