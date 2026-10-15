# M0 — Kết quả hiện tại: Mode 2 đã có bằng chứng MP4

Run thành công: `run-gXLDuW`, người dùng chạy trên Terminal của máy đích.

| Kiểm tra | Kết quả |
| --- | --- |
| Video | H.264, 1080×1920, 30 fps, 100 frame, 3,333333 giây |
| Hash frame | 100/100 khác nhau |
| Sentinel seek lại | 5/5 khớp chính xác, trong cùng browser |
| PNG và ảnh decode | 100 ảnh mỗi loại vượt guard |
| Camera | center [124,35]→[125,35.5], zoom 4→4.5, pitch 20→48, bearing −12→12 |
| Renderer | Chrome 155.0.8059.40; ANGLE Vulkan SwiftShader |
| Capture trung bình | 1480,217 ms/frame |
| SHA-256 MP4 | c13be68b6dc98c6e1898efc6e84d94a556d1c15db1224c933897621e602a264c |

Đã chạy ffprobe độc lập để xác nhận metadata và mở sentinel 0/50/99 để kiểm tra trực quan.
MP4, 5 ảnh sentinel và verification JSON được lưu tại `docs/evidence/m0/`.

**Giới hạn:** hình học tổng hợp CC0, không phải biên giới quốc gia. Chưa thử Remotion,
chưa chạy video thứ hai trong browser mới; chưa hoàn thành toàn bộ gate M0. Không có bằng
chứng Remotion không ổn. Mode 2 được chứng minh khả thi trên môi trường này với SwiftShader.
M1–M6 vẫn pending theo thứ tự đặc tả.

---

## Lịch sử điều tra (các trạng thái dưới đây thuộc lần chạy trước)

# M0 — Báo cáo thực nghiệm 2026-10-14

## Kết luận

**BLOCKED trước khi render WebGL.** Không thể xác nhận M0, tính ổn định headless,
determinism GPU, khả năng Remotion hoặc chất lượng MP4. Chưa chọn renderer production.

## Môi trường và lệnh đã chạy

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Node / npm | 24.13.1 / 11.10.0 |
| Chrome | Binary tồn tại ở `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; chưa launch qua Playwright |
| pnpm | Không có trong PATH |
| FFmpeg | Tìm được ZIP sẵn có `/tmp/ffmpeg-9.0.2.zip`, giải nén vào `/tmp/map-video-tools`; `-version` pass, 9.0.2-tessus |
| ffprobe | `ENOENT` |
| npm registry | `npm view`, `npm install`, `curl -I` đều lỗi DNS `ENOTFOUND` / `Could not resolve host` |
| Cache cục bộ | Không có MapLibre, deck.gl, Remotion trong kết quả `npm cache ls` |
| Unit tests | 17 pass, 0 fail |
| `node scripts/capture.mjs` | Thất bại có báo cáo `PREFLIGHT_BLOCKED`; 0 frame |

Web documentation truy cập được qua công cụ web riêng, nhưng điều đó không cung cấp khả năng
cài npm trong shell. Không thử vượt hạn chế mạng hoặc sandbox.

## Nội dung đã viết

- Camera pure TypeScript: easing theo frame, longitude và bearing theo cung ngắn.
- MapLibre GeoJSON base + deck.gl extruded GeoJsonLayer dùng camera cập nhật bằng jumpTo.
- Readiness ứng viên: style/tiles, fonts, deck render callback, hai lượt map render, timeout,
  lỗi context loss; không dùng thời gian thực để tính animation.
- PNG capture 100 frame, 5 sentinel và seek ngược để so hash.
- Pixel guard kiểm tra crop bản đồ, nền đen/transparent và màu base map + deck overlay.
- FFmpeg encode H.264, ffprobe xác nhận số frame/kích thước/fps, decode kiểm tra lại toàn bộ ảnh.
- Cleanup browser/server trong finally; chặn browser request ra ngoài origin local.

Đây là implementation **chưa xác minh browser**, không phải báo cáo render thành công. Pixel
thresholds và readiness vẫn cần kiểm chứng thực nghiệm, đặc biệt ảnh extruded bị chiếu sáng,
camera cắt mất geometry, callbacks interleaved và determinism khi seek.

## So sánh các mode

| Mode | Implementation | Thực nghiệm | Quyết định |
| --- | --- | --- | --- |
| Remotion | Chưa triển khai | Chưa chạy | Chưa đủ bằng chứng |
| PNG → FFmpeg | Có ứng viên spike | Blocked tại preflight | Chưa được chứng minh |
| SVG/canvas | Chưa triển khai | Chưa chạy | Chưa áp dụng |

Không suy ra Remotion không ổn từ lỗi cài dependencies. ADR-003 để trạng thái pending.

## Điều kiện gỡ blocker và hoàn tất

1. Cấp môi trường cài npm được hoặc cung cấp dependency bundle/lockfile đầy đủ, cùng ffprobe.
2. Cài và đối chiếu source/API đã cài; chốt lockfile, browser và codec versions.
3. Chạy spike, sửa lỗi thực tế, lưu PNG/MP4; mở ảnh sentinel để review.
4. Tích hợp Remotion với lifecycle frame-ready, chạy comparison và repeat render trong browser mới.
5. Chốt mode dựa trên bằng chứng và hoàn thành yêu cầu hai MP4 100 frame trước M1.

Không có milestone nào được đánh dấu hoàn tất trong lần chạy này.

## Lần tiếp tục: gia cố readiness và quản lý tiến trình

Kiểm tra lại registry vẫn lỗi DNS. Lệnh capture mới tiếp tục dừng tại preflight;
`outputs/m0/latest.json` trỏ tới báo cáo của lần chạy này. Không phát sinh ảnh/video.

Đã sửa các lỗi có thể xác định bằng code/test offline:

- Map/font startup có deadline; tránh treo vô hạn trước frame đầu.
- Hai lượt map render phải quan sát các lượt deck render khác nhau.
- Asset chưa sẵn sàng reset bộ đếm; lỗi update đồng bộ hoặc context loss dọn listener.
- Khóa concurrent frame request được đặt trước khi chờ startup.
- FFmpeg/ffprobe có timeout, giới hạn stdout và được chờ kết thúc sau khi kill.
- Mỗi lần capture ghi vào thư mục riêng; tránh dùng lẫn MP4/PNG cũ với báo cáo thất bại mới.
- Lỗi cleanup được ghi vào báo cáo thay vì làm mất báo cáo.

17 tests pass; các tests readiness dùng event driver kiểm soát được để kiểm tra race/error
paths, không mô phỏng hay thay thế bằng chứng render WebGL. M0 vẫn chưa hoàn tất.

## Kết quả browser thật: run-hSbGgd

Người dùng đã chạy capture từ Terminal ngoài phiên bị hạn chế. Dependencies, FFmpeg và
ffprobe pass preflight. Chrome 155.0.8059.40 chạy được nhưng MapLibre báo
`Could not create a WebGL context`, `GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`.
Số frame: 0. Đây là lỗi WebGL thực tế, không còn lỗi cài dependency.

Đã thêm `WEBGL_BACKEND=swiftshader` dùng CPU driver với hai cờ được tài liệu Chromium
xác nhận: `--use-gl=angle --use-angle=swiftshader`. Giữ sandbox bật, không tự chuyển backend.
Nguồn: https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md
WebGL2 probe ghi renderer/vendor/version trước khi tải map. 18 unit tests pass.
SwiftShader capture chưa chạy thành công; M0 vẫn chưa đạt.

## SwiftShader run-VYsNYV: đã có ảnh thật, false negative ở pixel guard

WebGL2 khởi tạo thành công: ANGLE / Vulkan SwiftShader Device (Subzero), Chrome
155.0.8059.40. `frames/0000.png` đã được mở kiểm tra trực quan: có base geometry cyan
và deck geometry rose, attribution hiển thị. Không có lỗi permission trong báo cáo này.

Guard cũ báo `MISSING_MAP_OR_DECK_OVERLAY`: blackFraction=0,
cyanFraction=0.022328317901234566, pinkFraction=0.00003817836934156379.
Màu rose chính là RGB (169,44,77), 2298 pixels; điều kiện đỏ >170 loại nhầm.
Đã thay bằng kiểm tra tỷ lệ màu rose có brightness floor, không hạ ngưỡng diện tích.
Thêm regression fixture từ chính PNG thật và các trường hợp không có overlay.
20 tests pass. Capture giờ lưu pixel metrics vào report trước khi assert để chẩn đoán
frame bị loại. Chưa render lại đủ 100 frame hoặc encode MP4; M0 vẫn chưa hoàn tất.

## Tiếp tục theo đặc tả v1.2 — 2026-10-14

- Đã đọc source spike/chunk pipeline và đặc tả §§1–42; giữ thứ tự M0/M0b trước M1.
- `npm test`: 30 pass, 0 fail, 0 skip. Có kiểm tra encode/concat bằng FFmpeg trên MP4
  cũ; không coi đó là bằng chứng render browser mới.
- Capture mới `run-na7dfV` và suite `outputs/verification/run-T0Rxdw/report.json`
  đều dừng tại `listen EPERM: operation not permitted 127.0.0.1:5173`, trước browser.
  Prerequisites Node/dependencies/FFmpeg/ffprobe đều pass.
- Thêm `npm run spike:verify`: hai browser capture độc lập → so hash/metadata/sentinel/
  build identity → checkpoint/restart/resume; `-- --scale` thêm benchmark 9.000 frame.
- Sửa comparison fail-open: không chấp nhận hash thiếu, frame chưa validated, sentinel
  thiếu/sai, video metadata sai hoặc frame frozen. Thiếu browser metadata không còn được
  coi là cùng môi trường. Hash source/dependencies/config phải khớp mới đạt build gate.
- Fingerprint gồm 8 file input, Node/browser/renderer/backend, kích thước/fps và codec
  tools; đã smoke-test đọc/hash file cục bộ. Chưa kiểm chứng đường capture thành công mới.

**Vẫn pending:** repeat capture mới, sustained M0b, Remotion comparison, geodata thật;
M1–M14 chưa được triển khai. Lệnh chạy và giới hạn được cập nhật trong README.


## Bằng chứng mới: suite run-4oOPc4 pass

Người dùng chạy từ Terminal: run-m10ZXw và run-t6WewD đều capture-passed.
Đối chiếu độc lập: 100/100 frame pixel-identical, environmentMatch/buildMatch/
encodedBytesMatch đều true. Kiểm tra lại SHA-256 và ffprobe cả hai MP4 thành công.
Chrome của lần chạy này: 155.0.8059.79; không suy rộng sang browser/môi trường khác.

Checkpoint smoke i4cB2C: chunk 0 được reuse, browser mới render đúng 50 frame còn lại;
MP4 ghép 100 frame, H.264, 1080×1920, 30 fps, 3,333333 giây; checksum và ffprobe pass.
Đã lưu ba video, report và verification tại `docs/evidence/m0-repeat/`.

Đây là smoke 100 frame, chưa đạt M0b sustained 3–5 phút. Capture của 50 frame sau
resume trung bình khoảng 0,932 s/frame; ngoại suy capture 9.000 frame khoảng 2,33 giờ,
chưa gồm encode/QA và không phải benchmark dài thực đo. Remotion comparison và geodata
thật vẫn pending. Các trạng thái chưa chạy ở trên là lịch sử trước suite này.

## Benchmark 9.000 frame dừng tại chunk 15 (2026-10-15)

Báo cáo `outputs/m0b/benchmark/report.json`: 14 chunk (0–13), 2.100 frame đã
xác minh; 150 frame chunk 14 đã capture/encode nhưng lỗi tại `mkdir qa`:
`EEXIST .../outputs/m0b/benchmark/qa`. Vì chunk 14 chưa qua QA, không được reuse.
Đã đổi tạo thư mục scratch/qa thành idempotent và thêm tương thích resume giới hạn
đúng hash source cũ của bản sửa này; mọi đầu vào scene/browser/codec khác vẫn phải
khớp tuyệt đối. `npm test`: 31 pass. Chưa chạy lại browser sau sửa do phiên agent
không thể mở server local. Các chunk 0–13 vẫn giữ nguyên.

Muốn kiểm tra bản sửa mà không chạy hết 9.000 frame, dùng lại môi trường SwiftShader:
`npm run spike:scale -- --frames 9000 --chunk-frames 150 --output outputs/m0b/benchmark --resume --stop-after-chunks 1`.
Lệnh sẽ reuse 14 chunk đầu, render và QA một chunk 150 frame rồi checkpoint.

## Sửa `mkdir qa` đã được kiểm chứng bằng browser

Người dùng chạy `--resume --stop-after-chunks 1`: report có trạng thái
`checkpointed`, không lỗi; reuse 14 chunk và render/QA chunk 14 (150 frame) thành
công. Đã đối chiếu SHA-256 của cả 15 chunk: 2.250/9.000 frame verified. Đây là
proof lỗi `EEXIST` đã được xử lý trên máy đích; sustained 9.000 frame vẫn chưa chạy xong.

## M1 foundation bắt đầu (2026-10-15)

Schema JSON v1.0 strict, timeline frame, xác minh GeoJSON và CLI validate đã được
thêm. Fixture synthetic A→C→D 300 frame hợp lệ; 36 tests pass, Vite bundle build
thành công. Renderer project một lần có CLI, nhưng agent sandbox không thể chạy
Chrome (`browserType.launch: Target page, context or browser has been closed`).
Do đó không có bằng chứng MP4 từ M1; lệnh smoke 3 frame trong README cần được
chạy trên Terminal máy đích. Chưa đánh dấu M1 hoàn tất.

## M1 project renderer: first real browser capture

User Terminal run `outputs/render-run-oW3qJg`: 3-frame MP4 from project JSON, scene A,
1080×1920, H.264, 30 fps. Agent independently verified ffprobe 3 decoded frames,
SHA-256 and PNG sentinel; screenshot shows map geometry, title and visible CC0
attribution. This proves the new project renderer's A path only. The original
fixture map was visually too small; fixture camera zoom was increased afterward.
C/D and the new camera settings remain unverified in browser. Renderer now accepts
`--start-frame` to test an individual scene without encoding the full 300 frames.

## M1 C/D browser proof và chuẩn bị dữ liệu thật

Run `mJGKVB` (C frame 150–152) và `ErUSFQ` (D frame 200–202) đều capture-passed.
Agent đã kiểm tra SHA-256, ffprobe và mở ảnh sentinel. C extrusion hiện rõ nhưng còn
thấp; D card chồng lên vùng bản đồ. Fixture đã đổi height/camera, `npm test` 37 pass;
bản visual sau sửa chưa được render lại.

Importer Natural Earth 110m được thêm, lưu raw GeoJSON, checksum, manifest và ví dụ
JPN/CHN khi chạy thành công. Trong sandbox, `--download` dừng tại DNS
`ENOTFOUND raw.githubusercontent.com`; không có dữ liệu thật hoặc video quốc gia
nào được nhận là hoàn tất.

## Natural Earth JPN/CHN imported (2026-10-15)

User Terminal imported Natural Earth 110m source. Raw 838,726 bytes SHA-256
`6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f`;
normalized 7,310 bytes SHA-256
`558f3eda35cf13afaaa6f26d947d96b1bc26f4060654592d172714a49c6c09a1`.
Agent independently matched both files against the manifest. JPN and CHN are
MultiPolygons (3 and 2 parts), IDs resolve from scene JSON, `video:validate`
passes, and 37 tests pass. Real-country browser render remains pending.

`video:render --sample-frames 0,150,200` now captures one A/C/D frame each for a
fast map geometry smoke. The resulting 3-frame MP4 is a diagnostic montage,
**not** an editorial video or evidence of continuous transitions.

## Natural Earth visual QA và fit camera

`outputs/render-run-mgAv8K` tạo 3-frame A/C/D diagnostic montage thành công.
Agent kiểm tra SHA-256, ffprobe (H.264, 1080×1920, 3 frame), và mở ba ảnh.
Geometry JPN/CHN, extrusion và attribution hiển thị. Ảnh cho thấy Tây Trung
Quốc bị cắt ở A/C và card D đè lên bản đồ. Đã thêm `featureBounds` và
`fitMercatorBounds` dùng khung nội dung theo tỉ lệ dọc; importer áp dụng fit
cho A/C và vùng map phía trên card cho D. Current example đã regenerate camera.
`npm test`: 38 pass; visual sau fit cần browser proof mới, chưa được tuyên bố pass.

## Fit camera verified and motion QA corrected

`outputs/render-run-hXauao` passed 3-frame A/C/D render from real Natural Earth
JPN/CHN data. Agent independently checked file checksum, ffprobe and all three
sentinel images. Both countries fit entirely within the portrait frame and the D
card no longer overlaps map geometry. This verifies still frames only, not a
continuous 300-frame timeline.

Before a continuous render, frozen-frame QA was updated: intentional static D
cards are counted as holds, while a declared moving scene still fails after 30
identical captures. C rise now also changes fill opacity across frames and has
an explicit illustrative-height label. `npm test`: 39 pass. This change needs a
browser render to verify its visual result.
