# Xe điện Trung Quốc và Nhật Bản — hồ sơ nghiên cứu sơ bộ

**Cập nhật 2026-10-15:** Người dùng đã ủy quyền Codex đối chiếu và duyệt
25/25 claim trong một phiên bản workflow mới. Xem [báo cáo duyệt](china-japan-ev-2025-review.md).
Phần dưới mô tả dossier ứng viên ban đầu; bản đã duyệt vẫn `needs_research`
vì các gap mức cao chưa được đóng.

Ngày thu thập: 2026-10-15. Giai đoạn so sánh: năm dương lịch 2025. Góc mặc
định: thị trường và doanh số. Đây là **25 claim ứng viên cần người biên tập
duyệt**, không phải kịch bản hoặc video hoàn chỉnh. Dossier có 14 quan sát,
4 nguồn cục bộ đã kiểm tra SHA-256 và 4 khoảng trống nghiên cứu.

## Định nghĩa bắt buộc khi biên tập

- IEA dùng “electric cars” cho BEV (xe chạy pin) và PHEV (hybrid sạc ngoài).
  HEV thông thường được báo cáo riêng. [IEA, Trends in electric cars](https://www.iea.org/reports/global-ev-outlook-2026/trends-in-electric-cars).
- CAAM báo cáo “new energy vehicles” (NEV). Con số NEV của CAAM và số
  “electric cars” của IEA có phạm vi khác nhau; **không đặt chúng vào cùng một
  biểu đồ như hai phép đo tương đương** trước khi đối chiếu định nghĩa, phạm vi
  xe và phương pháp. [Cổng Chính phủ Trung Quốc dẫn CAAM](https://english.www.gov.cn/archive/statistics/202601/14/content_WS6967432ec6d00ca5f9a088ff.html).
- JAMA đo **ý định mua trong khảo sát**, không phải doanh số đăng ký thực tế.
  Nhóm “electrified” trong khảo sát gồm cả HEV, PHEV, BEV và FCEV.
  [JAMA, khảo sát thị trường xe du lịch 2025](https://www.jama.or.jp/release/news_release/2026/3582/).

## Trục kể chuyện đề xuất để duyệt

| Bản | Trọng tâm | Claim ứng viên |
| --- | --- | --- |
| Short 90 giây | Định nghĩa → chênh lệch doanh số và thị phần → vai trò HEV tại Nhật → kết luận có giới hạn | `definition-iea-electric-car`, `china-share-2025`, `japan-share-2025`, `japan-hev-share-2025` |
| Long 15 phút, chương thị trường | Doanh số, thị phần, tăng trưởng và cách đo | `global-sales-2025`, `china-sales-2025`, `japan-sales-2025`, `china-growth-2025`, `china-caam-nev-sales-2025` |
| Long, chương công nghiệp | Sản xuất, xuất khẩu, pin, chi phí | `china-production-2025`, `china-exports-2025`, `china-battery-share-2025`, `china-scale-cost`, `china-lfp-cost` |
| Long, chương Nhật Bản | HEV, khảo sát người mua, hạ tầng sạc, giới hạn suy luận | `japan-hev-share-2025`, `japan-jama-intent-2025`, `japan-jama-home-charging`, `japan-charging-constraint` |

IEA ước tính Trung Quốc bán hơn 13 triệu xe điện năm 2025, gần 55% doanh số
ô tô mới; Nhật Bản chỉ nhỉnh hơn 100 nghìn xe, dưới 3%, còn HEV thông thường
chiếm khoảng một phần ba. Đây là **số trong báo cáo IEA**, chưa được người
biên tập duyệt để đưa vào lời dẫn. [IEA, Trends in electric cars](https://www.iea.org/reports/global-ev-outlook-2026/trends-in-electric-cars).

Nguồn chi phí của IEA nêu quy mô nhà máy, chi phí pin, kinh nghiệm sản xuất và
hóa học LFP là các yếu tố chi phí; báo cáo cũng nói hỗ trợ chính sách ban đầu
không giải thích toàn bộ chênh lệch giá. Không suy diễn từ đó rằng mọi xe của
Trung Quốc rẻ hơn mọi xe của Nhật. [IEA, Cutting through the noise](https://iea.blob.core.windows.net/assets/ce1ffa54-b592-4bb2-83c7-4eb000b21be4/WhyareelectriccarsmadeinChinasomuchcheaperthenthosemadeinothercountries.pdf).

## Việc còn phải duyệt trước kịch bản và render

1. Người biên tập kiểm tra từng claim tiếng Việt với đúng đoạn nguồn tiếng
   Anh/Nhật, ý nghĩa mốc “hơn”, “dưới”, “khoảng”, và các cách định nghĩa xe.
2. Kiểm tra quyền dùng đồ thị, ảnh xe, logo và tài liệu của nguồn. IEA báo
   cáo CC BY 4.0; trang Chính phủ Trung Quốc cấm đăng lại nội dung khi chưa
   được phép; quyền tái sử dụng hình/text JAMA chưa được xác nhận. Chỉ dùng
   những phát biểu sự kiện có dẫn nguồn, không đưa bản chụp trang vào MP4.
3. Bổ sung nguồn về chiến lược các hãng Nhật, lợi nhuận, giá xe và tác động
   hạ tầng nếu muốn kết luận sâu trong bản 15 phút. Những điều này chưa được
   chứng minh bởi dossier hiện tại.
4. Sau duyệt, chạy `npm run evidence:validate -- --input
   examples/china-japan-ev-2025-dossier.json`, lưu bản dossier đã duyệt qua
   workflow, rồi mới viết và duyệt hai kịch bản riêng.

Không có claim nào trong dossier hiện được đánh dấu `approved`. `scripts:draft`
trả `needs_research`; chưa có TTS, phụ đề đã căn, scene được duyệt hay MP4 cho
chủ đề này.
