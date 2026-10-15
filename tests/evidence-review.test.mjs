import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {applyClaimReview,sha256Bytes} from '../packages/evidence/src/review.ts';
import {editorialGate} from '../packages/editorial/src/gate.ts';

const bytes=await readFile('examples/evidence-map-dossier.json');
const pending=EvidenceDossierSchema.parse(JSON.parse(bytes.toString('utf8')));
const hash=sha256Bytes(bytes);
const review=(overrides={})=>({projectId:pending.projectId,inputSha256:hash,
  reviewer:'Editor A',reviewedAt:'2026-10-15T00:00:00.000Z',
  decisions:[{claimId:'map-generalized',verdict:'supported',approval:'approved',
    reason:'Source and map caveat checked by editor.'}],...overrides});

test('manual claim review records who approved the exact dossier snapshot',()=>{
  const result=applyClaimReview(pending,review(),hash);
  assert.equal(result.claims[0].approval,'approved');
  assert.equal(result.reviewLog.length,1);
  assert.equal(result.reviewLog[0].inputSha256,hash);
  assert.equal(result.reviewLog[0].reviewer,'Editor A');
  assert.deepEqual(result.sources,pending.sources);
  assert.equal(pending.claims[0].approval,'needs_review');
  assert.equal(editorialGate(result).status,'needs_research');
});

test('review rejects stale snapshots, unknown claims and unsupported approval',()=>{
  assert.throws(()=>applyClaimReview(pending,review({inputSha256:'0'.repeat(64)}),hash),
    /REVIEW_STALE_DOSSIER/);
  assert.throws(()=>applyClaimReview(pending,review({decisions:[{
    claimId:'unknown',verdict:'supported',approval:'approved',reason:'Source was checked by editor.'}]}),hash),
    /REVIEW_UNKNOWN_CLAIM/);
  const unsupported=review();unsupported.decisions[0].verdict='unsupported';
  assert.throws(()=>applyClaimReview(pending,unsupported,hash));
  const duplicated=review();duplicated.decisions.push({...duplicated.decisions[0]});
  assert.throws(()=>applyClaimReview(pending,duplicated,hash));
});

test('review cannot approve a quantitative claim whose evidence value is missing',()=>{
  const dossier=structuredClone(pending);
  dossier.observations=[{id:'obs-missing',sourceId:'natural-earth-raw',
    regionCode:'JPN',indicatorCode:'POP',value:null,unit:'people',year:2020,
    qualityFlags:['missing']}];
  dossier.claims=[{id:'numeric',text:'A numeric claim awaiting evidence',
    evidenceIds:['obs-missing'],sourceIds:['natural-earth-raw'],
    claimType:'quantitative',qualifiers:[],verdict:'uncertain',approval:'needs_research'}];
  const snapshotHash='1'.repeat(64);
  const decision={projectId:dossier.projectId,inputSha256:snapshotHash,reviewer:'Editor A',
    reviewedAt:'2026-10-15T00:00:00.000Z',decisions:[{claimId:'numeric',
      verdict:'supported',approval:'approved',reason:'Attempted approval for test.'}]};
  assert.throws(()=>applyClaimReview(EvidenceDossierSchema.parse(dossier),decision,snapshotHash));
});

test('scope resolution removes only named gap and preserves audit trail',()=>{
  const question=pending.gaps[0].question;
  const decision=review({decisions:[],gapDecisions:[{question,
    reason:'Editorial scope excludes the disputed interpretation and keeps the source caveat visible.'}]});
  const updated=applyClaimReview(pending,decision,hash);
  assert.equal(updated.gaps.length,pending.gaps.length-1);
  assert.equal(updated.gapReviewLog[0].question,question);
  assert.equal(updated.gapReviewLog[0].inputSha256,hash);
  assert.equal(updated.claims[0].approval,'needs_review');
  assert.throws(()=>applyClaimReview(pending,review({decisions:[],gapDecisions:[{
    question:'unknown',reason:'A sufficiently long reason for this unknown gap.'}]}),hash),
  /REVIEW_UNKNOWN_GAP/);
  assert.throws(()=>applyClaimReview(pending,review({decisions:[],gapDecisions:[{
    question,reason:'short'}]}),hash));
});
