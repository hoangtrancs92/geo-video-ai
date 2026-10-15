import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {draftScriptBrief} from '../packages/editorial/src/draft.ts';

const example=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
test('sparse evidence creates a blocked brief without narration',()=>{
  const brief=draftScriptBrief(EvidenceDossierSchema.parse(example));
  assert.equal(brief.status,'needs_research');
  assert.equal(brief.short.narration,null);
  assert.equal(brief.long.narration,null);
  assert.ok(brief.reasons.includes('LONG_NEEDS_AT_LEAST_20_APPROVED_CLAIMS'));
});

test('approved facts retain their exact source links in separate edition briefs',()=>{
  const data=structuredClone(example);data.gaps=[];
  const source=data.sources[0];
  data.sources=[source,{...source,id:'second-source'},
    {...source,id:'third-source'}];
  data.claims=Array.from({length:20},(_,index)=>({
    ...data.claims[0],id:`claim-${index+1}`,
    text:`Reviewed claim ${String.fromCharCode(65+index)}`,sourceIds:[data.sources[index%3].id],
    verdict:'supported',approval:'approved'}));
  const brief=draftScriptBrief(EvidenceDossierSchema.parse(data));
  assert.equal(brief.status,'ready_for_writing');
  assert.equal(brief.short.factCards.length,6);
  assert.equal(brief.long.factCards.length,20);
  assert.equal(brief.long.chapters.length,3);
  assert.equal(brief.long.factCards[8].sources[0].id,data.claims[8].sourceIds[0]);
  assert.equal(brief.long.factCards[8].approvedStatement,data.claims[8].text);
});
