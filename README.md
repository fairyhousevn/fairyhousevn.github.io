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

## 🤖 Tích hợp AI Chatbox (9Router API)

Hệ thống trợ lý AI "Fairy" được cấu hình gọi trực tiếp đến **9Router API** (sử dụng model **chatboxweb**) ngay từ trình duyệt của khách hàng, giúp tránh hoàn toàn các lỗi giới hạn lưu lượng (rate limit 429) do trùng IP dùng chung trên serverless proxy.

### Cơ chế hoạt động:
1. **Hybrid Key Dispenser**: API key của 9Router được lưu trữ an toàn trong Vercel Environment Variables. Khi chatbox khởi tạo, trình duyệt gửi một request `GET /api/get-config` để nhận cấu hình cùng API key đã được mã hóa đơn giản (Base64 + đảo chuỗi).
2. **Giải mã & Gọi trực tiếp tại Runtime**: Trình duyệt khách tự giải mã key và thực hiện gọi trực tiếp tới endpoint của 9Router. Nhờ đó, request đi từ chính IP riêng biệt của mỗi khách hàng thay vì IP dùng chung của Vercel server, tránh tình trạng bị chặn hàng loạt.
3. **Tự động thử lại (Auto-Retry)**: Nếu cuộc gọi API gặp sự cố mạng hoặc quá tải tạm thời, hệ thống sẽ tự động thử lại 2 lần với thuật toán giãn cách thời gian để đảm bảo phản hồi thông suốt.

### Cấu hình biến môi trường trên Vercel:
- `NINE_ROUTER_KEY`: API Key của 9Router (dạng `sk-...`).
- `NINE_ROUTER_URL`: Endpoint API của 9Router (ví dụ: `https://rlf2des.abc-tunnel.us/v1/chat/completions`).

