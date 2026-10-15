import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {editorialGate,assertContentMatchesDossier} from '../packages/editorial/src/gate.ts';

const pending=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
test('insufficient dossier explicitly returns needs_research',()=>{
  const result=editorialGate(EvidenceDossierSchema.parse(pending));
  assert.equal(result.status,'needs_research');
  assert.deepEqual(result.reasons,['HIGH_PRIORITY_RESEARCH_GAP','NO_APPROVED_FACTS']);
});

test('manual content cannot change an approved fact or its source lineage',()=>{
  const draft=structuredClone(pending);draft.gaps=[];draft.claims[0].approval='approved';
  const dossier=EvidenceDossierSchema.parse(draft);
  assert.equal(editorialGate(dossier).status,'ready_for_manual_scripts');
  const content={projectId:dossier.projectId,research:{
    sources:[{id:'natural-earth-raw',url:dossier.sources[0].url,
      fileRef:dossier.sources[0].localPath,title:dossier.sources[0].title,
      license:dossier.sources[0].license,retrievedAt:dossier.sources[0].retrievedAt}],facts:[{id:'map-generalized',
      statement:dossier.claims[0].text,sourceIds:['natural-earth-raw']}]}};
  assert.doesNotThrow(()=>assertContentMatchesDossier(dossier,content));
  content.research.facts[0].statement='A different claim';
  assert.throws(()=>assertContentMatchesDossier(dossier,content),/CONTENT_FACT_LINEAGE_MISMATCH/);
  content.research.facts[0].statement=dossier.claims[0].text;
  content.research.sources[0].url='https://example.org/other';
  assert.throws(()=>assertContentMatchesDossier(dossier,content),/CONTENT_SOURCE_SET_MISMATCH/);
});
