import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {handleWorkflowRequest} from '../scripts/workflow-server.mjs';

async function call(root,method,url,payload) {
  const request=Readable.from(payload===undefined?[]:[JSON.stringify(payload)]);
  request.method=method;request.url=url;
  const response={status:0,headers:null,body:'',
    writeHead(status,headers){this.status=status;this.headers=headers;},
    end(value){this.body=String(value??'');}};
  await handleWorkflowRequest(root,request,response);
  return {status:response.status,body:JSON.parse(response.body)};
}
test('workflow HTTP handler executes intake, review, draft and QA without localhost',async()=>{
  const root=process.cwd(),id=`api-direct-${process.pid}`,
    input=path.join(root,'outputs','evidence',`${id}.json`),
    job=path.join(root,'outputs','workflow',id);
  await mkdir(path.dirname(input),{recursive:true});
  try {
    const dossier=JSON.parse(await readFile('examples/evidence-map-dossier.json','utf8'));
    dossier.projectId=id;await writeFile(input,JSON.stringify(dossier));
    const created=await call(root,'POST','/api/documentaries',{
      dossierPath:path.relative(root,input)});
    assert.equal(created.status,201);
    assert.equal(created.body.status,'needs_research');
    assert.equal((await call(root,'GET',`/api/documentaries/${id}/evidence`)).body.projectId,id);
    const review=await call(root,'POST',`/api/documentaries/${id}/approve-evidence`,{
      projectId:id,inputSha256:created.body.dossierSha256,reviewer:'Editor Test',
      reviewedAt:'2026-10-15T00:00:00.000Z',decisions:[{claimId:'map-generalized',
        verdict:'supported',approval:'approved',reason:'Source and caveat reviewed in test.'}]});
    assert.equal(review.status,200);
    assert.equal(review.body.state.reviewCount,1);
    const generated=await call(root,'POST',`/api/documentaries/${id}/scripts/generate`,{});
    assert.equal(generated.status,200);
    assert.equal(generated.body.status,'needs_research');
    const events=await call(root,'GET',`/api/documentaries/${id}/events`);
    assert.equal(events.status,200);
    assert.deepEqual(events.body.items.map(item=>item.action),
      ['intake','evidence_reviewed','narration_draft_generated']);
    assert.equal(events.body.items[1].actor,'Editor Test');
    assert.equal((await call(root,'GET',`/api/documentaries/${id}/narration-draft`)).status,200);
    const qa=await call(root,'GET',`/api/documentaries/${id}/qa`);
    assert.equal(qa.status,200);assert.equal(qa.body.status,'technical_qa_not_run');
    assert.equal((await call(root,'POST','/api/documentaries',{
      dossierPath:path.relative(root,input)})).status,409);
    assert.equal((await call(root,'POST',`/api/documentaries/${id}/approve-scripts`,{
      contentPath:'missing.json'})).status,400);
  } finally {await rm(input,{force:true});await rm(job,{recursive:true,force:true});}
});
