export interface GeoFeature {
  type:'Feature';id?:string|number;properties:Record<string,unknown>;
  geometry:{type:'Polygon'|'MultiPolygon';coordinates:unknown};
}
export interface GeoCollection {type:'FeatureCollection';features:GeoFeature[]}
function validRing(value:unknown):boolean {
  if(!Array.isArray(value)||value.length<4) return false;
  const points=value as unknown[];
  if(!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>
    typeof n==='number'&&Number.isFinite(n))&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90)) return false;
  const first=points[0] as number[],last=points.at(-1) as number[];
  return first[0]===last[0]&&first[1]===last[1];
}
function validPolygon(value:unknown):boolean {return Array.isArray(value)&&value.length>0&&value.every(validRing);}
export function validateGeoJson(value:unknown):GeoCollection {
  if(!value||typeof value!=='object'||(value as any).type!=='FeatureCollection'||
    !Array.isArray((value as any).features)) throw new Error('INVALID_FEATURE_COLLECTION');
  const collection=value as GeoCollection;
  if(!collection.features.length||collection.features.length>10000) throw new Error('INVALID_FEATURE_COUNT');
  const ids=new Set<string>();
  for(const feature of collection.features) {
    const featureId=feature?.properties?.featureId;
    if(feature?.type!=='Feature'||typeof featureId!=='string'||!featureId||ids.has(featureId))
      throw new Error('INVALID_OR_DUPLICATE_FEATURE_ID');
    ids.add(featureId);
    const geometry=feature.geometry;
    if(!geometry||!(geometry.type==='Polygon'?validPolygon(geometry.coordinates):
      geometry.type==='MultiPolygon'&&Array.isArray(geometry.coordinates)&&
      geometry.coordinates.length>0&&geometry.coordinates.every(validPolygon)))
      throw new Error(`INVALID_GEOMETRY:${featureId}`);
  }
  return collection;
}
export function assertFeatureReferences(sceneRegions:{featureId:string}[],geo:GeoCollection):void {
  const ids=new Set(geo.features.map(f=>f.properties.featureId));
  for(const region of sceneRegions) if(!ids.has(region.featureId))
    throw new Error(`UNKNOWN_FEATURE_ID:${region.featureId}`);
}
