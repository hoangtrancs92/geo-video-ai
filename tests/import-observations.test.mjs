import test from 'node:test';
import assert from 'node:assert/strict';
import {importObservations,parseObservationBytes} from '../packages/evidence/src/import.ts';

const source={id:'manual-2020',kind:'uploaded_file',publisher:'Fixture publisher',
  title:'Fixture observations',retrievedAt:'2026-10-15T00:00:00.000Z',
  license:'Test fixture',attribution:'Fixture publisher'};
const bytes=text=>new TextEncoder().encode(text);

test('CSV import preserves source checksum, quoted fields, null and review gate',()=>{
  const raw=bytes('id,regionCode,indicatorCode,value,unit,year,qualityFlags,methodologyNote\n'+
    'jpn,JPN,POP,123,people,2020,,"Estimate, revised"\n'+
    'chn,CHN,POP,,people,2020,missing|revised,Unavailable\n');
  const dossier=importObservations({projectId:'sample',source,sourceBytes:raw,
    extension:'.csv',sourcePath:'assets/data/sample.csv'});
  assert.equal(dossier.observations.length,2);
  assert.equal(dossier.observations[0].methodologyNote,'Estimate, revised');
  assert.equal(dossier.observations[1].value,null);
  assert.deepEqual(dossier.observations[1].qualityFlags,['missing','revised']);
  assert.equal(dossier.observations[0].sourceId,'manual-2020');
  assert.match(dossier.sources[0].rawSha256,/^[a-f0-9]{64}$/);
  assert.equal(dossier.claims.length,0);
  assert.equal(dossier.gaps[0].priority,'high');
});

test('JSON import validates each row and rejects malformed or misleading values',()=>{
  const row={id:'one',regionCode:'JPN',indicatorCode:'POP',value:10,unit:'people',year:2020};
  const dossier=importObservations({projectId:'sample',source,sourceBytes:bytes(JSON.stringify([row])),
    extension:'.json',sourcePath:'assets/data/sample.json'});
  assert.equal(dossier.observations[0].value,10);
  assert.throws(()=>parseObservationBytes(bytes('{}'),'.json'),/OBSERVATION_JSON_ARRAY_REQUIRED/);
  assert.throws(()=>importObservations({projectId:'sample',source,
    sourceBytes:bytes('id,regionCode,indicatorCode,value,unit,year\n'+
      'bad,JPN,POP,not-a-number,people,2020\n'),extension:'.csv',
    sourcePath:'assets/data/sample.csv'}));
  assert.throws(()=>parseObservationBytes(bytes('id,id\na,b\n'),'.csv'),/CSV_INVALID_HEADER/);
});
