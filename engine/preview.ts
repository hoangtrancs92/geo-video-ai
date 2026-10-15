import {ProjectSchema,type Project} from '../packages/schema/src/project.schema.ts';
import {totalFrames} from '../packages/motion/src/timeline.ts';
import {previewFrame,previewProjectPath} from '../packages/motion/src/preview.ts';
import {assertRenderableStyles} from '../packages/styles/src/support.ts';
import {assertSupportedTransitions} from '../packages/motion/src/transition.ts';

const css=document.createElement('style');css.textContent=`
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#081525;color:#e9f4ff;font:16px system-ui,sans-serif}
main{max-width:1440px;margin:auto;padding:24px}header{display:flex;gap:24px;align-items:baseline;flex-wrap:wrap}
h1{margin:0;font-size:27px}header p{color:#9ab2c7;margin:0}.controls{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:22px 0 12px}
label{display:flex;gap:8px;align-items:center}select,input[type=number]{background:#102840;color:#fff;border:1px solid #58758f;border-radius:6px;padding:9px;font:inherit}
input[type=text],button{background:#102840;color:#fff;border:1px solid #58758f;border-radius:6px;padding:9px;font:inherit}input[type=text]{width:min(440px,70vw)}button{cursor:pointer;border-color:#7ee3f8}.custom{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 12px}
input[type=number]{width:100px}#scene{color:#7ee3f8}#timeline{width:100%;accent-color:#7ee3f8}#stage{height:min(70vh,800px);min-height:300px;display:grid;place-items:center;background:#030d1b;border:1px solid #294159;border-radius:10px;overflow:hidden}
#canvas{position:relative;flex:none;overflow:hidden}iframe{display:block;border:0;transform-origin:top left;background:#091727}#fade{position:absolute;inset:0;background:#030d1b;pointer-events:none}#status{min-height:1.4em;color:#9ab2c7}
`;document.head.append(css);

const select=document.querySelector<HTMLSelectElement>('#project')!;
const custom=document.querySelector<HTMLInputElement>('#custom-path')!;
const openProject=document.querySelector<HTMLButtonElement>('#open-project')!;
const timeline=document.querySelector<HTMLInputElement>('#timeline')!;
const number=document.querySelector<HTMLInputElement>('#frame-number')!;
const sceneLabel=document.querySelector<HTMLElement>('#scene')!;
const status=document.querySelector<HTMLElement>('#status')!;
const stage=document.querySelector<HTMLElement>('#stage')!;
const canvas=document.querySelector<HTMLElement>('#canvas')!;
const iframe=document.querySelector<HTMLIFrameElement>('#video')!;
const fade=document.querySelector<HTMLElement>('#fade')!;
let project:Project|null=null,requested=0,lastRendered=-1,loading=0,working=false;

function fit() {
  if(!project) return;
  const {width,height}=project.output;
  const scale=Math.min(stage.clientWidth/width,stage.clientHeight/height);
  canvas.style.width=`${width*scale}px`;canvas.style.height=`${height*scale}px`;
  iframe.style.width=`${width}px`;iframe.style.height=`${height}px`;
  iframe.style.transform=`scale(${scale})`;
}
new ResizeObserver(fit).observe(stage);

async function waitForEngine(token:number) {
  const deadline=Date.now()+30000;
  while(token===loading&&Date.now()<deadline) {
    const engine=(iframe.contentWindow as any)?.engine;
    if(engine) return engine;
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('PREVIEW_ENGINE_TIMEOUT');
}

async function draw() {
  if(working||!project) return;
  working=true;
  const token=loading;
  let failed=false;
  try {
    const engine=await waitForEngine(token);
    while(token===loading&&project) {
      const frame=requested,plan=previewFrame(project,frame);
      await engine.setFrame(plan.sourceFrame);
      if(token!==loading) break;
      fade.style.opacity=String(1-plan.opacity);
      sceneLabel.textContent=`${plan.style} · ${plan.variant} · ${plan.sceneId}`;
      status.textContent=`Frame ${frame}/${totalFrames(project)-1} · ${project.output.width}×${project.output.height}`;
      lastRendered=frame;
      if(frame===requested) break;
    }
  } catch(error) {failed=true;if(token===loading) status.textContent=String(error);}
  finally {working=false;if(project&&(token!==loading||(!failed&&lastRendered!==requested))) void draw();}
}

function seek(value:number) {
  if(!project) return;
  requested=Math.max(0,Math.min(totalFrames(project)-1,Math.trunc(value)||0));
  timeline.value=String(requested);number.value=String(requested);
  void draw();
}
timeline.addEventListener('input',()=>seek(Number(timeline.value)));
number.addEventListener('change',()=>seek(Number(number.value)));

async function loadProject(path:string) {
  const token=++loading;
  project=null;lastRendered=-1;status.textContent='Đang tải project và WebGL…';sceneLabel.textContent='Đang tải…';
  iframe.src='about:blank';
  try {
    const url=previewProjectPath(path);
    const response=await fetch(url);
    if(!response.ok) throw new Error(`PROJECT_FETCH_${response.status}`);
    const candidate=ProjectSchema.parse(await response.json());
    assertRenderableStyles(candidate);assertSupportedTransitions(candidate);
    if(token!==loading) return;
    project=candidate;requested=0;timeline.max=String(totalFrames(candidate)-1);
    timeline.value='0';number.max=timeline.max;number.value='0';
    fit();fade.style.opacity='0';
    iframe.src=`/engine/index.html?project=${encodeURIComponent(url)}`;
    void draw();
  } catch(error) {if(token===loading) status.textContent=String(error);}
}
select.addEventListener('change',()=>{custom.value='';void loadProject(`examples/${select.value}`);});
openProject.addEventListener('click',()=>void loadProject(custom.value.trim()));
custom.addEventListener('keydown',event=>{if(event.key==='Enter') void loadProject(custom.value.trim());});
void loadProject(`examples/${select.value}`);
