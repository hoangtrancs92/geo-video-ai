# Stylized Earth globe prototype — 2026-10-15

The previous project used a flat Mercator map and a two-country GeoJSON subset.
`examples/earth-globe-intro.json` is a separate four-second preset A proof with
MapLibre's `globe` projection, an offline Natural Earth 1:110m world layer
(177 features), and deck.gl emphasis for Japan and China. The globe camera
moves from zoom 1.65 to 2.15. No remote tiles or satellite imagery are used.
Natural Earth boundaries are generalized and need editorial review for any
territorial claim. This is **not** Google Earth, terrain, photogrammetry or a
photorealistic globe.

The source bytes match the prior pinned Natural Earth download. The normalized
world GeoJSON and provenance manifest are registered in `assets/registry.json`.
`npm run geodata:world` recreates them from the pinned local raw file. The
project and asset gate pass; 64 tests, the Vite build and a 120-frame/four-chunk
dry run pass. MapLibre's documented globe projection API is
[`map.setProjection({type:'globe'})`](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/).

The agent sandbox closes Chromium before frame capture, so **no globe frame or
MP4 has yet been visually verified**. On the target Mac, run one frame first:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/earth-globe-intro.json --output outputs/earth-globe-frame.mp4 --start-frame 45 --frames 1
```

Inspect the sentinel PNG named in `outputs/render-run-*/report.json` before
rendering all 120 frames. Globe support is currently restricted to preset A;
mixing globe and flat C/D scenes requires an explicit projection transition
and browser validation.
