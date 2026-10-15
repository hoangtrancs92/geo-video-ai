import {Map as LibreMap} from 'maplibre-gl';
import {MapboxOverlay} from '@deck.gl/mapbox';
import {GeoJsonLayer} from '@deck.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {spikeState} from './state.ts';
import {awaitFrame, withDeadline} from './frame-ready.ts';

// Original synthetic geometry: tests the rendering path, never presented as real borders.
const polygon = (x: number, y: number, size: number) => ({type: 'Feature' as const, properties: {},
  geometry: {type: 'Polygon' as const, coordinates: [[[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]]]}});
const ground = {type: 'FeatureCollection' as const, features: [polygon(119,30,4), polygon(125,33,4), polygon(122,38,3)]};
const prism = {type: 'FeatureCollection' as const, features: [polygon(124,32,2)]};
const errors: string[] = [];
const workload = new URLSearchParams(location.search).get('workload') === 'scale' ? 'scale' : 'm0';
const map = new LibreMap({container:'map', interactive:false, attributionControl:false,
  center:[124,35], zoom:4, fadeDuration:0, canvasContextAttributes:{antialias:true,preserveDrawingBuffer:true},
  style:{version:8,sources:{ground:{type:'geojson',data:ground}},layers:[
    {id:'ocean',type:'background',paint:{'background-color':'#091727'}},
    {id:'land',type:'fill',source:'ground',paint:{'fill-color':'#38c8ed'}},
    {id:'borders',type:'line',source:'ground',paint:{'line-color':'#c5f2ff','line-width':3}}
  ]}});
map.on('error', event => errors.push(event.error.message));
map.getCanvas().addEventListener('webglcontextlost', () => errors.push('WEBGL_CONTEXT_LOST'));
let deckPasses = 0;
const overlay = new MapboxOverlay({interleaved:true,layers:[],onAfterRender:()=>{deckPasses++;},onError:(e: Error)=>errors.push(e.message)});
const ready = (async () => {
  await withDeadline(map.once('load'), 15000, 'MAP_LOAD_TIMEOUT');
  if (!map.getCanvas().getContext('webgl2')) throw new Error('WEBGL2_UNAVAILABLE');
  map.addControl(overlay);
  await withDeadline(document.fonts.ready, 15000, 'FONT_LOAD_TIMEOUT');
})();
// Mark startup rejection as handled even before the first automation request arrives.
void ready.catch(error => errors.push(String(error)));
let busy = false;
async function setFrame(frame: number) {
  if (busy) throw new Error('Concurrent frame requests prohibited');
  busy = true;
  try {
    await ready;
    const {camera,elevation} = spikeState(frame,workload);
    await awaitFrame({
      subscribe: listener => { map.on('render',listener); return () => { map.off('render',listener); }; },
      status: () => ({assetsReady:Boolean(map.isStyleLoaded() && map.areTilesLoaded()),deckPasses,error:errors.join('\n') || undefined}),
      repaint: () => { map.triggerRepaint(); },
      update: () => {
        map.jumpTo(camera);
        overlay.setProps({layers:[new GeoJsonLayer({id:'spike-prism',data:prism,extruded:true,
          filled:true,stroked:true,getFillColor:[244,63,110],getLineColor:[255,190,205],
          getElevation:elevation,getLineWidth:2,lineWidthUnits:'pixels',material:false})]});
      }
    },frame);
    return {frame,camera,deckPasses,webgl2:true};
  } finally {busy=false;}
}
Object.assign(window,{spike:{setFrame,dispose:()=>{overlay.finalize();map.remove();}}});
