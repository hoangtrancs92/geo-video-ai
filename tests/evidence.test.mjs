import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EvidenceDossierSchema} from '../packages/evidence/src/dossier.schema.ts';
import {verifyLocalEvidence,approvedFacts} from '../packages/evidence/src/offline.ts';

const source=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));

test('offline dossier verifies pinned raw bytes and does not approve a pending claim',async()=>{
  const dossier=EvidenceDossierSchema.parse(source);
  const verified=await verifyLocalEvidence(dossier,process.cwd());
  assert.equal(verified.length,1);
  assert.equal(verified[0].sha256,dossier.sources[0].rawSha256);
  assert.deepEqual(approvedFacts(dossier),[]);
});

test('dossier rejects orphan observations, unsupported approvals and numeric claims without evidence',()=>{
  const base=structuredClone(source);
  base.observations=[{id:'obs',sourceId:'missing',regionCode:'JPN',
    indicatorCode:'POP',value:10,unit:'people',year:2020,qualityFlags:[]}];
  assert.equal(EvidenceDossierSchema.safeParse(base).success,false);
  for(const mutate of [
    x=>{x.claims[0].approval='approved';x.claims[0].verdict='unsupported';},
    x=>{x.claims[0].claimType='quantitative';},
    x=>{x.claims[0].text='Natural Earth 110m';}
  ]) {
    const candidate=structuredClone(source);mutate(candidate);
    assert.equal(EvidenceDossierSchema.safeParse(candidate).success,false);
  }
});

test('approved source-linked qualitative claim crosses to content fact once approved',()=>{
  const candidate=structuredClone(source);candidate.claims[0].approval='approved';
  const dossier=EvidenceDossierSchema.parse(candidate);
  assert.deepEqual(approvedFacts(dossier),[{id:'map-generalized',
    statement:'The map uses generalized Natural Earth country boundaries.',
    sourceIds:['natural-earth-raw']}]);
});

test('approved quantitative claim cannot cite a missing observation value',()=>{
  const candidate=structuredClone(source);
  candidate.observations=[{id:'obs-missing',sourceId:'natural-earth-raw',
    regionCode:'JPN',indicatorCode:'POP',value:null,unit:'people',year:2020,
    qualityFlags:['missing']}];
  candidate.claims=[{id:'population-claim',text:'Population claim under review',
    evidenceIds:['obs-missing'],sourceIds:['natural-earth-raw'],
    claimType:'quantitative',qualifiers:[],verdict:'supported',approval:'approved'}];
  assert.equal(EvidenceDossierSchema.safeParse(candidate).success,false);
  candidate.claims[0].approval='needs_review';
  assert.equal(EvidenceDossierSchema.safeParse(candidate).success,true);
});
