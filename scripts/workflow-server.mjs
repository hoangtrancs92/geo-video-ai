import http from 'node:http';
import path from 'node:path';
import {readFile,readdir} from 'node:fs/promises';
import {sha256Bytes} from '../packages/evidence/src/review.ts';
import {intake,listJobs,loadState,currentDossier,getBrief,reviewEvidence,
  approveScripts,prepareWorkflow,renderPlan,startRender,generateNarrationDraft,
  getNarrationDraft,runTechnicalQa,assembleApprovedSpeech,loadEvents,
  getScriptDraft,saveScriptDraft} from './workflow-actions.mjs';

const defaultRoot=path.resolve(import.meta.dirname,'..');
const json=(response,status,body)=>{response.writeHead(status,{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store'});response.end(JSON.stringify(body));};
async function body(request) {
  let content='';for await(const chunk of request) {
    content+=chunk;if(content.length>1048576) throw new Error('REQUEST_TOO_LARGE');
  }
  return JSON.parse(content||'{}');
}
export async function handleWorkflowRequest(root,request,response) {
    try {
      const url=new URL(request.url,'http://localhost');
      if(request.method==='GET'&&url.pathname==='/') {
        response.writeHead(200,{'content-type':'text/html; charset=utf-8'});
        response.end(await readFile(path.join(root,'engine','workflow.html')));return;
      }
      if(request.method==='GET'&&url.pathname==='/api/documentaries') {
        json(response,200,{items:await listJobs(root)});return;
      }
      if(request.method==='POST'&&url.pathname==='/api/documentaries') {
        json(response,201,await intake(root,(await body(request)).dossierPath));return;
      }
      const match=url.pathname.match(/^\/api\/documentaries\/([A-Za-z0-9_-]{1,64})(?:\/(evidence|scripts|narration-draft|artifacts|qa|events|approve-evidence|approve-scripts|prepare|render-plan|render|retry|qa\/run|audio\/assemble|scripts\/generate|scripts\/draft))?$/);
      if(match&&request.method==='POST') {
        const [,id,action]=match,input=await body(request);
        if(action==='approve-evidence') {json(response,200,await reviewEvidence(root,id,input));return;}
        if(action==='scripts/generate') {json(response,200,await generateNarrationDraft(root,id));return;}
        if(action==='scripts/draft') {json(response,200,await saveScriptDraft(root,id,input));return;}
        if(action==='approve-scripts') {json(response,200,await approveScripts(root,id,input));return;}
        if(action==='audio/assemble') {json(response,200,await assembleApprovedSpeech(root,id,input));return;}
        if(action==='prepare') {json(response,200,await prepareWorkflow(root,id,input));return;}
        if(action==='render-plan') {json(response,200,await renderPlan(root,id,input));return;}
        if(action==='render') {json(response,202,await startRender(root,id,input));return;}
        if(action==='retry') {json(response,202,await startRender(root,id,
          {...input,edition:url.searchParams.get('edition')??input.edition}));return;}
        if(action==='qa/run') {json(response,200,await runTechnicalQa(root,id));return;}
      }
      if(match&&request.method==='GET') {
        const state=await loadState(root,match[1]);
        if(!match[2]) {json(response,200,state);return;}
        if(match[2]==='events') {json(response,200,{items:await loadEvents(root,match[1])});return;}
        if(match[2]==='scripts/draft') {json(response,200,await getScriptDraft(root,match[1]));return;}
        if(match[2]==='evidence') {
          json(response,200,(await currentDossier(root,match[1])).dossier);return;
        }
        if(match[2]==='scripts') {
          json(response,200,await getBrief(root,match[1]));return;
        }
        if(match[2]==='narration-draft') {
          json(response,200,await getNarrationDraft(root,match[1]));return;
        }
        if(match[2]==='artifacts') {
          const renderDir=path.join(root,'outputs','documentaries',match[1]);
          const files=await readdir(renderDir).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error));
          let outputs=[];
          try {
            const manifest=JSON.parse(await readFile(path.join(renderDir,'manifest.json'),'utf8'));
            outputs=['short','long'].map(kind=>manifest.editions?.[kind]?.output).filter(Boolean);
          } catch(error) {if(error.code!=='ENOENT') throw error;}
          json(response,200,{projectId:match[1],files:files.filter(file=>
            ['manifest.json','short.json','long.json','render-status.json',
              'qa-report.json',...outputs].includes(file))});return;
        }
        if(match[2]==='qa') {
          await currentDossier(root,match[1]);
          const renderDir=path.join(root,'outputs','documentaries',match[1]);
          let renderStatus=null;
          try {renderStatus=JSON.parse(await readFile(path.join(renderDir,'render-status.json'),'utf8'));}
          catch(error) {if(error.code!=='ENOENT') throw error;}
          let technicalReport=null;
          try {technicalReport=JSON.parse(await readFile(path.join(renderDir,'qa-report.json'),'utf8'));}
          catch(error) {if(error.code!=='ENOENT') throw error;}
          const editions=renderStatus?.editions??{};
          let approvedScripts=false;
          if(state.gates.scripts==='approved'&&state.contentPath) {
            try {approvedScripts=sha256Bytes(await readFile(path.resolve(root,state.contentPath)))===
              state.contentSha256;}
            catch(error) {if(error.code!=='ENOENT') throw error;}
          }
          json(response,200,{projectId:match[1],
            status:technicalReport?.status??'technical_qa_not_run',technicalReport,
            renderStatus:renderStatus?.status??'pending',
            checks:{sourceHashes:true,approvedScripts,
              shortMp4:editions.short?.status==='completed',
              longMp4:editions.long?.status==='completed',
              audioLoudness:false,visualReview:false,sustainedBenchmark:false}});return;
        }
      }
      json(response,404,{error:'NOT_FOUND'});
    } catch(error) {
      json(response,error.code==='ENOENT'?404:error.code==='EEXIST'?409:400,
        {error:error.message});
    }
}
export function createWorkflowServer(root=defaultRoot) {
  return http.createServer((request,response)=>{void handleWorkflowRequest(root,request,response);});
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const port=Number(process.env.WORKFLOW_PORT||4180);
  createWorkflowServer().listen(port,'127.0.0.1',()=>
    console.log(`Workflow: http://127.0.0.1:${port}`));
}
