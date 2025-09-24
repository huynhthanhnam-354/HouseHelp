const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
// Increase payload limit for base64 images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

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
  const { services, exactRating, maxPrice, available } = req.query;
  
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
    if (exactRating) {
      // Lọc theo rating chính xác (ví dụ: 4 sao = 4.0-4.9)
      having.push(`AVG(r.rating) >= ? AND AVG(r.rating) < ?`);
      params.push(Number(exactRating));
      params.push(Number(exactRating) + 1);
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

// API: Lấy thông tin housekeeper theo ID
app.get('/api/housekeepers/:id', (req, res) => {
  const housekeeperId = req.params.id;
  
  let sql = `
    SELECT h.*, u.fullName, u.email, u.phone,
           COALESCE(AVG(r.rating), 0) as avgRating,
           COUNT(r.id) as reviewCount
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    LEFT JOIN reviews r ON h.id = r.housekeeperId
    WHERE h.id = ? OR h.userId = ?
    GROUP BY h.id, h.userId, h.services, h.price, h.available, h.description, u.fullName, u.email, u.phone
  `;
  
  db.query(sql, [housekeeperId, housekeeperId], (err, results) => {
    if (err) {
      console.log('SQL Error:', err);
      return res.status(500).json({ error: err });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Housekeeper not found' });
    }
    
    const hk = results[0];
    const initials = hk.fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    const housekeeperWithDetails = {
      ...hk,
      initials: initials,
      rating: parseFloat(hk.avgRating).toFixed(1),
      reviewCount: hk.reviewCount,
      avatar: initials,
      experience: hk.description || "Professional housekeeper",
      backgroundChecked: true,
      insured: true,
      location: hk.address || "Location not specified",
      bio: hk.description || "Professional housekeeper with experience.",
      phoneNumber: hk.phone,
      availability: hk.available ? "Available today" : "Not available"
    };
    
    res.json(housekeeperWithDetails);
  });
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

// API: Lấy profile đầy đủ của user
app.get('/api/users/:id/profile', (req, res) => {
  db.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

// API: Cập nhật profile user
app.put('/api/users/:id/profile', (req, res) => {
  const userId = req.params.id;
  const {
    fullName, phone, dateOfBirth, gender, address, city, district,
    bio, languages, emergencyContact, emergencyContactName, avatar,
    idCardFront, idCardBack
  } = req.body;

  console.log('=== UPDATE USER PROFILE ===');
  console.log('User ID:', userId);
  console.log('Request Body:', req.body);

  const sql = `
    UPDATE users SET 
      fullName = ?, phone = ?, dateOfBirth = ?, gender = ?, address = ?, 
      city = ?, district = ?, bio = ?, languages = ?, emergencyContact = ?, 
      emergencyContactName = ?, avatar = ?, idCardFront = ?, idCardBack = ?, 
      updatedAt = NOW()
    WHERE id = ?
  `;

  const params = [
    fullName, phone, dateOfBirth, gender, address, city, district,
    bio, languages, emergencyContact, emergencyContactName, avatar,
    idCardFront, idCardBack, userId
  ];

  console.log('SQL:', sql);
  console.log('Params:', params);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.status(500).json({ error: err });
    }
    
    console.log('Update Result:', result);
    console.log('Affected Rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      console.log('No rows affected - User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Trả về thông tin user đã cập nhật
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) {
        console.error('Select Error:', err);
        return res.status(500).json({ error: err });
      }
      console.log('Updated User:', results[0]);
      res.json(results[0]);
    });
  });
});

// API: Lấy profile housekeeper
app.get('/api/housekeepers/:userId/profile', (req, res) => {
  const userId = req.params.userId;
  
  const sql = `
    SELECT h.*, u.fullName, u.email, u.phone, u.avatar
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    WHERE h.userId = ?
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ error: 'Housekeeper not found' });
    res.json(results[0]);
  });
});

// API: Cập nhật profile housekeeper
app.put('/api/housekeepers/:userId/profile', (req, res) => {
  const userId = req.params.userId;
  const {
    description, experience, price, priceType, workingHours, 
    serviceRadius, services, available
  } = req.body;

  const sql = `
    UPDATE housekeepers SET 
      description = ?, experience = ?, price = ?, priceType = ?, 
      workingHours = ?, serviceRadius = ?, services = ?, available = ?,
      updatedAt = NOW()
    WHERE userId = ?
  `;

  const params = [
    description, experience, price, priceType, workingHours,
    serviceRadius, services, available, userId
  ];

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Housekeeper not found' });
    
    // Trả về thông tin housekeeper đã cập nhật
    const selectSql = `
      SELECT h.*, u.fullName, u.email, u.phone, u.avatar
      FROM housekeepers h
      JOIN users u ON h.userId = u.id
      WHERE h.userId = ?
    `;
    
    db.query(selectSql, [userId], (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results[0]);
    });
  });
});

// API: Đặt lịch
app.post('/api/bookings', (req, res) => {
  const { 
    customerId, 
    housekeeperId, 
    service, 
    date, 
    time,
    duration,
    location,
    notes,
    totalPrice,
    customerName,
    customerEmail,
    customerPhone,
    housekeeperName
  } = req.body;
  
  const bookingData = {
    customerId,
    housekeeperId,
    service,
    date,
    time,
    duration,
    location,
    notes,
    status: 'pending',
    totalPrice,
    customerName,
    customerEmail,
    customerPhone,
    housekeeperName,
    createdAt: new Date()
  };

  const sql = `INSERT INTO bookings 
    (customerId, housekeeperId, service, startDate, time, duration, location, notes, status, totalPrice, customerName, customerEmail, customerPhone, housekeeperName, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
  const values = [
    customerId, housekeeperId, service, date, time, duration, location, notes, 
    'pending', totalPrice, customerName, customerEmail, customerPhone, housekeeperName, new Date()
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating booking:', err);
      return res.status(500).json({ error: err });
    }

    const bookingId = result.insertId;
    const newBooking = { ...bookingData, id: bookingId };

    console.log('🎯 NEW BOOKING CREATED:');
    console.log('- Booking ID:', bookingId);
    console.log('- Customer ID:', customerId);
    console.log('- Housekeeper ID:', housekeeperId);
    console.log('- Customer Name:', customerName);
    console.log('- Service:', service);

    // Send notification to housekeeper
    const notificationToHousekeeper = {
      id: Date.now(),
      type: 'new_booking',
      title: 'Đơn đặt lịch mới',
      message: `${customerName} đã đặt lịch dịch vụ ${service}`,
      bookingId: bookingId,
      booking: newBooking,
      timestamp: new Date(),
      read: false
    };

    // Get housekeeper's userId from housekeeperId
    console.log('🔍 Looking up housekeeper userId for housekeeperId:', housekeeperId);
    db.query('SELECT userId FROM housekeepers WHERE id = ?', [housekeeperId], (err, hkResults) => {
      console.log('📝 Housekeeper query results:', hkResults);
      
      if (!err && hkResults.length > 0) {
        const housekeeperUserId = hkResults[0].userId;
        console.log('✅ Found housekeeper userId:', housekeeperUserId);
        console.log('📤 Sending notification to userId:', housekeeperUserId);
        
        const sent = sendNotificationToUser(housekeeperUserId, notificationToHousekeeper);
        console.log('📬 Notification sent result:', sent);
        
        // Save notification to database
        const notifSql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        db.query(notifSql, [
          housekeeperUserId, 
          notificationToHousekeeper.type,
          notificationToHousekeeper.title,
          notificationToHousekeeper.message,
          bookingId,
          JSON.stringify(newBooking),
          new Date(),
          0
        ], (notifErr) => {
          if (notifErr) console.error('Error saving notification:', notifErr);
        });
      }
    });

    res.json(newBooking);
  });
});

// API: Housekeeper xác nhận booking
app.post('/api/bookings/:id/confirm', (req, res) => {
  const bookingId = req.params.id;
  
  // Update booking status to confirmed
  db.query('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', bookingId], (err, result) => {
    if (err) {
      console.error('Error confirming booking:', err);
      return res.status(500).json({ error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get booking details to send notification to customer
    db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, bookingResults) => {
      if (err || bookingResults.length === 0) {
        return res.status(500).json({ error: 'Error fetching booking details' });
      }

      const booking = bookingResults[0];
      
      // Send notification to customer
      const notificationToCustomer = {
        id: Date.now(),
        type: 'booking_confirmed',
        title: 'Đặt lịch đã được xác nhận',
        message: `${booking.housekeeperName} đã xác nhận đơn đặt lịch của bạn`,
        bookingId: bookingId,
        booking: booking,
        timestamp: new Date(),
        read: false
      };

      console.log('🎉 Sending confirmation notification to customer:', booking.customerId);
      console.log('Notification data:', notificationToCustomer);
      const sent = sendNotificationToUser(booking.customerId, notificationToCustomer);
      console.log('Notification sent successfully:', sent);
      
      // Save notification to database
      const notifSql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(notifSql, [
        booking.customerId,
        notificationToCustomer.type,
        notificationToCustomer.title,
        notificationToCustomer.message,
        bookingId,
        JSON.stringify(booking),
        new Date(),
        0
      ], (notifErr) => {
        if (notifErr) console.error('Error saving notification:', notifErr);
      });

      res.json({ message: 'Booking confirmed successfully', booking: booking });
    });
  });
});

// API: Housekeeper từ chối booking
app.post('/api/bookings/:id/reject', (req, res) => {
  const bookingId = req.params.id;
  
  // Update booking status to rejected
  db.query('UPDATE bookings SET status = ? WHERE id = ?', ['rejected', bookingId], (err, result) => {
    if (err) {
      console.error('Error rejecting booking:', err);
      return res.status(500).json({ error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Get booking details to send notification to customer
    db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, bookingResults) => {
      if (err || bookingResults.length === 0) {
        return res.status(500).json({ error: 'Error fetching booking details' });
      }

      const booking = bookingResults[0];
      
      // Send notification to customer
      const notificationToCustomer = {
        id: Date.now(),
        type: 'booking_rejected',
        title: 'Đặt lịch đã bị từ chối',
        message: `${booking.housekeeperName} đã từ chối đơn đặt lịch của bạn`,
        bookingId: bookingId,
        booking: booking,
        timestamp: new Date(),
        read: false
      };

      console.log('❌ Sending rejection notification to customer:', booking.customerId);
      console.log('Notification data:', notificationToCustomer);
      const sent = sendNotificationToUser(booking.customerId, notificationToCustomer);
      console.log('Notification sent successfully:', sent);
      
      // Save notification to database
      const notifSql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(notifSql, [
        booking.customerId,
        notificationToCustomer.type,
        notificationToCustomer.title,
        notificationToCustomer.message,
        bookingId,
        JSON.stringify(booking),
        new Date(),
        0
      ], (notifErr) => {
        if (notifErr) console.error('Error saving notification:', notifErr);
      });

      res.json({ message: 'Booking rejected successfully', booking: booking });
    });
  });
});

// API: Kiểm tra status của booking
app.get('/api/bookings/:id/status', (req, res) => {
  const bookingId = req.params.id;
  
  db.query('SELECT id, status FROM bookings WHERE id = ?', [bookingId], (err, results) => {
    if (err) {
      console.error('Error fetching booking status:', err);
      return res.status(500).json({ error: err });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json(results[0]);
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
    { value: 5, label: "5 stars", stars: 5 },
    { value: 4, label: "4 stars", stars: 4 },
    { value: 3, label: "3 stars", stars: 3 },
    { value: 2, label: "2 stars", stars: 2 },
    { value: 1, label: "1 star", stars: 1 }
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

// API: Lấy notifications của user
app.get('/api/notifications/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.query(
    'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
    [userId],
    (err, results) => {
      if (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: err });
      }
      
      const notifications = results.map(notif => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data) : null,
        read: notif.read_status === 1
      }));
      
      res.json(notifications);
    }
  );
});

// API: Tạo notification mới
app.post('/api/notifications', (req, res) => {
  const { userId, type, title, message, bookingId, data } = req.body;
  
  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: 'Missing required fields: userId, type, title, message' });
  }
  
  const sql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const values = [
    userId,
    type,
    title,
    message,
    bookingId || null,
    data ? JSON.stringify(data) : null,
    new Date(),
    0
  ];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating notification:', err);
      return res.status(500).json({ error: err });
    }
    
    const notificationId = result.insertId;
    const newNotification = {
      id: notificationId,
      userId,
      type,
      title,
      message,
      bookingId,
      data,
      timestamp: new Date(),
      read: false
    };
    
    // Send notification via WebSocket
    sendNotificationToUser(userId, newNotification);
    
    res.json({ message: 'Notification created successfully', notification: newNotification });
  });
});

// API: Đánh dấu notification đã đọc
app.put('/api/notifications/:id/read', (req, res) => {
  const notificationId = req.params.id;
  
  db.query(
    'UPDATE notifications SET read_status = 1 WHERE id = ?',
    [notificationId],
    (err, result) => {
      if (err) {
        console.error('Error marking notification as read:', err);
        return res.status(500).json({ error: err });
      }
      
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// API: Xóa notification
app.delete('/api/notifications/:id', (req, res) => {
  const notificationId = req.params.id;
  
  db.query(
    'DELETE FROM notifications WHERE id = ?',
    [notificationId],
    (err, result) => {
      if (err) {
        console.error('Error deleting notification:', err);
        return res.status(500).json({ error: err });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      res.json({ message: 'Notification deleted successfully' });
    }
  );
});

// WebSocket connection handling
const activeUsers = new Map(); // Store active user connections

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins with their ID and role
  socket.on('join', ({ userId, role }) => {
    // Store user with both string and number keys to handle type mismatches
    const userIdStr = String(userId);
    const userIdNum = parseInt(userId);
    
    const userInfo = { socketId: socket.id, role, userId: userId };
    activeUsers.set(userId, userInfo);
    activeUsers.set(userIdStr, userInfo);
    activeUsers.set(userIdNum, userInfo);
    
    socket.userId = userId;
    socket.role = role;
    console.log(`✅ User ${userId} (${role}) joined. Active users: ${activeUsers.size}`);
    console.log(`Stored user with keys:`, [userId, userIdStr, userIdNum]);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userIdStr = String(socket.userId);
      const userIdNum = parseInt(socket.userId);
      
      activeUsers.delete(socket.userId);
      activeUsers.delete(userIdStr);
      activeUsers.delete(userIdNum);
      
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Helper function to send notification to specific user
function sendNotificationToUser(userId, notification) {
  console.log(`Trying to send notification to user ${userId}`, {
    userIdType: typeof userId,
    activeUsersKeys: Array.from(activeUsers.keys()),
    activeUsersSize: activeUsers.size
  });
  
  // Try both string and number versions of userId
  const userIdStr = String(userId);
  const userIdNum = parseInt(userId);
  
  let user = activeUsers.get(userId) || activeUsers.get(userIdStr) || activeUsers.get(userIdNum);
  
  if (user) {
    io.to(user.socketId).emit('notification', notification);
    console.log(`✅ Notification sent to user ${userId}:`, notification);
    return true;
  } else {
    console.log(`❌ User ${userId} not found in active users. Available users:`, Array.from(activeUsers.keys()));
    return false;
  }
}

// API để debug active users
app.get('/api/debug/active-users', (req, res) => {
  const activeUsersList = Array.from(activeUsers.entries()).map(([key, value]) => ({
    key: key,
    keyType: typeof key,
    value: value
  }));
  
  res.json({
    totalActiveUsers: activeUsers.size,
    activeUsers: activeUsersList,
    uniqueSocketIds: [...new Set(Array.from(activeUsers.values()).map(u => u.socketId))].length
  });
});

// API để debug database structure
app.get('/api/debug/db-structure', (req, res) => {
  // Get columns of bookings table
  db.query('DESCRIBE bookings', (err, bookingsColumns) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get bookings structure: ' + err.message });
    }
    
    // Get columns of users table
    db.query('DESCRIBE users', (err2, usersColumns) => {
      if (err2) {
        return res.status(500).json({ error: 'Failed to get users structure: ' + err2.message });
      }
      
      // Get sample booking data and notifications structure
      db.query('SELECT * FROM bookings LIMIT 3', (err3, sampleBookings) => {
        if (err3) {
          return res.status(500).json({ error: 'Failed to get sample bookings: ' + err3.message });
        }
        
        // Get notifications table structure
        db.query('DESCRIBE notifications', (err4, notificationsColumns) => {
          if (err4) {
            return res.status(500).json({ 
              bookingsStructure: bookingsColumns,
              usersStructure: usersColumns,
              sampleBookings: sampleBookings,
              notificationsError: 'Failed to get notifications structure: ' + err4.message
            });
          }
          
          // Get recent notifications
          db.query('SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 5', (err5, recentNotifications) => {
            res.json({
              bookingsStructure: bookingsColumns,
              usersStructure: usersColumns,
              notificationsStructure: notificationsColumns,
              sampleBookings: sampleBookings,
              recentNotifications: recentNotifications || []
            });
          });
        });
      });
    });
  });
});

// API test để debug notification
app.post('/api/test-notification', (req, res) => {
  const { userId, message } = req.body;
  
  console.log(`🧪 Testing notification for user ${userId}`);
  
  const testNotification = {
    id: Date.now(),
    type: 'test',
    title: 'Test Notification',
    message: message || 'This is a test notification',
    timestamp: new Date(),
    read: false
  };
  
  const sent = sendNotificationToUser(userId, testNotification);
  
  res.json({ 
    success: sent, 
    message: sent ? 'Notification sent' : 'User not connected',
    activeUsers: Array.from(activeUsers.keys())
  });
});

// API để fix customer ID trong booking
app.put('/api/debug/fix-booking-customer/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const { newCustomerId } = req.body;
  
  console.log(`🔧 Fixing booking ${bookingId} customer ID to ${newCustomerId}`);
  
  const query = 'UPDATE bookings SET customerId = ? WHERE id = ?';
  db.query(query, [newCustomerId, bookingId], (err, result) => {
    if (err) {
      console.error('Error updating booking customer ID:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    console.log(`✅ Updated booking ${bookingId} customer ID to ${newCustomerId}`);
    res.json({ 
      message: 'Booking customer ID updated successfully',
      bookingId: bookingId,
      newCustomerId: newCustomerId,
      affectedRows: result.affectedRows
    });
  });
});

server.listen(5000, () => console.log('Server running on port 5000 with WebSocket support'));
