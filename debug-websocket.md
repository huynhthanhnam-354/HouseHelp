# Debug WebSocket Connection

## Cách kiểm tra WebSocket trong Network Tab:

1. Mở Developer Tools (F12)
2. Chuyển sang tab **Network**
3. Filter bằng **WS** (WebSocket)
4. Đăng nhập housekeeper
5. Bạn sẽ thấy:
   - ✅ Có connection tới `localhost:5000` với status 101 (Switching Protocols)
   - ❌ Không có connection hoặc status khác 101

## Test thủ công WebSocket:

Chạy lệnh sau trong Console của browser:

```javascript
// Test WebSocket connection
const testSocket = io('http://localhost:5000');
testSocket.on('connect', () => {
    console.log('✅ Test WebSocket connected!');
    testSocket.emit('join', { userId: 1, role: 'housekeeper' });
});
testSocket.on('connect_error', (error) => {
    console.log('❌ Test WebSocket failed:', error);
});
```

## Kiểm tra backend có đang chạy không:

Mở terminal và chạy:
```bash
curl http://localhost:5000/api/debug/active-users
```

Nếu trả về JSON thì backend đang chạy, nếu lỗi thì backend chưa start.
