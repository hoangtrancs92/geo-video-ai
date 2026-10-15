import {createHash} from 'node:crypto';
import {ObservationSchema,EvidenceDossierSchema} from './dossier.schema.ts';

function csvRows(input:string):string[][] {
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
  const text=input.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++) {
    const char=text[i];
    if(quoted) {
      if(char==='"'&&text[i+1]==='"') {field+='"';i++;}
      else if(char==='"') quoted=false;
      else field+=char;
    } else if(char==='"') {
      if(field) throw new Error('CSV_BAD_QUOTE');
      quoted=true;
    } else if(char===',') {row.push(field);field='';}
    else if(char==='\n'||char==='\r') {
      if(char==='\r'&&text[i+1]==='\n') i++;
      row.push(field);field='';
      if(row.some(value=>value!=='')) rows.push(row);
      row=[];
    } else field+=char;
  }
  if(quoted) throw new Error('CSV_UNCLOSED_QUOTE');
  row.push(field);if(row.some(value=>value!=='')) rows.push(row);
  return rows;
}

export function parseObservationBytes(bytes:Uint8Array,extension:string) {
  const input=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  let records:unknown[];
  if(extension==='.json') {
    const parsed=JSON.parse(input);
    if(!Array.isArray(parsed)) throw new Error('OBSERVATION_JSON_ARRAY_REQUIRED');
    records=parsed;
  } else if(extension==='.csv') {
    const [head,...rows]=csvRows(input);
    if(!head||new Set(head).size!==head.length||head.some(value=>!value))
      throw new Error('CSV_INVALID_HEADER');
    const expected=['id','regionCode','indicatorCode','value','unit','year','period',
      'datasetId','priceBasis','currency','methodologyNote','revision','qualityFlags'];
    if(head.some(value=>!expected.includes(value))||rows.some(row=>row.length!==head.length))
      throw new Error('CSV_INVALID_COLUMNS');
    records=rows.map(row=>Object.fromEntries(head.map((key,index)=>{
      const value=row[index];
      if(key==='value') return [key,value===''?null:Number(value)];
      if(key==='year') return [key,value===''?undefined:Number(value)];
      if(key==='qualityFlags') return [key,value===''?[]:value.split('|')];
      return [key,value===''?undefined:value];
    })));
  } else throw new Error('OBSERVATION_FILE_TYPE_UNSUPPORTED');
  if(!records.length) throw new Error('OBSERVATIONS_EMPTY');
  return records;
}

export function importObservations({projectId,source,sourceBytes,extension,sourcePath}: {
  projectId:string;source:Record<string,unknown>;sourceBytes:Uint8Array;
  extension:string;sourcePath:string;
}) {
  const rawSha256=createHash('sha256').update(sourceBytes).digest('hex');
  const provenance={...source,localPath:sourcePath,rawSha256};
  const observations=parseObservationBytes(sourceBytes,extension).map(item=>
    ObservationSchema.parse({...item,sourceId:source.id,qualityFlags:(item as Record<string,unknown>).qualityFlags??[]}));
  return EvidenceDossierSchema.parse({schemaVersion:'1.2',projectId,sources:[provenance],
    observations,claims:[],gaps:[{question:'Which claims are supported by the imported observations?',
      reason:'Imported rows require source and methodology review before approving a claim.',priority:'high'}]});
}
