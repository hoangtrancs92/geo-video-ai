import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {ApprovedExcerptProvider,assertEditorialDraftGrounded} from '../packages/editorial/src/provider.ts';

const example=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
test('offline provider preserves only approved claim wording and references',()=>{
  const raw=structuredClone(example);raw.gaps=[];
  const source=raw.sources[0];raw.sources=[source,{...source,id:'source-b'},
    {...source,id:'source-c'}];
  raw.claims=Array.from({length:20},(_,index)=>({...raw.claims[0],
    id:`claim-${index}`,text:`Editorial fixture ${String.fromCharCode(65+index)}`,
    sourceIds:[raw.sources[index%3].id],verdict:'supported',approval:'approved'}));
  const dossier=EvidenceDossierSchema.parse(raw),hash='a'.repeat(64);
  const draft=ApprovedExcerptProvider.draft(dossier,hash);
  assert.equal(draft.status,'draft_for_human_review');
  assert.equal(draft.short.segments.length,4);
  assert.equal(draft.long.segments.length,20);
  assert.equal(draft.short.segments[0].narration,raw.claims[0].text);
  assert.doesNotThrow(()=>assertEditorialDraftGrounded(dossier,draft));
  const changed=structuredClone(draft);changed.long.segments[0].narration='An invented conclusion';
  assert.throws(()=>assertEditorialDraftGrounded(dossier,changed),/EDITORIAL_DRAFT_UNGROUNDED/);
  changed.long.segments[0].narration=draft.long.segments[0].narration;
  changed.long.segments[0].sourceIds=['source-c'];
  assert.throws(()=>assertEditorialDraftGrounded(dossier,changed),/EDITORIAL_DRAFT_UNGROUNDED/);
});

test('sparse dossier cannot yield a ready script',()=>{
  const draft=ApprovedExcerptProvider.draft(EvidenceDossierSchema.parse(example),'b'.repeat(64));
  assert.equal(draft.status,'needs_research');
  assert.equal(draft.short.segments.length,0);
  assert.equal(draft.long.segments.length,0);
});
