# 🐛 Debug Guide: Notification System không hoạt động

## Vấn đề hiện tại:
**Khi housekeeper reject booking, customer không nhận được thông báo**

## 🔧 Debug Tools đã tạo:

### 1. **TestNotification Component** (góc phải màn hình)
- 📑 Click để expand
- 🔍 Check Active Users - xem ai đang online
- 🗄️ DB Structure - kiểm tra database structure
- Test gửi notification đến current user hoặc Customer #4

### 2. **DebugBookingFlow Component** (góc trái màn hình)
- 📝 Create Test Booking
- ✅ Confirm Booking 
- ❌ Reject Booking
- 📊 Check Status

## 🧪 Step-by-step Testing:

### Bước 1: Kiểm tra WebSocket Connection
1. **Mở browser** → Login với account Customer
2. **Click TestNotification** → expand (📑)
3. **Click "🔍 Active Users"** 
4. **Kiểm tra:**
   - Current user có xuất hiện trong Active Users không?
   - User ID có đúng không?

### Bước 2: Kiểm tra Database Structure
1. **Click "🗄️ DB Structure"** trong TestNotification
2. **Kiểm tra:**
   - Bảng `bookings` có column `customerId` không?
   - `customerId` có đúng là foreign key đến `users.id` không?
   - Sample bookings có data đúng không?

### Bước 3: Test Notification Flow End-to-End
1. **Mở 2 browser/tab:**
   - Tab 1: Login Customer (role: customer)
   - Tab 2: Login Housekeeper (role: housekeeper)

2. **Tab Customer:**
   - Kiểm tra Active Users có customer ID
   - Note down Customer ID

3. **Tab Housekeeper:**
   - Click DebugBookingFlow → "📝 Create Test Booking"
   - Copy Booking ID
   - Click "❌ Reject Booking"
   - **Kiểm tra backend console** có log:
     ```
     ❌ Sending rejection notification to customer: X
     Notification sent successfully: true/false
     ```

4. **Tab Customer:**
   - Kiểm tra notification bell có số badge không?
   - Check browser console có log "🔔 Received notification:"?
   - Vào Customer Dashboard xem có notification không?

## 🔍 Các điểm cần kiểm tra:

### A. WebSocket Connection Issues:
```javascript
// Browser Console - Customer side
// Nên thấy:
// "Connected to notification service"
// "User X (customer) joined"
```

### B. User ID Type Mismatch:
```javascript
// Backend Console - khi reject booking
// Nên thấy:
// "❌ Sending rejection notification to customer: 4"
// "✅ Notification sent successfully: true"

// Nếu thấy:
// "❌ User 4 not found in active users"
// => Vấn đề với user ID mapping
```

### C. Database Structure:
```sql
-- Nên có structure như thế này:
bookings.customerId -> users.id (trực tiếp)
bookings.housekeeperId -> users.id (trực tiếp)
```

## 🚨 Các vấn đề có thể gặp:

### 1. **Customer không online**
- Giải pháp: Đảm bảo customer đã login và có WebSocket connection

### 2. **User ID type mismatch** 
- customerId trong DB là string, activeUsers dùng number
- Backend đã handle với cả string và number keys

### 3. **Database structure khác với expected**
- File househelp.sql có thể khác với DB thực tế
- Cần check actual structure với API `/api/debug/db-structure`

### 4. **Notification Service không hoạt động**
- Check browser console có error gì không
- Test với TestNotification component

## 📋 Checklist Debug:

- [ ] Customer WebSocket connected
- [ ] Customer xuất hiện trong Active Users
- [ ] Database structure đúng
- [ ] Booking creation thành công
- [ ] Housekeeper reject API hoạt động
- [ ] Backend log "Notification sent successfully: true"
- [ ] Customer browser console có "🔔 Received notification"
- [ ] Notification bell có badge số
- [ ] Customer Dashboard hiển thị notification

## 🎯 Next Steps nếu vẫn không hoạt động:

1. **Check network connectivity** giữa frontend-backend
2. **Verify authentication** - user có đúng role không?
3. **Check CORS settings** cho WebSocket
4. **Database connection issues**
5. **Frontend NotificationContext** có subscribe đúng không?

---

**🚀 Sau khi fix xong, test với scenario thực tế:**
1. Customer đặt lịch thật
2. Housekeeper vào dashboard reject
3. Customer nên nhận thông báo real-time

