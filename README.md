# map-video-engine

**Đã render MP4 A→C→D 300 frame liên tục với bản đồ Nhật–Trung thật. Gate M0 đầy đủ và các milestone sản phẩm tiếp theo chưa hoàn tất.**

Đặc tả: [Codex Map Video Engine Spec v1.2](<Codex_Map_Video_Engine_Spec (1).md>).

## Bằng chứng đã xác minh

- [MP4 H.264](docs/evidence/m0/spike.mp4): 1080×1920, 30 fps, 100 frame, 3,333 giây.
- [Ảnh đầu](docs/evidence/m0/sentinel-0.png), [giữa](docs/evidence/m0/sentinel-50.png), [cuối](docs/evidence/m0/sentinel-99.png).
- [Kết quả xác minh](docs/evidence/m0/verification.json): 100 hash frame khác nhau, 5/5 sentinel khớp khi seek lại trong cùng browser.
- MapLibre base geometry + deck.gl interleaved extrusion, camera jumpTo theo frame; Chromium SwiftShader → PNG → FFmpeg.
- Toàn bộ 100 PNG gốc và 100 ảnh decode từ MP4 vượt pixel guard; đã kiểm tra trực quan sentinel 0/50/99.
- Capture trung bình 1,480 giây/frame trên lần chạy này; không phải tốc độ encode hoặc cam kết hiệu năng production.
- 100 test đạt, 1 test localhost bị bỏ qua vì sandbox chặn bind: camera, route reveal, scene fade, asset registry, phụ đề/SRT/ASS, bố cục chữ, preview timeline, ghép scene, globe, evidence/editorial gate, schema short/long, bố cục ngang, readiness, timeout/cleanup, pixel guard với ảnh thật, process limits, browser options, chunk storage/media, audio AAC/SFX, API workflow, WDI cache và documentary plan/QA.

Hình học trong spike là hình tổng hợp CC0 để kiểm tra renderer, **chưa phải bản đồ quốc gia JPN/CHN**.
Hai browser độc lập trên cùng môi trường đã cho kết quả pixel và MP4 giống nhau; chưa chứng minh reproducibility giữa các môi trường.

## Chạy lại

Node 24.13.1; dependencies được pin trực tiếp và có `package-lock.json`. Cài bằng `npm ci`.
FFmpeg/ffprobe 9.0.2 và Chrome 155.0.8059.40 là các binary đã dùng cho bằng chứng.
Chrome hệ thống có thể tự cập nhật; cần browser cố định trước khi chốt reproducibility production.

```sh
npm ci
npm test
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run spike
```

`tools/ffprobe` là binary tải riêng trên máy phát triển, không được phân phối trong repo.
Có thể trỏ `FFPROBE_PATH`, `FFMPEG_PATH`, `CHROME_PATH` tới binary của máy khác.
Nếu không có `CHROME_PATH`, cài Chromium của Playwright trước: `npx playwright install chromium`.

Để thử engine Safari trên macOS, cài WebKit của Playwright bằng
`npx playwright install webkit`, rồi đặt `BROWSER_ENGINE=webkit` khi chạy
`video:render`, `video:render:chunks` hoặc `documentary:render`. Không đặt
`CHROME_PATH` hay `WEBGL_BACKEND=swiftshader` trong chế độ này. Đây là WebKit
do Playwright đóng gói, không phải ứng dụng Safari; khả năng WebGL và việc
chụp frame vẫn phải kiểm tra trên máy chạy thật.
Không tự tắt sandbox. SwiftShader là lựa chọn rõ ràng qua biến môi trường; báo cáo lưu renderer thực tế.

Mỗi lần chạy tạo `outputs/m0/run-*`; `outputs/m0/latest.json` trỏ tới lần mới nhất.
Video chỉ đổi tên thành `spike.mp4` sau kiểm tra metadata, decode và pixel guard thành công.
Bằng chứng được giữ riêng ở `docs/evidence/m0` để không bị mất theo thư mục outputs.

## Trạng thái tiếp theo

| Mục | Trạng thái |
| --- | --- |
| Mode 2, 100 frame MP4 thật | Đã xác minh — run-gXLDuW |
| Remotion integration/comparison | Chưa triển khai/chạy; không kết luận Remotion lỗi |
| Hai video độc lập + so sánh build/pixel/MP4 | Pass — run-m10ZXw / run-t6WewD |
| Checkpoint → restart browser → resume | Pass — checkpoint-smoke-i4cB2C (100 frame) |
| M0b benchmark 5 phút | Đã xác minh 2.250/9.000 frame qua checkpoint; chưa hoàn tất |
| GeoJSON JPN/CHN Natural Earth | Đã nhập, đối chiếu checksum và browser sample A/C/D pass |
| Globe Earth | Đã thêm mẫu địa cầu đồ họa 177 vùng; validation/build pass, browser frame chưa kiểm chứng |
| Font địa phương | Có fallback hệ thống theo locale; chưa bundle font có giấy phép hoặc kiểm chứng glyph trên browser |
| M1 schema/timeline/CLI render | MP4 real-data A→C→D 300 frame pass qua chunk/resume; registry pin GeoJSON/license/checksum, nội dung còn là demo kỹ thuật |
| M2 Style A | Ba variant có tạo hình khác nhau; browser sample 50/150/250 pass, full demo pending |
| M3 Style C | Prism và so sánh hai khối pass browser sample; full demo, benchmark/fallback pending |
| M4 Style D | Hai card layout pass browser; phụ đề tạm tắt bằng `subtitlesEnabled: false`; có kiểm tra tràn chữ |
| M5–M6, UI/API và 4 demo | M5 có preview và CLI ghép scene A/C/D; UI biên tập, API và 4 demo chưa hoàn tất |
| v1.1 short/long contract | Có request DTO riêng và schema project hai edition; chưa có editorial planner hoặc hai video thật |
| Layout 16:9 | A/C/D sample pass trực quan ở 1920×1080; video liên tục và long edition pending |
| A→C→D transition | Fade qua nền tối 8 frame; browser sample pass, timeline test nằm trong bộ 59 test |

Phiên agent hiện bị chặn mở server local (`listen EPERM`), nên capture thành công được người dùng
khởi chạy từ Terminal; agent đọc báo cáo, ảnh và video trực tiếp để xác minh. Lỗi WebGL mặc định
đã được khắc phục cho lần chạy này bằng SwiftShader.

Chi tiết: [báo cáo M0](docs/M0-report.md), [API evidence](docs/api-evidence.md), [licensing](docs/licensing.md).

Để AI khác tiếp quản nhanh, đọc [AI handoff](docs/AI_HANDOFF.md) và
[change log](docs/CHANGELOG.md). Mọi thay đổi mới cần cập nhật hai tài liệu
theo quy tắc trong [AGENTS.md](AGENTS.md).

Nền tảng evidence offline của v1.2 đã có strict dossier schema, liên kết
source→observation→claim và kiểm checksum raw source:

```sh
npm run evidence:validate -- --input examples/evidence-map-dossier.json
npm run editorial:gate -- --dossier examples/evidence-map-dossier.json
```

Fixture này cố ý có **0 quan sát và 0 fact được duyệt**; gate trả
`needs_research`. Đây là validation và chặn sai sự thật, chưa tạo được kịch bản
hay hai video thật. Phép tính difference/growth/CAGR/percentage-point trong
`packages/evidence/src/metrics.ts` giữ ID input và từ chối so sánh không đồng
định nghĩa/đơn vị/năm.

Voice nhập từ file cục bộ được hỗ trợ khi `audio.voiceover` trỏ tới file và
`audio.voiceRights` có `license` + `attribution`. File phải có đúng một audio
stream và dài bằng toàn bộ timeline. Render một lần cắt đúng đoạn `startFrame`;
render theo chunk ghép track AAC sau khi nối video. `audio.music` yêu cầu
`audio.musicRights`, file dài ít nhất bằng timeline; `audio.musicGainDb` mặc
định -18 dB và `duckingDb` giảm thêm nhạc khi có voice. `audio.sfx` là mảng cue
`{id,assetPath,startFrame,durationFrames,gainDb,rights}`; mỗi cue cần quyền sử
dụng và file đủ dài. Các cue được cắt/đặt theo frame, trộn rồi giới hạn peak
trước khi mã hóa AAC. `--sample-frames` có audio cần thêm `--video-only`.
Voice/music/SFX đã qua test FFmpeg với media tổng hợp, nhưng chưa có project
audio render thật trên Chrome. TTS, căn phụ đề theo tiếng nói, ducking theo
biên độ giọng và audio QA nâng cao chưa triển khai.

## Tiếp tục kiểm chứng M0/M0b

Chạy từ thư mục `map-video-engine` trong Terminal có quyền mở server local:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run spike:verify
```

Lệnh tạo hai capture 100 frame trong hai browser độc lập, so sánh toàn bộ hash,
kiểm tra metadata/sentinel và fingerprint source/dependencies/môi trường, rồi thử
checkpoint → restart → resume. Dừng tại bước lỗi và lưu báo cáo ở
`outputs/verification/run-*/report.json`; không ghi đè bằng chứng cũ.
Các báo cáo cũ thiếu fingerprint vẫn có thể so pixel nhưng không đạt gate matching build.

Thêm `-- --scale` để chạy tiếp benchmark 9.000 frame (5 phút video), chunk 150 frame:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run spike:verify -- --scale
```

Benchmark mặc định giới hạn 8 giờ / 8 GiB workspace. Có thể chạy riêng và resume:

```sh
npm run spike:scale -- --frames 9000 --chunk-frames 150 --output outputs/m0b/benchmark
npm run spike:scale -- --frames 9000 --chunk-frames 150 --output outputs/m0b/benchmark --resume
```

Các lệnh riêng cũng cần biến môi trường binary/backend như trên. Resume yêu cầu cùng
source/config/browser; lock sau crash cần được kiểm tra để chắc chắn tiến trình cũ đã
thoát trước khi xóa thủ công. Test FFmpeg trong `npm test` sử dụng MP4 M0 đã có để
kiểm tra split/concat và checksum; **không thay thế** browser restart/resume benchmark.

Phiên agent bị `listen EPERM`, nhưng người dùng đã chạy suite thành công từ Terminal:
`run-4oOPc4`, hai capture độc lập khớp toàn bộ 100 frame và bytes MP4; restart/resume pass.
Đã kiểm tra lại SHA-256 và ffprobe cho cả ba MP4, lưu tại `docs/evidence/m0-repeat/`.
M0b sustained benchmark và Remotion chưa chạy. Dù suite đã pass,
Remotion comparison và dữ liệu địa lý thật vẫn cần hoàn tất trước khi kết luận toàn bộ M0.

Benchmark `outputs/m0b/benchmark` đã dừng tại chunk 15 vì `mkdir qa` gặp `EEXIST`.
14 chunk đầu (2.100 frame) còn nguyên. Sau bản sửa, có thể thử tiếp đúng một chunk:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run spike:scale -- --frames 9000 --chunk-frames 150 --output outputs/m0b/benchmark --resume --stop-after-chunks 1
```

Lệnh này checkpoint sau khi kiểm tra chunk mới; không tạo video 5 phút hoàn chỉnh.
Muốn tiếp tục toàn bộ, bỏ `--stop-after-chunks 1`. Cần giữ cùng Node/Chrome/FFmpeg;
chỉ riêng sửa lỗi tạo thư mục này được phép thay source hash khi resume.

## M1 đang triển khai: project JSON → bản đồ → MP4 ngắn

`packages/schema/src/project.schema.ts` là hợp đồng JSON v1.0 strict; timeline
`packages/motion/src/timeline.ts` tính scene/camera theo frame. Fixture
`examples/mixed-acd.json` có 3 scene A→C→D, tổng 300 frame (10 giây), dùng
`assets/geodata/synthetic-regions.geojson` là hình học tự tạo và được gắn nhãn CC0.
Dữ liệu này **không phải** biên giới quốc gia hoặc phim tư liệu.

```sh
npm run video:validate -- --input examples/mixed-acd.json
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/mixed-acd.json --output outputs/mixed-acd-smoke.mp4 --frames 3
```

`--frames 3` là kiểm tra trình duyệt nhanh, xuất 3 frame đầu. Bỏ cờ này để
render đủ video 10 giây A→C→D (300 frame). `video:render` build trang tĩnh và
phục vụ file trực tiếp qua Playwright; không cần mở cổng local. Nó kiểm tra
frame PNG, metadata ffprobe và ảnh decode trước khi công bố MP4. Giới hạn
one-shot hiện là 900 frame; render dài vẫn phải dùng pipeline chunk.

Trong sandbox của agent, Vite build và 36 tests pass nhưng Chrome bị đóng ngay sau
khi launch; MP4 M1 chưa được xác minh. Không dùng video 3 frame để tuyên bố
preset A/C/D hoặc video hai phiên bản đã hoàn thành. Dữ liệu quốc gia thật, font
Nhật/Việt, Remotion comparison và M0b sustained benchmark vẫn pending.

M1 A 3-frame smoke đã pass trên Terminal và được kiểm tra lại bằng ffprobe/ảnh PNG.
Fixture đã được tăng zoom sau lần smoke đó; để kiểm tra riêng preset C/D nhanh:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/mixed-acd.json --output outputs/mixed-c-smoke.mp4 --start-frame 150 --frames 3
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/mixed-acd.json --output outputs/mixed-d-smoke.mp4 --start-frame 200 --frames 3
```

Các file 3 frame này là kiểm tra kỹ thuật, không phải video nội dung hoàn chỉnh.

### Dữ liệu bản đồ quốc gia (bước nhập dữ liệu)

`npm run geodata:import -- --download` tải GeoJSON Natural Earth 1:110m từ repository
nguồn, lấy JPN/CHN, kiểm tra hình học, lưu raw response, SHA-256, ngày tải và
manifest bản quyền. Tạo `examples/japan-china-map.json` chỉ trình bày hình học;
chiều cao khối là minh họa, không phải thống kê. Nếu đã có file local, dùng
`npm run geodata:import -- --source /path/to/ne_110m_admin_0_countries.geojson`.

Natural Earth JPN/CHN đã được nhập trên máy đích và kiểm tra checksum. Boundary
Natural Earth 110m là hình học tổng quát theo de facto;
biên giới tranh chấp cần biên tập trước khi xuất bản. Nguồn:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_admin_0_countries.geojson
Bản quyền: https://github.com/nvkelso/natural-earth-vector/blob/master/LICENSE.md

Smoke C/D 3 frame đã pass trên máy đích; checksum, ffprobe và ảnh sentinel được
đối chiếu lại. Sau khi xem ảnh, fixture D được đổi camera để tránh thẻ đè lên bản
đồ và C được nâng chiều cao minh họa; cả hai đã pass browser sample tiếp theo.

Natural Earth JPN/CHN import đã hoàn tất ở máy đích; manifest và hai SHA-256 được
đối chiếu lại. Để kiểm tra bản đồ thật qua A/C/D chỉ bằng ba frame:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/japan-china-map.json --output outputs/japan-china-samples.mp4 --sample-frames 0,150,200
```

MP4 này là ảnh mẫu ở các frame không liền nhau, dùng để kiểm tra hình học và layout;
không phải video chuyển cảnh liên tục. Source Natural Earth 110m là bản đồ tổng quát,
cần biên tập đối với nội dung biên giới tranh chấp.

Ảnh Natural Earth A/C/D đầu tiên cho thấy camera dọc cắt phía tây Trung Quốc và
card D che bản đồ. Project mẫu đã được fit lại theo bounds thực tế; bản mẫu sau sửa
đã pass trong `outputs/japan-china-fit-samples.mp4`.

Real-data A/C/D sample montage `outputs/render-run-hXauao` đã được đối chiếu:
JPN/CHN nằm trọn khung dọc, card D không còn đè lên bản đồ. Trước khi render
liên tục, frozen-frame QA đã phân biệt cảnh D giữ hình có chủ ý với cảnh A/C
đang chuyển động; C có nhãn chiều cao minh họa.

### Render timeline liên tục theo chunk

`video:render:chunks` chia project thành MP4 tối đa 300 frame/chunk, xác minh từng
chunk bằng checksum và ffprobe, rồi ghép không encode lại. Các chunk đã xác minh
được dùng lại với `--resume` khi input, source, backend và binary vẫn khớp.
Lệnh `--plan` chỉ kiểm tra project và lịch chunk, không mở Chrome hay tạo MP4:

```sh
npm run video:render:chunks -- --input examples/japan-china-map.json --output outputs/japan-china.mp4 --chunk-frames 150 --plan
```

Để xuất video 10 giây liên tục trên Terminal có Chrome/WebGL, chạy:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render:chunks -- --input examples/japan-china-map.json --output outputs/japan-china.mp4 --chunk-frames 150
```

Thêm `--stop-after-chunks 1` để kiểm tra một chunk và lưu checkpoint, rồi thêm
`--resume` khi chạy tiếp cùng lệnh. Report nằm tại
`outputs/japan-china.mp4.work/report.json`. Browser render end-to-end đã pass trên
máy đích: chunk đầu 30 frame được checkpoint, `--resume` dùng lại chunk đó và
render 9 chunk tiếp theo. `outputs/japan-china.mp4` là H.264 1080×1920, 30 fps,
300 frame/10 giây; SHA-256 `cfcb9af617714464f92b71aa4458cc8472c9e109b1df56c9cdb502237e3c8caa`.
Đã kiểm tra ffprobe, checksum và ảnh decode tại các cảnh A/C/D. Đây là demo
kỹ thuật; cảnh C còn ít nổi khối, chưa có đường nối quốc gia, voice hoặc nhạc.

Sau khi xem video 10 giây, cảnh C được chỉnh tăng chiều cao lăng trụ minh họa
từ 45 km lên 500 km và bật lighting của deck.gl. Đây là **tỷ lệ tạo hình**, không
phải dữ liệu chiều cao địa lý. Browser render frame 180 pass trong
`outputs/render-run-x6HOFh/sentinel-180.png`: mặt bên và chiều cao nhìn rõ;
ffprobe xác nhận MP4 thử một frame. `outputs/japan-china.mp4` vẫn là bản trước sửa;
chưa render lại toàn bộ timeline mới. Không resume output cũ sau khi thay source/project.

Cảnh A hiện có tuyến Tokyo–Beijing minh họa được vẽ dần theo frame bằng
`PathLayer` deck.gl (nét lõi + halo) và nhãn địa điểm. Nhãn trên video ghi
`visual route`; tuyến không đại diện cho chuyến bay hay dữ liệu giao thương.
Motion/path tests và bundle pass; tuyến mới chưa được xác minh trực quan trong
browser. Chỉ cần render một frame A ở giữa cảnh để kiểm tra nhanh trước khi
render lại video 10 giây.

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/japan-china-map.json --output outputs/route-check.mp4 --start-frame 65 --frames 1
```

Ba biến thể A (`cinematic-focus`, `cinematic-duel`, `route-reveal`) có fixture
`examples/style-a-variants.json`, 300 frame/10 giây với dữ liệu Natural Earth.
`focus` làm tối vùng còn lại và nhấn biên giới vùng chọn; `duel` tô hai vùng và
viền theo màu tương ứng; `route-reveal` vẽ tuyến sáng theo frame. Camera, vùng,
nhãn và tuyến đều lấy từ project JSON. Fixture/schema, 53 tests và Vite build
pass; browser sample ba frame đã pass và được review. Xem
[trạng thái M2](docs/M2-style-a-status.md).

Các tên C `floating-islands` và D `timeline-panel` vẫn chỉ nằm trong schema;
validate/render hiện báo
`STYLE_VARIANT_NOT_IMPLEMENTED` thay vì xuất hình giống biến thể khác.

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/style-a-variants.json --output outputs/style-a-samples.mp4 --sample-frames 50,150,250
```

Lệnh trên chỉ tạo ba frame rời để kiểm tra tạo hình; video demo liên tục cần
render đủ 300 frame qua `video:render:chunks` khi cần chốt M2.

M3 có fixture `examples/style-c-variants.json` gồm `country-prism` và
`comparison-heights` với hai khối cao 500 km/250 km **chỉ để minh họa**. Không
có phép đo nào được gán cho hai giá trị này. Schema buộc comparison có hai vùng
extrude; hai frame browser đã pass và được xem trực quan. Xem
[trạng thái M3](docs/M3-style-c-status.md).

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/style-c-variants.json --output outputs/style-c-samples.mp4 --sample-frames 100,250
```

M4 có thêm `editorial-card` với một thẻ nguồn lớn, bên cạnh layout D
`split-comparison`. Browser sample đầu pass kỹ thuật nhưng thẻ editorial che
một phần bản đồ; bản sửa đã pass browser recheck frame 250. Fixture
`examples/style-d-variants.json` pass schema, asset gate, build và chunk plan. Xem
[trạng thái M4](docs/M4-style-d-status.md).

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/style-d-variants.json --output outputs/style-d-card-recheck.mp4 --start-frame 250 --frames 1
```

Phụ đề hiện **tạm tắt**: `defaults.subtitlesEnabled` mặc định `false` và cả ba
fixture D ghi `false` rõ ràng. Cue cũ được giữ như dữ liệu nháp; renderer không
vẽ chữ và lệnh `video:subtitles` xuất SRT rỗng khi cờ tắt. Ảnh
[kiểm tra phụ đề trước đây](docs/evidence/m4-style-d/subtitle-frame-250.png)
chỉ là bằng chứng lịch sử, không đại diện cho output hiện tại. Khi cần bật lại,
đặt cờ `true` trong project. Renderer vẫn kiểm tra chữ trong tiêu đề/thẻ/nguồn
không tràn khung và đặt ngôn ngữ HTML theo `locale`.

M5 có trang preview cục bộ để chọn các fixture A/C/D hoặc A→C→D, seek theo
frame và xem đoạn fade theo cùng timeline với exporter. Chạy:

```sh
npm run preview
```

Mở `http://127.0.0.1:4173/engine/preview.html`. Chọn fixture hoặc nhập
`outputs/projects/acd-composed.json` vào ô “Project JSON cục bộ” sau khi tạo
project bằng lệnh dưới. Đây là preview/selector cục bộ, chưa phải UI biên tập.
Xem [trạng thái M5](docs/M5-preview-status.md).

Mở `http://127.0.0.1:4173/engine/evidence.html` để xem bảng nguồn, quan sát,
claim và khoảng trống nghiên cứu của dossier v1.2. Chọn dossier mẫu hoặc một
file JSON cục bộ (tối đa 10 MB). Trang kiểm tra cấu trúc bằng cùng Zod schema,
nhưng không đọc file nguồn hay phê duyệt claim. Kiểm tra checksum nguồn bằng:

```sh
npm run evidence:validate -- --input examples/evidence-map-dossier.json
```

Nhập CSV/JSON quan sát thủ công bằng `npm run evidence:import -- --data
assets/data/observations.csv --source assets/data/source.json --project-id sample
--output outputs/evidence/sample.json`. `source.json` cần metadata nguồn theo
`ProvenanceSourceSchema` (trừ `localPath` và `rawSha256` do lệnh tự ghi); kết quả
chỉ là dossier chờ review, không tự tạo claim đã duyệt. Giữ file dữ liệu gốc
nguyên vẹn để lệnh validate có thể xác nhận SHA-256.

Duyệt claim thủ công bằng `npm run evidence:review -- --input dossier.json
--review review.json --output outputs/evidence/reviewed.json`. File review cần
`projectId`, `inputSha256` từ `evidence:validate`, `reviewer`, `reviewedAt` ISO
và `decisions` gồm `claimId`, `verdict`, `approval`, `reason` (ít nhất 10 ký tự).
Lệnh kiểm tra lại byte nguồn, từ chối hash cũ, giữ lịch sử duyệt trong dossier
mới và không ghi đè file đầu vào. Đây là ghi nhận quyết định của người biên tập,
không phải hệ thống tự xác nhận sự thật.

Connector World Bank Indicators API v2 nhận yêu cầu cố định trong
`examples/world-bank-gdp-request.json` (WDI, source ID 2, tối đa 4 mã quốc gia
và 26 năm). Lệnh trực tiếp trên máy có mạng và `curl`:

```sh
npm run evidence:worldbank -- --request examples/world-bank-gdp-request.json --raw outputs/evidence/gdp-raw.json --output outputs/evidence/gdp-dossier.json
```

Đường `--raw` dùng cache SHA-256 trong `outputs/cache/world-bank/` tối đa 24 giờ
và quota 20 request trong 24 giờ. Response phải qua chuẩn hóa trước khi vào
cache; file raw/dossier đầu ra vẫn dùng tên mới để không ghi đè bằng chứng cũ.

Nếu Node subprocess không ra mạng, có thể tải endpoint được ghi trong request
bằng `curl` riêng rồi nhập byte gốc qua `--raw-input`:

```sh
npm run evidence:worldbank -- --request examples/world-bank-gdp-request.json --raw-input outputs/evidence/world-bank-gdp-2020-raw.json --output outputs/evidence/world-bank-gdp-2020-dossier.json
npm run evidence:validate -- --input outputs/evidence/world-bank-gdp-2020-dossier.json
```

Mẫu đã tải hiện có 2 quan sát GDP năm 2020, không có claim được duyệt và vẫn
trả `needs_research`. `--raw-input` ghi nguồn là file nhập, vì CLI không thể tự
chứng minh URL mà file đó được tải từ. Đơn vị do người nhập khai báo; metadata,
định nghĩa GDP và quyền sử dụng của chỉ số phải được biên tập kiểm tra trước khi
đưa vào video. Xem [API World Bank](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392),
[cú pháp truy vấn](https://datahelpdesk.worldbank.org/knowledgebase/articles/898581-api-basic-call-structures)
và [điều khoản dữ liệu](https://www.worldbank.org/ext/en/legal/terms-conditions/datasets).

Mẫu **trái đất hình cầu** riêng đã được thêm tại
`examples/earth-globe-intro.json`. Nó dùng dữ liệu Natural Earth toàn thế giới
offline, không phải Google Earth/ảnh vệ tinh. Mẫu này chưa có frame browser thật;
kiểm tra nhanh một frame trước khi render cả 4 giây:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/earth-globe-intro.json --output outputs/earth-globe-frame.mp4 --start-frame 45 --frames 1
```

Xem [giới hạn và bằng chứng globe](docs/globe-prototype.md).

Ghép scene đã có từ các fixture cùng output/locale/map/audio thành project mới
(không tạo dữ liệu bản đồ hoặc thống kê):

```sh
npm run video:compose -- --base examples/style-a-variants.json --scenes examples/style-a-variants.json#focus,examples/style-c-variants.json#prism,examples/style-d-variants.json#editorial --id acd-composed --title "A C D composed" --output outputs/projects/acd-composed.json
npm run video:render:chunks -- --input outputs/projects/acd-composed.json --output outputs/acd-composed.mp4 --chunk-frames 50 --plan
```

Project mẫu được ghép có 400 frame (A 100, C 150, D 150), fade giữa scene,
`subtitlesEnabled: false`; validation và kế hoạch 8 chunk pass. Chưa có MP4
browser của project mới.

### Workflow biên tập mới (chưa hoàn tất)

Tạo brief từ dossier đã kiểm tra nguồn. Lệnh giữ nguyên câu claim được duyệt,
liệt kê nguồn và chia riêng short/long; nó không tự tạo lời dẫn hoặc duyệt
kịch bản. Dossier quá mỏng trả `needs_research`:

```sh
npm run scripts:draft -- --dossier examples/evidence-map-dossier.json
npm run scripts:draft -- --dossier path/to/reviewed-dossier.json --output outputs/brief.json
```

Ghép các đoạn giọng đọc được cấp quyền vào WAV và SRT theo thời lượng FFprobe
đo từ từng file. `manifest.json` cần `provider` (`imported` hoặc `macos_say`),
`targetSeconds`, `rights: {license, attribution}`, và `segments` chứa
`id`, `text`, cùng `assetPath` cho `imported`; `macos_say` cần `voiceId`.
SRT chỉ là file xuất, không tự bật phụ đề trên video.

```sh
FFPROBE_PATH="$PWD/tools/ffprobe" npm run speech:assemble -- --manifest path/to/speech-manifest.json --output-dir outputs/speech/my-project
FFPROBE_PATH="$PWD/tools/ffprobe" npm run workflow
npm run build
```

Workflow mở ở `http://127.0.0.1:4180`. API hiện có tạo/list dự án từ dossier,
xem evidence, brief, danh sách artifact và trạng thái QA. UI/API cũng nhận
quyết định duyệt claim, duyệt ContentProject theo hash, chuẩn bị hai edition,
lập kế hoạch render và bắt đầu render nền với `--resume`. File trạng thái,
`render-job.json`, `render.log` và `events.ndjson` nằm trong
`outputs/workflow/<projectId>/`. Xem lịch sử chuyển trạng thái tại
`GET /api/documentaries/<projectId>/events` hoặc tab `events` trong UI.
Trong bước “Duyệt claim”, mỗi phiếu hiển thị nguyên văn claim, giới hạn diễn
giải, nguồn, quyền sử dụng và số liệu được dẫn. Người duyệt chọn cả kết luận,
trạng thái và ghi lý do; chỉ phiếu có lựa chọn mới được gửi. Không có nút duyệt
hàng loạt hoặc trạng thái duyệt mặc định. Khoảng trống nghiên cứu mức cao vẫn
chặn brief ngay cả khi các claim đã được duyệt; cần bổ sung hoặc sửa dossier
có bằng chứng và duyệt lại theo phiên bản mới.
Phải có ít nhất 20 claim được duyệt từ ba nguồn để brief long sẵn sàng cho
bước biên tập. Duyệt kịch bản còn kiểm tra mỗi bản có đủ trích dẫn và lời dẫn
trong khoảng 1,5–4 từ/giây; đây là kiểm tra cấu trúc, không thay thế biên tập
nội dung. Kịch bản vẫn do người biên tập viết và duyệt.
Trong UI, nạp ContentProject JSON có scene và outline rồi sửa riêng lời dẫn,
tiêu đề, hook và `factRefs` ở tab short/long. `Lưu bản nháp và kiểm tra` ghi
phiên bản mới vào `outputs/workflow/<projectId>/script-draft-*.json`; bản nháp
chưa hoàn chỉnh vẫn lưu được và báo `needs_revision`. Khi báo
`ready_for_review`, người duyệt xác nhận bản nháp bằng bước `Duyệt kịch bản`.
API tương ứng: `POST/GET /api/documentaries/<projectId>/scripts/draft`; POST
nhận `{content, expectedSha256}` (`null` cho lần đầu) để tránh ghi đè bản
người khác đang sửa. Cần tự cung cấp ContentProject cấu trúc, scenes và
outlines; UI chưa tự viết kịch bản đầy đủ từ một chủ đề.
Máy sandbox hiện tại không cho bind localhost, nên UI chưa được duyệt bằng
browser trên máy đích.
`npm run build` đóng gói bốn HTML entry vào `outputs/site-build/`.

Chủ đề mẫu đang nghiên cứu: **xe điện Trung Quốc và Nhật Bản, số liệu 2025**.
Xem [dossier ứng viên](examples/china-japan-ev-2025-dossier.json) và
[ghi chú nguồn](docs/evidence/china-japan-ev-2025-research.md). Kiểm tra:

```sh
npm run evidence:validate -- --input examples/china-japan-ev-2025-dossier.json
npm run scripts:draft -- --dossier examples/china-japan-ev-2025-dossier.json
```

Workflow job `china-japan-ev-2025` hiện `prepared_for_render`. 25 claim được
Codex đối chiếu theo ủy quyền, sau đó ba gap mức cao được xử lý bằng quyết
định phạm vi có lưu hash; một gap về đồ họa vẫn ở mức trung. Short 90 giây và
long 15 phút đã có kịch bản khác nhau, factRef, giọng Linh, SRT/ASS và dự án
render. Audio QA tự động pass, render plan là 2.700/27.000 frame. **Chưa có
MP4:** Chrome đóng ngay ở one-frame probe trong sandbox, nên QA báo
`missing_mp4`. Xem [báo cáo sản xuất](docs/evidence/china-japan-ev-2025-production.md)
và [ContentProject](examples/china-japan-ev-2025-content.json). Duyệt nguồn
và kịch bản đều do AI làm theo ủy quyền, chưa có nghe/nhìn độc lập. IEA tính
BEV+PHEV; không dùng số NEV của CAAM như một đại lượng tương đương.

Tạo lại nội dung/manifest giọng và kiểm tra kế hoạch:

```sh
node scripts/create-china-japan-ev-content.mjs
FFPROBE_PATH="$PWD/tools/ffprobe" npm run documentary:render -- --dir outputs/documentaries/china-japan-ev-2025 --plan
```

Sau khi kịch bản đã được duyệt, không chạy lại generator rồi thay file đã
được workflow pin hash nếu chưa tạo phiên bản duyệt mới.

### Chạy dự án xe điện trên máy Mac khác

Clone repo, cài Node 24.13.1, FFmpeg/FFprobe và giọng tiếng Việt `Linh` của
macOS, rồi chạy trong thư mục repo:

```sh
npm ci
npx playwright install webkit
npm run speech:assemble -- --manifest examples/china-japan-ev-2025-speech-short.json --output-dir outputs/speech/china-japan-ev-2025/short
npm run speech:assemble -- --manifest examples/china-japan-ev-2025-speech-long.json --output-dir outputs/speech/china-japan-ev-2025/long
npm run documentary:prepare -- --content examples/china-japan-ev-2025-content.json --dossier examples/china-japan-ev-2025-dossier-reviewed.json --approval examples/china-japan-ev-2025-script-approval.json --short-template examples/japan-china-map.json --long-template examples/japan-china-wide.json --output-dir outputs/documentaries/china-japan-ev-2025
BROWSER_ENGINE=webkit npm run video:render -- --input outputs/documentaries/china-japan-ev-2025/short.json --output outputs/documentaries/china-japan-ev-2025/webkit-frame-probe.mp4 --frames 1 --video-only
BROWSER_ENGINE=webkit npm run documentary:render -- --dir outputs/documentaries/china-japan-ev-2025 --resume
npm run documentary:qa -- --dir outputs/documentaries/china-japan-ev-2025
```

`outputs/`, `node_modules/` và binary cài tại `tools/` không có trong Git.
Hai giọng WAV sẽ được tạo lại bằng `say` trên máy mới; script, dossier đã
duyệt và giấy chấp thuận kịch bản nằm trong `examples/`. Xem frame probe trước
khi chạy render dài. WebKit của Playwright dùng engine Safari nhưng không phải
ứng dụng Safari. Máy này đã crash khi mở cả Chrome và WebKit trước frame đầu;
lệnh trên chưa được xác nhận bằng MP4 trên máy khác.

`scripts:write` tạo bản nháp lời dẫn từ **nguyên văn** claim đã duyệt, với
factRef và sourceRef cho mỗi đoạn. Short lấy tối đa bốn claim, long lấy toàn bộ;
đây là các đoạn trích để biên tập, chưa phải kịch bản đủ 90 giây/15 phút:

```sh
npm run scripts:write -- --dossier path/to/reviewed-dossier.json --output outputs/editorial-draft.json
```

`speech:assemble` xuất cả `captions.srt` và `captions.ass` theo thời lượng từng
đoạn giọng. Manifest có thể đặt `rateWpm` cho `macos_say` và `targetSeconds`
trên từng đoạn; FFmpeg chỉ điều chỉnh tempo trong khoảng 0,7–1,3 lần để
khớp timeline. Nếu audio ngắn hơn đích trên 2 giây mà không có target từng
đoạn, lệnh dừng. Track cuối được hạ 2 dB trước QA true peak. Phụ đề vẫn tắt
mặc định trong renderer.
Workflow UI/API có bước `audio/assemble` riêng cho short/long. Nó chỉ nhận
manifest mà `segments` khớp ID và lời đọc trong ContentProject đã duyệt,
`targetSeconds` khớp edition, và `rights` khớp `voice.rights`. ContentProject
cần đặt `voice.assetPath` là
`outputs/speech/<projectId>/<edition>/voice.wav`. Sau khi ghép, lệnh prepare
sẽ đo lại file voice; test synthetic dùng tone để kiểm tra đường đi, không
chứng minh giọng đọc nội dung thật.
Manifest cần `output: {width, height}` khớp 1080×1920 cho short hoặc
1920×1080 cho long để ASS xuất đúng khung.

Kiểm tra âm thanh đầu ra (file WAV hoặc MP4 đã có audio) bằng loudness, true
peak và khoảng im lặng. Ngưỡng mặc định được ghi trong JSON; lệnh trả exit 2
nếu cần duyệt lại:

```sh
FFPROBE_PATH="$PWD/tools/ffprobe" npm run audio:qa -- --input outputs/speech/my-project/voice.wav --output outputs/speech/my-project/audio-qa.json
FFPROBE_PATH="$PWD/tools/ffprobe" npm run documentary:qa -- --dir outputs/documentaries/my-project
```

Phân tích này chưa thay thế kiểm tra nghe thực tế, đồng bộ lời với hình hoặc
kiểm tra phụ đề theo từng từ.
`documentary:qa` xác thực hash input/project/render, số frame, codec, kích
thước và audio của từng MP4; file thiếu được báo `missing_mp4`. Kết quả kỹ
thuật vẫn chờ duyệt nội dung/hình và benchmark trên máy đích.

### Hợp đồng short/long v1.1

`CreateProjectRequestSchema` xác thực yêu cầu đầu vào với cài đặt riêng cho
short 1080×1920/90–180 giây và long 1920×1080/900–1200 giây. Nó **không** giả
làm một kịch bản hoàn chỉnh. `ContentProjectSchema` xác thực hai edition đã biên
tập: scene liên tục, frame/duration, outline/script timing, nguồn→fact→factRef,
đầu ra và script khác nhau. Các kiểm tra này không chứng minh claim đúng hoặc
kịch bản đủ nội dung; research/editorial review vẫn phải hoàn tất.

```sh
npm run content:validate -- --input examples/content-request.json
```

Ví dụ trả `needs_research` vì chưa có fact/source. Chưa có adapter tự viết
kịch bản, voice hoặc video 150 giây/18 phút; không tạo số liệu hay narration giả.

Khi đã có `ContentProject` gồm hai kịch bản biên tập riêng và dossier được
duyệt, tạo `approval.json` với `projectId`, SHA-256 byte của file content và
dossier, `reviewer`, `approvedAt` ISO và `note` (ít nhất 10 ký tự). Lệnh sau
kiểm tra nguồn, fact, chữ ký duyệt theo hash, âm thanh và hai template bản đồ,
rồi tạo `short.json`, `long.json`, `manifest.json` trong thư mục mới:

```sh
npm run documentary:prepare -- --content path/to/content.json --dossier path/to/dossier.json --approval path/to/approval.json --short-template examples/japan-china-map.json --long-template examples/japan-china-wide.json --output-dir outputs/documentaries/my-project
npm run documentary:render -- --dir outputs/documentaries/my-project --plan
npm run documentary:render -- --dir outputs/documentaries/my-project
```

`documentary:render` gọi renderer chunk cho từng edition, ghi trạng thái riêng,
và hỗ trợ `--edition short` hoặc `--edition long` cùng `--resume`. Bản long lỗi
không xóa MP4 short đã xong. `prepare` chặn kế hoạch quá mỏng (short dưới 2
scene/segment, long dưới 10 scene/segment hoặc 3 chương, narration lặp/segment
quá 90 giây). Đây là cổng kỹ thuật tối thiểu, không thay thế duyệt chất lượng
kịch bản. Hiện chưa có ContentProject thật được duyệt để chạy hai MP4 đủ thời
lượng; bài test chỉ kiểm tra kế hoạch 2.700/27.000 frame mà không mở browser.

### Bố cục ngang thử nghiệm

`examples/japan-china-wide.json` có camera fit riêng cho 1920×1080: bản đồ bên
phải, vùng chữ/thẻ bên trái. Đây là project kỹ thuật 10 giây dùng để kiểm tra
renderer 16:9, **không phải** bản long editorial độc lập. Bounds test, schema,
Vite build và browser sample A/C/D pass. Bằng chứng và giới hạn:
[M1 wide report](docs/M1-wide-report.md). Có thể chạy lại ba frame:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/japan-china-wide.json --output outputs/wide-samples.mp4 --sample-frames 65,180,200
```

Các cảnh A→C và C→D dùng fade qua nền tối 8 frame. Browser sample đầu tiên
pass kỹ thuật nhưng cho thấy chữ và hai vị trí bản đồ chồng lên nhau ở giữa
crossfade; bản sửa đã pass browser sample và kiểm tra ảnh ở cả hai điểm nối,
xem [review chuyển cảnh](docs/M1-transition-review.md). `cut` vẫn hoạt động;
`slide` và `map-match` fail rõ ràng vì chưa triển khai. Có thể kiểm tra ngắn bằng:

```sh
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input examples/japan-china-wide.json --output outputs/wide-transition-recheck.mp4 --sample-frames 99,100,103,104,107,108,199,200,203,204,207,208
```

Không dùng `--resume` trên các chunk cũ sau khi thay source.

Hiệu năng SwiftShader hiện rất chậm cho mục tiêu 15–20 phút; xem
[ghi chú chi phí render](docs/render-cost-note.md) trước khi chạy long edition.
