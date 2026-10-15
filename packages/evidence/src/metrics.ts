import type {Observation} from './dossier.schema.ts';

export type DerivedMetric={kind:'difference'|'growth'|'cagr'|'percentage_point_change';
  value:number;unit:string;inputObservationIds:[string,string];sourceIds:string[];
  regionCodes:[string,string];indicatorCode:string;fromPeriod:string;toPeriod:string};

const period=(item:Observation)=>item.period??String(item.year);
function comparable(first:Observation,second:Observation) {
  if(first.value===null||second.value===null) throw new Error('METRIC_MISSING_VALUE');
  if(first.indicatorCode!==second.indicatorCode||first.unit!==second.unit||
    first.datasetId!==second.datasetId||first.sourceId!==second.sourceId||
    first.priceBasis!==second.priceBasis||first.currency!==second.currency)
    throw new Error('METRIC_DEFINITION_MISMATCH');
}
function result(kind:DerivedMetric['kind'],value:number,unit:string,a:Observation,b:Observation):DerivedMetric {
  if(!Number.isFinite(value)) throw new Error('METRIC_NONFINITE_RESULT');
  return {kind,value,unit,inputObservationIds:[a.id,b.id],sourceIds:[a.sourceId],
    regionCodes:[a.regionCode,b.regionCode],indicatorCode:a.indicatorCode,
    fromPeriod:period(a),toPeriod:period(b)};
}

export function difference(a:Observation,b:Observation):DerivedMetric {
  comparable(a,b);
  if(period(a)!==period(b)) throw new Error('METRIC_PERIOD_MISMATCH');
  return result('difference',b.value!-a.value!,a.unit,a,b);
}

function chronological(a:Observation,b:Observation) {
  comparable(a,b);
  if(a.regionCode!==b.regionCode) throw new Error('METRIC_REGION_MISMATCH');
  if(a.year===undefined||b.year===undefined||a.year>=b.year)
    throw new Error('METRIC_YEAR_ORDER_REQUIRED');
}

export function growth(a:Observation,b:Observation):DerivedMetric {
  chronological(a,b);
  if(a.value!<=0) throw new Error('METRIC_POSITIVE_BASELINE_REQUIRED');
  return result('growth',(b.value!/a.value!-1)*100,'percent',a,b);
}

export function cagr(a:Observation,b:Observation):DerivedMetric {
  chronological(a,b);
  if(a.value!<=0||b.value!<=0) throw new Error('METRIC_POSITIVE_VALUES_REQUIRED');
  return result('cagr',((b.value!/a.value!)**(1/(b.year!-a.year!))-1)*100,
    'percent_per_year',a,b);
}

export function percentagePointChange(a:Observation,b:Observation):DerivedMetric {
  chronological(a,b);
  if(!['percent','%'].includes(a.unit)) throw new Error('METRIC_PERCENT_UNIT_REQUIRED');
  return result('percentage_point_change',b.value!-a.value!,'percentage_points',a,b);
}
