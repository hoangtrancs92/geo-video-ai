import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createWorkflowServer} from '../scripts/workflow-server.mjs';

test('local workflow intake persists a blocked brief and exposes evidence',async t=>{
  const root=process.cwd(),id=`api-test-${process.pid}`;
  const dossier=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
  dossier.projectId=id;
  const input=path.join(root,'outputs','evidence',`${id}.json`);
  const job=path.join(root,'outputs','workflow',id);
  await mkdir(path.dirname(input),{recursive:true});
  await writeFile(input,JSON.stringify(dossier));
  const server=createWorkflowServer(root);
  try {
    try {await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));}
    catch(error) {if(error.code==='EPERM') {t.skip('Localhost blocked by sandbox');return;}throw error;}
    const base=`http://127.0.0.1:${server.address().port}`;
    const created=await fetch(`${base}/api/documentaries`,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify({dossierPath:path.relative(root,input)})});
    assert.equal(created.status,201);
    const state=await created.json();assert.equal(state.status,'needs_research');
    assert.equal(state.gates.render,'pending');
    const brief=await (await fetch(`${base}/api/documentaries/${id}/scripts`)).json();
    assert.equal(brief.long.narration,null);
    assert.equal((await fetch(`${base}/api/documentaries/${id}/qa`)).status,200);
    assert.equal((await fetch(`${base}/api/documentaries`,{method:'POST',
      headers:{'content-type':'application/json'},body:JSON.stringify({dossierPath:path.relative(root,input)})})).status,409);
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await rm(input,{force:true});await rm(job,{recursive:true,force:true});
  }
});
