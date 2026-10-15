import type {ContentProject} from '../../schema/src/content.schema.ts';
import type {EvidenceDossier} from '../../evidence/src/dossier.schema.ts';
import {approvedFacts} from '../../evidence/src/offline.ts';

/** Structural pacing and citation gate. Human factual/editorial review is still required. */
export function assertEditorialSubstance(content:ContentProject,dossier:EvidenceDossier) {
  const approved=approvedFacts(dossier);
  if(approved.length<20) throw new Error('EDITORIAL_APPROVED_CLAIMS_TOO_FEW');
  const facts=new Map(approved.map(fact=>[fact.id,fact]));
  const segmenter=new Intl.Segmenter(content.locale,{granularity:'word'});
  const words=(text:string)=>[...segmenter.segment(text)].filter(item=>item.isWordLike).length;
  for(const kind of ['short','long'] as const) {
    const edition=content.editions[kind],refs=new Set<string>(),sources=new Set<string>();
    let totalWords=0,citedSegments=0;
    for(const item of edition.script) {
      const count=words(item.narration);totalWords+=count;
      if(count<Math.ceil(item.targetSeconds*1.5)||count>Math.ceil(item.targetSeconds*4))
        throw new Error(`EDITORIAL_SEGMENT_PACING:${kind}:${item.segmentId}`);
      if(item.factRefs.length) citedSegments++;
      for(const id of item.factRefs) {
        const fact=facts.get(id);
        if(!fact) throw new Error(`EDITORIAL_UNAPPROVED_FACT:${kind}:${id}`);
        refs.add(id);for(const sourceId of fact.sourceIds) sources.add(sourceId);
      }
    }
    if(totalWords<Math.ceil(edition.durationTargetSeconds*1.5)||
      citedSegments<Math.ceil(edition.script.length*.8)||
      refs.size<(kind==='short'?2:10)||sources.size<(kind==='short'?1:3))
      throw new Error(`EDITORIAL_EDITION_TOO_THIN:${kind}`);
  }
}
