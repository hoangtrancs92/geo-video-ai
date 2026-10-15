import type {GeoCollection} from './validate.ts';
export type Bounds=[number,number,number,number];
const mercatorY=(lat:number)=>{
  const rad=lat*Math.PI/180;
  return (1-Math.log(Math.tan(Math.PI/4+rad/2))/Math.PI)/2;
};
const latitudeAtY=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
export function featureBounds(geo:GeoCollection):Bounds {
  let minLon=180,minLat=90,maxLon=-180,maxLat=-90;
  const visit=(value:any):void=>{
    if(Array.isArray(value)&&typeof value[0]==='number'&&typeof value[1]==='number') {
      minLon=Math.min(minLon,value[0]);maxLon=Math.max(maxLon,value[0]);
      minLat=Math.min(minLat,value[1]);maxLat=Math.max(maxLat,value[1]);
    } else if(Array.isArray(value)) value.forEach(visit);
  };
  for(const feature of geo.features) visit(feature.geometry.coordinates);
  if(minLon>=maxLon||minLat>=maxLat) throw new Error('EMPTY_GEOMETRY_BOUNDS');
  return [minLon,minLat,maxLon,maxLat];
}
export function fitMercatorBounds(bounds:Bounds,viewport:{width:number;height:number},
  content:{left:number;right:number;top:number;bottom:number},paddingZoom=0.25) {
  const [west,south,east,north]=bounds;
  if(!(west<east&&south<north&&content.left<content.right&&content.top<content.bottom&&
    content.left>=0&&content.top>=0&&content.right<=viewport.width&&content.bottom<=viewport.height))
    throw new Error('INVALID_FIT_BOUNDS');
  const dx=(east-west)/360,dy=mercatorY(south)-mercatorY(north);
  const zoom=Math.max(0,Math.min(22,Math.log2(Math.min(
    (content.right-content.left)/(512*dx),(content.bottom-content.top)/(512*dy)))-paddingZoom));
  const world=512*2**zoom,midY=(mercatorY(north)+mercatorY(south))/2;
  const targetY=(content.top+content.bottom)/2,targetX=(content.left+content.right)/2;
  const centerY=midY+(viewport.height/2-targetY)/world;
  const centerLon=(west+east)/2+(viewport.width/2-targetX)/world*360;
  return {center:[centerLon,latitudeAtY(centerY)] as [number,number],zoom};
}
