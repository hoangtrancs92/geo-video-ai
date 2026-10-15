import test from 'node:test';import assert from 'node:assert/strict';
import {selectCountries} from '../scripts/import-natural-earth.mjs';
const feature=(code)=>({type:'Feature',properties:{ADM0_A3:code},geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,2],[1,1]]]}});
test('Natural Earth adapter requires both countries and preserves source geometry',()=>{
  const j=feature('JPN'),c=feature('CHN');const result=selectCountries({type:'FeatureCollection',features:[c,j]});
  assert.deepEqual(result.features.map(f=>f.properties.featureId),['JPN','CHN']);
  assert.deepEqual(result.features[0].geometry,j.geometry);
  assert.throws(()=>selectCountries({type:'FeatureCollection',features:[j]}),/MISSING_COUNTRY:CHN/);
  assert.throws(()=>selectCountries({type:'FeatureCollection',features:[j,j,c]}),/DUPLICATE_COUNTRY:JPN/);
});
