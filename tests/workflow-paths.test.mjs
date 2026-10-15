import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {safeJson} from '../scripts/workflow-actions.mjs';
import {verifyLocalEvidence} from '../packages/evidence/src/offline.ts';

test('workflow JSON and evidence source symlinks cannot escape the project root',async()=>{
  const root=process.cwd(),outside=await mkdtemp(path.join(os.tmpdir(),'workflow-outside-')),
    link=path.join(root,'outputs','evidence',`outside-${process.pid}.json`);
  await mkdir(path.dirname(link),{recursive:true});
  try {
    await writeFile(path.join(outside,'secret.json'),'{}');
    await symlink(path.join(outside,'secret.json'),link);
    assert.throws(()=>safeJson(root,path.relative(root,link)),/WORKFLOW_JSON_SYMLINK_OUTSIDE_ROOT/);
    await assert.rejects(verifyLocalEvidence({sources:[{
      id:'test',localPath:path.relative(root,link),rawSha256:'0'.repeat(64)}]},root),
    /SOURCE_SYMLINK_OUTSIDE_ROOT/);
  } finally {await rm(link,{force:true});await rm(outside,{recursive:true,force:true});}
});
