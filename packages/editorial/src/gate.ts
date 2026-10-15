import type {EvidenceDossier} from '../../evidence/src/dossier.schema.ts';
import {approvedFacts} from '../../evidence/src/offline.ts';
import type {ContentProject} from '../../schema/src/content.schema.ts';

export function editorialGate(dossier:EvidenceDossier) {
  const reasons:string[]=[];
  if(dossier.gaps.some(gap=>gap.priority==='high')) reasons.push('HIGH_PRIORITY_RESEARCH_GAP');
  if(approvedFacts(dossier).length===0) reasons.push('NO_APPROVED_FACTS');
  if(dossier.claims.some(claim=>claim.verdict==='conflicting'||claim.verdict==='unsupported'))
    reasons.push('UNRESOLVED_CLAIMS');
  return {status:reasons.length?'needs_research':'ready_for_manual_scripts',reasons} as const;
}

export function assertContentMatchesDossier(dossier:EvidenceDossier,content:ContentProject):void {
  if(content.projectId!==dossier.projectId) throw new Error('CONTENT_DOSSIER_PROJECT_MISMATCH');
  const gate=editorialGate(dossier);
  if(gate.status!=='ready_for_manual_scripts') throw new Error(`CONTENT_RESEARCH_GATE:${gate.reasons.join(',')}`);
  const canonical=new Map(approvedFacts(dossier).map(fact=>[fact.id,fact]));
  if(content.research.facts.length!==canonical.size) throw new Error('CONTENT_FACT_SET_MISMATCH');
  for(const fact of content.research.facts) {
    const original=canonical.get(fact.id);
    if(!original||fact.statement!==original.statement||
      JSON.stringify([...fact.sourceIds].sort())!==JSON.stringify([...original.sourceIds].sort()))
      throw new Error(`CONTENT_FACT_LINEAGE_MISMATCH:${fact.id}`);
  }
  const sources=new Map(dossier.sources.map(source=>[source.id,source]));
  if(content.research.sources.length!==sources.size||
    content.research.sources.some(source=>{
      const original=sources.get(source.id);
      return !original||source.url!==original.url||source.fileRef!==original.localPath||
        source.title!==original.title||source.license!==original.license||
        source.retrievedAt!==original.retrievedAt;
    }))
    throw new Error('CONTENT_SOURCE_SET_MISMATCH');
}
