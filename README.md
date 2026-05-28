# Fairy House 🌸

Website giới thiệu và bán phụ kiện xinh Kitty, móc khoá và quà lưu niệm dễ thương.

## Tính năng
- Danh sách sản phẩm "Hàng Mới" cập nhật liên tục.
- Giao diện hồng Pastel ngọt ngào, tối ưu cho di động.
- Hiệu ứng trái tim bay lãng mạn.
- Nút gọi điện và chat Zalo đặt hàng nhanh chóng.

## Cách sử dụng
Mở file `index.html` bằng trình duyệt để xem website.

## Thông tin cửa hàng
- **Địa chỉ:** Chợ Mỹ Luông, An Giang
- **SĐT/Zalo:** 0378 791 667

## 🤖 Tích hợp AI Chatbox (Gemini 2.5 Flash)

Hệ thống trợ lý AI "Fairy" được cấu hình gọi trực tiếp **Google Gemini API** (sử dụng model **gemini-2.5-flash** miễn phí) ngay từ trình duyệt của khách hàng, loại bỏ sự phụ thuộc vào proxy trung gian (9Router/Cloudflare Tunnel).

### Cơ chế hoạt động:
1. **Xoay vòng 4 API Key (Round-Robin)**: Để giảm thiểu giới hạn lưu lượng (rate limit), mỗi tin nhắn gửi đi sẽ luân phiên sử dụng tuần tự 1 trong 4 API key của cửa hàng.
2. **Tự động chuyển đổi khi gặp lỗi (Auto-Failover)**: Nếu một key bị lỗi (như lỗi rate limit 429 hoặc lỗi kết nối), hệ thống tự động nhảy sang key kế tiếp để thử lại ngay lập tức (tối đa 4 lần thử với 4 key) để đảm bảo trải nghiệm thông suốt cho khách hàng.
3. **Thanh giám sát trạng thái (Key Monitor)**:
   - Hiển thị 4 chấm tròn nhỏ ở góc trên bên phải khung chat (cạnh nút ✕).
   - Màu sắc chấm đại diện cho trạng thái của 4 key tương ứng:
     - ⚪ **Màu xám**: Đang chờ (`idle`).
     - 🟡 **Vàng nhấp nháy**: Đang gửi request xử lý (`active`).
     - 🟢 **Màu xanh lá**: Lần gọi gần nhất thành công (`success`).
     - 🔴 **Màu đỏ**: Gặp lỗi hoặc hết hạn mức (`error`).
   - Đã ẩn hoàn toàn các nhãn văn bản và tooltip hover để giữ giao diện tối giản nhất.

### Danh sách 4 API Key sử dụng:
Các API key đã được chuyển hoàn toàn vào **Vercel Environment Variables** (`GEMINI_KEY_1`, `GEMINI_KEY_2`, `GEMINI_KEY_3`, `GEMINI_KEY_4`) để đảm bảo bảo mật tuyệt đối, tránh bị lộ khi đưa mã nguồn lên GitHub.

