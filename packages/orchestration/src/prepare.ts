import {z} from 'zod';
import {ContentProjectSchema} from '../../schema/src/content.schema.ts';
import {ProjectSchema,type Project} from '../../schema/src/project.schema.ts';
import {EvidenceDossierSchema} from '../../evidence/src/dossier.schema.ts';
import {assertContentMatchesDossier} from '../../editorial/src/gate.ts';
import {assertEditorialSubstance} from '../../editorial/src/substance.ts';

const sha256=z.string().regex(/^[a-f0-9]{64}$/);
export const ScriptApprovalSchema=z.strictObject({
  projectId:z.string().min(1),contentSha256:sha256,dossierSha256:sha256,
  reviewer:z.string().trim().min(2),approvedAt:z.iso.datetime(),
  note:z.string().trim().min(10)
});

export function assertScriptReady(content:z.infer<typeof ContentProjectSchema>,
  dossier:z.infer<typeof EvidenceDossierSchema>) {
  assertContentMatchesDossier(dossier,content);
  if(JSON.stringify(content.editions.short.scenes)===JSON.stringify(content.editions.long.scenes))
    throw new Error('EDITIONS_SHARE_IDENTICAL_SCENES');
  for(const kind of ['short','long'] as const) {
    const edition=content.editions[kind],minimum=kind==='short'?2:10;
    if(edition.scenes.length<minimum||edition.script.length<minimum||
      (kind==='long'&&edition.outline.length<3)||
      edition.script.some(segment=>segment.targetSeconds>90)||
      new Set(edition.script.map(segment=>segment.narration)).size!==edition.script.length)
      throw new Error(`EDITORIAL_PLAN_TOO_THIN:${kind}`);
    if(edition.voice.provider==='external') throw new Error(`VOICE_PROVIDER_NOT_AVAILABLE:${kind}`);
  }
  assertEditorialSubstance(content,dossier);
}

export function prepareEditions(rawContent:unknown,rawDossier:unknown,
  rawApproval:unknown,hashes:{contentSha256:string;dossierSha256:string},
  templates:{short:unknown;long:unknown}) {
  const content=ContentProjectSchema.parse(rawContent),
    dossier=EvidenceDossierSchema.parse(rawDossier),
    approval=ScriptApprovalSchema.parse(rawApproval);
  if(approval.projectId!==content.projectId||
    approval.contentSha256!==hashes.contentSha256||
    approval.dossierSha256!==hashes.dossierSha256)
    throw new Error('SCRIPT_APPROVAL_STALE_OR_WRONG_PROJECT');
  assertScriptReady(content,dossier);
  const result:{short:Project;long:Project}={} as never;
  for(const kind of ['short','long'] as const) {
    const edition=content.editions[kind],template=ProjectSchema.parse(templates[kind]);
    const {voiceover:_oldVoice,voiceRights:_oldRights,...otherAudio}=template.audio;
    result[kind]=ProjectSchema.parse({
      ...template,projectId:`${content.projectId}-${kind}`,title:edition.title,
      locale:content.locale,
      output:{width:edition.output.width,height:edition.output.height,
        fps:edition.output.fps,codec:edition.output.codec,quality:template.output.quality},
      defaults:{...template.defaults,theme:content.production.defaultTheme,
        subtitlesEnabled:edition.captions.enabled},
      audio:{...otherAudio,voiceover:edition.voice.provider==='local'?edition.voice.assetPath:null,
        ...(edition.voice.provider==='local'?{voiceRights:edition.voice.rights}:{})},
      scenes:edition.scenes
    });
  }
  return {content,dossier,approval,projects:result};
}
