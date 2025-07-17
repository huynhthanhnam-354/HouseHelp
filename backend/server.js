const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Kết nối MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',         // đổi thành user của bạn nếu khác
  password: '',         // đổi thành password của bạn nếu có
  database: 'househelp' // đúng tên database bạn đã tạo
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL Connected!');
});

// API: Lấy tất cả housekeepers (join với users để lấy tên và tính rating từ reviews)
app.get('/api/housekeepers', (req, res) => {
  const sql = `
    SELECT h.*, u.fullName, u.email, u.phone,
           COALESCE(AVG(r.rating), 0) as avgRating,
           COUNT(r.id) as reviewCount
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    LEFT JOIN reviews r ON h.id = r.housekeeperId
    GROUP BY h.id, h.userId, h.services, h.price, h.available, h.description, u.fullName, u.email, u.phone
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    // Thêm initials cho avatar
    const housekeepersWithInitials = results.map(hk => ({
      ...hk,
      initials: hk.fullName.split(' ').map(n => n[0]).join('').toUpperCase(),
      rating: parseFloat(hk.avgRating).toFixed(1) // Làm tròn rating đến 1 chữ số thập phân
    }));
    res.json(housekeepersWithInitials);
  });
});

// API: Đăng ký user mới
app.post('/api/register', (req, res) => {
  const { fullName, email, password, phone, role, idCardFront, idCardBack } = req.body;
  const sql = 'INSERT INTO users (fullName, email, password, phone, role, idCardFront, idCardBack) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [fullName, email, password, phone, role, idCardFront, idCardBack], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ id: result.insertId, fullName, email, phone, role, idCardFront, idCardBack });
  });
});

// API: Đăng nhập
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(results[0]);
  });
});

// API: Lấy thông tin user theo id
app.get('/api/users/:id', (req, res) => {
  db.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

// API: Đặt lịch
app.post('/api/bookings', (req, res) => {
  const { customerId, housekeeperId, service, date, status, price } = req.body;
  const sql = 'INSERT INTO bookings (customerId, housekeeperId, service, date, status, price) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [customerId, housekeeperId, service, date, status, price], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ id: result.insertId, customerId, housekeeperId, service, date, status, price });
  });
});

// API: Lấy lịch sử đặt lịch của user
app.get('/api/bookings/user/:id', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM bookings WHERE customerId = ? OR housekeeperId = ?', [userId, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// API: Tạo review cho housekeeper
app.post('/api/reviews', (req, res) => {
  const { housekeeperId, customerId, rating, comment } = req.body;
  const sql = 'INSERT INTO reviews (housekeeperId, customerId, rating, comment) VALUES (?, ?, ?, ?)';
  db.query(sql, [housekeeperId, customerId, rating, comment], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ id: result.insertId, housekeeperId, customerId, rating, comment });
  });
});

// API: Lấy reviews của housekeeper
app.get('/api/reviews/housekeeper/:id', (req, res) => {
  const housekeeperId = req.params.id;
  const sql = `
    SELECT r.*, u.fullName as customerName
    FROM reviews r
    JOIN users u ON r.customerId = u.id
    WHERE r.housekeeperId = ?
    ORDER BY r.createdAt DESC
  `;
  db.query(sql, [housekeeperId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

// API: Filter - Services (lấy từ bảng services)
app.get('/api/filters/services', (req, res) => {
  db.query('SELECT name FROM services', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results.map(r => r.name));
  });
});

// API: Filter - Ratings (tính từ bảng reviews)
app.get('/api/filters/ratings', (req, res) => {
  const sql = `
    SELECT DISTINCT FLOOR(AVG(r.rating)) AS min_rating 
    FROM housekeepers h
    LEFT JOIN reviews r ON h.id = r.housekeeperId
    WHERE r.rating IS NOT NULL
    GROUP BY h.id
    HAVING min_rating > 0
    ORDER BY min_rating DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    const ratings = results.map(r => r.min_rating).filter((v, i, a) => a.indexOf(v) === i);
    // Thêm rating 5+ nếu có housekeeper có rating >= 5
    if (ratings.includes(5)) {
      ratings.unshift(5);
    }
    res.json(ratings);
  });
});

// API: Filter - Price Range
app.get('/api/filters/price-range', (req, res) => {
  db.query('SELECT MIN(price) AS min_price, MAX(price) AS max_price FROM housekeepers', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results[0]);
  });
});

// API: Filter - Availability
app.get('/api/filters/availability', (req, res) => {
  db.query('SELECT DISTINCT available FROM housekeepers', (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results.map(r => r.available));
  });
});

app.listen(5000, () => console.log('Server running on port 5000'));
