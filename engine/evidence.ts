import {EvidenceDossierSchema,type EvidenceDossier} from '../packages/evidence/src/dossier.schema.ts';

const byId=(id:string)=>document.getElementById(id)!;
const status=byId('status');

function table(target:string,headers:string[],rows:string[][]) {
  const mount=byId(target);
  mount.replaceChildren();
  if(!rows.length) {const empty=document.createElement('p');empty.className='muted';empty.textContent='Chưa có dữ liệu.';mount.append(empty);return;}
  const element=document.createElement('table');
  const head=document.createElement('thead'),headRow=document.createElement('tr');
  for(const label of headers) {const cell=document.createElement('th');cell.textContent=label;headRow.append(cell);}
  head.append(headRow);element.append(head);
  const body=document.createElement('tbody');
  for(const row of rows) {
    const tr=document.createElement('tr');
    for(const value of row) {const td=document.createElement('td');td.textContent=value;tr.append(td);}
    body.append(tr);
  }
  element.append(body);mount.append(element);
}

function show(dossier:EvidenceDossier) {
  const summary=byId('summary');summary.replaceChildren();
  const counts=[`Project: ${dossier.projectId}`,`Nguồn: ${dossier.sources.length}`,
    `Quan sát: ${dossier.observations.length}`,`Claim duyệt: ${dossier.claims.filter(c=>c.approval==='approved').length}/${dossier.claims.length}`,
    `Khoảng trống ưu tiên cao: ${dossier.gaps.filter(g=>g.priority==='high').length}`];
  for(const label of counts) {const chip=document.createElement('span');chip.textContent=label;summary.append(chip);}
  table('sources',['ID','Nhà xuất bản / tài liệu','Tệp / URL','Truy xuất','Giấy phép / sử dụng thương mại','SHA-256','Quan sát / claim'],
    dossier.sources.map(source=>[
      source.id,`${source.publisher} · ${source.title}`,[source.localPath,source.url].filter(Boolean).join(' · '),source.retrievedAt,
      `${source.license??'Chưa ghi giấy phép'} · ${source.allowedForCommercial===true?'Có':source.allowedForCommercial===false?'Không':'Chưa rõ'}`,
      source.rawSha256,
      `${dossier.observations.filter(o=>o.sourceId===source.id).length} / ${dossier.claims.filter(c=>c.sourceIds.includes(source.id)).length}`
    ]));
  table('observations',['ID','Nguồn','Vùng / chỉ số','Giá trị','Kỳ','Định nghĩa / chất lượng'],
    dossier.observations.map(item=>[
      item.id,item.sourceId,`${item.regionCode} · ${item.indicatorCode}`,
      item.value===null?'Thiếu':`${item.value} ${item.unit}`,
      item.period??String(item.year),
      [item.priceBasis,item.currency,item.revision,...item.qualityFlags].filter(Boolean).join(' · ')||'—'
    ]));
  table('claims',['ID','Nội dung','Quan sát / nguồn','Đánh giá','Duyệt'],
    dossier.claims.map(claim=>[claim.id,claim.text,
      `${claim.evidenceIds.join(', ')||'—'} / ${claim.sourceIds.join(', ')}`,
      claim.verdict,claim.approval]));
  table('reviews',['Claim','Người duyệt / thời điểm','Quyết định','Lý do','Snapshot đầu vào'],
    (dossier.reviewLog??[]).map(entry=>[entry.claimId,
      `${entry.reviewer} · ${entry.reviewedAt}`,`${entry.verdict} · ${entry.approval}`,
      entry.reason,entry.inputSha256]));
  table('gaps',['Ưu tiên','Câu hỏi','Lý do'],dossier.gaps.map(gap=>[gap.priority,gap.question,gap.reason]));
  status.className=dossier.gaps.some(g=>g.priority==='high')?'warn':'';
  status.textContent='Đã kiểm tra cấu trúc JSON. Chưa kiểm tra byte nguồn hoặc phê duyệt nội dung.';
}

async function load(raw:string) {
  try {show(EvidenceDossierSchema.parse(JSON.parse(raw)));}
  catch(error) {
    for(const id of ['summary','sources','observations','claims','reviews','gaps']) byId(id).replaceChildren();
    status.className='warn';status.textContent=`Dossier không hợp lệ: ${error instanceof Error?error.message:String(error)}`;
  }
}

byId('sample').addEventListener('click',async()=>{
  try {
    const response=await fetch('/examples/evidence-map-dossier.json');
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    await load(await response.text());
  } catch(error) {status.className='warn';status.textContent=`Không mở được mẫu: ${String(error)}`;}
});
byId('file').addEventListener('change',async event=>{
  const file=(event.target as HTMLInputElement).files?.[0];
  if(!file) return;
  if(file.size>10_000_000) {status.className='warn';status.textContent='JSON vượt giới hạn 10 MB.';return;}
  await load(await file.text());
});
