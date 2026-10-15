import {createHash} from 'node:crypto';
import {z} from 'zod';
import {EvidenceDossierSchema,type EvidenceDossier} from './dossier.schema.ts';

const id=z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/);
const sha256=z.string().regex(/^[a-f0-9]{64}$/);

export const ClaimReviewSchema=z.strictObject({
  projectId:id,inputSha256:sha256,reviewer:z.string().trim().min(2),
  reviewedAt:z.iso.datetime(),
  decisions:z.array(z.strictObject({
    claimId:id,verdict:z.enum(['supported','uncertain','conflicting','unsupported']),
    approval:z.enum(['needs_research','needs_review','approved','rejected']),
    reason:z.string().trim().min(10)
  })).default([]),
  gapDecisions:z.array(z.strictObject({question:z.string().trim().min(1),
    reason:z.string().trim().min(20)})).default([])
}).superRefine((review,ctx)=>{
  if(!review.decisions.length&&!review.gapDecisions.length)
    ctx.addIssue({code:'custom',path:['decisions'],message:'At least one decision required'});
  const seen=new Set<string>();
  for(const [index,decision] of review.decisions.entries()) {
    if(seen.has(decision.claimId)) ctx.addIssue({code:'custom',path:['decisions',index,'claimId'],
      message:'Duplicate claim decision'});
    seen.add(decision.claimId);
    if(decision.approval==='approved'&&decision.verdict!=='supported')
      ctx.addIssue({code:'custom',path:['decisions',index,'approval'],
        message:'Approval requires supported verdict'});
  }
  const gapSeen=new Set<string>();
  for(const [index,decision] of review.gapDecisions.entries()) {
    if(gapSeen.has(decision.question)) ctx.addIssue({code:'custom',path:['gapDecisions',index,'question'],
      message:'Duplicate gap decision'});
    gapSeen.add(decision.question);
  }
});

export function sha256Bytes(bytes:Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function applyClaimReview(dossier:EvidenceDossier,rawReview:unknown,inputSha256:string) {
  const review=ClaimReviewSchema.parse(rawReview);
  if(review.projectId!==dossier.projectId) throw new Error('REVIEW_PROJECT_MISMATCH');
  if(review.inputSha256!==inputSha256) throw new Error('REVIEW_STALE_DOSSIER');
  const claims=new Map(dossier.claims.map(claim=>[claim.id,claim]));
  for(const decision of review.decisions)
    if(!claims.has(decision.claimId)) throw new Error(`REVIEW_UNKNOWN_CLAIM:${decision.claimId}`);
  const gaps=new Set(dossier.gaps.map(gap=>gap.question));
  for(const decision of review.gapDecisions)
    if(!gaps.has(decision.question)) throw new Error(`REVIEW_UNKNOWN_GAP:${decision.question}`);
  const resolved=new Set(review.gapDecisions.map(decision=>decision.question));
  const updated={...dossier,
    claims:dossier.claims.map(claim=>{
      const decision=review.decisions.find(item=>item.claimId===claim.id);
      return decision?{...claim,verdict:decision.verdict,approval:decision.approval}:claim;
    }),
    gaps:dossier.gaps.filter(gap=>!resolved.has(gap.question)),
    gapReviewLog:[...(dossier.gapReviewLog??[]),...review.gapDecisions.map(decision=>({
      ...decision,reviewer:review.reviewer,reviewedAt:review.reviewedAt,
      inputSha256:review.inputSha256
    }))],
    reviewLog:[...(dossier.reviewLog??[]),...review.decisions.map(decision=>({
      ...decision,reviewer:review.reviewer,reviewedAt:review.reviewedAt,
      inputSha256:review.inputSha256
    }))]
  };
  return EvidenceDossierSchema.parse(updated);
}
