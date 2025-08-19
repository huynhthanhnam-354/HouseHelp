# Hệ thống Thông báo HouseHelp - Hướng dẫn Test và Debug

## Tổng quan
Đã hoàn thiện hệ thống thông báo hai chiều giữa Customer và Housekeeper, tương tự như Grab:

### Luồng thông báo:
1. **Customer đặt lịch** → **Housekeeper nhận thông báo**
2. **Housekeeper confirm/reject** → **Customer nhận thông báo**

## Các thành phần đã được tạo/cập nhật:

### 1. Frontend
- ✅ **CustomerDashboard** (`src/pages/CustomerDashboard.jsx`) - Dashboard cho customer xem booking history và notifications
- ✅ **Navigation Updates** - Thêm Dashboard link cho customer trong header dropdown
- ✅ **NotificationBell Updates** - Chuyển hướng customer đến dashboard khi click notification
- ✅ **TestNotification** component - Tool debug notification system

### 2. Backend  
- ✅ **Enhanced Logging** - Thêm console.log để debug notification sending
- ✅ **API Endpoints** - Đã có sẵn `/api/bookings/user/:id` để lấy booking history
- ✅ **WebSocket System** - Đã có sẵn notification system với `sendNotificationToUser`

### 3. Routing
- ✅ **Customer Dashboard Route** - `/customer/dashboard`
- ✅ **Housekeeper Dashboard Route** - `/housekeeper/dashboard` (đã có sẵn)

## Cách test hệ thống:

### Test cơ bản:
1. **Khởi động backend:** `node server.js`
2. **Khởi động frontend:** `npm start`
3. **Đăng nhập với 2 account:**
   - Account 1: Customer 
   - Account 2: Housekeeper
4. **Test flow:**
   - Customer đặt lịch
   - Housekeeper vào dashboard, confirm/reject
   - Customer kiểm tra notification bell và dashboard

### Debug Tools:
1. **TestNotification Component** - Hiển thị ở góc phải màn hình (development only)
   - Test gửi notification đến Customer #4
   - Test gửi notification đến current user
   
2. **Browser Console** - Kiểm tra:
   - WebSocket connection logs
   - Notification received logs
   - API response logs

3. **Backend Console** - Kiểm tra:
   - `🎉 Sending confirmation notification to customer: X`
   - `❌ Sending rejection notification to customer: X`
   - `✅ Notification sent successfully: true/false`

## Các vấn đề có thể gặp và cách khắc phục:

### 1. Customer không nhận được thông báo:
**Nguyên nhân có thể:**
- WebSocket connection không hoạt động
- User ID mapping không đúng
- Customer không online

**Cách check:**
- Kiểm tra backend console có log `Notification sent successfully: false`?
- Kiểm tra `activeUsers` trong backend có chứa customer ID không?
- Thử dùng TestNotification component để test trực tiếp

### 2. Notification hiển thị nhưng không navigate đúng:
**Cách khắc phục:**
- Kiểm tra NotificationBell.jsx đã update logic chuyển hướng chưa
- Đảm bảo Customer Dashboard route đã được add vào App.jsx

### 3. Database structure mismatch:
**Lưu ý:** 
- File `househelp.sql` có schema khác với implementation thực tế
- Database hiện tại có các field: `service`, `date`, `time`, `customerName` trực tiếp trong `bookings` table
- `customerId` và `housekeeperId` trong `bookings` là user IDs trực tiếp

## URLs quan trọng:
- Customer Dashboard: `http://localhost:3000/customer/dashboard`
- Housekeeper Dashboard: `http://localhost:3000/housekeeper/dashboard`
- Test API: `http://localhost:5000/api/test-notification`

## API Endpoints mới/cập nhật:
- `GET /api/bookings/user/:id` - Lấy booking history của user
- `POST /api/test-notification` - Test gửi notification (development)
- `POST /api/bookings/:id/confirm` - Housekeeper confirm booking (đã có logging)
- `POST /api/bookings/:id/reject` - Housekeeper reject booking (đã có logging)

## Cải thiện tiếp theo có thể làm:
1. Real-time status updates trong customer dashboard
2. Push notifications cho mobile
3. Email notifications backup
4. Notification history với pagination
5. Mark all as read functionality
6. Sound notifications
7. Notification preferences settings

