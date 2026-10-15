import type {EvidenceDossier} from '../../evidence/src/dossier.schema.ts';
import {approvedFacts} from '../../evidence/src/offline.ts';
import {editorialGate} from './gate.ts';

/** A source-linked writing brief. It deliberately contains no invented narration. */
export function draftScriptBrief(dossier:EvidenceDossier) {
  const facts=approvedFacts(dossier);
  const sources=new Map(dossier.sources.map(source=>[source.id,source]));
  const reasons=[...editorialGate(dossier).reasons];
  if(facts.length<6) reasons.push('SHORT_NEEDS_AT_LEAST_6_APPROVED_CLAIMS');
  if(facts.length<20) reasons.push('LONG_NEEDS_AT_LEAST_20_APPROVED_CLAIMS');
  if(new Set(facts.flatMap(fact=>fact.sourceIds)).size<3)
    reasons.push('LONG_NEEDS_AT_LEAST_3_SOURCES');
  const entries=facts.map(fact=>({factId:fact.id,approvedStatement:fact.statement,
    asOf:fact.asOf??null,sources:fact.sourceIds.map(id=>({id,
      title:sources.get(id)?.title??'',url:sources.get(id)?.url??null,
      localPath:sources.get(id)?.localPath??null}))}));
  function edition(kind:'short'|'long',selected:typeof entries,chapters:number,targetSeconds:number) {
    return {kind,targetSeconds,chapters:Array.from({length:chapters},(_,index)=>{
      const start=Math.floor(index*selected.length/chapters),
        end=Math.floor((index+1)*selected.length/chapters);
      return {chapterId:`${kind}-chapter-${index+1}`,targetSeconds:targetSeconds/chapters,
        factIds:selected.slice(start,end).map(item=>item.factId),
        writingTask:'Explain only the approved evidence, context and limitations; cite each claim.'};
    }),factCards:selected,narration:null,requiresHumanReview:true};
  }
  return {schemaVersion:'1.0',projectId:dossier.projectId,
    status:reasons.length?'needs_research':'ready_for_writing',reasons,
    claimCount:facts.length,sourceCount:new Set(facts.flatMap(fact=>fact.sourceIds)).size,
    short:edition('short',entries.slice(0,Math.min(6,entries.length)),2,90),
    long:edition('long',entries,3,900),
    note:'This is an evidence-linked writing brief, not an approved script or render plan.'};
}
