import test from 'node:test';
import assert from 'node:assert/strict';
import {ObservationSchema} from '../packages/evidence/src/dossier.schema.ts';
import {difference,growth,cagr,percentagePointChange} from '../packages/evidence/src/metrics.ts';

const obs=(id,regionCode,year,value,unit='people')=>ObservationSchema.parse({
  id,sourceId:'source',datasetId:'dataset',regionCode,indicatorCode:'POP',value,unit,year,
  qualityFlags:[]});

test('derived metrics carry source and observation lineage',()=>{
  const japan=obs('jpn','JPN',2020,100),china=obs('chn','CHN',2020,150);
  assert.deepEqual(difference(japan,china),{kind:'difference',value:50,unit:'people',
    inputObservationIds:['jpn','chn'],sourceIds:['source'],regionCodes:['JPN','CHN'],
    indicatorCode:'POP',fromPeriod:'2020',toPeriod:'2020'});
  assert.equal(growth(japan,obs('jpn-later','JPN',2025,110)).value,10.000000000000009);
  assert.ok(Math.abs(cagr(japan,obs('jpn-later','JPN',2025,110)).value-1.924487)<0.00001);
  assert.equal(percentagePointChange(obs('a','JPN',2020,12,'percent'),
    obs('b','JPN',2021,15,'percent')).value,3);
});

test('metrics block mismatched period, unit, definition and missing values',()=>{
  const a=obs('a','JPN',2020,100),b=obs('b','CHN',2021,110);
  assert.throws(()=>difference(a,b),/METRIC_PERIOD_MISMATCH/);
  assert.throws(()=>difference(a,{...b,year:2020,unit:'USD'}),/METRIC_DEFINITION_MISMATCH/);
  assert.throws(()=>difference(a,{...b,year:2020,sourceId:'other'}),/METRIC_DEFINITION_MISMATCH/);
  assert.throws(()=>growth(a,b),/METRIC_REGION_MISMATCH/);
  assert.throws(()=>growth(obs('zero','JPN',2020,0),obs('later','JPN',2021,20)),/POSITIVE_BASELINE/);
  assert.throws(()=>cagr(a,obs('negative','JPN',2021,-1)),/POSITIVE_VALUES/);
  assert.throws(()=>difference({...a,value:null},{...b,year:2020}),/METRIC_MISSING_VALUE/);
});

test('currency observations require price basis and cannot mix nominal with real',()=>{
  const monetary={...obs('money','JPN',2020,100,'USD'),currency:'USD'};
  assert.equal(ObservationSchema.safeParse(monetary).success,false);
  const nominal=ObservationSchema.parse({...monetary,priceBasis:'nominal'});
  const real=ObservationSchema.parse({...monetary,id:'real',priceBasis:'real'});
  assert.throws(()=>difference(nominal,real),/METRIC_DEFINITION_MISMATCH/);
});
