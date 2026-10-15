# Xe điện Trung Quốc và Nhật Bản — tiến độ sản xuất

Ngày 2026-10-15. Người dùng cho phép dùng nguồn tổng hợp và AI viết nội dung,
không yêu cầu vòng kiểm chứng nghiêm ngặt hơn. Các câu định lượng vẫn giữ
nguồn và cách đo để tránh so sai chỉ tiêu.

## Nội dung và quyết định phạm vi

- `dossier-reviewed-2.json` trong `outputs/workflow/china-japan-ev-2025/`
  có 25 claim đã duyệt, ba gap mức cao được giải quyết bằng quyết định phạm vi
  có ghi lý do và hash ở `docs/evidence/china-japan-ev-2025-scope-review.json`.
  Một gap mức trung về đồ họa vẫn được giữ. Brief báo `ready_for_writing`.
- [ContentProject](../../examples/china-japan-ev-2025-content.json) chứa
  short 90 giây, 2 đoạn, 270 từ theo `Intl.Segmenter`; long 900 giây,
  10 đoạn, 2.105 từ. Lời dẫn do Codex viết lại từ claim đã duyệt, có factRef
  trên từng đoạn; không chép nguyên văn prose/đồ họa nguồn. Cổng schema,
  pacing, citation và 20-claim/3-source đều qua. Người duyệt kịch bản được
  ghi là AI biên tập theo ủy quyền của người dùng, không phải người độc lập.
- Biểu đồ so sánh Trung Quốc-Nhật chỉ dùng BEV+PHEV theo IEA. CAAM NEV là
  mốc riêng, không tính chung. Kịch bản không dự báo lợi nhuận hay tương lai
  từng hãng. Phụ đề render tắt; SRT/ASS được xuất làm artifact.

## Giọng và render

- Giọng `Linh` của macOS `say` tạo hai track tại
  `outputs/speech/china-japan-ev-2025/{short,long}/voice.wav` theo manifest
  trong `examples/`. Mỗi đoạn được điều chỉnh tempo có giới hạn để khớp
  45/90 giây, sau đó hạ 2 dB cho đủ khoảng cách true peak.
- QA âm thanh tự động: short 90 giây, -19,51 LUFS, -2,33 dBTP; long 900 giây,
  -19,54 LUFS, -2,41 dBTP. Không phát hiện khoảng im lặng trên 2 giây.
  Chưa có nghe duyệt chất lượng phát âm/tự nhiên hoặc xác nhận quyền phát hành
  giọng macOS ngoài phạm vi dùng cục bộ.
- `outputs/documentaries/china-japan-ev-2025/` có `short.json`, `long.json`
  và manifest hash-bound. `renderPlan` tạo kế hoạch 2.700 frame/18 chunk và
  27.000 frame/180 chunk. Đây là kế hoạch, chưa phải MP4.
- Hai project hiện chỉ có voice; nhạc nền và SFX của riêng chủ đề này chưa
  được chọn/ghép. Engine hỗ trợ SFX có nguồn gốc và cue frame, nhưng không
  tự thêm âm thanh chưa được lựa chọn vào bản phát hành.
- One-frame browser probe bằng Chrome hệ thống thất bại tại
  `render-run-ZIWWOP/report.json`: browser bị đóng ngay sau launch, chưa có
  frame. Playwright mặc định thiếu headless-shell; bản Chromium trỏ tay không
  tồn tại ở đường dẫn báo. QA documentary báo `missing_mp4` cho cả hai bản.
- Thử Safari ngày 2026-10-15: `/usr/bin/safaridriver -p 4444` thoát mã 1;
  `safaridriver --enable` yêu cầu mật khẩu. WebKit 18.4 của Playwright được
  tải và giải nén tạm tại `/private/tmp/map-video-playwright-browsers`, nhưng
  phép mở trang `about:blank` cũng `SIGABRT` trong `_RegisterApplication`.
  Probe `BROWSER_ENGINE=webkit` một frame thất bại trước khi chụp ảnh;
  xem `render-run-6yT4Ii/report.json`. Chưa có MP4.
- Full `npm test`: 100 pass, một localhost skip, 0 fail; Vite build bốn entry
  pass. Dossier v2 kiểm tra hash/schema pass với 25 fact duyệt và một gap trung.

## Tiếp tục trên máy chạy browser được

```sh
FFPROBE_PATH="$PWD/tools/ffprobe" npm run documentary:render -- --dir outputs/documentaries/china-japan-ev-2025 --plan
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run video:render -- --input outputs/documentaries/china-japan-ev-2025/short.json --output outputs/documentaries/china-japan-ev-2025/short-frame-probe.mp4 --sample-frames 0 --video-only
WEBGL_BACKEND=swiftshader FFPROBE_PATH="$PWD/tools/ffprobe" CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run documentary:render -- --dir outputs/documentaries/china-japan-ev-2025 --resume
# WebKit (engine Safari) trong phiên macOS cho phép browser chạy:
npx playwright install webkit
BROWSER_ENGINE=webkit FFPROBE_PATH="$PWD/tools/ffprobe" npm run video:render -- --input outputs/documentaries/china-japan-ev-2025/short.json --output outputs/documentaries/china-japan-ev-2025/webkit-frame-probe.mp4 --frames 1 --video-only
FFPROBE_PATH="$PWD/tools/ffprobe" npm run documentary:qa -- --dir outputs/documentaries/china-japan-ev-2025
```

Trước khi render toàn bộ, xem trực quan frame đầu, giữa, cuối của các dạng
scene để bắt lỗi chữ, bản đồ và tỷ lệ. Render 15 phút có thể kéo dài nhiều giờ
theo tốc độ benchmark cũ; cần tiếp tục bằng chunk/resume. Sau MP4 phải nghe
đầu, giữa, cuối của hai track và kiểm tra hình, tiếng, nguồn trên màn hình.
