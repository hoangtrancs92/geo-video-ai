import {objectHash} from './chunks.mjs';

// A single, audited maintenance change: tolerate an already-created scratch/QA
// directory after removing it. Scene, browser, codec and frame inputs are unchanged.
const mkdirFixPreviousHash = '44b4bd8f8ed268b57cc8e2dd035c4de929b68f649d6d99eca1d3b7f5217324e1';

export function resumeIdentity(prior, current, resume) {
  const currentIdentity = objectHash(current);
  if (!prior) return {identity:currentIdentity, compatiblePatch:false};
  if (!resume) throw new Error('RESUME_REQUIRED');
  const previousIdentity = objectHash(prior);
  if (previousIdentity === currentIdentity) return {identity:currentIdentity, compatiblePatch:false};
  const previousHash = prior.sources?.['scripts/scale-spike.mjs'];
  const currentHash = current.sources?.['scripts/scale-spike.mjs'];
  if (previousHash !== mkdirFixPreviousHash || typeof currentHash !== 'string' ||
      currentHash === previousHash ||
      objectHash({...current,sources:{...current.sources,'scripts/scale-spike.mjs':previousHash}}) !== previousIdentity)
    throw new Error('RESUME_CONFIG_MISMATCH');
  return {identity:previousIdentity,compatiblePatch:true,previousHash,currentHash};
}
