import {z} from 'zod';
import type {EvidenceDossier} from '../../evidence/src/dossier.schema.ts';
import {approvedFacts} from '../../evidence/src/offline.ts';
import {draftScriptBrief} from './draft.ts';

const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const segment=z.strictObject({id,kind:z.enum(['short','long']),
  narration:z.string().trim().min(1),claimIds:z.array(id).length(1),
  sourceIds:z.array(id).min(1),visualIntent:z.enum(['explain','number-card']),
  citationsVisible:z.literal(true)});
export const EditorialDraftSchema=z.strictObject({schemaVersion:z.literal('1.0'),
  projectId:id,dossierSha256:z.string().regex(/^[a-f0-9]{64}$/),
  status:z.enum(['needs_research','draft_for_human_review']),
  reasons:z.array(z.string()),
  short:z.strictObject({targetSeconds:z.literal(90),segments:z.array(segment)}),
  long:z.strictObject({targetSeconds:z.literal(900),segments:z.array(segment)}),
  note:z.string().min(1)});

export interface EditorialProvider {
  draft(dossier:EvidenceDossier,dossierSha256:string):z.infer<typeof EditorialDraftSchema>;
}

/** Deterministic offline provider: exact approved claim text only. */
export const ApprovedExcerptProvider:EditorialProvider={
  draft(dossier,dossierSha256) {
    const brief=draftScriptBrief(dossier),facts=approvedFacts(dossier),
      claims=new Map(dossier.claims.map(claim=>[claim.id,claim]));
    function edition(kind:'short'|'long',chosen:typeof facts,targetSeconds:90|900) {
      return {targetSeconds,segments:chosen.map((fact,index)=>({
        id:`${kind}-excerpt-${index+1}`,kind,narration:fact.statement,
        claimIds:[fact.id],sourceIds:fact.sourceIds,
        visualIntent:claims.get(fact.id)?.claimType==='quantitative'?'number-card':'explain',
        citationsVisible:true as const
      }))};
    }
    const result={schemaVersion:'1.0' as const,projectId:dossier.projectId,
      dossierSha256,status:brief.status==='needs_research'?'needs_research' as const:
        'draft_for_human_review' as const,reasons:brief.reasons,
      short:edition('short',facts.slice(0,4),90),long:edition('long',facts,900),
      note:'Source excerpts only. Durations are targets, not measured narration. A human must write and approve complete independent scripts.'};
    return EditorialDraftSchema.parse(result);
  }
};

export function assertEditorialDraftGrounded(dossier:EvidenceDossier,raw:unknown) {
  const draft=EditorialDraftSchema.parse(raw);
  if(draft.projectId!==dossier.projectId) throw new Error('EDITORIAL_DRAFT_PROJECT_MISMATCH');
  const canonical=new Map(approvedFacts(dossier).map(fact=>[fact.id,fact]));
  for(const kind of ['short','long'] as const) {
    for(const item of draft[kind].segments) {
      const fact=canonical.get(item.claimIds[0]);
      if(item.kind!==kind||!fact||item.narration!==fact.statement||
        JSON.stringify(item.sourceIds)!==JSON.stringify(fact.sourceIds))
        throw new Error(`EDITORIAL_DRAFT_UNGROUNDED:${item.id}`);
    }
  }
  return draft;
}
