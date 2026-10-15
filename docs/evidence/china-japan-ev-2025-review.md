# Đối chiếu nguồn cho xe điện Trung Quốc và Nhật Bản

Ngày 2026-10-15. Người dùng đã ủy quyền cho Codex duyệt claim mà không cần
chờ xác nhận. Đây là **đối chiếu nguồn do AI thực hiện**, không phải chữ ký
của một biên tập viên độc lập hoặc tư vấn pháp lý.

## Kết quả

- 25/25 claim trong dossier ứng viên được đánh dấu `supported` và `approved`
  sau khi đối chiếu với nguồn gốc. Quyết định, lý do của từng claim và hash
  đầu vào nằm trong [review JSON](china-japan-ev-2025-review.json).
- Phiên bản bất biến của workflow là
  `outputs/workflow/china-japan-ev-2025/dossier-reviewed-1.json`, SHA-256
  `d2063a5e924a88d7c320932c1c2501e9d5060b6226573f1ebb78dd3dbfaa5b25`.
  Validation xác nhận 25 approved facts, 14 observations và 4 gaps.
- Brief vẫn báo `needs_research` vì còn gap mức cao. Bản nháp excerpt chỉ
  chép claim được duyệt, chưa phải lời dẫn hoàn chỉnh.

## Đường dẫn đối chiếu

| Nhóm claim | Nguồn trực tiếp | Giới hạn bắt buộc |
| --- | --- | --- |
| Định nghĩa, doanh số Trung Quốc/Nhật, HEV và sạc | [IEA, Trends in electric cars](https://www.iea.org/reports/global-ev-outlook-2026/trends-in-electric-cars) | Electric cars = BEV + PHEV; HEV thông thường là nhóm khác. Giữ các mốc “hơn”, “dưới”, “gần”. |
| Sản xuất, xuất khẩu và cell pin | [IEA, Manufacturing and trade](https://www.iea.org/reports/global-ev-outlook-2026/manufacturing-and-trade) | Sản xuất và xuất khẩu khác doanh số nội địa hoặc doanh số ở nước nhận. |
| Chi phí và LFP | [IEA, Cutting through the noise (PDF)](https://iea.blob.core.windows.net/assets/ce1ffa54-b592-4bb2-83c7-4eb000b21be4/WhyareelectriccarsmadeinChinasomuchcheaperthenthosemadeinothercountries.pdf) | So sánh chi phí sản xuất với các vùng được nêu trong PDF; không suy rộng thành mọi mẫu xe Trung–Nhật. |
| 16,49 triệu NEV | [Cổng Chính phủ Trung Quốc dẫn CAAM](https://english.www.gov.cn/archive/statistics/202601/14/content_WS6967432ec6d00ca5f9a088ff.html) | Chỉ nêu như một chỉ tiêu CAAM riêng; không vẽ chung thang đo với IEA electric cars. |
| Ý định mua và sạc tại nhà | [JAMA, khảo sát xe du lịch 2025](https://www.jama.or.jp/release/news_release/2026/3582/) | Đây là khảo sát, không phải doanh số; 46% gồm cả HEV, PHEV, BEV, FCEV. |

## Việc còn chặn bản phát hành

1. Chỉ dùng đồ họa tự tạo từ số liệu có dẫn nguồn. Không chép ảnh, biểu đồ,
   logo hoặc nguyên văn từ trang CAAM/JAMA; quyền tái sử dụng của các vật liệu
   này chưa được xác nhận.
2. Kịch bản phải giới hạn ở thị trường, sản xuất, chi phí theo IEA và khảo sát
   JAMA. Nếu muốn kết luận về lợi nhuận, công nghệ hay chiến lược từng hãng,
   cần bổ sung nguồn độc lập. Gap này hiện vẫn mức cao.
3. Tạo và kiểm tra hai kịch bản khác nhau, giọng đọc, hình động và MP4 thực;
   chưa có phê duyệt kịch bản hoặc QA nghe/nhìn.
