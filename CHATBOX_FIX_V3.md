# 🔧 Chatbox Fix V3 - Logic Gửi Liên Tục

## 📋 Thay Đổi Chính

**Bỏ logic retry 2 lần cũ**, thay bằng **logic gửi liên tục cứ 3 giây một lần**.

## ✅ Logic Mới

### Cách Hoạt Động
```
Gửi request lần 1 → Chờ 3 giây
Gửi request lần 2 → Chờ 3 giây
Gửi request lần 3 → Chờ 3 giây
...
Gửi request lần 50 → Hết 150 giây

Nếu vẫn không có phản hồi → Báo lỗi
```

### Thông Số
- **Tổng thời gian:** 150 giây (2.5 phút)
- **Số lần gửi:** 50 lần
- **Khoảng cách:** 3 giây giữa mỗi lần
- **Typing indicator:** Hiển thị liên tục trong suốt 150 giây

### Lý Do
- Server 9Router hay bị mất kết nối (tunnel unreachable)
- Server restart tầm **120 giây**
- 150 giây đủ để đợi server restart và kết nối lại
- Mỗi request mới có thể "wake up" server, tăng khả năng kết nối thành công

## 📊 So Sánh

| Phiên bản | Logic | Thời gian | Số lần gửi |
|-----------|-------|-----------|------------|
| **V1** | Chờ 60s → Retry → Chờ 60s | 125s | 2 lần |
| **V2** | Chờ tối thiểu 60s mỗi lần | 125s | 2 lần |
| **V3** | Gửi liên tục 3s một lần | 150s | 50 lần |

## 🎯 Ưu Điểm V3

✅ **Tăng khả năng kết nối:** 50 lần gửi thay vì 2 lần  
✅ **"Wake up" server:** Mỗi request có thể kích hoạt server 9Router  
✅ **Đủ thời gian cho server restart:** 150 giây > 120 giây (thời gian restart)  
✅ **Typing indicator:** Hiển thị liên tục, người dùng biết hệ thống đang hoạt động

## 🧪 Test

1. **Clear cache:** Ctrl + Shift + R
2. **Gửi tin nhắn**
3. **Quan sát:**
   - Typing indicator hiển thị liên tục
   - Console log: `[9Router API] Lượt gửi 1/50 (3s/150s)...`
   - Cứ 3 giây xuất hiện log mới
   - Nếu có phản hồi → Hiển thị kết quả ngay
   - Nếu hết 150 giây → Báo lỗi

## 📝 Code Changes

**File:** `chatbox.js`  
**Hàm:** `callGemini()`  
**Dòng:** 516-697

**Thay đổi chính:**
```javascript
// CŨ: Retry 2 lần, mỗi lần chờ 60 giây
let retries = 1;
while (retries >= 0) { ... }

// MỚI: Gửi liên tục 50 lần, mỗi lần cách 3 giây
const MAX_ATTEMP