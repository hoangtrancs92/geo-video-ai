import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,rename,stat,readdir} from 'node:fs/promises';
import path from 'node:path';

export function chunkPlan(total, size) {
  if(!Number.isSafeInteger(total) || total < 1 || total > 36000 || !Number.isSafeInteger(size) || size < 1 || size > 300) throw new Error('INVALID_CHUNK_PLAN');
  return Array.from({length:Math.ceil(total/size)},(_,id)=>({id,start:id*size,count:Math.min(size,total-id*size)}));
}
export function objectHash(value) {return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export async function fileHash(file) {
  const hash=createHash('sha256');
  for await(const bytes of createReadStream(file)) hash.update(bytes);
  return hash.digest('hex');
}
export async function atomicJson(file,value) {
  await writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(file+'.tmp',file);
}
export async function treeBytes(dir) {
  let total=0;
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) total+=await treeBytes(file);
    else if(entry.isFile()) total+=(await stat(file)).size;
    else throw new Error(`UNSAFE_WORKSPACE_ENTRY:${file}`);
  }
  return total;
}
export function assertVideo(metadata,{frames,width,height,fps=30}) {
  const streams=metadata.streams.filter(s=>s.codec_type==='video');
  const s=streams[0];
  if(streams.length!==1 || s.codec_name!=='h264' || s.width!==width || s.height!==height ||
    s.pix_fmt!=='yuv420p' || s.r_frame_rate!==`${fps}/1` || Number(s.nb_read_frames)!==frames ||
    !Number.isFinite(Number(s.duration)) || Math.abs(Number(s.duration)-frames/fps)>1/fps) throw new Error('VIDEO_QA_FAILED');
}
export async function reusableChunk(directory,chunk,identity) {
  const name=String(chunk.id).padStart(5,'0');
  try {
    const record=JSON.parse(await readFile(path.join(directory,name+'.json'),'utf8'));
    if(record.identity!==identity || record.start!==chunk.start || record.count!==chunk.count || record.status!=='verified') return false;
    return record.sha256===await fileHash(path.join(directory,name+'.mp4')) ? record : false;
  } catch(error) {
    if(error.code==='ENOENT' || error instanceof SyntaxError) return false;
    throw error;
  }
}
