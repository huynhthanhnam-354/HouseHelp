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

// API: Lấy tất cả housekeepers (filter dịch vụ theo bảng housekeeper_services, OR logic)
app.get('/api/housekeepers', (req, res) => {
  const { services, minRating, maxPrice, available } = req.query;
  
  // Nếu có filter services, trước tiên cần chuyển tên service thành serviceId
  if (services) {
    const serviceNames = services.split(",");
    const getServiceIdsSql = `SELECT id FROM services WHERE name IN (${serviceNames.map(() => "?").join(",")})`;
    
    db.query(getServiceIdsSql, serviceNames, (err, serviceResults) => {
      if (err) return res.status(500).json({ error: err });
      
      console.log('ServiceNames:', serviceNames);
      console.log('ServiceResults:', serviceResults);
      
      const serviceIds = serviceResults.map(s => s.id);
      console.log('ServiceIds:', serviceIds);
      
      if (serviceIds.length === 0) {
        console.log('No services found, returning empty array');
        return res.json([]); // Không có service nào match
      }
      
      // Tiếp tục với query chính
      executeMainQuery(serviceIds);
    });
  } else {
    // Không có filter services, query bình thường
    executeMainQuery(null);
  }
  
  function executeMainQuery(serviceIds) {
    let sql = `
      SELECT h.*, u.fullName, u.email, u.phone,
             COALESCE(AVG(r.rating), 0) as avgRating,
             COUNT(r.id) as reviewCount
      FROM housekeepers h
      JOIN users u ON h.userId = u.id
      LEFT JOIN reviews r ON h.id = r.housekeeperId
    `;
    const where = [];
    const having = [];
    const params = [];

    if (serviceIds && serviceIds.length > 0) {
      sql += ` JOIN housekeeper_services hs ON h.id = hs.housekeeperId`;
      where.push(`hs.serviceId IN (${serviceIds.map(() => "?").join(",")})`);
      params.push(...serviceIds);
    }
    if (maxPrice) {
      where.push(`h.price <= ?`);
      params.push(Number(maxPrice));
    }
    if (available) {
      where.push(`h.available = ?`);
      params.push(Number(available));
    }

    if (where.length) {
      sql += ` WHERE ` + where.join(" AND ");
    }
    sql += ` GROUP BY h.id, h.userId, h.services, h.price, h.available, h.description, u.fullName, u.email, u.phone`;
    // BỎ HAVING COUNT(DISTINCT hs.serviceId) = ... để filter OR
    if (minRating) {
      having.push(`AVG(r.rating) >= ?`);
      params.push(Number(minRating));
    }
    if (having.length) {
      sql += ` HAVING ` + having.join(" AND ");
    }

    console.log('Final SQL:', sql);
    console.log('Final Params:', params);
    
    db.query(sql, params, (err, results) => {
      if (err) {
        console.log('SQL Error:', err);
        return res.status(500).json({ error: err });
      }
      
      console.log('Query Results:', results);
      
      const housekeepersWithInitials = results.map(hk => ({
        ...hk,
        initials: hk.fullName.split(' ').map(n => n[0]).join('').toUpperCase(),
        rating: parseFloat(hk.avgRating).toFixed(1)
      }));
      res.json(housekeepersWithInitials);
    });
  }
});

// API: Đăng ký user mới
app.post('/api/register', (req, res) => {
  const { fullName, email, password, phone, role, idCardFront, idCardBack, services } = req.body;
  const sql = 'INSERT INTO users (fullName, email, password, phone, role, idCardFront, idCardBack) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [fullName, email, password, phone, role, idCardFront, idCardBack], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    
    const userId = result.insertId;
    
    // Nếu là housekeeper và có services, tạo housekeeper record và liên kết services
    if (role === 'housekeeper' && services && services.length > 0) {
      // Tạo housekeeper record
      const housekeeperSql = 'INSERT INTO housekeepers (userId, rating, services, price, available, description) VALUES (?, ?, ?, ?, ?, ?)';
      const servicesString = services.join(',');
      
      db.query(housekeeperSql, [userId, 0, servicesString, 0, 1, ''], (err, housekeeperResult) => {
        if (err) return res.status(500).json({ error: err });
        
        const housekeeperId = housekeeperResult.insertId;
        
        // Lấy serviceIds từ service names
        const getServiceIdsSql = `SELECT id, name FROM services WHERE name IN (${services.map(() => "?").join(",")})`;
        
        db.query(getServiceIdsSql, services, (err, serviceResults) => {
          if (err) return res.status(500).json({ error: err });
          
          // Tạo các liên kết trong housekeeper_services
          const insertPromises = serviceResults.map(service => {
            return new Promise((resolve, reject) => {
              db.query('INSERT INTO housekeeper_services (housekeeperId, serviceId) VALUES (?, ?)', 
                [housekeeperId, service.id], (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                });
            });
          });
          
          Promise.all(insertPromises)
            .then(() => {
              res.json({ id: userId, fullName, email, phone, role, idCardFront, idCardBack, housekeeperId });
            })
            .catch(err => {
              res.status(500).json({ error: err });
            });
        });
      });
    } else {
      res.json({ id: userId, fullName, email, phone, role, idCardFront, idCardBack });
    }
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

// API: Filter - Ratings (trả về tất cả các lựa chọn từ 1-5 sao)
app.get('/api/filters/ratings', (req, res) => {
  // Trả về tất cả các lựa chọn rating từ 1-5 sao, bao gồm "Any rating"
  const ratings = [
    { value: null, label: "Any rating", stars: 5 },
    { value: 5, label: "5+ stars", stars: 5 },
    { value: 4, label: "4+ stars", stars: 4 },
    { value: 3, label: "3+ stars", stars: 3 },
    { value: 2, label: "2+ stars", stars: 2 },
    { value: 1, label: "1+ stars", stars: 1 }
  ];
  res.json(ratings);
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
