# MAP VIDEO ENGINE — IMPLEMENTATION SPECIFICATION FOR CODEX
**Version:** 1.2 | **Date:** 2026-10-14 | **Language:** Vietnamese | **Status:** Phased implementation specification (Map Engine first; documentary platform stages follow)

## 1. Mục tiêu và phạm vi
Xây dựng ứng dụng **tạo video bản đồ tự động từ kịch bản tới MP4** dùng **TypeScript + React + MapLibre GL JS + deck.gl + Remotion + FFmpeg**. Hỗ trợ 3 phong cách tùy chọn và phối hợp trong một video: **A — Cinematic 2D**, **C — 2.5D Extruded Map**, **D — Clean Infographic**. Có editor/preview, cấu hình JSON, CLI, REST API và batch renderer. Hệ thống phải chạy **không cần GEOlayers 3, Adobe After Effects**. Mục tiêu sản xuất: **mỗi chủ đề bắt buộc xuất hai video**: short 9:16 90–180 giây và long 16:9 900–1200 giây, mặc định 30fps; Nhật/Việt/Anh. Xem mục 24–31, có hiệu lực ưu tiên khi khác với các ví dụ v1.0. Không hứa GPU/WebGL render luôn thành công trên mọi cloud: có preflight và chế độ fallback.

### Out-of-scope ở MVP
Không triển khai Google Earth/photorealistic globe, dựng địa hình thực với photogrammetry, AI tạo hình ảnh nhân vật, hoặc đảm bảo độ chính xác lịch sử biên giới. Không tự động tải nội dung bản đồ không được cấp phép. Với bản đồ nhạy cảm hoặc dữ liệu tranh chấp, tuân thủ nguồn dữ liệu và yêu cầu kiểm chứng nội dung.

### Nguyên tắc cốt lõi
- Render **deterministic**: frame N = f(spec, N, assets). Tuyệt đối tránh dùng Date.now(), requestAnimationFrame thời gian thực, Math.random không seed, hoặc MapLibre flyTo() trong pipeline xuất frame.
- Dùng MapLibre làm base map; deck.gl cho lớp overlay; Remotion để điều phối frame, chữ và audio. **Kiểm thử spike WebGL-to-video đầu tiên trước khi phát triển hệ thống**.
- Preview và render cùng một hàm tính state frame; thiếu asset, tile, glyph phải fail rõ ràng hoặc fallback có thông báo, không xuất video đen.
- Không khóa vendor bản đồ: URL style, tile, geocoding qua adapter/config. Kiểm tra quyền thương mại, attribution, rate limits và offline cache theo từng nhà cung cấp.

## 2. Sản phẩm đầu ra
1. Web UI: upload/paste **một chủ đề/kịch bản nguồn**; tự tạo hai bản riêng short/long; chọn A/C/D (có thể trộn), theme, tỉ lệ, camera, hiệu ứng, subtitle, voice; timeline preview riêng từng bản; bấm Render; tải **hai MP4**.
2. CLI: `pnpm video:validate --input examples/japan-china.json`, `pnpm video:render --input examples/japan-china.json --output outputs/japan-china.mp4`, `pnpm video:batch --input jobs/`.
3. API: `POST /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/:id/events`, `GET /api/jobs/:id/output`, `POST /api/jobs/:id/cancel`.
4. Bộ sample: 3 bản demo riêng cho A/C/D và 1 demo phối hợp A→C→D.
5. Tests, README cài đặt, Dockerfile/dev mode, sample .env, tài liệu troubleshooting, mẫu asset attribution.

## 3. Kiến trúc & module
```text
User text / JSON / optional LLM
       ↓
Script Analyzer → Storyboard Planner → Zod validation → Normalized Timeline
       ↓
Geodata Service (GeoJSON, lookup, borders, route points, licensing metadata)
       ↓
Style & Scene Engine (A / C / D, motion presets, camera interpolation)
       ↓
MapLibre BaseMap + deck.gl Layers → FrameReady Guard
       ↓
Remotion composition (typography, captions, cards, audio)
       ↓
Chromium headless WebGL frame rendering → FFmpeg H.264 → MP4
       ↓
Artifact store + metadata + thumbnail + logs
```
- **apps/web**: React UI (Vite hoặc Next.js); không buộc vào framework server.
- **apps/api**: Fastify hoặc NestJS TypeScript; queue BullMQ + Redis nếu cần batch.
- **apps/renderer**: Remotion + Puppeteer/Chromium dependency; ffmpeg codec.
- **packages/schema**: JSON/Zod DTO, defaults, schema version/migrations.
- **packages/storyboard**: parse/sanitize script + adapter LLM tùy chọn (mock deterministic cho offline tests).
- **packages/geodata**: normalize feature IDs, GeoJSON, validation geometry, lookup/bounds.
- **packages/motion**: pure functions interpolation/easing/keyframe timeline.
- **packages/styles**: A/C/D theme & effect registries.
- **packages/maps**: MapLibre shell, Deck overlay, layers, render-ready coordinator.
- **packages/media**: subtitles, local fonts, audio, SFX, typography, output encoding.
- **packages/observability**: logging, timings, retry, diagnostics.

## 4. Thư viện và tính tương thích
Node.js LTS (pin exact major sau thử nghiệm), pnpm, TypeScript strict, React, `maplibre-gl`, `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/geo-layers`, `@deck.gl/maplibre`, `remotion`, `@remotion/cli`, `@remotion/renderer`, `zod`, `@turf/turf`, `ffmpeg` binary, optional Playwright cho visual tests. Chốt version bằng lockfile **sau khi chạy compatibility spike**; không dựa vào API có thể thay đổi giữa các major. `MapLibreOverlay` từ `@deck.gl/maplibre` có `interleaved: true/false`; bật interleaved cho cảnh yêu cầu depth/layer order và WebGL2. Lưu ý deck.gl layer không tự được drape lên terrain của MapLibre. Không dùng CDN demo tiles để xuất video sản xuất.

## 5. Preset A — Cinematic 2D (ưu tiên high-end documentary)
**Mục tiêu:** map phẳng đẹp, nền xanh than, màu quốc gia tương phản, đường viền sáng, camera zoom/pan nhịp điện ảnh.
- Theme: `midnight-blue`, `black-gold`, `red-blue-duel`, `steel-teal`, `warm-paper-dark`.
- Border: `thin-clean`, `double-outline`, `soft-glow` (glow bằng compositing/layer duplicate), `pulse-outline`, `dashed-animated`.
- Region effects: `fade-fill`, `wipe-fill`, `pulse-fill`, `spotlight`, `desaturate-others`, `mask-reveal`.
- Route effects: `arc-reveal`, `moving-dash`, `travelling-dot`, `neon-tail`, `multi-route-stagger`.
- Camera: `slow-push`, `pan-cross`, `zoom-out-reveal`, `ease-in-out`, `focus-switch`, `orbit-lite` (bearing nhỏ).
- Typography: title cinematic, lower-third, stat punch, label leader lines; consistent safe areas.
- Data layer: `GeoJsonLayer`, `ArcLayer`, `PathLayer`, `ScatterplotLayer`, optional `TextLayer`.
- Visual quality: line antialiasing, shadows/glow by dedicated post layer (CSS/canvas effect where viable), avoid neon excessive.

## 6. Preset C — 2.5D Extruded (nổi khối quốc gia)
**Mục tiêu:** vùng quốc gia extrude nhẹ 3D, góc máy nghiêng, ánh sáng/đổ bóng giả lập, phân lớp chiều cao.
- Modes: `country-prism`, `city-towers`, `regional-columns`, `comparison-heights`, `floating-islands` (stylized, explicitly not topographically accurate).
- Camera: pitch 35–60°, bearing change, `tilt-reveal`, `orbit-arc`, `rise-and-rotate`, `wide-to-detail`.
- Region height: predefined `elevationMeters` hoặc scale từ data; nếu dựa theo thống kê thì label đơn vị rõ và có legend, không khiến viewer hiểu sai.
- Materials: `matte`, `metallic-inspired`, `glass-like` (shader/custom composition only if supported), `duotone`; không cam kết PBR thực nếu chưa implement.
- Layers: `GeoJsonLayer({extruded:true,getElevation,...})`, `ColumnLayer`, `PolygonLayer`; interleaved MapLibreOverlay khi cần ordering.
- Hazards: geometry invalid, multipolygon islands, clipping, z-fighting, shadows performance; log warnings và thử video benchmark.
- Trong `2.5D`, muốn hiệu ứng bật khối lên theo frame thì tính getElevation dựa trên frame và tạo/update layer; không chạy animation thời gian thực.

## 7. Preset D — Clean Infographic (giải thích, tin tức)
**Mục tiêu:** dễ đọc, thông tin rõ, chuyển cảnh gọn, map tối giản với biểu đồ overlay.
- Themes: `editorial-white`, `soft-pastel`, `newsroom-dark`, `academic-blue`, `tech-minimal`.
- Layouts: `full-map`, `map-left-stats-right`, `top-title-bottom-map`, `split-country`, `map-with-timeline`, `before-after`.
- Components: title/subtitle, callout, card, bar comparison, numeric counter, flags (use verified/public-domain assets), legend, pins, timeline, arrow connectors, subtitles.
- Transitions: `crossfade`, `slide`, `morph-color`, `count-up`, `pop`, `wipe`, `stagger`.
- Grid/spacing tokens, line-height, max subtitle lines, contrast WCAG-inspired, text measurement preflight for Japanese/Vietnamese.
- Đảm bảo số liệu và ngày tháng có `source`, `unit`, `asOf`; không tự bịa số liệu từ text kịch bản.

## 8. Motion library và mix style
Mọi scene nhận `stylePreset: A|C|D` và `variant`, cùng `transitionIn/out`. Scene A→C→D cho 10–20 giây: (1) A hook zoom Nhật Bản, (2) C extrude so sánh hai quốc gia, (3) D split infographic & CTA. Chuyển style: `map-match-cut`, `color-carry`, `camera-match`, `crossfade` (fallback). Registry các option:

| Category | Options |
|---|---|
| Style | A cinematic-2d / C extruded-2_5d / D infographic |
| Camera | static, slow-push, fit-bounds, pan, tilt, orbit-lite, focus-switch, track-route |
| Fill | solid, dim-others, pulse, wipe, gradient-simulated |
| Borders | thin, double, dashed, glow, pulse |
| Route | arc, path, moving-dot, reveal, multi-route |
| Markers | dots, pulses, labels, clusters, flags |
| Text | editorial, kinetic, subtitles, comparison, counters |
| Transition | cut, fade, slide, zoom-match, map-match, mask-wipe |
| Timing | calm, balanced, energetic; frame-aligned easings |

Define per-scene budget: maximum region polygons, ArcLayer routes, labels, and render time; support gracefully degrade `glow→solid`, `extruded→flat` upon low GPU only if declared and logging explicitly.

## 9. JSON schema (contract chính, v1)
Tất cả thời gian tính bằng **frame** để tránh drift; hệ thống chấp nhận time seconds từ UI nhưng normalize về frames. Camera center là `[longitude, latitude]`, không đảo ngược.

```json
{
  "schemaVersion": "1.0",
  "projectId": "japan-china-demo",
  "title": "Japan & China",
  "output": {"width":1080,"height":1920,"fps":30,"codec":"h264","quality":"high"},
  "locale": "ja-JP",
  "map": {"styleId":"licensed-dark","attribution":true,"projection":"mercator"},
  "defaults": {"theme":"midnight-blue","motion":"balanced","safeMarginsPx":90},
  "audio": {"voiceover":null,"music":null,"duckingDb":-12},
  "scenes": [
    {"id":"s1","startFrame":0,"durationFrames":120,"stylePreset":"A","variant":"cinematic-duel","title":"日本と中国","camera":{"from":{"center":[138.2,36.2],"zoom":4,"pitch":0,"bearing":0},"to":{"center":[126,36],"zoom":3.5,"pitch":0,"bearing":0},"easing":"easeInOutCubic"},"regions":[{"featureId":"JPN","fill":"#F43F5E","effect":"pulse"}],"routes":[],"labels":[{"text":"日本","position":[139.69,35.68],"startFrame":25,"endFrame":115}],"transitionOut":"map-match"},
    {"id":"s2","startFrame":120,"durationFrames":120,"stylePreset":"C","variant":"country-prism","camera":{"from":{"center":[119,36],"zoom":3,"pitch":25,"bearing":0},"to":{"center":[119,36],"zoom":3.5,"pitch":50,"bearing":-12},"easing":"easeInOutCubic"},"regions":[{"featureId":"CHN","fill":"#38BDF8","extrudeMeters":45000,"effect":"rise"}],"routes":[],"labels":[],"transitionOut":"fade"},
    {"id":"s3","startFrame":240,"durationFrames":120,"stylePreset":"D","variant":"split-comparison","camera":{"from":{"center":[123,37],"zoom":2.5,"pitch":0,"bearing":0},"to":{"center":[123,37],"zoom":2.5,"pitch":0,"bearing":0},"easing":"linear"},"regions":[],"routes":[],"labels":[],"cards":[{"heading":"日本","value":"Demo","source":"placeholder"},{"heading":"中国","value":"Demo","source":"placeholder"}],"transitionOut":"fade"}
  ]
}
```
**Bắt buộc:** schema Zod `strict()`, fail invalid enum/missing featureId, enforce no overlaps (trừ transition overlap được khai báo), camera numeric finite, longitude [-180,180], latitude [-85,85] for Mercator, zoom safe supported range, fps >0, valid asset paths (prevent traversal), no uncontrolled remote URLs. JSON trên là minh họa, các tên variant phải tồn tại trong registry.

## 10. Quy tắc timeline / deterministic rendering
```ts
interface FrameContext { frame: number; fps: number; sceneFrame: number; progress: number; }
function clamp01(v:number){return Math.min(1,Math.max(0,v));}
function easeInOutCubic(t:number){const x=clamp01(t);return x<0.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
function lerp(a:number,b:number,t:number){return a+(b-a)*t;}
function cameraAtFrame(from:Camera,to:Camera,frame:number,total:number){
  const t=easeInOutCubic(frame/Math.max(1,total-1));
  return {center:[lerp(from.center[0],to.center[0],t),lerp(from.center[1],to.center[1],t)],zoom:lerp(from.zoom,to.zoom,t),pitch:lerp(from.pitch,to.pitch,t),bearing:lerp(from.bearing,to.bearing,t)};
}
```
Enhance implementation: interpolate longitude shortest path across anti-meridian, normalize bearing shortest arc; optionally geodesic/great-circle for distant flights. Use `map.jumpTo(cameraAtFrame(...))` for frame updates rather than `flyTo` (wall-clock animation). deck.gl update layer props from same frame; use easing with clamped boundary. Support seeded random for decorative positions only.

## 11. Deck.gl / MapLibre integration
- Create MapLibre map on mounted DOM element; define style once, use `map.once('load')` and more robust tile readiness before capture.
- `const overlay = new MapLibreOverlay({interleaved:true, layers:[]}); map.addControl(overlay);`
- Each frame: `map.jumpTo(frameCamera); overlay.setProps({layers: buildLayers(scene, frame)});` Use stable layer IDs; update triggers for changing data/accessors; memoize geodata.
- For `GeoJsonLayer`: `filled`, `stroked`, `getFillColor`, `getLineColor`, `getLineWidth`, `extruded`, `getElevation`, `lineAntialiasing` as appropriate (verify installed API versions).
- For `ArcLayer`: `getSourcePosition`, `getTargetPosition`, `getSourceColor`, `getTargetColor`, `getWidth`, `antialiasing` (check supported prop).
- Text/subtitle preferably DOM overlay from Remotion, not map labels, to avoid font jitter and keep pixel alignment.
- Interleaved mode needs WebGL2; detect `getContext('webgl2')` capability in preflight. Different layers may require separate canvas mode (overlaid) if interleaved compatibility fails.
- Manage WebGL resources on unmount (`overlay.finalize()`, `map.remove()`).

## 12. Rendering strategy: critical engineering spike
**Không giả định Remotion render WebGL luôn thành công:** trước MVP thực hiện spike 2 video, 100 frames, 1080x1920, Chrome headless trên máy đích. Remotion hỗ trợ render Chromium nhưng WebGL frame capture/phần cứng phải được xác minh. Comparison matrix:

**Mode 1 (preferred only if proven):** Remotion renderer hosts MapLibre and deck.gl in composition. For each `useCurrentFrame`, update deterministic map camera/layers, signal frame-ready only after map style/assets/render pass stable; use `delayRender`/`continueRender` for startup/assets and validated frame capture integration. **Never** call `delayRender` on each frame without a sound lifecycle design. Test frames differ and have correct overlays.

**Mode 2 (robust fallback):** dedicated Playwright/Puppeteer Chromium frame capture service: `setFrame(n)` → wait for `frameComplete(n)` → screenshot PNG (or readPixels when validated) → FFmpeg encode; Remotion graphics/audio can be composited via transparent layer/video or independent post pass. This mode costs disk/time but is easier to test.

**Mode 3 (low GPU fallback):** static SVG/canvas map renderer for preset A/D only; explicitly disable extruded C or render flat fallback as chosen by user. No silent black frames.

Render gate: style loaded, fonts ready, required tiles cached/loaded, deck.gl update settled, non-empty capture, timeout and retry, progress marker. Do not rely solely on `map.loaded()` as full guarantee of GPU frame being present. Snapshot across 5 sentinel frames 0,25%,50%,75%,end; compare black-pixel percentage/hash and overlay existence. Tile loading can vary with camera: prefetch or offline tile pack for known bounds when license allows.

## 13. Text/voice/subtitles/audio
Text layouts support Japanese font fallback (Noto Sans JP licensed), Vietnamese combining marks and English; bundle licensed fonts and respect distribution rights. Never package proprietary font files without license. Optional TTS adapter has provider abstraction; user must supply key/provider. Manual voice file supported. Align words/subtitles via known segments or forced alignment adapter; don't fake word timestamps. Apply audio ducking/normalization using FFmpeg; avoid audio clipping. Text safe zone: reserve lower 15–20% if subtitles; vertical title margins. Attribution must remain visible for source/tile rules throughout video or per provider terms.

## 14. Storyboard planner: text → video JSON
Pipeline: ingest text → extract entities and actions → geocode/place resolve → identify scene count → choose effect candidates → enrich typography → validate schema → generate thumbnail previews → render. LLM optional; its JSON is untrusted and must pass Zod and geographical/entity validation. Unsupported locations trigger explicit correction, not fabricated coordinates. Provide style selection strategies:
- `manual`: exact preset user selected; allow scene overrides.
- `auto-balanced`: alternate A/C/D without overusing one transition, consistent palette.
- `auto-cinematic`: 60% A, 30% C, 10% D (illustrative weight configurable).
- `auto-informative`: 30% A, 10% C, 60% D.
- `seeded-random`: deterministic seeded sampler with no consecutive identical variants unless permitted.
Add UI options: theme, pace, cameraIntensity, routeStyle, borderEffect, textDensity, dataMode, 2D/2.5D, seed, safeArea, aspect ratio.

## 15. Cấu trúc thư mục đề xuất
```text
map-video-engine/
  apps/
    web/src/{pages,components,presets,timeline}/
    api/src/{jobs,queue,controllers,storage}/
    renderer/src/{Root.tsx,MapComposition.tsx,FrameMap.tsx,cli.ts}
  packages/
    schema/src/{project.schema.ts,defaults.ts,types.ts}
    motion/src/{camera.ts,easing.ts,timeline.ts}
    geodata/src/{features.ts,lookup.ts,validation.ts,providers.ts}
    maps/src/{MapCanvas.tsx,overlay.ts,frame-ready.ts,layers/}
    styles/src/{registry.ts,A.ts,C.ts,D.ts,themes.ts}
    storyboard/src/{rule-planner.ts,llm-adapter.ts}
    media/src/{subtitles.ts,audio.ts,text-layout.ts}
  assets/{geodata,tiles,fonts,icons,sfx}/
  examples/{cinematic-a.json,extruded-c.json,infographic-d.json,mixed-acd.json}
  tests/{unit,integration,e2e,visual,golden}/
  scripts/{preflight.ts,render-batch.ts,build-preview.ts}
  docs/{architecture.md,runbook.md,licensing.md,api.md}
  outputs/  .env.example  docker-compose.yml  pnpm-workspace.yaml
```

## 16. Backend API / Job lifecycle
`POST /api/jobs`: `{projectSpec, idempotencyKey?}` → 202 `{jobId,status:"queued"}`. `GET /api/jobs/:id`: `queued|preparing|rendering|encoding|completed|failed|canceled`, percentage 0–100, currentFrame, fps, error code, output URL. `GET /api/jobs/:id/events`: SSE or websocket; `POST /api/jobs/:id/cancel`: cancel worker and temp cleanup. Request size limit, authentication if publicly exposed, rate limiting, CORS, sandbox URLs, audit logging. Job immutable spec snapshot, trace/job ID, reproducible seed, artifact checksum, retention policy. Worker concurrency configured according to GPU/CPU/RAM; quota for frames + time; exponential retry **only transient** tile/network issues; never retry bad schema infinitely.

## 17. Performance, reliability, security
Cache GeoJSON parsed features and tile assets legally; simplify geometry for far zoom (Turf/Mapshaper preprocessing), avoid oversized text layer, use stable IDs, cap extrusions. Normalize antimeridian and MultiPolygon. Fail fast for no WebGL2, missing fonts, incompatible Chromium flags, remote 429/403, invalid credentials, map source empty. Do not expose keys to web clients unless publishable by provider; sign server-side when appropriate. Sanitize SVG/text, forbid path traversal in user-provided asset URIs, restrict remote fetch domains, protect against SSRF, cap memory/resource usage. Browser sandbox must not be disabled casually on shared server. Track CPU/GPU utilization, elapsed render per frame, failed tile count, bytes processed. Choose paid/properly licensed tile provider for production; never claim OpenStreetMap tile servers are unlimited free CDN for batch video rendering.

## 18. Kiểm thử và điều kiện chấp nhận (Definition of Done)
**Unit**: easing endpoints and continuity, deterministic camera at specific frames, schema rejects invalid coords, theme/options validation, scene overlap rules, seed reproducibility. **Integration**: GeoJSON MultiPolygon/JPN/CHN match, MapLibreOverlay attaches, update of extruded height, labels don't overflow. **Render**: A/C/D 10s all yield non-black frames; mixed A→C→D transitions continuous; test 9:16 and 16:9; output video metadata correct (`ffprobe`); subtitles readable Japanese/Vietnamese; audio sync <1 frame tolerance where feasible; sources attribution displayed. **Batch**: queue 10 jobs, cancel/retry/idempotency, artifact URLs, no leaked browser process. **Visual regression**: 5–10 golden frames per preset at fixed versions/datasets, pixel diff tolerances.

Acceptance checklist:
- [ ] One-command local demo with no AI key (rule-based planner + bundled licensed demo geodata).
- [ ] Dropdown exposes A, C, D, auto mix, and at least 3 visual variants each.
- [ ] UI adjusts camera, theme, region highlight, border, routes, text, transition.
- [ ] JSON schema documented and exported; example mixed-acd.json validates.
- [ ] Frame-based render deterministic across runs on pinned environment.
- [ ] No random black frames in 4 sample MP4s.
- [ ] Renderer falls back or provides actionable error if WebGL unsupported.
- [ ] Tests, logs, runbook, attribution/licensing and build instructions supplied.

## 19. Kế hoạch thực hiện theo milestones
**M0 — Technical spike (bắt buộc):** build MapLibre + deck.gl example; headless capture 100 frames; verify WebGL2 and no black frames. Choose Render Mode 1 or 2 based on evidence. Deliver spike report and test MP4.
**M1 — Foundation:** monorepo, schema, normalized timeline, asset registry, 1 simple MapLibre + GeoJSON map, CLI one-shot render.
**M2 — Style A:** 3 variants, camera pan/zoom, borders/route/labels, 10-second demo and screenshots.
**M3 — Style C:** extruded/prism, lighting-inspired palette, angle/orbit, benchmark, fallback.
**M4 — Style D:** text, cards, infographic layouts, localizations and subtitle safe zone.
**M5 — Scene mixing:** transitions A→C→D, JSON composition, UI selectors and preset preview.
**M6 — Productionize:** queue/API, batch, seed, retries, asset cache, observability, license document, tests and docs.
Do not call MVP complete before spike + real MP4 + acceptance tests.

## 20. Mã khởi tạo định hướng (pseudocode, verify installed APIs)
```ts
// Frame-driven rendering; intentionally schematic, NOT drop-in production code.
function renderState(spec: Project, frame: number) {
  const scene = resolveScene(spec.scenes, frame);
  const local = frame - scene.startFrame;
  return {
    camera: cameraAtFrame(scene.camera.from, scene.camera.to, local, scene.durationFrames),
    layers: buildDeckLayers(scene, local, scene.durationFrames),
    overlays: buildTypography(scene, local)
  };
}
function seekFrame(frame: number) {
  const state = renderState(project, frame);
  map.jumpTo(state.camera);
  overlay.setProps({layers:state.layers});
  return awaitRenderSettled(frame); // implemented and tested by renderer module
}
```
**Quan trọng:** Không tự nhận `awaitRenderSettled` là API có sẵn — Codex phải tự triển khai readiness protocol; căn cứ screenshot/pixel verification. Thiết kế visual effects như glow/gradient có thể cần thêm pass compositing, không phải tự có từ GeoJSON.

## 21. Prompt giao thẳng cho Codex
> Bạn là senior TypeScript/WebGL/video engineer. Hãy triển khai repository `map-video-engine` theo đầy đủ tài liệu này. Không chỉ scaffold và không tạo mock video thay MP4. Trước tiên thực hiện milestone M0: chứng minh thực tế một MP4 100-frame từ MapLibre + deck.gl chạy headless ổn định với camera khác nhau theo frame; viết báo cáo test và nếu Remotion integration không ổn thì chọn screenshot→FFmpeg fallback. Tiếp tục M1–M6 theo thứ tự. Hỗ trợ preset A/C/D, từ 3 variant mỗi preset, phối hợp presets trong một timeline, lựa chọn theme/animation trong UI, JSON schema/Zod, CLI render, REST job API, tests, 4 demo MP4. Dữ liệu demo phải dùng tài nguyên hợp lệ, không phụ thuộc credentials private. Pin package versions; không bịa APIs; kiểm tra docs bản đã cài. Đảm bảo deterministic, attribution/licensing, và không render frame đen. Khi mỗi milestone kết thúc hãy chạy tests, xuất screenshot/video bằng chứng, cập nhật README và báo blocker cụ thể.

## 22. Tài liệu chính thức đối chiếu (truy cập 2026-10-14)
- deck.gl MapLibreOverlay: https://deck.gl/next/docs/api-reference/maplibre/overview
- deck.gl Integration modes: https://deck.gl/next/docs/developer-guide/base-maps/using-with-maplibre
- MapLibre GL JS Map API: https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- MapLibre camera: https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/CameraOptions/
- MapLibre examples: https://maplibre.org/maplibre-gl-js/docs/examples/
- Remotion render readiness/timeout: https://www.remotion.dev/docs/options/timeout
- Remotion main docs: https://www.remotion.dev/docs
- deck.gl layer catalog: https://deck.gl/docs/api-reference/layers

## 23. Decisions cần pin trong repository
ADR-001: ưu tiên Node/TS monorepo (không Python bắt buộc). ADR-002: frame-driven deterministic animation. ADR-003: choose real proven render mode after M0. ADR-004: providers/attribution configurable. ADR-005: 3 presets A,C,D independent + scene mixing. ADR-006: safe-area/text localization. ADR-007: offline demo needs licensed local data and no paid keys. Defaults nên là vertical 9:16, dark navy A, calm 30fps, no TTS provider; UI cho phép đổi mọi lựa chọn.


---
## 24. REQUIRED CHANGE v1.1 — One topic → TWO editorially distinct videos
**Đây là yêu cầu bắt buộc, ưu tiên hơn mọi duration/default hoặc ví dụ demo 10–60 giây trước đó.** Một `ContentProject` (chủ đề, research dossier, nguồn dẫn và tài sản) sinh ra **hai `VideoEdition`** dùng chung factual foundation, mỗi edition có narrative outline, script/voice, storyboard, timeline, layout, thumbnail và output riêng. KHÔNG chỉ resize, crop hoặc cắt bản long để thành short; KHÔNG kéo chậm bản short để thành long. Giữ bản demo 10 giây chỉ cho integration test, không dùng làm chuẩn sản phẩm.

| Thuộc tính | SHORT | LONG |
|---|---|---|
| Purpose | Hook mạnh, truyền tải luận điểm chính đủ hấp dẫn, rõ thông tin | Giải thích chuyên sâu, có bối cảnh, chứng cứ, phản biện và kết luận |
| Duration | **90–180 s** inclusive (2,700–5,400 frames @30fps) | **900–1,200 s** inclusive (27,000–36,000 frames @30fps) |
| Aspect / resolution | **9:16**, 1080x1920 | **16:9**, 1920x1080 |
| Targets | TikTok, YouTube Shorts khi phù hợp chính sách hiện hành, Facebook Reels | YouTube long-form, Facebook full-length video |
| Editorial | 1 central thesis, 2–4 key insights, clear payoff, no misleading cliffhanger | Chapters, chronology/context, primary data when available, limits/uncertainty, nuanced synthesis |
| Pacing defaults | Quick hook 0–5s, frequent purposeful scene changes | More room for exposition, varied pace, visual resets per chapter |
| Accessibility | Big captions and mobile safe zones | Readable captions, charts, citations and chapter cards |
| Output file | `<slug>_short_9x16.mp4` | `<slug>_long_16x9.mp4` |

These lengths are **user requirements**, not assertions that every social platform will classify/accept all durations/formats in every jurisdiction. Supply `platformExportProfiles` for additional metadata and platform-specific constraints; validate separately at export. The platform must not silently trim content or mislabel a video.

## 25. Editorial generation pipeline and factual consistency
Input options: `topicText`, `masterScript`, structured facts/sources, selected locales and optional uploaded assets. `ResearchDossier` is the SINGLE SOURCE OF TRUTH: facts with IDs, values, dates, source URL/file reference, confidence, licensing and lastCheckedAt. Online lookup and LLM are optional adapters. Without LLM, allow manually edited scripts and local demo fixtures; do not claim arbitrary prose can be rewritten automatically without an analysis capability.

```text
Topic / master script
    -> research dossier + source validation + human optional approval
    -> master narrative graph (claims/fact IDs/characters/locations/sections)
    -> editorial diverge:
       SHORT: dedicated 90–180s outline + full short script + storyboard + captions
       LONG: dedicated 900–1200s chapters + full long script + storyboard + captions
    -> independent timing via measured voice duration
    -> shared GeoJSON/geocoding/cache/theme assets
    -> independent 9:16 and 16:9 camera/layout pass
    -> frame-by-frame rendering, mix/master audio, QA
    -> TWO MP4s + manifests + captions + metadata
```

Planner must maintain `factRefs` per claim, reject unsupported specific numerical claims, flag conflicting statistics, detect repeated claims without narrative value, and provide editorial QA. Short edition should cover the core question and meaningful conclusion even for users who do not watch long. Long edition must not pad with repeated camera motion, silent maps, fake statistics or wordy filler simply to reach 15–20 minutes. If factual source material is inadequate, mark `needs_research` and require more sources rather than fabricate. Give each edition its own title, description, tags, hook, thumbnail and CTA (short CTA may offer the long edition without being mandatory to understand the short).

## 26. Content data model / TypeScript contract v1.1
```ts
type EditionKind = 'short' | 'long';
type StylePreset = 'A' | 'C' | 'D';
type ProductionMode = 'auto' | 'review_before_render';
interface Fact { id: string; statement: string; sourceIds: string[]; asOf?: string; confidence?: 'high'|'medium'|'low'; }
interface Source { id: string; url?: string; fileRef?: string; title?: string; license?: string; retrievedAt?: string; }
interface ContentProject {
  schemaVersion: '1.1'; projectId: string; topic: string; locale: 'vi-VN'|'ja-JP'|'en-US';
  research: { facts: Fact[]; sources: Source[] };
  narrative: { thesis: string; keyPoints: string[]; exclusions?: string[] };
  production: { mode: ProductionMode; defaultTheme: string; mixStyles: StylePreset[]; seed: number };
  editions: Record<EditionKind, VideoEdition>;
}
interface VideoEdition {
  kind: EditionKind; title: string; durationTargetSeconds: number;
  output: { width: number; height: number; fps: 30; format: 'mp4'; codec: 'h264'; filename: string };
  hook?: string; outline: { chapterId: string; name: string; goal: string; targetSeconds: number }[];
  script: { segmentId: string; narration: string; factRefs: string[]; targetSeconds: number }[];
  scenes: SceneSpec[]; // reuse existing scene schema, adapted to its output/aspect
  voice: { provider: 'local'|'external'|'none'; voiceId?: string; assetPath?: string };
  captions: { enabled: boolean; language: string; formats: ('srt'|'ass')[] };
}
```
Zod refinements: editions exactly `short` and `long`; `short` duration 90–180 inclusive with 1080x1920; `long` 900–1200 inclusive with 1920x1080; fps default 30 (allow settings migration via versioned schema); sum scene frames matches edition target within frame rounding; no overlap except explicit transitions; every factRef exists; every sourceId exists. Durations are verified from `ffprobe` **after render**, not inferred only from the JSON. Avoid fixed fake word counts: derive speech length using per-language measured TTS/narration pace, actual generated waveform, pause allocation and re-timing with natural bounds. If voice unavailable, permit `voice:none` but flag output as silent narration in UI.

**Sample submission:**
```json
{
 "schemaVersion":"1.1", "projectId":"japan-robotics", "topic":"Vì sao Nhật Bản mạnh về robot công nghiệp?", "locale":"vi-VN",
 "research":{"facts":[],"sources":[]},
 "narrative":{"thesis":"Giải thích các động lực của ngành robot Nhật Bản","keyPoints":["công nghiệp","tự động hóa","thách thức"]},
 "production":{"mode":"review_before_render","defaultTheme":"midnight-blue","mixStyles":["A","C","D"],"seed":42},
 "editionSettings":{
   "short":{"durationTargetSeconds":150,"width":1080,"height":1920,"fps":30},
   "long":{"durationTargetSeconds":1080,"width":1920,"height":1080,"fps":30}
 }
}
```
`editionSettings` above is an **input request DTO**, not yet the fully normalized `ContentProject` contract: planner creates `editions` before strict `ContentProject` validation. Codex must implement separate `CreateProjectRequestSchema` and `ContentProjectSchema` to avoid a fake schema mismatch.

## 27. Narrative templates and multi-style scene selection
Implement editable `NarrativeStrategy` registry; all strategies are available for both editions, with independent timing rules:
- `question-reveal`: provocative question → context → evidence → meaningful answer.
- `timeline`: chronology with dated map moves and chapter cards.
- `compare-two`: side-by-side Japan/China or two regions; fair comparable metrics.
- `cause-effect`: stepwise geographical/economic chain with arrows.
- `journey-route`: move between points with animated arcs, distance annotations only if computed.
- `data-first`: infographic numbers → map context → limits/caveats.
- `myth-vs-fact`: clarify oversimplified claims using reputable evidence.

Scene style registry: A = dramatic intro, routes, borders, match-cuts; C = extrusions, oblique camera, depth and highlighted regions; D = chart-driven narrative, callouts, split-screen, source cards. Provide preset compositions `A→D→A`, `C→D→A`, `A→C→D`, `D→A→C` and `auto-mix`; choose by semantic purpose, not randomness. Exposure caps and transitions should be adjustable per edition. Limit long video visual monotony by alternating map visuals with chapter title cards, statistics, timeline panels and relevant on-map highlights; do not force scene cuts every N seconds mechanically.

## 28. Aspect-aware cinematography + audio
Render each edition from a **recomposed layout**, not a crop. Maintain `safeArea` per platform; captions must avoid likely platform UI overlays; author title, labels, legends, map focal region and source badges with independent constraints for 9:16/16:9. Auto camera fitting must keep selected geometries and important labels visible after subtitle/footer reservation. Short: prominent large caption, fewer simultaneous labels, tighter spotlight. Long: higher information density, explanatory chart legend, optional chapter/time codes and citations. Support per-scene style override, easy transitions and reproducible seeds.

Voice: TTS adapter (local option such as installed engine, external optional) or imported narration; forced alignment/subtitle generation from actual final voice waveform when available; punctuation-aware segmentation; optional music with ducking; normalize loudness/true peak via FFmpeg and clip checks. Video must avoid silent padded seconds except deliberate pauses; time stretch only within agreed perceptual bounds, otherwise regenerate/rewrite narration. Music licensing must be tracked in asset manifest.

## 29. Rendering long duration reliably (critical)
At 30fps, a 20-minute video requires **36,000 frames**; do not keep all frames in RAM. Use segment/chunk rendering per scene/chapter with stable deterministic frame evaluation; stream encode or render bounded segments into temp files, then concatenate with verified codec/fps/audio settings. Track per-edition and per-chunk checkpoints; resume failed chunks; idempotent artifact naming; checksum; disk quota; cleanup. Maintain shared geodata/cache reuse across editions without concurrency races. GPU feature detection, VRAM caps, render ready barriers; use fallback capture→FFmpeg only when validated at full chapter scale. Cache tile/glyph sources with proper license permissions. Implement still-frame repetition or motion simplification where appropriate without lowering video quality; render at actual frame budget until benchmark proves sustainable.

Do not claim full render speed until benchmark: M0 must record actual seconds/frame, RAM/VRAM use, total storage and 5–10min sustained chunk test, then extrapolate before trying 20 minutes. Produce status per `jobId`, `edition`, `chapter`, `chunk`, `frame`. Verify video durations and frame counts using ffprobe, detect black frames, frozen-camera unintended sequences, missing chapter audio and clip boundaries; fail edition if verification fails.

## 30. Job API, output bundle, UI requirements
`POST /api/projects` creates topic project + edition planning request; `POST /api/projects/:id/generate` builds source dossier/plans; `POST /api/projects/:id/render` starts **both** outputs by default with `{editions:['short','long']}`; `GET /api/projects/:id` shows per-edition plan/edit approval/QA; `GET /api/projects/:id/jobs` gets both statuses; support cancel/retry each independently. A failed long render must not erase valid short output; parent status `partial_success` until both complete. Avoid exposing API secrets. Legacy `POST /api/jobs` remains for a single explicit edition or deprecated with migration notice.

Deliverables per project:
```text
outputs/<slug>/
  short/<slug>_short_9x16.mp4
  short/subtitles.srt
  short/thumbnail.png
  short/metadata.json
  long/<slug>_long_16x9.mp4
  long/subtitles.srt
  long/chapters.json
  long/thumbnail.png
  long/metadata.json
  research/sources.json
  manifest.json    # content hash, versions, sources, licensing, QA, durations
```
UI: source topic + locale; style-select A/C/D and blend presets; short editor and long editor separate tabs; linked fact/citation pane; voice/subtitle/theme selectors per edition; storyboards with chapter timeline; render both + render only short/long; per-edition progress/cancel/retry; preview safe areas for vertical/horizontal; MP4 download independently. No platform auto-publishing in MVP; export only.

## 31. Milestones update, acceptance tests and CODEX instruction override
Extend previous M0–M6 with:
- **M0b** prove memory-safe 3–5 minute test output and sustained benchmark; calculate projected 20-min compute and disk costs. Make chunk pipeline before promising production.
- **M7** content dossier + short/long editorial planners + versioned schemas + narration timing, no fabricated claims; manual/offline mode.
- **M8** independent aspect-aware rendering, two video outputs, per-chunk recovery, preview, per-edition metadata and QA; example 150-second short and 18-minute long.
- **M9** UX editing flows, mixed A/C/D variations in each edition, production hardening and 2-edition E2E demo.

Acceptance:
- [ ] **One source project generates exactly two independent scripts**; short is standalone and substantively shorter; long deepens rather than pads.
- [ ] **Two validated MP4 outputs**: 9:16 90–180s and 16:9 900–1200s, both 30fps default.
- [ ] Both videos share canonical facts/sources and flag unsupported figures; no unlicensed assets.
- [ ] A, C, D and auto-mix available in either output independently; visual layouts are not crops.
- [ ] Per-edition chapter timing, voice and subtitles align with actual audio; no overflow in safe zones.
- [ ] Stream/chunk rendering prevents 36k-frame in-memory accumulation; crash/resume works.
- [ ] ffprobe duration/aspect/frame count test, black-frame QA, silent-audio QA, retry isolation, artifact checksum.
- [ ] Real end-to-end 2-output demo, not mock JSON or clips under user minimum durations.

**Prompt to paste into Codex (overrides former §21):**
> Implement Map Video Engine from this spec, honoring v1.1 §§24–31 as normative over older examples. One topic must produce two independently scripted and composed editions: short vertical 1080x1920 90–180 seconds, long horizontal 1920x1080 900–1200 seconds. Use deck.gl + MapLibre + Remotion, presets A/C/D with selectable variants and mixed styles. Shared research facts/sources, separate storyboards/camera layouts/voices/captions; no simple trimming or padding. Offline/manual workflow must work without API keys. Implement deterministic WebGL render, chunked resilient long-form export, QA ffprobe/black frames/audio, per-edition API/UI controls. Execute M0/M0b compatibility & scale spikes first; report real evidence and limitations, then M1–M9. Never fabricate APIs, research claims or successful render results.

---

# PART III — AI DOCUMENTARY VIDEO FACTORY (v1.2 extension)
**Normative precedence:** Sections 32–42 extend §§1–31. They do not replace the existing Map Video Engine scope, presets A/C/D, short/long outputs, or local-first requirement. Build each engine as a separate independently testable package. No research, narration or fact checking is implicit in the map renderer.

## 32. Product boundary and five-stage roadmap
**Goal:** turn a user-supplied documentary topic into two editorially independent, evidence-linked videos: short 9:16 **90–180 s**, and long 16:9 **900–1200 s**. Main domain: country comparisons, economy, demographics, geography, trade, industry, technology, history and public datasets. Inputs may be Vietnamese/Japanese/English; scripts and voice should respect selected locale.

Five subsystems:
1. **Map Video Engine (M0–M9, existing):** deterministic map animation, A/C/D + mixed presets, two aspect-aware renders and QA. This is the first implementation milestone, not the entire product.
2. **Research & Data Engine:** retrieve evidence from official/public sources and user-provided CSV/JSON/URLs, normalize observations and provenance, compute comparisons with explicit units/time coverage.
3. **AI Script & Editorial Engine:** develop claims and story arcs from verified evidence; create separate short and long narration and shot plans, citations, attractive but accurate hooks.
4. **Voice, Subtitle & Sound Engine:** TTS or uploaded voice, timestamps, word-level alignment when available, licensed music/SFX, final mix.
5. **Orchestration & Quality Engine:** pipeline state machine, review gates, retry/cache, per-edition rendering, factual/visual/audio QA and exports. Automatic publication is explicitly out-of-scope until separately authorized.

**Principle:** `research → evidence → narrative → storyboard → map/visual scenes → audio → render → QA`. Never let a generative model invent a metric to fill a graphic. Model output is a proposal; validated evidence is authoritative.

## 33. System architecture, ownership and data flow
```text
POST /api/documentaries {topic, locale, countries, years, sources?, config}
  -> TopicIntake (policy and scope validation)
  -> ResearchCoordinator
      -> DataSourceAdapters -> RawSourceCache -> ProvenanceStore
      -> ObservationNormalizer -> DerivedMetricCalculator
      -> ClaimVerifier -> EvidenceDossier
  -> EditorialPlanner
      -> ShortNarrativePlanner (90-180 s)
      -> LongNarrativePlanner (900-1200 s)
      -> ScriptCritic / FactRefValidator / HumanApprovalGate
  -> StoryboardDirector
      -> scene types: Map(A,C), Chart(D), DataCard(D), Timeline, Explainer
      -> Aspect-aware camera/typography layout
  -> AudioPlanner -> TTS/Imported Narration -> Alignment -> Captions
  -> Existing Map Video Engine (Remotion + MapLibre + deck.gl)
      -> frame ready -> chunk render -> encode and assemble
  -> Automated QA -> Outputs (2 MP4s + files + provenance + report)
```
Use a **monorepo** with `packages/research`, `packages/evidence`, `packages/editorial`, `packages/audio`, `packages/orchestration`, `packages/qa` layered on existing packages. API calls must have adapter interfaces and mocks. Use TypeScript for contracts, orchestration and rendering; Python allowed only in an isolated data-analysis worker if justified. SQLite for local MVP project metadata, optionally PostgreSQL in production. Redis/BullMQ optional, not needed to run a single local job.

## 34. Evidence and data contracts (versioned)
```ts
type DocumentarySchemaVersion = '1.2';
type ApprovalState = 'draft'|'needs_research'|'needs_review'|'approved'|'rejected';
type SourceKind = 'official_api'|'official_page'|'uploaded_file'|'licensed_dataset'|'manual';
interface ProvenanceSource {
  id: string; kind: SourceKind; publisher: string; title: string;
  url?: string; localPath?: string; retrievedAt: string;
  publishedAt?: string; license?: string; attribution?: string;
  rawSha256: string; allowedForCommercial?: boolean;
}
interface Observation {
  id: string; sourceId: string; datasetId?: string;
  regionCode: string; indicatorCode: string; value: number | null;
  unit: string; year?: number; period?: string;
  priceBasis?: 'nominal'|'real'|'ppp'|'not_applicable';
  currency?: string; methodologyNote?: string; revision?: string;
  qualityFlags: string[];
}
interface SupportedClaim {
  id: string; text: string; evidenceIds: string[];
  sourceIds: string[]; derivedCalculationId?: string;
  asOf?: string; qualifiers: string[];
  verdict: 'supported'|'uncertain'|'conflicting'|'unsupported';
  approval: ApprovalState;
}
interface EvidenceDossier {
  schemaVersion: DocumentarySchemaVersion;
  sources: ProvenanceSource[];
  observations: Observation[];
  claims: SupportedClaim[];
  gaps: {question:string; reason:string; priority:'high'|'medium'|'low'}[];
}
```
**Crosswalk rule:** adapt canonical `EvidenceDossier.claims` to existing `ContentProject.research.facts`; preserve stable IDs and source mapping. Do not create a second contradictory truth store. Store **raw response bytes** + hash + normalized record; preserve retrieval date, original units, revisions and license.

## 35. Data source adapter priority and statistical hygiene
Build source connectors by explicit opt-in config; initial candidates **World Bank Indicators API**, **UN Data/UN Comtrade** where access terms allow, **IMF data portals/APIs** as supported, **OECD datasets** where access terms allow, plus local CSV/JSON. URLs are examples of candidate institutions, **not a guarantee of open, unlimited or account-free API access**. Each adapter must document current endpoint, auth/key needs, terms, quotas, permitted commercial/render usage, caching and attribution. No scraping against access restrictions; no bypassing rate limits or paywalls.

- Comparable metrics require a `MetricDefinition`: concept, unit, source, geography, time period, aggregation, deflator/base year, currency conversion and population denominator where relevant.
- Never equate **nominal GDP**, **real GDP** and **PPP GDP**, or compare figures from mismatched years as though simultaneous.
- Store time series with missing observations (`null`, never silently 0). Show coverage and revisions.
- Comparison computations are pure, auditable and covered by tests: growth `(last/first - 1)*100`, YoY, CAGR `(last/first)^(1/years)-1`, percentage-point vs percentage change, per-capita where denominator is valid. Reject division by zero, negative values for CAGR unless explicit alternative, and mismatched dimensions.
- Every factual chart/map label must show the relevant time period and cite the dataset/source in metadata; optionally render short visible source label in final video.
- Geographic/border depictions and country naming may be disputed: use documented source and neutral labels, and allow editorial review.
- Research freshness: `asOf`, cache TTL by dataset; no claim of currentness if only old data available. For forward-looking or disputed political assertions, label uncertainty; do not transform predictions into facts.

## 36. Research workflow and review gates
1. Intake `topic + scope + locale + countryCodes + periods` and optional user-uploaded data.
2. Generate **research questions** and indicator requirements; never automatically fill missing fields with fabricated numbers.
3. Fetch sources using adapters or require manually supplied evidence when offline.
4. Normalize and validate units/year/source; detect duplicates, contradictions and missing periods.
5. Build dossier with evidence table and concise factual narrative; mark gaps.
6. Compute explicitly named derived metrics and attach lineage to input observation IDs.
7. Evaluate each claim (`supported/uncertain/conflicting/unsupported`) and block numeric claims that lack evidence references.
8. Persist research snapshot; snapshot is immutable once rendering begins. Subsequent refresh produces a new revision.

Modes:
- `offline_manual`: no network/API, CSV/JSON + approved claims; entire video pipeline can run.
- `assisted`: connector retrieval and AI-drafted text, requires human factual signoff before render.
- `auto_verified`: automated publication-quality **draft** only; if high-risk claims, missing facts or conflicting series appear, stop at `needs_review` (do not bypass).

## 37. Editorial engine: two different stories from one dossier
Short **90–180s**: opening question/hook with no sensationalized false claim (0–8s illustrative), accessible setup, **2–4 evidence-based insights**, visual payoff, clear standalone conclusion; optional invitation to see long edition. Long **15–20 min**: thesis + context, definitions and caveats, chronological / thematic chapters, multiple independent evidence points, alternative explanations/limitations and conclusion. It must not pad empty animation or recycle the same assertion to hit runtime.

```ts
interface EditorialRequest {
  dossierRevisionId: string; locale: 'vi-VN'|'ja-JP'|'en-US';
  strategy: 'compare-two'|'timeline'|'cause-effect'|'data-first'|'myth-vs-fact';
  hooks: 'question'|'contrast'|'surprising-fact'|'historical-turn';
  tone: 'documentary'|'energetic'|'educational';
  styleMix: ('A'|'C'|'D')[];
  editions: {short:{durationMin:90;durationMax:180};long:{durationMin:900;durationMax:1200}};
}
interface NarrationSegment {
  id:string; narration:string; claimIds:string[];
  visualIntent:'map'|'chart'|'number-card'|'timeline'|'title'|'explain';
  preferredStyle?:'A'|'C'|'D'; targetSeconds:number;
  citationsVisible?:boolean;
}
```
Do not hardcode AI model/provider. `EditorialProvider` interface must support (a) local/manual storyboard, (b) local optional model, (c) external LLM by user-provided key. Validate model JSON with Zod, repair only structural errors, verify factRefs again before storyboard creation. Human can edit scripts while retaining source references; any altered claim triggers re-verification.

## 38. Creative variation engine — selectable A/C/D compositions
Preserve A = Cinematic 2D, C = 2.5D Extruded, D = Infographic; both editions support every preset and mixtures. Build an **effect and direction registry**:
- A: `border-pulse`, `country-focus`, `camera-pan`, `route-arc`, `light-trail`, `focus-vignette`.
- C: `height-extrusion`, `oblique-orbit`, `rise-reveal`, `stacked-regions`, `3d-comparison` (clearly label exaggerated height if not to scale).
- D: `bar-race` (only if time series), `line-reveal`, `stat-counter`, `two-column-compare`, `timeline-ribbon`, `source-note`.
- Composition plans: `A-D-A`, `A-C-D`, `C-D-A`, `D-A-C`, `alternating`, and `editor-choice`.
- Theme registry: `midnight-neon`, `atlas-gold`, `clean-newsroom`, `paper-atlas`, and custom palettes; all themes enforce WCAG-inspired contrast checks for text.
- Per scene optional `motionIntensity: calm|balanced|energetic`, `transition: dissolve|wipe|match-zoom|hard-cut`; deterministic seeds, no uncontrolled random cuts.

**No fake specificity**: geospatial shape comes from approved GeoJSON; chart values from referenced `Observation`/derived metric; no invented stats, route distances or country borders. A short video can emphasize A/C and light D; long uses more D for evidence, with A/C for geography and pacing. Variation should be **semantic**, not random spectacle.

## 39. Audio pipeline, synchronization and rights
`script segments -> voice adapter -> audio files -> measured durations -> timeline retiming -> alignment -> SRT/ASS -> licensed music/SFX mix`. Provider strategy: imported human voice, user-installed local TTS, optional external TTS (requires account/key according to vendor). No default paid API required. Locale-specific voices with pronunciation dictionary for country names; per-sentence pause controls; regenerate/replan if narration does not fit target range. Align actual speech, do not estimate subtitles from raw word count alone. Reject music assets without rights metadata; include attribution and license in manifest. Audio QA: missing narration, clipping, overly quiet tracks, >configured silence gap, and final mux sync.

## 40. Orchestration, job states and APIs
State machine (`project.status`):
`created -> researching -> research_review -> scripting -> script_review -> storyboarding -> audio -> rendering -> verifying -> completed`; exceptional states `needs_research`, `needs_review`, `partial_success`, `failed`, `cancelled`.
Do not make `auto_verified` automatically skip failed gates. Per-edition states are independent (`short` can complete while `long` resumes). Each transition is logged with actor, timestamp, artifacts and reasons; commands are idempotent via job key and content hash.

Add API endpoints (keep v1.1 endpoints as backward-compatible):
```http
POST /api/documentaries
GET  /api/documentaries/:id
POST /api/documentaries/:id/research
GET  /api/documentaries/:id/evidence
POST /api/documentaries/:id/approve-evidence
POST /api/documentaries/:id/scripts/generate
POST /api/documentaries/:id/approve-scripts
POST /api/documentaries/:id/render
GET  /api/documentaries/:id/artifacts
GET  /api/documentaries/:id/qa
POST /api/documentaries/:id/retry?edition=long
```
Add a UI wizard: **Topic → Research & Evidence → Scripts (Short/Long) → Visual Styles (A/C/D) → Audio → Render → QA/Export**. Provide fine controls for source review, claim edits, alternate hooks, theme and preset selection, scenes, aspect-safe preview, voice, subtitle and music. Default workflow runs on local filesystem with mock/manual adapters; batch mode later.

## 41. Project files, privacy, security, and reproducibility
```text
projects/<id>/
  config/request.json
  research/raw/<source-id>.<ext>
  research/normalized/observations.json
  research/evidence-dossier.json
  research/provenance.json
  script/short.json
  script/long.json
  storyboards/short.json
  storyboards/long.json
  audio/short/*
  audio/long/*
  renders/short/chunks/*
  renders/long/chunks/*
  outputs/short.mp4
  outputs/long.mp4
  outputs/short.srt
  outputs/long.srt
  outputs/short-thumbnail.png
  outputs/long-thumbnail.png
  manifest.json
  qa-report.json
```
Keys only via environment variable/secret store; never in storyboard JSON, project exports, CLI logs, screenshots or Git. Use per-provider request timeout/retry/rate limit; sanitize filenames and user URLs, block SSRF/private IP destinations, sandbox uploaded files and renderer process. Hash evidence snapshots and generated artifacts; lock dependencies. Record source licensing, map attribution, music licensing and generated-voice provider terms. Budget limits: tokens, dataset calls, GPU/concurrency, temporary disk, timeout; a long render cannot exhaust the host silently.

## 42. Delivery plan, executable tests, acceptance criteria and Codex prompt
Implementation sequence **do not skip M0**:
- **Stage 1 (M0–M9):** Map Video Engine technical spike; A/C/D; one topic → two scene plans and actual MP4 outputs, chunked long render, manual inputs.
- **Stage 2 (M10):** `EvidenceDossier` schema, CSV/JSON manual import, provenance and auditable computations, UI source table. Offline tests must pass without keys.
- **Stage 3 (M11):** source adapter interface, first official indicator source implementation + HTTP cache/quotas; contradictions and missing-data gates; mark inaccessible adapters unsupported rather than faking integration.
- **Stage 4 (M12):** EditorialProvider with mock/manual backend; short/long script generator from dossier, schema and factRef verifier; human editorial review.
- **Stage 5 (M13):** Audio adapter, imported voice/local TTS and optional external providers, subtitle alignment, audio QA.
- **Stage 6 (M14):** integrated pipeline/CLI/API/UI wizard and retry; e2e benchmark on a real 120s + 18min video with real approved sample data and full QA.

Acceptance tests:
- [ ] Offline mode produces two true MP4s without any API account using local datasets and imported/no-voice narration.
- [ ] Source-to-observation-to-claim-to-screen value lineage is machine-queryable for **every** statistic.
- [ ] Contradictory units/year/definitions block misleading comparisons; no fabricated values or unnamed sources.
- [ ] Both versions have independent narrative and visual plans; short is complete and engaging, long adds depth instead of padding.
- [ ] Each edition can select A, C, D and mixed shot templates, with safe labels for both orientations.
- [ ] Actual rendered short is 90–180 seconds, long is 900–1200 seconds, proper dimensions, captions and QA checks.
- [ ] Chunk resume, approval gates, provider failure and network-offline cases have integration tests.
- [ ] `manifest.json` includes source references, revision/date, asset licenses, scene/style choices, content hashes and build version.
- [ ] Benchmark documents CPU/GPU/VRAM/time/disk usage rather than promising zero-cost/instant generation.

**Codex execution prompt — v1.2 (takes priority over former prompts):**
> Read this full specification, particularly §§24–42. The product is an AI Documentary Video Factory whose first deliverable is a fully functional Map Video Engine. Every topic creates two independently scripted, composed and rendered videos: vertical short 1080×1920 / 90–180s, horizontal long 1920×1080 / 900–1200s. Both must support selectable A Cinematic 2D, C 2.5D Extruded and D Infographic, plus mixes and themes. Implement M0/M0b rendering proof first. Preserve local-first, no paid API account for manual/offline workflow. Next implement EvidenceDossier, verified country/statistical datasets, source provenance, factRef-checked bilingual editorial planning, audio/TTS adapters, orchestrator, review gates, UI and QA. Never invent statistics, sources, API compatibility or render results. Complete milestones in order with tests, working demos and concise written limitations. Keep v1.1 functionality and schema migrations intact.
