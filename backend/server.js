const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ChatbotService = require('./services/chatbotService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5174"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
// Increase payload limit for base64 images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory with fallback
app.use('/uploads', express.static(uploadsDir));

// Middleware to handle missing files with placeholder
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(uploadsDir, req.path);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    
    // Return a placeholder response for missing images
    res.status(404).json({
      error: 'File not found',
      message: 'Tài liệu không tồn tại hoặc đã bị xóa',
      path: req.path
    });
    return;
  }
  
  next();
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { fileType } = req.body;
    let subDir = 'general';
    
    switch (fileType) {
      case 'avatar':
        subDir = 'avatars';
        break;
      case 'id_card_front':
      case 'id_card_back':
        subDir = 'id_cards';
        break;
      case 'profile_image':
        subDir = 'profiles';
        break;
      default:
        subDir = 'general';
    }
    
    const fullPath = path.join(uploadsDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh (JPG, PNG, GIF)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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

// Initialize Chatbot Service
const chatbotService = new ChatbotService();

// API: Lấy tất cả housekeepers (filter dịch vụ theo bảng housekeeper_services, OR logic)
app.get('/api/housekeepers', (req, res) => {
  const { services, exactRating, maxPrice, available, topRated } = req.query;
  
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
      SELECT h.*, u.fullName, u.email, u.phone, u.isVerified, u.isApproved,
             COALESCE(AVG(r.rating), 0) as avgRating,
             COUNT(r.id) as reviewCount
      FROM housekeepers h
      JOIN users u ON h.userId = u.id
      LEFT JOIN reviews r ON h.id = r.housekeeperId
      WHERE u.isApproved = 1 AND u.isVerified = 1
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
      sql += ` AND ` + where.join(" AND ");
    }
    sql += ` GROUP BY h.id, h.userId, h.services, h.price, h.available, h.description, u.fullName, u.email, u.phone`;
    
    // BỎ HAVING COUNT(DISTINCT hs.serviceId) = ... để filter OR
    if (exactRating) {
      // Lọc theo rating chính xác (ví dụ: 4 sao = 4.0-4.9)
      having.push(`AVG(r.rating) >= ? AND AVG(r.rating) < ?`);
      params.push(Number(exactRating));
      params.push(Number(exactRating) + 1);
    }
    
    // Filter top-rated (rating >= 4.5 và có ít nhất 10 reviews)
    if (topRated === 'true') {
      having.push(`AVG(r.rating) >= 4.5 AND COUNT(r.id) >= 5`);
    }
    
    if (having.length) {
      sql += ` HAVING ` + having.join(" AND ");
    }
    
    // Sắp xếp: Top-rated theo rating cao nhất, còn lại theo thứ tự bình thường
    if (topRated === 'true') {
      sql += ` ORDER BY AVG(r.rating) DESC, COUNT(r.id) DESC`;
    } else {
      sql += ` ORDER BY h.isTopRated DESC, AVG(r.rating) DESC`;
    }

    
    db.query(sql, params, (err, results) => {
      if (err) {
        console.log('SQL Error:', err);
        return res.status(500).json({ error: err });
      }
      
      // Lọc thêm một lần nữa để đảm bảo chỉ có housekeeper đã xác minh
      const verifiedResults = results.filter(hk => {
        const isVerified = hk.isVerified === 1 || hk.isVerified === true;
        const isApproved = hk.isApproved === 1 || hk.isApproved === true;
        return isVerified && isApproved;
      });
      
      const housekeepersWithInitials = verifiedResults.map(hk => ({
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
  const { 
    fullName, 
    email, 
    password, 
    phone, 
    role, 
    idCardFront, 
    idCardBack, 
    services,
    address,
    city,
    district,
    dateOfBirth,
    gender
  } = req.body;

  console.log('📝 Registration request:', { fullName, email, role, phone });

  // Validation
  if (!fullName || !email || !password) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin bắt buộc',
      message: 'Họ tên, email và mật khẩu là bắt buộc' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      error: 'Email không hợp lệ',
      message: 'Vui lòng nhập đúng định dạng email' 
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'Mật khẩu quá ngắn',
      message: 'Mật khẩu phải có ít nhất 6 ký tự' 
    });
  }

  // Check if email already exists
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, existingUsers) => {
    if (err) {
      console.error('Database error checking email:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể kiểm tra email' });
    }

    if (existingUsers.length > 0) {
      return res.status(409).json({ 
        error: 'Email đã tồn tại',
        message: 'Email này đã được đăng ký. Vui lòng sử dụng email khác hoặc đăng nhập.' 
      });
    }

    // Hash password (in production, use bcrypt)
    // For now, we'll use simple hashing
    const hashedPassword = require('crypto').createHash('sha256').update(password).digest('hex');

    const sql = `INSERT INTO users 
      (fullName, email, password, phone, role, idCardFront, idCardBack, address, city, district, dateOfBirth, gender, authProvider) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local')`;
    
    const values = [
      fullName, 
      email, 
      hashedPassword, 
      phone, 
      role || 'customer', 
      idCardFront, 
      idCardBack,
      address,
      city,
      district,
      dateOfBirth,
      gender
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Database error creating user:', err);
        return res.status(500).json({ error: 'Lỗi tạo tài khoản', message: err.message });
      }
      
      const userId = result.insertId;
      console.log('✅ User created with ID:', userId);
      
      // Nếu là housekeeper, tạo housekeeper record
      if (role === 'housekeeper') {
        const housekeeperSql = `INSERT INTO housekeepers 
          (userId, rating, services, price, available, description, experience) 
          VALUES (?, 0, ?, 50000, 1, 'Người giúp việc mới tham gia', 0)`;
        
        const servicesString = services && services.length > 0 ? services.join(',') : '';
        
        db.query(housekeeperSql, [userId, servicesString], (err, housekeeperResult) => {
          if (err) {
            console.error('Error creating housekeeper record:', err);
            return res.status(500).json({ error: 'Lỗi tạo hồ sơ người giúp việc', message: err.message });
          }
          
          const housekeeperId = housekeeperResult.insertId;
          console.log('✅ Housekeeper record created with ID:', housekeeperId);
          
          // Liên kết services nếu có
          if (services && services.length > 0) {
            const getServiceIdsSql = `SELECT id, name FROM services WHERE name IN (${services.map(() => "?").join(",")})`;
            
            db.query(getServiceIdsSql, services, (err, serviceResults) => {
              if (err) {
                console.error('Error fetching services:', err);
              } else {
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
                    console.log('✅ Housekeeper services linked');
                  })
                  .catch(err => {
                    console.error('Error linking services:', err);
                  });
              }
            });
          }
          
          // Return success response for housekeeper
          res.status(201).json({ 
            success: true,
            message: 'Đăng ký thành công! Tài khoản của bạn đang chờ xét duyệt.',
            user: { 
              id: userId, 
              fullName, 
              email, 
              phone, 
              role,
              housekeeperId,
              isVerified: false,
              isApproved: false
            }
          });
        });
      } else {
        // Return success response for customer
        res.status(201).json({ 
          success: true,
          message: 'Đăng ký thành công! Chào mừng bạn đến với HouseHelp.',
          user: { 
            id: userId, 
            fullName, 
            email, 
            phone, 
            role: role || 'customer',
            isVerified: false,
            isApproved: true // Customer auto-approved
          }
        });
      }

      // Log registration activity
      db.query('INSERT INTO system_logs (userId, action, description, ipAddress) VALUES (?, ?, ?, ?)', 
        [userId, 'USER_REGISTERED', `New ${role || 'customer'} registered: ${fullName}`, req.ip], 
        (err) => {
          if (err) console.error('Error logging registration:', err);
        });
    });
  });
});

// ========================
// FILE UPLOAD APIs
// ========================

// API: Upload single file
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Không có file được upload',
        message: 'Vui lòng chọn file để upload' 
      });
    }

    const { userId, fileType } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Thiếu thông tin userId',
        message: 'Cần có userId để upload file' 
      });
    }

    const file = req.file;
    const filePath = `/uploads/${path.relative(uploadsDir, file.path)}`.replace(/\\/g, '/');
    
    console.log('📁 File uploaded:', {
      originalName: file.originalname,
      filename: file.filename,
      path: filePath,
      size: file.size,
      type: fileType
    });

    // Save file info to database
    const sql = `INSERT INTO file_uploads 
      (userId, fileName, originalName, filePath, fileType, mimeType, fileSize) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [
      userId, 
      file.filename, 
      file.originalname, 
      filePath, 
      fileType || 'general', 
      file.mimetype, 
      file.size
    ], (err, result) => {
      if (err) {
        console.error('Error saving file info to database:', err);
        return res.status(500).json({ error: 'Lỗi lưu thông tin file', message: err.message });
      }

      // Update user's avatar or ID card fields if applicable
      if (fileType === 'avatar') {
        db.query('UPDATE users SET avatar = ? WHERE id = ?', [filePath, userId], (updateErr) => {
          if (updateErr) console.error('Error updating user avatar:', updateErr);
        });
      } else if (fileType === 'id_card_front') {
        db.query('UPDATE users SET idCardFront = ? WHERE id = ?', [filePath, userId], (updateErr) => {
          if (updateErr) console.error('Error updating ID card front:', updateErr);
        });
      } else if (fileType === 'id_card_back') {
        db.query('UPDATE users SET idCardBack = ? WHERE id = ?', [filePath, userId], (updateErr) => {
          if (updateErr) console.error('Error updating ID card back:', updateErr);
        });
      }

      res.json({
        success: true,
        message: 'Upload file thành công',
        file: {
          id: result.insertId,
          filename: file.filename,
          originalName: file.originalname,
          path: filePath,
          url: `http://localhost:5000${filePath}`,
          size: file.size,
          type: fileType || 'general'
        }
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Lỗi upload file',
      message: error.message 
    });
  }
});

// API: Upload multiple files
app.post('/api/upload-multiple', upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'Không có file được upload',
        message: 'Vui lòng chọn ít nhất một file để upload' 
      });
    }

    const { userId, fileType } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Thiếu thông tin userId',
        message: 'Cần có userId để upload file' 
      });
    }

    const uploadedFiles = [];
    const insertPromises = req.files.map(file => {
      const filePath = `/uploads/${path.relative(uploadsDir, file.path)}`.replace(/\\/g, '/');
      
      return new Promise((resolve, reject) => {
        const sql = `INSERT INTO file_uploads 
          (userId, fileName, originalName, filePath, fileType, mimeType, fileSize) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(sql, [
          userId, 
          file.filename, 
          file.originalname, 
          filePath, 
          fileType || 'general', 
          file.mimetype, 
          file.size
        ], (err, result) => {
          if (err) {
            reject(err);
          } else {
            uploadedFiles.push({
              id: result.insertId,
              filename: file.filename,
              originalName: file.originalname,
              path: filePath,
              url: `http://localhost:5000${filePath}`,
              size: file.size,
              type: fileType || 'general'
            });
            resolve(result);
          }
        });
      });
    });

    Promise.all(insertPromises)
      .then(() => {
        res.json({
          success: true,
          message: `Upload thành công ${uploadedFiles.length} file`,
          files: uploadedFiles
        });
      })
      .catch(err => {
        console.error('Error saving multiple files:', err);
        res.status(500).json({ 
          error: 'Lỗi lưu thông tin file',
          message: err.message 
        });
      });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ 
      error: 'Lỗi upload file',
      message: error.message 
    });
  }
});

// API: Get user's uploaded files
app.get('/api/users/:userId/files', (req, res) => {
  const { userId } = req.params;
  const { fileType } = req.query;
  
  let sql = 'SELECT * FROM file_uploads WHERE userId = ?';
  const params = [userId];
  
  if (fileType) {
    sql += ' AND fileType = ?';
    params.push(fileType);
  }
  
  sql += ' ORDER BY uploadedAt DESC';
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching user files:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách file', message: err.message });
    }
    
    const files = results.map(file => ({
      ...file,
      url: `http://localhost:5000${file.filePath}`
    }));
    
    res.json(files);
  });
});

// API: Delete uploaded file
app.delete('/api/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  
  // Get file info first
  db.query('SELECT * FROM file_uploads WHERE id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Error fetching file info:', err);
      return res.status(500).json({ error: 'Lỗi lấy thông tin file', message: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }
    
    const file = results[0];
    const fullPath = path.join(__dirname, file.filePath);
    
    // Delete file from filesystem
    fs.unlink(fullPath, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Error deleting file from disk:', unlinkErr);
      }
      
      // Delete from database
      db.query('DELETE FROM file_uploads WHERE id = ?', [fileId], (deleteErr) => {
        if (deleteErr) {
          console.error('Error deleting file from database:', deleteErr);
          return res.status(500).json({ error: 'Lỗi xóa file', message: deleteErr.message });
        }
        
        res.json({
          success: true,
          message: 'Xóa file thành công'
        });
      });
    });
  });
});

// API: Đăng nhập
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('🔐 Login attempt:', { email });
  
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin đăng nhập',
      message: 'Email và mật khẩu là bắt buộc' 
    });
  }

  // Hash password to compare (same method as registration)
  const hashedPassword = require('crypto').createHash('sha256').update(password).digest('hex');
  
  db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, hashedPassword], (err, results) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể đăng nhập' });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ 
        error: 'Thông tin đăng nhập không chính xác',
        message: 'Email hoặc mật khẩu không đúng' 
      });
    }
    
    const user = results[0];
    console.log('✅ Login successful for user:', user.id);
    
    // Update last active time
    db.query('UPDATE users SET lastActiveAt = NOW() WHERE id = ?', [user.id], (updateErr) => {
      if (updateErr) console.error('Error updating last active:', updateErr);
    });
    
    // Log login activity
    db.query('INSERT INTO system_logs (userId, action, description, ipAddress) VALUES (?, ?, ?, ?)', 
      [user.id, 'USER_LOGIN', `User logged in: ${user.fullName}`, req.ip], 
      (logErr) => {
        if (logErr) console.error('Error logging login:', logErr);
      });
    
    // Remove password from response
    delete user.password;
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      user: user
    });
  });
});

// ========================
// VERIFICATION & APPROVAL APIs
// ========================

// API: Submit verification request
app.post('/api/verification/submit', (req, res) => {
  const { userId, userNotes, documents } = req.body;
  
  console.log('📋 Verification request submitted:', { userId, documents: documents?.length });
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin userId',
      message: 'Cần có userId để gửi yêu cầu xác thực' 
    });
  }

  // Check if user exists and is housekeeper
  db.query('SELECT * FROM users WHERE id = ? AND role = "housekeeper"', [userId], (err, userResults) => {
    if (err) {
      console.error('Database error checking user:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể kiểm tra thông tin người dùng' });
    }

    if (userResults.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại hoặc không phải housekeeper' });
    }

    const user = userResults[0];

    // Create verification request
    const requestSql = `INSERT INTO verification_requests 
      (userId, requestType, userNotes, submittedDocuments, priority) 
      VALUES (?, ?, ?, ?, ?)`;
    
    const priority = user.isVerified ? 'normal' : 'high'; // New users get high priority
    const requestType = user.isVerified ? 'document_update' : 'initial_verification';
    
    db.query(requestSql, [
      userId, 
      requestType, 
      userNotes || '', 
      JSON.stringify(documents || []),
      priority
    ], (err, requestResult) => {
      if (err) {
        console.error('Error creating verification request:', err);
        return res.status(500).json({ error: 'Lỗi tạo yêu cầu xác thực', message: err.message });
      }

      const requestId = requestResult.insertId;
      console.log('✅ Verification request created with ID:', requestId);

      // Save documents to verification_documents table
      if (documents && documents.length > 0) {
        const documentPromises = documents.map(doc => {
          return new Promise((resolve, reject) => {
            // Validate required fields
            if (!doc.path || !doc.type || !doc.originalName) {
              console.error('Invalid document data:', doc);
              reject(new Error(`Invalid document data: missing path, type, or originalName`));
              return;
            }
            
            const docSql = `INSERT INTO verification_documents 
              (userId, documentType, filePath, originalName) 
              VALUES (?, ?, ?, ?)`;
            
            console.log('Inserting document:', { userId, type: doc.type, path: doc.path, originalName: doc.originalName });
            
            db.query(docSql, [userId, doc.type, doc.path, doc.originalName], (err, result) => {
              if (err) {
                console.error('Database error inserting document:', err);
                reject(err);
              } else {
                console.log('Document inserted successfully:', result.insertId);
                resolve(result);
              }
            });
          });
        });

        Promise.all(documentPromises)
          .then(() => {
            console.log('✅ All verification documents saved');
            
            // Create notification for admins
            const notificationSql = `INSERT INTO notifications 
              (userId, type, title, message, data) 
              SELECT id, 'verification_request', 'Yêu cầu xác thực mới', ?, ? 
              FROM users WHERE role = 'admin'`;
            
            const notificationData = JSON.stringify({
              requestId: requestId,
              userId: userId,
              userName: user.fullName,
              requestType: requestType
            });

            db.query(notificationSql, [
              `${user.fullName} đã gửi yêu cầu xác thực tài khoản housekeeper`,
              notificationData
            ], (notifErr) => {
              if (notifErr) console.error('Error creating admin notification:', notifErr);
            });

            res.json({
              success: true,
              message: 'Gửi yêu cầu xác thực thành công! Admin sẽ xem xét trong vòng 24-48 giờ.',
              requestId: requestId
            });
          })
          .catch(err => {
            console.error('Error saving verification documents:', err);
            res.status(500).json({ error: 'Lỗi lưu tài liệu xác thực', message: err.message });
          });
      } else {
        res.json({
          success: true,
          message: 'Gửi yêu cầu xác thực thành công! Vui lòng upload tài liệu xác thực.',
          requestId: requestId
        });
      }
    });
  });
});

// API: Get verification status for user
app.get('/api/verification/status/:userId', (req, res) => {
  const { userId } = req.params;
  
  const sql = `
    SELECT 
      vr.*,
      u.fullName, u.isVerified, u.isApproved,
      admin.fullName as reviewerName
    FROM verification_requests vr
    JOIN users u ON vr.userId = u.id
    LEFT JOIN users admin ON vr.assignedTo = admin.id
    WHERE vr.userId = ?
    ORDER BY vr.submittedAt DESC
    LIMIT 1
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching verification status:', err);
      return res.status(500).json({ error: 'Lỗi lấy trạng thái xác thực', message: err.message });
    }
    
    if (results.length === 0) {
      return res.json({
        hasRequest: false,
        isVerified: false,
        isApproved: false,
        message: 'Chưa có yêu cầu xác thực nào'
      });
    }
    
    const request = results[0];
    
    // Get documents for this request
    db.query('SELECT * FROM verification_documents WHERE userId = ? ORDER BY uploadedAt DESC', 
      [userId], (docErr, documents) => {
        if (docErr) {
          console.error('Error fetching verification documents:', docErr);
        }
        
        res.json({
          hasRequest: true,
          request: request,
          documents: documents || [],
          isVerified: request.isVerified,
          isApproved: request.isApproved
        });
      });
  });
});

// API: Admin - Get pending verification requests
app.get('/api/admin/verification/pending', (req, res) => {
  const { status = 'pending', priority, page = 1, limit = 20 } = req.query;
  
  let sql = `
    SELECT 
      vr.*,
      u.fullName, u.email, u.phone, u.createdAt as userCreatedAt,
      h.experience, h.services,
      COUNT(vd.id) as documentCount
    FROM verification_requests vr
    JOIN users u ON vr.userId = u.id
    LEFT JOIN housekeepers h ON u.id = h.userId
    LEFT JOIN verification_documents vd ON vr.userId = vd.userId
    WHERE 1=1
      AND (u.isVerified = 0 OR u.isApproved = 0)
  `;
  
  const params = [];
  
  if (status) {
    sql += ' AND vr.status = ?';
    params.push(status);
  }
  
  if (priority) {
    sql += ' AND vr.priority = ?';
    params.push(priority);
  }
  
  sql += ` GROUP BY vr.id 
           ORDER BY 
             FIELD(vr.priority, 'urgent', 'high', 'normal', 'low'),
             vr.submittedAt ASC
           LIMIT ? OFFSET ?`;
  
  const offset = (page - 1) * limit;
  params.push(parseInt(limit), parseInt(offset));
  
  console.log('🔍 Verification query SQL:', sql);
  console.log('📋 Query params:', params);
  
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching pending verifications:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách xác thực', message: err.message });
    }
    
    console.log(`📊 Found ${results.length} pending verification requests`);
    res.json(results);
  });
});

// API: Admin - Review verification request
app.post('/api/admin/verification/:requestId/review', (req, res) => {
  const { requestId } = req.params;
  const { adminId, action, adminNotes, documentReviews } = req.body;
  
  console.log('👨‍💼 Admin reviewing verification:', { requestId, action, adminId });
  
  if (!adminId || !action) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin',
      message: 'Cần có adminId và action để xem xét yêu cầu' 
    });
  }

  // Verify admin permissions
  db.query('SELECT * FROM users WHERE id = ? AND role = "admin"', [adminId], (err, adminResults) => {
    if (err) {
      console.error('Database error checking admin:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể kiểm tra quyền admin' });
    }

    if (adminResults.length === 0) {
      return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này' });
    }

    // Get verification request details
    db.query('SELECT * FROM verification_requests WHERE id = ?', [requestId], (err, requestResults) => {
      if (err) {
        console.error('Error fetching verification request:', err);
        return res.status(500).json({ error: 'Lỗi lấy thông tin yêu cầu', message: err.message });
      }

      if (requestResults.length === 0) {
        return res.status(404).json({ error: 'Yêu cầu xác thực không tồn tại' });
      }

      const request = requestResults[0];
      const userId = request.userId;
      
      let newStatus, userVerified, userApproved;
      
      switch (action) {
        case 'approve':
          newStatus = 'approved';
          userVerified = true;
          userApproved = true;
          break;
        case 'reject':
          newStatus = 'rejected';
          userVerified = false;
          userApproved = false;
          break;
        case 'request_more_info':
          newStatus = 'requires_more_info';
          userVerified = false;
          userApproved = false;
          break;
        default:
          return res.status(400).json({ error: 'Action không hợp lệ' });
      }

      // Update verification request
      const updateRequestSql = `UPDATE verification_requests 
        SET status = ?, adminNotes = ?, assignedTo = ?, reviewedAt = NOW(), completedAt = ?
        WHERE id = ?`;
      
      const completedAt = (action === 'approve' || action === 'reject') ? new Date() : null;
      
      db.query(updateRequestSql, [newStatus, adminNotes, adminId, completedAt, requestId], (err) => {
        if (err) {
          console.error('Error updating verification request:', err);
          return res.status(500).json({ error: 'Lỗi cập nhật yêu cầu', message: err.message });
        }

        // Update user verification status
        db.query('UPDATE users SET isVerified = ?, isApproved = ?, verifiedAt = ? WHERE id = ?', 
          [userVerified, userApproved, userVerified ? new Date() : null, userId], (userErr) => {
            if (userErr) {
              console.error('Error updating user verification status:', userErr);
            }
          });

        // Update document reviews if provided
        if (documentReviews && documentReviews.length > 0) {
          const documentPromises = documentReviews.map(review => {
            return new Promise((resolve, reject) => {
              db.query('UPDATE verification_documents SET status = ?, adminNotes = ?, reviewedBy = ?, reviewedAt = NOW() WHERE id = ?', 
                [review.status, review.notes, adminId, review.documentId], (err, result) => {
                  if (err) reject(err);
                  else resolve(result);
                });
            });
          });

          Promise.all(documentPromises).catch(err => {
            console.error('Error updating document reviews:', err);
          });
        }

        // Create notification for user
        let notificationTitle, notificationMessage;
        
        switch (action) {
          case 'approve':
            notificationTitle = '🎉 Tài khoản đã được xác thực';
            notificationMessage = 'Chúc mừng! Tài khoản housekeeper của bạn đã được xác thực và phê duyệt. Bạn có thể bắt đầu nhận việc ngay bây giờ.';
            break;
          case 'reject':
            notificationTitle = '❌ Yêu cầu xác thực bị từ chối';
            notificationMessage = `Yêu cầu xác thực của bạn đã bị từ chối. Lý do: ${adminNotes || 'Không đáp ứng yêu cầu'}. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.`;
            break;
          case 'request_more_info':
            notificationTitle = '📋 Cần bổ sung thông tin';
            notificationMessage = `Yêu cầu xác thực của bạn cần bổ sung thêm thông tin. Ghi chú: ${adminNotes || 'Vui lòng cập nhật tài liệu'}`;
            break;
        }

        db.query('INSERT INTO notifications (userId, type, title, message, data) VALUES (?, ?, ?, ?, ?)', 
          [userId, 'verification_result', notificationTitle, notificationMessage, 
           JSON.stringify({ requestId, action, adminNotes })], 
          (notifErr) => {
            if (notifErr) console.error('Error creating user notification:', notifErr);
          });

        // Log admin action
        db.query('INSERT INTO system_logs (userId, action, description, ipAddress) VALUES (?, ?, ?, ?)', 
          [adminId, 'VERIFICATION_REVIEW', `Admin reviewed verification request ${requestId}: ${action}`, req.ip], 
          (logErr) => {
            if (logErr) console.error('Error logging admin action:', logErr);
          });

        console.log(`✅ Verification request ${requestId} ${action}ed by admin ${adminId}`);

        res.json({
          success: true,
          message: `Đã ${action === 'approve' ? 'phê duyệt' : action === 'reject' ? 'từ chối' : 'yêu cầu bổ sung thông tin'} thành công`,
          newStatus: newStatus
        });
      });
    });
  });
});

// API: Admin - Get verification documents by request ID
app.get('/api/admin/verification/:requestId/documents', (req, res) => {
  const { requestId } = req.params;
  
  console.log('📄 Fetching documents for request:', requestId);
  
  // First get the userId from the verification request
  const requestSql = 'SELECT userId FROM verification_requests WHERE id = ?';
  
  db.query(requestSql, [requestId], (err, requestResults) => {
    if (err) {
      console.error('Error fetching verification request:', err);
      return res.status(500).json({ error: 'Lỗi lấy thông tin yêu cầu', message: err.message });
    }
    
    if (requestResults.length === 0) {
      return res.status(404).json({ error: 'Yêu cầu xác thực không tồn tại' });
    }
    
    const userId = requestResults[0].userId;
    
    // Get documents for this user
    const documentsSql = `
      SELECT 
        id,
        documentType as type,
        filePath as url,
        originalName,
        uploadedAt,
        status
      FROM verification_documents 
      WHERE userId = ? 
      ORDER BY uploadedAt DESC
    `;
    
    db.query(documentsSql, [userId], (docErr, documents) => {
      if (docErr) {
        console.error('Error fetching verification documents:', docErr);
        return res.status(500).json({ error: 'Lỗi lấy tài liệu xác minh', message: docErr.message });
      }
      
      console.log(`📊 Found ${documents.length} documents for user ${userId}`);
      res.json(documents);
    });
  });
});

// ========================
// GOOGLE OAUTH APIs
// ========================

// API: Google OAuth Login/Register
app.post('/api/auth/google', (req, res) => {
  const { 
    googleId, 
    email, 
    name, 
    picture, 
    role = 'customer' 
  } = req.body;

  console.log('🔐 Google OAuth attempt:', { googleId, email, name, role });

  if (!googleId || !email || !name) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin Google OAuth',
      message: 'Google ID, email và tên là bắt buộc' 
    });
  }

  // Check if user exists with this Google ID
  db.query('SELECT * FROM users WHERE googleId = ?', [googleId], (err, googleResults) => {
    if (err) {
      console.error('Database error checking Google ID:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể xác thực Google' });
    }

    if (googleResults.length > 0) {
      // User exists with Google ID - login
      const user = googleResults[0];
      console.log('✅ Google login successful for existing user:', user.id);
      
      // Update last active time and profile picture
      db.query('UPDATE users SET lastActiveAt = NOW(), profilePicture = ? WHERE id = ?', 
        [picture, user.id], (updateErr) => {
          if (updateErr) console.error('Error updating user info:', updateErr);
        });
      
      // Log login activity
      db.query('INSERT INTO system_logs (userId, action, description, ipAddress) VALUES (?, ?, ?, ?)', 
        [user.id, 'GOOGLE_LOGIN', `User logged in via Google: ${user.fullName}`, req.ip], 
        (logErr) => {
          if (logErr) console.error('Error logging Google login:', logErr);
        });
      
      // Remove password from response
      delete user.password;
      
      return res.json({
        success: true,
        message: 'Đăng nhập Google thành công',
        user: user,
        isNewUser: false
      });
    }

    // Check if user exists with this email (different auth method)
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, emailResults) => {
      if (err) {
        console.error('Database error checking email:', err);
        return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể kiểm tra email' });
      }

      if (emailResults.length > 0) {
        // User exists with same email but different auth method
        const existingUser = emailResults[0];
        
        if (existingUser.authProvider === 'local') {
          return res.status(409).json({ 
            error: 'Email đã được đăng ký',
            message: 'Email này đã được đăng ký bằng phương thức khác. Vui lòng đăng nhập bằng email và mật khẩu.' 
          });
        }
        
        // Link Google account to existing user
        db.query('UPDATE users SET googleId = ?, profilePicture = ?, authProvider = "google", lastActiveAt = NOW() WHERE id = ?', 
          [googleId, picture, existingUser.id], (linkErr) => {
            if (linkErr) {
              console.error('Error linking Google account:', linkErr);
              return res.status(500).json({ error: 'Lỗi liên kết tài khoản Google', message: linkErr.message });
            }
            
            console.log('✅ Google account linked to existing user:', existingUser.id);
            
            // Remove password from response
            delete existingUser.password;
            
            res.json({
              success: true,
              message: 'Liên kết tài khoản Google thành công',
              user: { ...existingUser, googleId, profilePicture: picture },
              isNewUser: false
            });
          });
        
        return;
      }

      // Create new user with Google OAuth
      const sql = `INSERT INTO users 
        (fullName, email, googleId, authProvider, profilePicture, role, isVerified, isApproved) 
        VALUES (?, ?, ?, 'google', ?, ?, 1, ?)`;
      
      const isApproved = role === 'customer' ? 1 : 0; // Auto-approve customers, not housekeepers
      
      db.query(sql, [name, email, googleId, picture, role, isApproved], (err, result) => {
        if (err) {
          console.error('Database error creating Google user:', err);
          return res.status(500).json({ error: 'Lỗi tạo tài khoản Google', message: err.message });
        }
        
        const userId = result.insertId;
        console.log('✅ Google user created with ID:', userId);
        
        // If housekeeper, create housekeeper record
        if (role === 'housekeeper') {
          const housekeeperSql = `INSERT INTO housekeepers 
            (userId, rating, services, price, available, description, experience) 
            VALUES (?, 0, '', 50000, 1, 'Người giúp việc mới tham gia qua Google', 0)`;
          
          db.query(housekeeperSql, [userId], (err, housekeeperResult) => {
            if (err) {
              console.error('Error creating Google housekeeper record:', err);
            } else {
              console.log('✅ Google housekeeper record created');
            }
          });
        }
        
        // Log registration activity
        db.query('INSERT INTO system_logs (userId, action, description, ipAddress) VALUES (?, ?, ?, ?)', 
          [userId, 'GOOGLE_REGISTER', `New ${role} registered via Google: ${name}`, req.ip], 
          (logErr) => {
            if (logErr) console.error('Error logging Google registration:', logErr);
          });
        
        res.status(201).json({ 
          success: true,
          message: 'Đăng ký Google thành công! Chào mừng bạn đến với HouseHelp.',
          user: { 
            id: userId, 
            fullName: name, 
            email, 
            googleId,
            authProvider: 'google',
            profilePicture: picture,
            role,
            isVerified: true,
            isApproved: isApproved === 1
          },
          isNewUser: true
        });
      });
    });
  });
});

// API: Unlink Google account
app.post('/api/auth/google/unlink', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin userId',
      message: 'Cần có userId để hủy liên kết Google' 
    });
  }

  // Check if user has password (can't unlink if Google is only auth method)
  db.query('SELECT password, authProvider FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      console.error('Database error checking user auth:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống', message: 'Không thể kiểm tra thông tin xác thực' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }
    
    const user = results[0];
    
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ 
        error: 'Không thể hủy liên kết',
        message: 'Bạn cần đặt mật khẩu trước khi hủy liên kết tài khoản Google' 
      });
    }
    
    // Unlink Google account
    db.query('UPDATE users SET googleId = NULL, profilePicture = NULL, authProvider = "local" WHERE id = ?', 
      [userId], (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error unlinking Google account:', unlinkErr);
          return res.status(500).json({ error: 'Lỗi hủy liên kết Google', message: unlinkErr.message });
        }
        
        console.log('✅ Google account unlinked for user:', userId);
        
        res.json({
          success: true,
          message: 'Hủy liên kết tài khoản Google thành công'
        });
      });
  });
});

// API: Lấy danh sách tất cả users (cho Admin Dashboard)
app.get('/api/users', (req, res) => {
  const { role, verified, approved, page = 1, limit = 50 } = req.query;
  let sql = 'SELECT id, fullName, email, phone, role, isVerified, isApproved, createdAt, lastActiveAt FROM users WHERE 1=1';
  const params = [];

  // Filter theo role
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }

  // Filter theo verified status
  if (verified !== undefined) {
    sql += ' AND isVerified = ?';
    params.push(verified === 'true' ? 1 : 0);
  }

  // Filter theo approved status
  if (approved !== undefined) {
    sql += ' AND isApproved = ?';
    params.push(approved === 'true' ? 1 : 0);
  }

  // Pagination
  const offset = (page - 1) * limit;
  sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.log('SQL Error:', err);
      return res.status(500).json({ error: err });
    }

    // Đếm tổng số users để tính pagination
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (role) {
      countSql += ' AND role = ?';
      countParams.push(role);
    }
    if (verified !== undefined) {
      countSql += ' AND isVerified = ?';
      countParams.push(verified === 'true' ? 1 : 0);
    }
    if (approved !== undefined) {
      countSql += ' AND isApproved = ?';
      countParams.push(approved === 'true' ? 1 : 0);
    }

    db.query(countSql, countParams, (err, countResults) => {
      if (err) {
        console.log('Count SQL Error:', err);
        return res.status(500).json({ error: err });
      }

      const total = countResults[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        users: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalUsers: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
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

// API: Lấy danh sách tất cả bookings (cho Admin Dashboard)
app.get('/api/bookings', (req, res) => {
  const { status, housekeeper, customer, date, month, year, page = 1, limit = 50 } = req.query;
  
  let sql = `
    SELECT b.*, 
           u1.fullName as customerName, u1.email as customerEmail,
           u2.fullName as housekeeperName, u2.email as housekeeperEmail,
           s.name as serviceName
    FROM bookings b
    LEFT JOIN users u1 ON b.customerId = u1.id
    LEFT JOIN users u2 ON b.housekeeperId = u2.id  
    LEFT JOIN services s ON b.serviceId = s.id
    WHERE 1=1
  `;
  const params = [];

  // Filter theo status
  if (status) {
    sql += ' AND b.status = ?';
    params.push(status);
  }

  // Filter theo housekeeper
  if (housekeeper) {
    sql += ' AND b.housekeeperId = ?';
    params.push(housekeeper);
  }

  // Filter theo customer
  if (customer) {
    sql += ' AND b.customerId = ?';
    params.push(customer);
  }

  // Filter theo date
  if (date) {
    sql += ' AND DATE(b.startDate) = ?';
    params.push(date);
  }

  // Filter theo month/year
  if (month && year) {
    sql += ' AND MONTH(b.startDate) = ? AND YEAR(b.startDate) = ?';
    params.push(month, year);
  } else if (year) {
    sql += ' AND YEAR(b.startDate) = ?';
    params.push(year);
  }

  // Pagination
  const offset = (page - 1) * limit;
  sql += ' ORDER BY b.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.log('SQL Error:', err);
      return res.status(500).json({ error: err });
    }

    // Đếm tổng số bookings để tính pagination
    let countSql = 'SELECT COUNT(*) as total FROM bookings b WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND b.status = ?';
      countParams.push(status);
    }
    if (housekeeper) {
      countSql += ' AND b.housekeeperId = ?';
      countParams.push(housekeeper);
    }
    if (customer) {
      countSql += ' AND b.customerId = ?';
      countParams.push(customer);
    }
    if (date) {
      countSql += ' AND DATE(b.startDate) = ?';
      countParams.push(date);
    }
    if (month && year) {
      countSql += ' AND MONTH(b.startDate) = ? AND YEAR(b.startDate) = ?';
      countParams.push(month, year);
    } else if (year) {
      countSql += ' AND YEAR(b.startDate) = ?';
      countParams.push(year);
    }

    db.query(countSql, countParams, (err, countResults) => {
      if (err) {
        console.log('Count SQL Error:', err);
        return res.status(500).json({ error: err });
      }

      const total = countResults[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        bookings: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalBookings: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    });
  });
});

// API: Quick Booking - Tìm housekeeper phù hợp
app.post('/api/quick-booking/find-matches', (req, res) => {
  const { 
    service, 
    date, 
    time, 
    duration, 
    location, 
    maxPrice, 
    urgency,
    customerId 
  } = req.body;

  console.log('🔍 Quick booking search request:', {
    service, date, time, duration, location, maxPrice, urgency, customerId
  });

  // Build query to find matching housekeepers
  let sql = `
    SELECT h.*, u.fullName, u.email, u.phone, u.isVerified, u.isApproved,
           COALESCE(AVG(r.rating), 4.0) as avgRating,
           COUNT(r.id) as reviewCount,
           GROUP_CONCAT(s.name) as services
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    LEFT JOIN reviews r ON h.id = r.housekeeperId
    LEFT JOIN housekeeper_services hs ON h.id = hs.housekeeperId
    LEFT JOIN services s ON hs.serviceId = s.id
    WHERE u.isApproved = 1 AND u.isVerified = 1
      AND h.price <= ?
  `;

  const params = [maxPrice];

  // Add service filter if specified
  if (service) {
    sql += ` AND s.name LIKE ?`;
    params.push(`%${service}%`);
  }

  sql += `
    GROUP BY h.id, u.id
    HAVING avgRating >= 3.0
    ORDER BY 
      CASE 
        WHEN ? = 'asap' THEN (avgRating * 0.3 + (5 - h.price/20) * 0.4 + reviewCount/10 * 0.3)
        WHEN ? = 'urgent' THEN (avgRating * 0.4 + (5 - h.price/20) * 0.3 + reviewCount/10 * 0.3)
        ELSE (avgRating * 0.5 + (5 - h.price/20) * 0.2 + reviewCount/10 * 0.3)
      END DESC
    LIMIT 10
  `;

  params.push(urgency, urgency);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error finding matching housekeepers:', err);
      return res.status(500).json({ error: 'Failed to find matches' });
    }

    console.log(`✅ Found ${results.length} matching housekeepers`);
    
    // Calculate match scores and format results
    const matchedHousekeepers = results.map((hk, index) => {
      let matchScore = 85 - (index * 5); // Base score decreasing by rank
      
      // Adjust score based on criteria
      if (hk.avgRating >= 4.5) matchScore += 10;
      if (hk.reviewCount >= 10) matchScore += 5;
      if (hk.backgroundChecked) matchScore += 5;
      if (hk.insured) matchScore += 5;
      
      // Price bonus (lower price = higher score within budget)
      const priceRatio = hk.price / maxPrice;
      if (priceRatio <= 0.7) matchScore += 10;
      else if (priceRatio <= 0.9) matchScore += 5;

      return {
        ...hk,
        matchScore: Math.min(100, Math.max(60, matchScore)),
        services: hk.services ? hk.services.split(',') : []
      };
    });

    res.json({
      success: true,
      matches: matchedHousekeepers,
      searchCriteria: {
        service, date, time, duration, location, maxPrice, urgency
      }
    });
  });
});

// API: Quick Booking - Tạo booking nhanh
app.post('/api/quick-booking/create', (req, res) => {
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
    housekeeperName,
    urgency,
    isQuickBooking = true
  } = req.body;

  console.log('⚡ Creating quick booking:', {
    customerId, housekeeperId, service, date, time, urgency
  });

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
    urgency,
    isQuickBooking,
    createdAt: new Date()
  };

  const sql = `INSERT INTO bookings 
    (customerId, housekeeperId, service, startDate, time, duration, location, notes, status, totalPrice, customerName, customerEmail, customerPhone, housekeeperName, urgency, isQuickBooking, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
  const values = [
    customerId, housekeeperId, service, date, time, duration, location, notes, 
    'pending', totalPrice, customerName, customerEmail, customerPhone, housekeeperName, urgency, isQuickBooking, new Date()
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating quick booking:', err);
      return res.status(500).json({ error: err });
    }

    const bookingId = result.insertId;
    const newBooking = { ...bookingData, id: bookingId };

    console.log('⚡ QUICK BOOKING CREATED:');
    console.log('- Booking ID:', bookingId);
    console.log('- Customer ID:', customerId);
    console.log('- Housekeeper ID:', housekeeperId);
    console.log('- Urgency:', urgency);
    console.log('- Service:', service);

    // Send urgent notification to housekeeper for quick bookings
    const notificationTitle = urgency === 'asap' 
      ? '🚨 Đơn đặt lịch KHẨN CẤP!' 
      : urgency === 'urgent' 
        ? '⚡ Đơn đặt lịch GẤP!'
        : '📋 Đơn đặt lịch nhanh mới';

    const notificationMessage = urgency === 'asap'
      ? `${customerName} cần dịch vụ ${service} NGAY LẬP TỨC!`
      : urgency === 'urgent'
        ? `${customerName} cần dịch vụ ${service} trong 6h tới`
        : `${customerName} đã đặt lịch dịch vụ ${service} (Đặt nhanh)`;

    const notificationToHousekeeper = {
      id: Date.now(),
      type: 'quick_booking',
      title: notificationTitle,
      message: notificationMessage,
      bookingId: bookingId,
      booking: newBooking,
      urgency: urgency,
      timestamp: new Date(),
      read: false
    };

    // Get housekeeper's userId and send notification
    db.query('SELECT userId FROM housekeepers WHERE id = ?', [housekeeperId], (err, housekeeperResults) => {
      if (err || housekeeperResults.length === 0) {
        console.error('Error finding housekeeper userId:', err);
        return res.json({ success: true, booking: newBooking, id: bookingId });
      }

      const housekeeperUserId = housekeeperResults[0].userId;
      console.log('📤 Sending quick booking notification to housekeeper userId:', housekeeperUserId);

      // Store notification in database
      const notificationSql = `INSERT INTO notifications 
        (userId, type, title, message, bookingId, urgency, createdAt, isRead) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const notificationValues = [
        housekeeperUserId, 'quick_booking', notificationTitle, notificationMessage, 
        bookingId, urgency, new Date(), false
      ];

      db.query(notificationSql, notificationValues, (err) => {
        if (err) {
          console.error('Error saving notification:', err);
        } else {
          console.log('✅ Quick booking notification saved to database');
        }

        // Send real-time notification via WebSocket
        if (io) {
          io.emit(`notification_${housekeeperUserId}`, notificationToHousekeeper);
          console.log('📡 Quick booking notification sent via WebSocket');
        }

        res.json({ success: true, booking: newBooking, id: bookingId });
      });
    });
  });
});

// API: Đặt lịch (Regular booking)
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

        // Tạo tin nhắn chào tự động
        const welcomeMessage = `Xin chào! Tôi đã nhận được yêu cầu đặt lịch dịch vụ ${service} của bạn. Tôi sẽ xác nhận sớm nhất có thể. Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi! 😊`;
        
        const chatSql = `INSERT INTO chat_messages (bookingId, senderId, receiverId, message, messageType, createdAt) VALUES (?, ?, ?, ?, 'text', NOW())`;
        
        db.query(chatSql, [bookingId, housekeeperUserId, customerId, welcomeMessage], (chatErr, chatResult) => {
          if (chatErr) {
            console.error('Error creating welcome message:', chatErr);
          } else {
            console.log('✅ Welcome message created for booking:', bookingId);
            
            // Gửi WebSocket event cho tin nhắn chào
            io.emit('new_message', {
              id: chatResult.insertId,
              bookingId: parseInt(bookingId),
              senderId: housekeeperUserId,
              receiverId: customerId,
              message: welcomeMessage,
              messageType: 'text',
              senderName: housekeeperName,
              receiverName: customerName,
              timestamp: new Date()
            });
          }
        });
      }
    });

    res.json(newBooking);
  });
});

// API: Housekeeper xác nhận booking
app.post('/api/bookings/:id/confirm', (req, res) => {
  const bookingId = req.params.id;
  const { housekeeperId } = req.body; // Lấy housekeeperId từ request body
  
  // Kiểm tra trạng thái xác minh và phê duyệt của housekeeper trước khi cho phép xác nhận
  db.query('SELECT u.isVerified, u.isApproved FROM users u JOIN bookings b ON u.id = b.housekeeperId WHERE b.id = ?', 
    [bookingId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      console.error('Error checking housekeeper verification:', verifyErr);
      return res.status(500).json({ error: 'Lỗi kiểm tra trạng thái xác minh' });
    }
    
    if (verifyResults.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy booking' });
    }
    
    const housekeeper = verifyResults[0];
    if (!housekeeper.isVerified || !housekeeper.isApproved) {
      return res.status(403).json({ 
        error: 'Bạn cần được xác minh và phê duyệt bởi admin trước khi có thể xác nhận booking',
        needsVerification: !housekeeper.isVerified,
        needsApproval: !housekeeper.isApproved
      });
    }
    
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
  socket.on('join', ({ userId, role, userName }) => {
    // Store user with both string and number keys to handle type mismatches
    const userIdStr = String(userId);
    const userIdNum = parseInt(userId);
    
    const userInfo = { socketId: socket.id, role, userId: userId, userName };
    activeUsers.set(userId, userInfo);
    activeUsers.set(userIdStr, userInfo);
    activeUsers.set(userIdNum, userInfo);
    
    socket.userId = userId;
    socket.role = role;
    socket.userName = userName;
    
    // Cập nhật trạng thái available cho housekeeper khi đăng nhập
    if (role === 'housekeeper') {
      db.query('UPDATE housekeepers SET available = 1, lastOnline = NOW() WHERE userId = ?', [userId], (err) => {
        if (err) {
          console.error('Error updating housekeeper availability:', err);
        } else {
          console.log(`🟢 Housekeeper ${userId} is now AVAILABLE`);
        }
      });
    }
    
    console.log(`✅ User ${userId} (${role}) joined. Active users: ${activeUsers.size}`);
    console.log(`Stored user with keys:`, [userId, userIdStr, userIdNum]);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      const userIdStr = String(socket.userId);
      const userIdNum = parseInt(socket.userId);
      
      // Cập nhật trạng thái available cho housekeeper khi đăng xuất
      if (socket.role === 'housekeeper') {
        db.query('UPDATE housekeepers SET available = 0, lastOnline = NOW() WHERE userId = ?', [socket.userId], (err) => {
          if (err) {
            console.error('Error updating housekeeper availability:', err);
          } else {
            console.log(`🔴 Housekeeper ${socket.userId} is now UNAVAILABLE`);
          }
        });
      }
      
      activeUsers.delete(socket.userId);
      activeUsers.delete(userIdStr);
      activeUsers.delete(userIdNum);
      
      console.log(`❌ User ${socket.userId} disconnected. Active users: ${activeUsers.size}`);
    }
  });

  // Call signaling handlers
  socket.on('call_offer', ({ targetUserId, offer, isVideoCall, callerId }) => {
    console.log(`📞 Call offer from ${callerId || socket.userId} to ${targetUserId}`);
    console.log(`📞 Caller name: ${socket.userName}`);
    console.log(`📞 Active users:`, Array.from(activeUsers.keys()));
    
    const actualCallerId = callerId || socket.userId;
    const targetUser = activeUsers.get(targetUserId) || activeUsers.get(String(targetUserId)) || activeUsers.get(parseInt(targetUserId));
    
    if (targetUser) {
      const callData = {
        callerId: actualCallerId,
        callerName: socket.userName || 'Người dùng',
        offer,
        isVideoCall
      };
      
      io.to(targetUser.socketId).emit('incoming_call', callData);
      console.log(`✅ Call offer sent to ${targetUserId}:`, callData);
    } else {
      socket.emit('call_failed', { error: 'User not available' });
      console.log(`❌ Target user ${targetUserId} not found or offline`);
      console.log(`❌ Available users:`, Array.from(activeUsers.keys()));
    }
  });

  socket.on('call_answer', ({ targetUserId, answer }) => {
    console.log(`📞 Call answer from ${socket.userId} to ${targetUserId}`);
    
    const targetUser = activeUsers.get(targetUserId) || activeUsers.get(String(targetUserId)) || activeUsers.get(parseInt(targetUserId));
    
    if (targetUser) {
      io.to(targetUser.socketId).emit('call_answer', { answer });
      console.log(`✅ Call answer sent to ${targetUserId}`);
    }
  });

  socket.on('call_rejected', ({ targetUserId }) => {
    console.log(`📞 Call rejected by ${socket.userId} to ${targetUserId}`);
    
    const targetUser = activeUsers.get(targetUserId) || activeUsers.get(String(targetUserId)) || activeUsers.get(parseInt(targetUserId));
    
    if (targetUser) {
      io.to(targetUser.socketId).emit('call_rejected', { userId: socket.userId });
      console.log(`✅ Call rejection sent to ${targetUserId}`);
    }
  });

  socket.on('ice_candidate', ({ candidate, targetUserId }) => {
    const targetUser = activeUsers.get(targetUserId) || activeUsers.get(String(targetUserId)) || activeUsers.get(parseInt(targetUserId));
    
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice_candidate', { candidate });
    }
  });

  socket.on('call_ended', ({ targetUserId }) => {
    console.log(`📞 Call ended by ${socket.userId}`);
    
    if (targetUserId) {
      const targetUser = activeUsers.get(targetUserId) || activeUsers.get(String(targetUserId)) || activeUsers.get(parseInt(targetUserId));
      
      if (targetUser) {
        io.to(targetUser.socketId).emit('call_ended');
        console.log(`✅ Call end notification sent to ${targetUserId}`);
      }
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

// ========================
// REPORTS API - Báo cáo vi phạm
// ========================

// API: Tạo báo cáo vi phạm
app.post('/api/reports', (req, res) => {
  const { 
    bookingId, 
    customerId, 
    housekeeperId, 
    reportType, 
    title, 
    description, 
    evidence, 
    severity 
  } = req.body;

  // Validate required fields
  if (!bookingId || !customerId || !housekeeperId || !reportType || !title || !description) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin bắt buộc: bookingId, customerId, housekeeperId, reportType, title, description' 
    });
  }

  // Validate reportType
  const validReportTypes = ['late_arrival', 'no_show', 'inappropriate_behavior', 'poor_service', 'damage', 'other'];
  if (!validReportTypes.includes(reportType)) {
    return res.status(400).json({ 
      error: 'Loại báo cáo không hợp lệ. Phải là: ' + validReportTypes.join(', ') 
    });
  }

  // Validate severity
  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (severity && !validSeverities.includes(severity)) {
    return res.status(400).json({ 
      error: 'Mức độ nghiêm trọng không hợp lệ. Phải là: ' + validSeverities.join(', ') 
    });
  }

  const sql = `INSERT INTO reports 
    (bookingId, customerId, housekeeperId, reportType, title, description, evidence, severity, status, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`;
    
  const values = [
    bookingId, 
    customerId, 
    housekeeperId, 
    reportType, 
    title, 
    description, 
    evidence || null, 
    severity || 'medium'
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating report:', err);
      return res.status(500).json({ error: 'Lỗi tạo báo cáo: ' + err.message });
    }

    console.log(`✅ Report created with ID: ${result.insertId}`);
    
    // Tạo notification cho admin về báo cáo mới
    const adminNotificationSql = `INSERT INTO notifications 
      (userId, type, title, message, data, createdAt) 
      SELECT u.id, 'new_report', ?, ?, ?, NOW()
      FROM users u WHERE u.role = 'admin'`;
    
    const notificationData = JSON.stringify({
      reportId: result.insertId,
      bookingId: bookingId,
      reportType: reportType,
      severity: severity || 'medium'
    });

    db.query(adminNotificationSql, [
      'Báo cáo vi phạm mới',
      `Khách hàng đã báo cáo vi phạm: ${title}`,
      notificationData
    ], (notifErr) => {
      if (notifErr) {
        console.error('Error creating admin notification:', notifErr);
      } else {
        console.log('✅ Admin notification created for new report');
      }
    });

    res.status(201).json({
      message: 'Báo cáo đã được tạo thành công',
      reportId: result.insertId,
      status: 'pending'
    });
  });
});

// API: Lấy danh sách báo cáo của customer
app.get('/api/reports/customer/:customerId', (req, res) => {
  const { customerId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  let sql = `
    SELECT r.*, 
           b.service, b.startDate, b.customerName, b.housekeeperName,
           u.fullName as housekeeperFullName, u.avatar as housekeeperAvatar
    FROM reports r
    LEFT JOIN bookings b ON r.bookingId = b.id
    LEFT JOIN users u ON r.housekeeperId = u.id
    WHERE r.customerId = ?
  `;
  const params = [customerId];

  // Filter theo status nếu có
  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }

  // Pagination
  const offset = (page - 1) * limit;
  sql += ' ORDER BY r.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching customer reports:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách báo cáo: ' + err.message });
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM reports WHERE customerId = ?${status ? ' AND status = ?' : ''}`;
    const countParams = status ? [customerId, status] : [customerId];

    db.query(countSql, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting customer reports:', countErr);
        return res.status(500).json({ error: 'Lỗi đếm báo cáo: ' + countErr.message });
      }

      res.json({
        reports: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countResults[0].total / limit),
          totalReports: countResults[0].total,
          limit: parseInt(limit)
        }
      });
    });
  });
});

// API: Lấy tất cả báo cáo (cho admin)
app.get('/api/reports', (req, res) => {
  const { status, reportType, severity, page = 1, limit = 20 } = req.query;

  let sql = `
    SELECT r.*, 
           b.service, b.startDate, b.customerName, b.housekeeperName,
           c.fullName as customerFullName, c.email as customerEmail,
           h.fullName as housekeeperFullName, h.email as housekeeperEmail
    FROM reports r
    LEFT JOIN bookings b ON r.bookingId = b.id
    LEFT JOIN users c ON r.customerId = c.id
    LEFT JOIN users h ON r.housekeeperId = h.id
    WHERE 1=1
  `;
  const params = [];

  // Filters
  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }

  if (reportType) {
    sql += ' AND r.reportType = ?';
    params.push(reportType);
  }

  if (severity) {
    sql += ' AND r.severity = ?';
    params.push(severity);
  }

  // Pagination
  const offset = (page - 1) * limit;
  sql += ' ORDER BY r.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching all reports:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách báo cáo: ' + err.message });
    }

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM reports WHERE 1=1';
    const countParams = [];

    if (status) {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    if (reportType) {
      countSql += ' AND reportType = ?';
      countParams.push(reportType);
    }
    if (severity) {
      countSql += ' AND severity = ?';
      countParams.push(severity);
    }

    db.query(countSql, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting reports:', countErr);
        return res.status(500).json({ error: 'Lỗi đếm báo cáo: ' + countErr.message });
      }

      res.json({
        reports: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countResults[0].total / limit),
          totalReports: countResults[0].total,
          limit: parseInt(limit)
        }
      });
    });
  });
});

// API: Cập nhật trạng thái báo cáo (cho admin)
app.put('/api/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const { status, adminResponse } = req.body;

  // Validate status
  const validStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Trạng thái không hợp lệ. Phải là: ' + validStatuses.join(', ') 
    });
  }

  let sql = 'UPDATE reports SET updatedAt = NOW()';
  const params = [];

  if (status) {
    sql += ', status = ?';
    params.push(status);
    
    if (status === 'resolved' || status === 'dismissed') {
      sql += ', resolvedAt = NOW()';
    }
  }

  if (adminResponse) {
    sql += ', adminResponse = ?';
    params.push(adminResponse);
  }

  sql += ' WHERE id = ?';
  params.push(reportId);

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error updating report:', err);
      return res.status(500).json({ error: 'Lỗi cập nhật báo cáo: ' + err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    // Nếu có cập nhật status, gửi notification cho customer
    if (status) {
      const getReportSql = 'SELECT customerId, title FROM reports WHERE id = ?';
      db.query(getReportSql, [reportId], (getErr, reportResults) => {
        if (!getErr && reportResults.length > 0) {
          const customerId = reportResults[0].customerId;
          const reportTitle = reportResults[0].title;
          
          const notificationSql = `INSERT INTO notifications 
            (userId, type, title, message, data, createdAt) 
            VALUES (?, 'report_update', ?, ?, ?, NOW())`;
          
          const notificationData = JSON.stringify({
            reportId: reportId,
            newStatus: status,
            adminResponse: adminResponse
          });

          const statusMessages = {
            investigating: 'đang được điều tra',
            resolved: 'đã được giải quyết',
            dismissed: 'đã bị từ chối'
          };

          db.query(notificationSql, [
            customerId,
            'Cập nhật báo cáo vi phạm',
            `Báo cáo "${reportTitle}" ${statusMessages[status] || 'đã được cập nhật'}`,
            notificationData
          ], (notifErr) => {
            if (notifErr) {
              console.error('Error creating customer notification:', notifErr);
            } else {
              console.log('✅ Customer notification created for report update');
            }
          });
        }
      });
    }

    res.json({
      message: 'Báo cáo đã được cập nhật thành công',
      reportId: reportId,
      affectedRows: result.affectedRows
    });
  });
});

// API: Lấy chi tiết một báo cáo
app.get('/api/reports/:reportId', (req, res) => {
  const { reportId } = req.params;

  const sql = `
    SELECT r.*, 
           b.service, b.startDate, b.customerName, b.housekeeperName, b.location, b.notes,
           c.fullName as customerFullName, c.email as customerEmail, c.phone as customerPhone,
           h.fullName as housekeeperFullName, h.email as housekeeperEmail, h.phone as housekeeperPhone
    FROM reports r
    LEFT JOIN bookings b ON r.bookingId = b.id
    LEFT JOIN users c ON r.customerId = c.id
    LEFT JOIN users h ON r.housekeeperId = h.id
    WHERE r.id = ?
  `;

  db.query(sql, [reportId], (err, results) => {
    if (err) {
      console.error('Error fetching report details:', err);
      return res.status(500).json({ error: 'Lỗi lấy chi tiết báo cáo: ' + err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy báo cáo' });
    }

    res.json(results[0]);
  });
});

// ========================
// WARNINGS API - Cảnh cáo housekeeper
// ========================

// API: Gửi cảnh cáo đến housekeeper
app.post('/api/warnings', (req, res) => {
  const { 
    housekeeperId, 
    reportId, 
    adminId, 
    warningType, 
    title, 
    message, 
    severity,
    expiresAt 
  } = req.body;

  // Validate required fields
  if (!housekeeperId || !reportId || !adminId || !title || !message) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin bắt buộc: housekeeperId, reportId, adminId, title, message' 
    });
  }

  // Validate warningType
  const validWarningTypes = ['verbal', 'written', 'final', 'suspension'];
  if (warningType && !validWarningTypes.includes(warningType)) {
    return res.status(400).json({ 
      error: 'Loại cảnh cáo không hợp lệ. Phải là: ' + validWarningTypes.join(', ') 
    });
  }

  const sql = `INSERT INTO warnings 
    (housekeeperId, reportId, adminId, warningType, title, message, severity, expiresAt, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
    
  const values = [
    housekeeperId, 
    reportId, 
    adminId, 
    warningType || 'written', 
    title, 
    message, 
    severity || 'medium',
    expiresAt || null
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error creating warning:', err);
      return res.status(500).json({ error: 'Lỗi tạo cảnh cáo: ' + err.message });
    }

    console.log(`✅ Warning created with ID: ${result.insertId} for housekeeper ${housekeeperId}`);
    
    // Tạo notification cho housekeeper về cảnh cáo mới
    const notificationSql = `INSERT INTO notifications 
      (userId, type, title, message, data, createdAt) 
      VALUES (?, 'warning_received', ?, ?, ?, NOW())`;
    
    const notificationData = JSON.stringify({
      warningId: result.insertId,
      reportId: reportId,
      warningType: warningType || 'written',
      severity: severity || 'medium'
    });

    db.query(notificationSql, [
      housekeeperId,
      'Bạn đã nhận cảnh cáo từ quản trị viên',
      `Cảnh cáo: ${title}`,
      notificationData
    ], (notifErr) => {
      if (notifErr) {
        console.error('Error creating housekeeper notification:', notifErr);
      } else {
        console.log('✅ Housekeeper notification created for warning');
      }
    });

    // Nếu là suspension, tạm khóa tài khoản housekeeper
    if (warningType === 'suspension' && expiresAt) {
      const suspendSql = 'UPDATE users SET isApproved = FALSE WHERE id = ? AND role = "housekeeper"';
      db.query(suspendSql, [housekeeperId], (suspendErr) => {
        if (suspendErr) {
          console.error('Error suspending housekeeper:', suspendErr);
        } else {
          console.log(`✅ Housekeeper ${housekeeperId} suspended until ${expiresAt}`);
        }
      });
    }

    res.status(201).json({
      message: 'Cảnh cáo đã được gửi thành công',
      warningId: result.insertId,
      housekeeperId: housekeeperId
    });
  });
});

// API: Lấy danh sách cảnh cáo của housekeeper
app.get('/api/warnings/housekeeper/:housekeeperId', (req, res) => {
  const { housekeeperId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const sql = `
    SELECT w.*, 
           r.title as reportTitle, r.reportType,
           a.fullName as adminName
    FROM warnings w
    LEFT JOIN reports r ON w.reportId = r.id
    LEFT JOIN users a ON w.adminId = a.id
    WHERE w.housekeeperId = ?
    ORDER BY w.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  const offset = (page - 1) * limit;
  const params = [housekeeperId, parseInt(limit), parseInt(offset)];

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching housekeeper warnings:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách cảnh cáo: ' + err.message });
    }

    // Get total count
    const countSql = 'SELECT COUNT(*) as total FROM warnings WHERE housekeeperId = ?';
    db.query(countSql, [housekeeperId], (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting warnings:', countErr);
        return res.status(500).json({ error: 'Lỗi đếm cảnh cáo: ' + countErr.message });
      }

      res.json({
        warnings: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countResults[0].total / limit),
          totalWarnings: countResults[0].total,
          limit: parseInt(limit)
        }
      });
    });
  });
});

// API: Lấy tất cả cảnh cáo (cho admin)
app.get('/api/warnings', (req, res) => {
  const { housekeeperId, warningType, severity, page = 1, limit = 20 } = req.query;

  let sql = `
    SELECT w.*, 
           h.fullName as housekeeperName, h.email as housekeeperEmail,
           a.fullName as adminName,
           r.title as reportTitle, r.reportType
    FROM warnings w
    LEFT JOIN users h ON w.housekeeperId = h.id
    LEFT JOIN users a ON w.adminId = a.id
    LEFT JOIN reports r ON w.reportId = r.id
    WHERE 1=1
  `;
  const params = [];

  // Filters
  if (housekeeperId) {
    sql += ' AND w.housekeeperId = ?';
    params.push(housekeeperId);
  }

  if (warningType) {
    sql += ' AND w.warningType = ?';
    params.push(warningType);
  }

  if (severity) {
    sql += ' AND w.severity = ?';
    params.push(severity);
  }

  // Pagination
  const offset = (page - 1) * limit;
  sql += ' ORDER BY w.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching all warnings:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách cảnh cáo: ' + err.message });
    }

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM warnings WHERE 1=1';
    const countParams = [];

    if (housekeeperId) {
      countSql += ' AND housekeeperId = ?';
      countParams.push(housekeeperId);
    }
    if (warningType) {
      countSql += ' AND warningType = ?';
      countParams.push(warningType);
    }
    if (severity) {
      countSql += ' AND severity = ?';
      countParams.push(severity);
    }

    db.query(countSql, countParams, (countErr, countResults) => {
      if (countErr) {
        console.error('Error counting warnings:', countErr);
        return res.status(500).json({ error: 'Lỗi đếm cảnh cáo: ' + countErr.message });
      }

      res.json({
        warnings: results,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(countResults[0].total / limit),
          totalWarnings: countResults[0].total,
          limit: parseInt(limit)
        }
      });
    });
  });
});

// API: Đánh dấu cảnh cáo đã đọc
app.put('/api/warnings/:warningId/read', (req, res) => {
  const { warningId } = req.params;

  const sql = 'UPDATE warnings SET isRead = TRUE, readAt = NOW() WHERE id = ?';
  
  db.query(sql, [warningId], (err, result) => {
    if (err) {
      console.error('Error marking warning as read:', err);
      return res.status(500).json({ error: 'Lỗi đánh dấu cảnh cáo: ' + err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cảnh cáo' });
    }

    res.json({
      message: 'Đã đánh dấu cảnh cáo là đã đọc',
      warningId: warningId
    });
  });
});

// API: Lấy thống kê cảnh cáo của housekeeper
app.get('/api/warnings/stats/:housekeeperId', (req, res) => {
  const { housekeeperId } = req.params;

  const sql = `
    SELECT 
      COUNT(*) as totalWarnings,
      COUNT(CASE WHEN warningType = 'verbal' THEN 1 END) as verbalWarnings,
      COUNT(CASE WHEN warningType = 'written' THEN 1 END) as writtenWarnings,
      COUNT(CASE WHEN warningType = 'final' THEN 1 END) as finalWarnings,
      COUNT(CASE WHEN warningType = 'suspension' THEN 1 END) as suspensions,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as criticalWarnings,
      COUNT(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recentWarnings
    FROM warnings 
    WHERE housekeeperId = ?
  `;

  db.query(sql, [housekeeperId], (err, results) => {
    if (err) {
      console.error('Error fetching warning stats:', err);
      return res.status(500).json({ error: 'Lỗi lấy thống kê cảnh cáo: ' + err.message });
    }

    res.json(results[0] || {
      totalWarnings: 0,
      verbalWarnings: 0,
      writtenWarnings: 0,
      finalWarnings: 0,
      suspensions: 0,
      criticalWarnings: 0,
      recentWarnings: 0
    });
  });
});

// ========================
// ADMIN DASHBOARD APIs
// ========================

// API: Thống kê tổng quan hệ thống
app.get('/api/admin/dashboard/overview', (req, res) => {
  const queries = [
    // Tổng số users (không tính admin)
    'SELECT COUNT(*) as totalUsers FROM users WHERE role != "admin"',
    // Tổng số housekeepers
    'SELECT COUNT(*) as totalHousekeepers FROM users WHERE role = "housekeeper"',
    // Tổng số customers
    'SELECT COUNT(*) as totalCustomers FROM users WHERE role = "customer"',
    // Tổng số bookings
    'SELECT COUNT(*) as totalBookings FROM bookings',
    // Bookings hôm nay
    'SELECT COUNT(*) as todayBookings FROM bookings WHERE DATE(createdAt) = CURDATE()',
    // Revenue hôm nay (từ payments đã thành công)
    'SELECT COALESCE(SUM(p.amount), 0) as todayRevenue FROM payments p JOIN bookings b ON p.bookingId = b.id WHERE DATE(p.paidAt) = CURDATE() AND p.status = "success"',
    // Housekeepers đang hoạt động (available = 1)
    'SELECT COUNT(*) as activeHousekeepers FROM housekeepers WHERE available = 1',
    // Housekeepers đã xác minh và phê duyệt
    'SELECT COUNT(*) as verifiedHousekeepers FROM users WHERE role = "housekeeper" AND isVerified = 1 AND isApproved = 1',
    // Housekeepers chưa xác minh
    'SELECT COUNT(*) as unverifiedHousekeepers FROM users WHERE role = "housekeeper" AND (isVerified = 0 OR isApproved = 0)',
    // Housekeepers sẵn sàng nhận việc (verified + approved + available)
    'SELECT COUNT(*) as readyHousekeepers FROM users u JOIN housekeepers h ON u.id = h.userId WHERE u.role = "housekeeper" AND u.isVerified = 1 AND u.isApproved = 1 AND h.available = 1'
  ];

  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      });
    })
  )).then(results => {
    res.json({
      totalUsers: results[0].totalUsers,
      totalHousekeepers: results[1].totalHousekeepers,
      totalCustomers: results[2].totalCustomers,
      totalBookings: results[3].totalBookings,
      todayBookings: results[4].todayBookings,
      todayRevenue: results[5].todayRevenue,
      activeHousekeepers: results[6].activeHousekeepers,
      verifiedHousekeepers: results[7].verifiedHousekeepers,
      unverifiedHousekeepers: results[8].unverifiedHousekeepers,
      readyHousekeepers: results[9].readyHousekeepers
    });
  }).catch(err => {
    console.error('Error fetching overview stats:', err);
    res.status(500).json({ error: err.message });
  });
});

// API: Admin toggle trạng thái available của housekeeper
app.put('/api/admin/housekeepers/:userId/availability', (req, res) => {
  const { userId } = req.params;
  const { available } = req.body;
  
  if (available === undefined) {
    return res.status(400).json({ error: 'available status is required' });
  }
  
  const sql = 'UPDATE housekeepers SET available = ?, lastOnline = NOW() WHERE userId = ?';
  
  db.query(sql, [available ? 1 : 0, userId], (err, result) => {
    if (err) {
      console.error('Error updating housekeeper availability:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Housekeeper not found' });
    }
    
    console.log(`🔄 Admin set housekeeper ${userId} availability to ${available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    res.json({ 
      success: true, 
      message: `Housekeeper availability updated to ${available ? 'available' : 'unavailable'}` 
    });
  });
});

// API: Debug - Xem tất cả housekeepers
app.get('/api/debug/housekeepers', (req, res) => {
  const sql = `
    SELECT u.id, u.fullName, u.email, u.role, u.isVerified, u.isApproved, 
           h.available, h.rating, h.completedJobs, h.userId as housekeeperId
    FROM users u 
    LEFT JOIN housekeepers h ON u.id = h.userId 
    WHERE u.role = 'housekeeper'
    ORDER BY u.id
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Thống kê chi tiết người giúp việc
app.get('/api/admin/dashboard/housekeeper-details', (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN u.isVerified = 1 AND u.isApproved = 1 THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN u.isVerified = 0 OR u.isApproved = 0 THEN 1 ELSE 0 END) as unverified,
      SUM(CASE WHEN h.available = 1 THEN 1 ELSE 0 END) as available,
      SUM(CASE WHEN h.available = 0 THEN 1 ELSE 0 END) as unavailable,
      SUM(CASE WHEN u.isVerified = 1 AND u.isApproved = 1 AND h.available = 1 THEN 1 ELSE 0 END) as ready,
      AVG(h.rating) as avgRating,
      SUM(h.completedJobs) as totalCompletedJobs
    FROM users u
    LEFT JOIN housekeepers h ON u.id = h.userId
    WHERE u.role = 'housekeeper'
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching housekeeper details:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const stats = results[0];
    
    // Debug logging
    console.log('🔍 HOUSEKEEPER STATS DEBUG:');
    console.log('Raw query result:', stats);
    
    // Thêm query debug để xem chi tiết
    const debugSql = `
      SELECT u.id, u.fullName, u.role, u.isVerified, u.isApproved, h.available
      FROM users u 
      LEFT JOIN housekeepers h ON u.id = h.userId 
      WHERE u.role = 'housekeeper'
    `;
    
    db.query(debugSql, (debugErr, debugResults) => {
      if (!debugErr) {
        console.log('📋 All housekeepers in database:');
        debugResults.forEach((hk, index) => {
          console.log(`${index + 1}. ${hk.fullName} - Verified: ${hk.isVerified}, Approved: ${hk.isApproved}, Available: ${hk.available}`);
        });
      }
    });
    
    res.json({
      total: stats.total || 0,
      verified: stats.verified || 0,
      unverified: stats.unverified || 0,
      available: stats.available || 0,
      unavailable: stats.unavailable || 0,
      ready: stats.ready || 0,
      avgRating: parseFloat(stats.avgRating || 0).toFixed(1),
      totalCompletedJobs: stats.totalCompletedJobs || 0
    });
  });
});

// API: Thống kê bookings theo trạng thái
app.get('/api/admin/dashboard/booking-stats', (req, res) => {
  const sql = `
    SELECT 
      status,
      COUNT(*) as count,
      COALESCE(SUM(totalPrice), 0) as totalValue
    FROM bookings 
    GROUP BY status
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching booking stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Top housekeepers theo số đơn hoàn thành
app.get('/api/admin/dashboard/top-housekeepers', (req, res) => {
  const sql = `
    SELECT 
      u.fullName,
      u.email,
      h.completedJobs,
      h.rating,
      h.totalReviews,
      COUNT(b.id) as totalBookings,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.totalPrice ELSE 0 END), 0) as totalEarnings
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    LEFT JOIN bookings b ON h.id = b.housekeeperId
    GROUP BY h.id, u.fullName, u.email, h.completedJobs, h.rating, h.totalReviews
    ORDER BY h.completedJobs DESC, h.rating DESC
    LIMIT 10
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching top housekeepers:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Thống kê theo thời gian (7 ngày gần nhất)
app.get('/api/admin/dashboard/time-stats', (req, res) => {
  const sql = `
    SELECT 
      DATE(createdAt) as date,
      COUNT(*) as bookings,
      COALESCE(SUM(totalPrice), 0) as revenue,
      COUNT(DISTINCT customerId) as uniqueCustomers
    FROM bookings 
    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY DATE(createdAt)
    ORDER BY date DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching time stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Thống kê dịch vụ phổ biến
app.get('/api/admin/dashboard/service-stats', (req, res) => {
  const sql = `
    SELECT 
      service,
      COUNT(*) as bookingCount,
      COALESCE(SUM(totalPrice), 0) as totalRevenue,
      AVG(totalPrice) as avgPrice
    FROM bookings 
    WHERE service IS NOT NULL
    GROUP BY service
    ORDER BY bookingCount DESC
    LIMIT 10
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching service stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Danh sách housekeepers với trạng thái hoạt động
app.get('/api/admin/housekeepers/status', (req, res) => {
  const sql = `
    SELECT 
      u.id,
      u.fullName,
      u.email,
      u.phone,
      h.available,
      h.lastOnline,
      h.completedJobs,
      h.rating,
      h.totalReviews,
      u.lastActiveAt,
      u.isVerified,
      u.isApproved
    FROM housekeepers h
    JOIN users u ON h.userId = u.id
    ORDER BY h.lastOnline DESC, u.lastActiveAt DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching housekeeper status:', err);
      return res.status(500).json({ error: err.message });
    }
    
    const housekeepersWithStatus = results.map(hk => ({
      ...hk,
      status: hk.available ? 'available' : 'unavailable',
      lastSeen: hk.lastOnline || hk.lastActiveAt,
      isOnline: hk.lastOnline && new Date(hk.lastOnline) > new Date(Date.now() - 30 * 60 * 1000) // 30 phút
    }));
    
    res.json(housekeepersWithStatus);
  });
});

// API: Thống kê người dùng theo tháng
app.get('/api/admin/dashboard/user-growth', (req, res) => {
  const sql = `
    SELECT 
      DATE_FORMAT(createdAt, '%Y-%m') as month,
      role,
      COUNT(*) as count
    FROM users 
    WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), role
    ORDER BY month DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching user growth stats:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

// API: Cập nhật trạng thái housekeeper (approve/verify)
app.put('/api/admin/housekeepers/:userId/status', (req, res) => {
  const { userId } = req.params;
  const { isApproved, isVerified } = req.body;
  
  // Update user table
  const userSql = 'UPDATE users SET isApproved = ?, isVerified = ?, updatedAt = NOW() WHERE id = ? AND role = "housekeeper"';
  
  db.query(userSql, [isApproved, isVerified, userId], (err, result) => {
    if (err) {
      console.error('Error updating housekeeper status:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Housekeeper not found' });
    }
    
    // If both verified and approved, set available = 1 in housekeepers table
    if (isApproved && isVerified) {
      const housekeeperSql = 'UPDATE housekeepers SET available = 1, updatedAt = NOW() WHERE userId = ?';
      
      db.query(housekeeperSql, [userId], (hkErr, hkResult) => {
        if (hkErr) {
          console.error('Error updating housekeeper availability:', hkErr);
        } else {
          console.log(`✅ Housekeeper ${userId} set to AVAILABLE (verified + approved)`);
        }
      });
    } else {
      // If not fully approved/verified, set available = 0
      const housekeeperSql = 'UPDATE housekeepers SET available = 0, updatedAt = NOW() WHERE userId = ?';
      
      db.query(housekeeperSql, [userId], (hkErr, hkResult) => {
        if (hkErr) {
          console.error('Error updating housekeeper availability:', hkErr);
        } else {
          console.log(`🔴 Housekeeper ${userId} set to UNAVAILABLE (not fully approved)`);
        }
      });
    }
    
    // Lấy thông tin housekeeper để gửi WebSocket event
    db.query('SELECT fullName FROM users WHERE id = ?', [userId], (nameErr, nameResults) => {
      if (!nameErr && nameResults.length > 0) {
        const housekeeperName = nameResults[0].fullName;
        
        // Gửi WebSocket event để cập nhật real-time cho tất cả clients
        io.emit('housekeeper_status_updated', {
          userId: userId,
          housekeeperName: housekeeperName,
          isApproved: isApproved,
          isVerified: isVerified,
          available: isApproved && isVerified ? 1 : 0,
          timestamp: new Date().toISOString()
        });
        
        console.log(`📡 WebSocket event sent: housekeeper_status_updated for ${housekeeperName}`);
      }
    });
    
    res.json({ 
      message: 'Housekeeper status updated successfully',
      userId: userId,
      isApproved: isApproved,
      isVerified: isVerified,
      available: isApproved && isVerified ? 1 : 0
    });
  });
});

// ========================
// BOOKING COMPLETION & PAYMENT APIs
// ========================

// API: Housekeeper đánh dấu công việc hoàn thành
app.post('/api/bookings/:id/complete', (req, res) => {
  const bookingId = req.params.id;
  const { housekeeperId, completionNotes } = req.body;
  
  console.log(`🏁 Housekeeper ${housekeeperId} marking booking ${bookingId} as completed`);
  
  // Kiểm tra trạng thái xác minh và phê duyệt của housekeeper trước khi cho phép đánh dấu hoàn thành
  db.query('SELECT isVerified, isApproved FROM users WHERE id = ?', [housekeeperId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      console.error('Error checking housekeeper verification:', verifyErr);
      return res.status(500).json({ error: 'Lỗi kiểm tra trạng thái xác minh' });
    }
    
    if (verifyResults.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy housekeeper' });
    }
    
    const housekeeper = verifyResults[0];
    if (!housekeeper.isVerified || !housekeeper.isApproved) {
      return res.status(403).json({ 
        error: 'Bạn cần được xác minh và phê duyệt bởi admin trước khi có thể đánh dấu công việc hoàn thành',
        needsVerification: !housekeeper.isVerified,
        needsApproval: !housekeeper.isApproved
      });
    }
    
    // Cập nhật booking status thành completed
    db.query('UPDATE bookings SET status = ?, updatedAt = NOW() WHERE id = ? AND housekeeperId = ?', 
      ['completed', bookingId, housekeeperId], (err, result) => {
    if (err) {
      console.error('Error completing booking:', err);
      return res.status(500).json({ error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found or unauthorized' });
    }

    // Lấy thông tin booking để gửi notification
    db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, bookingResults) => {
      if (err || bookingResults.length === 0) {
        return res.status(500).json({ error: 'Error fetching booking details' });
      }

      const booking = bookingResults[0];
      
      // Cập nhật completedJobs cho housekeeper
      db.query('UPDATE housekeepers SET completedJobs = completedJobs + 1 WHERE userId = ?', 
        [housekeeperId], (err) => {
        if (err) console.error('Error updating completed jobs:', err);
      });

      // Tạo payment record
      const paymentSql = `INSERT INTO payments (bookingId, customerId, method, amount, status, createdAt) 
                         VALUES (?, ?, ?, ?, ?, NOW())`;
      db.query(paymentSql, [bookingId, booking.customerId, 'pending', booking.totalPrice, 'pending'], 
        (err, paymentResult) => {
        if (err) console.error('Error creating payment record:', err);
      });

      // Gửi notification cho customer
      const notificationToCustomer = {
        id: Date.now(),
        type: 'booking_completed',
        title: 'Công việc đã hoàn thành',
        message: `${booking.housekeeperName} đã hoàn thành công việc. Vui lòng xác nhận và thanh toán.`,
        bookingId: bookingId,
        booking: booking,
        timestamp: new Date(),
        read: false
      };

      console.log('✅ Sending completion notification to customer:', booking.customerId);
      sendNotificationToUser(booking.customerId, notificationToCustomer);
      
      // Lưu notification vào database
      const notifSql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(notifSql, [
        booking.customerId,
        notificationToCustomer.type,
        notificationToCustomer.title,
        notificationToCustomer.message,
        bookingId,
        JSON.stringify({ ...booking, completionNotes }),
        new Date(),
        0
      ], (notifErr) => {
        if (notifErr) console.error('Error saving notification:', notifErr);
      });

      res.json({ 
        message: 'Booking completed successfully', 
        booking: booking,
        paymentRequired: true
      });
    });
  });
  });
});

// API: Customer xác nhận và thanh toán
app.post('/api/bookings/:id/confirm-payment', (req, res) => {
  const bookingId = req.params.id;
  const { customerId, paymentMethod, rating, review } = req.body;
  
  console.log(`💰 Customer ${customerId} confirming payment for booking ${bookingId}`);
  
  // Cập nhật payment status
  db.query('UPDATE payments SET status = ?, method = ?, paidAt = NOW() WHERE bookingId = ? AND customerId = ?', 
    ['success', paymentMethod, bookingId, customerId], (err, result) => {
    if (err) {
      console.error('Error updating payment:', err);
      return res.status(500).json({ error: err.message });
    }

    // Cập nhật paymentStatus trong bảng bookings
    db.query('UPDATE bookings SET paymentStatus = ? WHERE id = ?', 
      ['success', bookingId], (paymentUpdateErr) => {
      if (paymentUpdateErr) {
        console.error('Error updating booking payment status:', paymentUpdateErr);
      }
    });

    // Lấy thông tin booking
    db.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, bookingResults) => {
      if (err || bookingResults.length === 0) {
        return res.status(500).json({ error: 'Error fetching booking details' });
      }

      const booking = bookingResults[0];

      // Thêm review nếu có
      if (rating && review) {
        const reviewSql = `INSERT INTO reviews (bookingId, housekeeperId, customerId, rating, comment, createdAt) 
                          VALUES (?, ?, ?, ?, ?, NOW())`;
        db.query(reviewSql, [bookingId, booking.housekeeperId, customerId, rating, review], (err) => {
          if (err) console.error('Error saving review:', err);
          
          // Cập nhật rating trung bình cho housekeeper
          const updateRatingSql = `
            UPDATE housekeepers SET 
              rating = (SELECT AVG(rating) FROM reviews WHERE housekeeperId = ?),
              totalReviews = (SELECT COUNT(*) FROM reviews WHERE housekeeperId = ?)
            WHERE userId = ?
          `;
          db.query(updateRatingSql, [booking.housekeeperId, booking.housekeeperId, booking.housekeeperId], 
            (err) => {
            if (err) console.error('Error updating housekeeper rating:', err);
          });
        });
      }

      // Gửi notification cho housekeeper
      const notificationToHousekeeper = {
        id: Date.now(),
        type: 'payment_received',
        title: 'Đã nhận thanh toán',
        message: `${booking.customerName} đã xác nhận và thanh toán ${new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(booking.totalPrice)}`,
        bookingId: bookingId,
        booking: booking,
        timestamp: new Date(),
        read: false
      };

      // Lấy housekeeper userId
      db.query('SELECT userId FROM housekeepers WHERE id = ?', [booking.housekeeperId], (err, hkResults) => {
        if (!err && hkResults.length > 0) {
          const housekeeperUserId = hkResults[0].userId;
          console.log('💸 Sending payment notification to housekeeper:', housekeeperUserId);
          sendNotificationToUser(housekeeperUserId, notificationToHousekeeper);
          
          // Lưu notification vào database
          const notifSql = `INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
          db.query(notifSql, [
            housekeeperUserId,
            notificationToHousekeeper.type,
            notificationToHousekeeper.title,
            notificationToHousekeeper.message,
            bookingId,
            JSON.stringify({ ...booking, paymentMethod, rating, review }),
            new Date(),
            0
          ], (notifErr) => {
            if (notifErr) console.error('Error saving notification:', notifErr);
          });
        }
      });

      res.json({ 
        message: 'Payment confirmed successfully', 
        booking: booking,
        paymentStatus: 'success'
      });
    });
  });
});

// API: Lấy thông tin payment cho booking
app.get('/api/bookings/:id/payment', (req, res) => {
  const bookingId = req.params.id;
  
  const sql = `
    SELECT p.*, b.totalPrice, b.customerName, b.housekeeperName, b.service
    FROM payments p
    JOIN bookings b ON p.bookingId = b.id
    WHERE p.bookingId = ?
  `;
  
  db.query(sql, [bookingId], (err, results) => {
    if (err) {
      console.error('Error fetching payment info:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(results[0]);
  });
});

// ========================
// REVIEWS MANAGEMENT APIs
// ========================

// API: Lấy tất cả reviews (cho admin)
app.get('/api/admin/reviews', (req, res) => {
  const sql = `
    SELECT r.*, 
           u1.fullName as customerName, u1.email as customerEmail,
           u2.fullName as housekeeperName, u2.email as housekeeperEmail,
           b.notes as service, b.startDate as bookingDate
    FROM reviews r
    JOIN users u1 ON r.customerId = u1.id
    JOIN housekeepers h ON r.housekeeperId = h.id
    JOIN users u2 ON h.userId = u2.id
    LEFT JOIN bookings b ON r.bookingId = b.id
    ORDER BY r.createdAt DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching reviews:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });
});

// API: Lấy reviews của một housekeeper cụ thể
app.get('/api/housekeepers/:id/reviews', (req, res) => {
  const housekeeperId = req.params.id;
  
  const sql = `
    SELECT r.*, 
           u.fullName as customerName,
           b.notes as service, b.startDate as bookingDate
    FROM reviews r
    JOIN users u ON r.customerId = u.id
    LEFT JOIN bookings b ON r.bookingId = b.id
    WHERE r.housekeeperId = ? AND r.isVisible = 1
    ORDER BY r.createdAt DESC
  `;
  
  db.query(sql, [housekeeperId], (err, results) => {
    if (err) {
      console.error('Error fetching housekeeper reviews:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json(results);
  });
});

// API: Xóa review (cho admin)
app.delete('/api/admin/reviews/:id', (req, res) => {
  const reviewId = req.params.id;
  
  db.query('DELETE FROM reviews WHERE id = ?', [reviewId], (err, result) => {
    if (err) {
      console.error('Error deleting review:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  });
});

// API: Ẩn/hiện review (cho admin)
app.put('/api/admin/reviews/:id/visibility', (req, res) => {
  const reviewId = req.params.id;
  const { visible } = req.body;
  
  db.query('UPDATE reviews SET isVisible = ? WHERE id = ?', [visible ? 1 : 0, reviewId], (err, result) => {
    if (err) {
      console.error('Error updating review visibility:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    res.json({ message: 'Review visibility updated successfully' });
  });
});

// ========================
// CHAT SYSTEM APIs
// ========================

// API: Lấy tin nhắn của một booking
app.get('/api/bookings/:bookingId/messages', (req, res) => {
  const { bookingId } = req.params;
  
  const sql = `
    SELECT cm.*, 
           sender.fullName as senderName,
           receiver.fullName as receiverName
    FROM chat_messages cm
    JOIN users sender ON cm.senderId = sender.id
    JOIN users receiver ON cm.receiverId = receiver.id
    WHERE cm.bookingId = ?
    ORDER BY cm.createdAt ASC
  `;
  
  db.query(sql, [bookingId], (err, results) => {
    if (err) {
      console.error('Error fetching messages:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`💬 Found ${results.length} messages for booking ${bookingId}`);
    res.json(results);
  });
});

// API: Gửi tin nhắn trong booking
app.post('/api/bookings/:bookingId/messages', (req, res) => {
  const { bookingId } = req.params;
  const { senderId, receiverId, message, messageType = 'text' } = req.body;
  
  if (!senderId || !receiverId || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const sql = `
    INSERT INTO chat_messages (bookingId, senderId, receiverId, message, messageType, createdAt)
    VALUES (?, ?, ?, ?, ?, NOW())
  `;
  
  db.query(sql, [bookingId, senderId, receiverId, message, messageType], (err, result) => {
    if (err) {
      console.error('Error sending message:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Lấy tin nhắn vừa tạo với thông tin đầy đủ
    const selectSql = `
      SELECT cm.*, 
             sender.fullName as senderName,
             receiver.fullName as receiverName
      FROM chat_messages cm
      JOIN users sender ON cm.senderId = sender.id
      JOIN users receiver ON cm.receiverId = receiver.id
      WHERE cm.id = ?
    `;
    
    db.query(selectSql, [result.insertId], (selectErr, selectResults) => {
      if (selectErr) {
        console.error('Error fetching new message:', selectErr);
        return res.status(500).json({ error: selectErr.message });
      }
      
      const newMessage = selectResults[0];
      
      // Gửi WebSocket event
      io.emit('new_message', {
        id: newMessage.id,
        bookingId: parseInt(bookingId),
        senderId: newMessage.senderId,
        receiverId: newMessage.receiverId,
        message: newMessage.message,
        messageType: newMessage.messageType,
        senderName: newMessage.senderName,
        receiverName: newMessage.receiverName,
        timestamp: newMessage.createdAt
      });
      
      console.log(`📨 New message sent in booking ${bookingId}`);
      res.json(newMessage);
    });
  });
});

// API: Đánh dấu tin nhắn đã đọc
app.put('/api/bookings/:bookingId/mark-read', (req, res) => {
  const { bookingId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const sql = `
    INSERT INTO chat_read_status (userId, bookingId, lastReadAt) 
    VALUES (?, ?, NOW()) 
    ON DUPLICATE KEY UPDATE lastReadAt = NOW()
  `;
  
  db.query(sql, [userId, bookingId], (err, result) => {
    if (err) {
      console.error('Error marking messages as read:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`✅ Messages marked as read for user ${userId} in booking ${bookingId}`);
    res.json({ success: true });
  });
});

// API: Lấy tin nhắn giữa 2 users (tất cả bookings)
app.get('/api/users/:userId1/messages/:userId2', (req, res) => {
  const { userId1, userId2 } = req.params;
  
  const sql = `
    SELECT cm.*, 
           sender.fullName as senderName,
           receiver.fullName as receiverName,
           b.id as bookingId
    FROM chat_messages cm
    JOIN users sender ON cm.senderId = sender.id
    JOIN users receiver ON cm.receiverId = receiver.id
    JOIN bookings b ON cm.bookingId = b.id
    WHERE ((cm.senderId = ? AND cm.receiverId = ?) OR (cm.senderId = ? AND cm.receiverId = ?))
    ORDER BY cm.createdAt ASC
  `;
  
  db.query(sql, [userId1, userId2, userId2, userId1], (err, results) => {
    if (err) {
      console.error('Error fetching user messages:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`💬 Found ${results.length} messages between users ${userId1} and ${userId2}`);
    res.json(results);
  });
});

// API: Gửi tin nhắn giữa 2 users (tìm booking gần nhất)
app.post('/api/users/:userId1/messages/:userId2', (req, res) => {
  const { userId1, userId2 } = req.params;
  const { message, messageType = 'text' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Tìm booking gần nhất giữa 2 users
  const findBookingSql = `
    SELECT b.id, b.customerId, b.housekeeperId, h.userId as housekeeperUserId
    FROM bookings b
    LEFT JOIN housekeepers h ON b.housekeeperId = h.id
    WHERE ((b.customerId = ? AND h.userId = ?) OR (b.customerId = ? AND h.userId = ?))
    ORDER BY b.createdAt DESC
    LIMIT 1
  `;
  
  db.query(findBookingSql, [userId1, userId2, userId2, userId1], (err, bookingResults) => {
    if (err) {
      console.error('Error finding booking:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (bookingResults.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy booking giữa 2 users này' });
    }
    
    const booking = bookingResults[0];
    const bookingId = booking.id;
    
    // Gửi tin nhắn
    const insertSql = `
      INSERT INTO chat_messages (bookingId, senderId, receiverId, message, messageType, createdAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    db.query(insertSql, [bookingId, userId1, userId2, message, messageType], (insertErr, result) => {
      if (insertErr) {
        console.error('Error sending message:', insertErr);
        return res.status(500).json({ error: insertErr.message });
      }
      
      // Lấy tin nhắn vừa tạo với thông tin đầy đủ
      const selectSql = `
        SELECT cm.*, 
               sender.fullName as senderName,
               receiver.fullName as receiverName
        FROM chat_messages cm
        JOIN users sender ON cm.senderId = sender.id
        JOIN users receiver ON cm.receiverId = receiver.id
        WHERE cm.id = ?
      `;
      
      db.query(selectSql, [result.insertId], (selectErr, selectResults) => {
        if (selectErr) {
          console.error('Error fetching new message:', selectErr);
          return res.status(500).json({ error: selectErr.message });
        }
        
        const newMessage = selectResults[0];
        
        // Gửi WebSocket event
        io.emit('new_message', {
          id: newMessage.id,
          bookingId: parseInt(bookingId),
          senderId: newMessage.senderId,
          receiverId: newMessage.receiverId,
          message: newMessage.message,
          messageType: newMessage.messageType,
          senderName: newMessage.senderName,
          receiverName: newMessage.receiverName,
          timestamp: newMessage.createdAt
        });
        
        console.log(`📨 New message sent between users ${userId1} and ${userId2}`);
        res.json(newMessage);
      });
    });
  });
});

// API: Lấy danh sách conversations theo user (booking-based)
app.get('/api/users/:userId/conversations', (req, res) => {
  const { userId } = req.params;
  
  const sql = `
    SELECT DISTINCT
      b.id as bookingId,
      b.service,
      b.status as bookingStatus,
      b.customerId,
      b.housekeeperId,
      b.customerName,
      b.housekeeperName,
      CASE 
        WHEN b.customerId = ? THEN COALESCE(h.userId, b.housekeeperId)
        ELSE b.customerId
      END as otherUserId,
      CASE 
        WHEN b.customerId = ? THEN b.housekeeperName
        ELSE b.customerName
      END as otherUserName,
      CASE 
        WHEN b.customerId = ? THEN 'housekeeper'
        ELSE 'customer'
      END as otherUserRole,
      (SELECT cm.message 
       FROM chat_messages cm 
       WHERE cm.bookingId = b.id 
       ORDER BY cm.createdAt DESC 
       LIMIT 1) as lastMessage,
      (SELECT cm.createdAt 
       FROM chat_messages cm 
       WHERE cm.bookingId = b.id 
       ORDER BY cm.createdAt DESC 
       LIMIT 1) as lastMessageTime,
      (SELECT COUNT(*) 
       FROM chat_messages cm 
       WHERE cm.bookingId = b.id 
       AND cm.receiverId = ? 
       AND cm.createdAt > COALESCE(
         (SELECT lastReadAt FROM chat_read_status WHERE userId = ? AND bookingId = b.id),
         '1970-01-01'
       )) as unreadCount
    FROM bookings b
    LEFT JOIN housekeepers h ON b.housekeeperId = h.id
    WHERE (b.customerId = ? OR h.userId = ?)
    AND EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.bookingId = b.id)
    ORDER BY lastMessageTime DESC
  `;
  
  db.query(sql, [userId, userId, userId, userId, userId, userId, userId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching conversations:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`📋 Found ${results.length} conversations for user ${userId}`);
    console.log(`📋 API /api/users/${userId}/conversations returned:`, JSON.stringify(results, null, 2));
    res.json(results);
  });
});

// API: Lấy danh sách conversations theo user (simplified)
app.get('/api/users/:userId/user-conversations', (req, res) => {
  const { userId } = req.params;
  
  const sql = `
    SELECT DISTINCT
      CASE 
        WHEN cm.senderId = ? THEN cm.receiverId
        ELSE cm.senderId
      END as otherUserId,
      CASE 
        WHEN cm.senderId = ? THEN receiver.fullName
        ELSE sender.fullName
      END as otherUserName,
      CASE 
        WHEN cm.senderId = ? THEN 
          (SELECT role FROM users WHERE id = cm.receiverId)
        ELSE 
          (SELECT role FROM users WHERE id = cm.senderId)
      END as otherUserRole,
      (SELECT cm2.message 
       FROM chat_messages cm2 
       WHERE ((cm2.senderId = ? AND cm2.receiverId = (CASE WHEN cm.senderId = ? THEN cm.receiverId ELSE cm.senderId END)) OR
              (cm2.receiverId = ? AND cm2.senderId = (CASE WHEN cm.senderId = ? THEN cm.receiverId ELSE cm.senderId END)))
       ORDER BY cm2.createdAt DESC 
       LIMIT 1) as lastMessage,
      (SELECT cm2.createdAt 
       FROM chat_messages cm2 
       WHERE ((cm2.senderId = ? AND cm2.receiverId = (CASE WHEN cm.senderId = ? THEN cm.receiverId ELSE cm.senderId END)) OR
              (cm2.receiverId = ? AND cm2.senderId = (CASE WHEN cm.senderId = ? THEN cm.receiverId ELSE cm.senderId END)))
       ORDER BY cm2.createdAt DESC 
       LIMIT 1) as lastMessageTime
    FROM chat_messages cm
    JOIN users sender ON cm.senderId = sender.id
    JOIN users receiver ON cm.receiverId = receiver.id
    WHERE (cm.senderId = ? OR cm.receiverId = ?)
    ORDER BY lastMessageTime DESC
  `;
  
  db.query(sql, [
    userId, userId, userId, userId, userId, userId, userId,
    userId, userId, userId, userId, userId, userId
  ], (err, results) => {
    if (err) {
      console.error('Error fetching user conversations:', err);
      return res.status(500).json({ error: err.message });
    }
    console.log(`📋 Found ${results.length} user conversations for user ${userId}`);
    res.json(results);
  });
});

// ========================
// CHAT SYSTEM APIs - DELETE MESSAGE
// ========================

// API: Xóa tin nhắn
app.delete('/api/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  // Kiểm tra xem tin nhắn có thuộc về user này không
  const checkSql = 'SELECT * FROM chat_messages WHERE id = ? AND senderId = ?';
  
  db.query(checkSql, [messageId, userId], (err, results) => {
    if (err) {
      console.error('Error checking message ownership:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(403).json({ error: 'Bạn chỉ có thể xóa tin nhắn của mình' });
    }
    
    // Xóa tin nhắn
    const deleteSql = 'DELETE FROM chat_messages WHERE id = ?';
    
    db.query(deleteSql, [messageId], (deleteErr, deleteResult) => {
      if (deleteErr) {
        console.error('Error deleting message:', deleteErr);
        return res.status(500).json({ error: deleteErr.message });
      }
      
      if (deleteResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Tin nhắn không tồn tại' });
      }
      
      // Emit WebSocket event để cập nhật real-time
      io.emit('message_deleted', {
        messageId: parseInt(messageId),
        bookingId: results[0].bookingId,
        deletedBy: userId
      });
      
      console.log(`🗑️ Message ${messageId} deleted by user ${userId}`);
      res.json({ success: true, message: 'Tin nhắn đã được xóa' });
    });
  });
});

// API: Xóa toàn bộ cuộc trò chuyện
app.delete('/api/conversations/:bookingId', (req, res) => {
  const { bookingId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  // Kiểm tra xem user có tin nhắn trong conversation này không
  const checkSql = `
    SELECT DISTINCT bookingId 
    FROM chat_messages 
    WHERE bookingId = ? AND (senderId = ? OR receiverId = ?)
    LIMIT 1
  `;
  
  db.query(checkSql, [bookingId, userId, userId], (err, results) => {
    if (err) {
      console.error('Error checking conversation ownership:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (results.length === 0) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa cuộc trò chuyện này' });
    }
    
    // Xóa chat read status trước (nếu bảng tồn tại)
    const deleteReadStatusSql = 'DELETE FROM chat_read_status WHERE bookingId = ?';
    
    db.query(deleteReadStatusSql, [bookingId], (readErr) => {
      if (readErr) {
        console.error('Warning: Error deleting read status (table may not exist):', readErr.message);
        // Không return error, tiếp tục xóa messages
      }
      
      // Xóa tất cả tin nhắn trong conversation
      const deleteSql = 'DELETE FROM chat_messages WHERE bookingId = ?';
      
      db.query(deleteSql, [bookingId], (deleteErr, deleteResult) => {
        if (deleteErr) {
          console.error('Error deleting conversation messages:', deleteErr);
          return res.status(500).json({ error: `Không thể xóa tin nhắn: ${deleteErr.message}` });
        }
        
        // Emit WebSocket event để cập nhật real-time
        io.emit('conversation_deleted', {
          bookingId: parseInt(bookingId),
          deletedBy: userId,
          messagesDeleted: deleteResult.affectedRows
        });
        
        console.log(`🗑️ Conversation ${bookingId} deleted by user ${userId} (${deleteResult.affectedRows} messages)`);
        res.json({ 
          success: true, 
          message: `Đã xóa cuộc trò chuyện (${deleteResult.affectedRows} tin nhắn)` 
        });
      });
    });
  });
});

// ========================
// CHATBOT AI APIs
// ========================

// API: Chat với AI Assistant
app.post('/api/chatbot/message', async (req, res) => {
  try {
    const { message, conversationHistory, userContext } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Lấy thông tin user context từ database nếu có userId
    let enrichedContext = userContext || {};
    
    if (userContext?.userId) {
      const userSql = 'SELECT fullName, email, phone FROM users WHERE id = ?';
      const userResult = await new Promise((resolve, reject) => {
        db.query(userSql, [userContext.userId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0] || {});
        });
      });
      
      // Lấy lịch sử booking của user
      const bookingSql = `
        SELECT s.name as serviceName, COUNT(*) as count 
        FROM bookings b 
        JOIN services s ON b.serviceId = s.id 
        WHERE b.customerId = ? 
        GROUP BY s.name
      `;
      const bookingResult = await new Promise((resolve, reject) => {
        db.query(bookingSql, [userContext.userId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      enrichedContext = {
        ...enrichedContext,
        name: userResult.fullName,
        email: userResult.email,
        phone: userResult.phone,
        previousBookings: bookingResult.map(b => b.serviceName)
      };
    }

    const result = await chatbotService.processMessage(message, conversationHistory, enrichedContext);
    
    // Force correct suggestions based on user role
    let correctSuggestions = result.suggestions;
    if (enrichedContext.role === 'housekeeper') {
      correctSuggestions = [
        'Quản lý đơn hàng',
        'Tối ưu giá dịch vụ', 
        'Cải thiện đánh giá',
        'Hướng dẫn app Housekeeper',
        'Giải quyết vấn đề với khách'
      ];
      console.log('🔧 FORCE FIX - Using housekeeper suggestions');
    } else if (enrichedContext.role === 'admin') {
      correctSuggestions = [
        'Phân tích dữ liệu',
        'Quản lý người dùng',
        'Báo cáo hệ thống',
        'Xử lý khiếu nại',
        'Cấu hình hệ thống'
      ];
      console.log('🔧 FORCE FIX - Using admin suggestions');
    }
    
    res.json({
      success: true,
      response: result.response,
      intent: result.intent,
      suggestions: correctSuggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.'
    });
  }
});

// API: Tính toán chi phí dự kiến
app.post('/api/chatbot/calculate-cost', (req, res) => {
  try {
    const { service, duration, location } = req.body;
    
    if (!service || !duration) {
      return res.status(400).json({ error: 'Service and duration are required' });
    }

    const costEstimate = chatbotService.calculateEstimatedCost(service, duration, location);
    
    if (!costEstimate) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      success: true,
      estimate: costEstimate
    });

  } catch (error) {
    console.error('Cost calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Gợi ý gói combo
app.post('/api/chatbot/combo-recommendations', (req, res) => {
  try {
    const { services, frequency } = req.body;
    
    if (!services || !Array.isArray(services)) {
      return res.status(400).json({ error: 'Services array is required' });
    }

    const recommendations = chatbotService.getComboRecommendations(services, frequency);
    
    res.json({
      success: true,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('Combo recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Lưu conversation với AI
app.post('/api/chatbot/save-conversation', (req, res) => {
  try {
    const { userId, conversationData, sessionId } = req.body;
    
    if (!userId || !conversationData) {
      return res.status(400).json({ error: 'UserId and conversationData are required' });
    }

    // Tạo bảng chatbot_conversations nếu chưa có
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS chatbot_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        sessionId VARCHAR(100),
        conversationData JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    db.query(createTableSql, (createErr) => {
      if (createErr) {
        console.error('Error creating chatbot_conversations table:', createErr);
        return res.status(500).json({ error: 'Database error' });
      }

      // Lưu conversation
      const insertSql = `
        INSERT INTO chatbot_conversations (userId, sessionId, conversationData) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        conversationData = VALUES(conversationData),
        updatedAt = CURRENT_TIMESTAMP
      `;

      db.query(insertSql, [userId, sessionId, JSON.stringify(conversationData)], (err, result) => {
        if (err) {
          console.error('Error saving conversation:', err);
          return res.status(500).json({ error: 'Failed to save conversation' });
        }

        res.json({
          success: true,
          conversationId: result.insertId || result.insertId,
          message: 'Conversation saved successfully'
        });
      });
    });

  } catch (error) {
    console.error('Save conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Lấy lịch sử conversation
app.get('/api/chatbot/conversations/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const sql = `
      SELECT id, sessionId, conversationData, createdAt, updatedAt
      FROM chatbot_conversations 
      WHERE userId = ? 
      ORDER BY updatedAt DESC 
      LIMIT ?
    `;

    db.query(sql, [userId, parseInt(limit)], (err, results) => {
      if (err) {
        console.error('Error fetching conversations:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const conversations = results.map(row => ({
        ...row,
        conversationData: JSON.parse(row.conversationData)
      }));

      res.json({
        success: true,
        conversations: conversations
      });
    });

  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Gửi khiếu nại
app.post('/api/complaints/submit', (req, res) => {
  try {
    const complaintData = req.body;
    
    // Tạo bảng complaints nếu chưa có
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticketId VARCHAR(50) UNIQUE NOT NULL,
        userId INT,
        userName VARCHAR(100),
        userEmail VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
        bookingId VARCHAR(50),
        description TEXT NOT NULL,
        evidence JSON,
        contactPreference ENUM('email', 'phone', 'both') DEFAULT 'email',
        status ENUM('pending', 'investigating', 'resolved', 'closed') DEFAULT 'pending',
        assignedTo INT,
        resolution TEXT,
        submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolvedAt DATETIME,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `;

    db.query(createTableSql, (createErr) => {
      if (createErr) {
        console.error('Error creating complaints table:', createErr);
        return res.status(500).json({ error: 'Database error' });
      }

      // Lưu khiếu nại
      const insertSql = `
        INSERT INTO complaints (
          ticketId, userId, userName, userEmail, type, severity, 
          bookingId, description, evidence, contactPreference, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        complaintData.ticketId,
        complaintData.userId,
        complaintData.userName,
        complaintData.userEmail,
        complaintData.type,
        complaintData.severity,
        complaintData.bookingId || null,
        complaintData.description,
        JSON.stringify(complaintData.evidence || []),
        complaintData.contactPreference,
        'pending'
      ];

      db.query(insertSql, values, (err, result) => {
        if (err) {
          console.error('Error saving complaint:', err);
          return res.status(500).json({ error: 'Failed to save complaint' });
        }

        // Gửi email thông báo (giả lập)
        console.log(`📧 Complaint notification sent for ticket: ${complaintData.ticketId}`);

        res.json({
          success: true,
          ticketId: complaintData.ticketId,
          message: 'Complaint submitted successfully',
          complaintId: result.insertId
        });
      });
    });

  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Lấy danh sách khiếu nại của user
app.get('/api/complaints/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    const sql = `
      SELECT id, ticketId, type, severity, bookingId, description, 
             status, submittedAt, updatedAt, resolvedAt
      FROM complaints 
      WHERE userId = ? 
      ORDER BY submittedAt DESC
    `;

    db.query(sql, [userId], (err, results) => {
      if (err) {
        console.error('Error fetching user complaints:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        complaints: results
      });
    });

  } catch (error) {
    console.error('Fetch user complaints error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Lấy chi tiết khiếu nại
app.get('/api/complaints/:ticketId', (req, res) => {
  try {
    const { ticketId } = req.params;
    
    const sql = `
      SELECT * FROM complaints WHERE ticketId = ?
    `;

    db.query(sql, [ticketId], (err, results) => {
      if (err) {
        console.error('Error fetching complaint details:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      const complaint = results[0];
      // Parse JSON fields
      if (complaint.evidence) {
        complaint.evidence = JSON.parse(complaint.evidence);
      }

      res.json({
        success: true,
        complaint: complaint
      });
    });

  } catch (error) {
    console.error('Fetch complaint details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// COUPON/DISCOUNT APIs
// ========================

// API: Kiểm tra mã giảm giá
app.post('/api/coupons/validate', (req, res) => {
  const { code, customerId, totalAmount } = req.body;
  
  console.log('🎫 Validating coupon:', { code, customerId, totalAmount });
  
  // Tìm coupon trong database
  const findCouponSql = `
    SELECT * FROM coupons 
    WHERE code = ? AND isActive = TRUE 
    AND (expiresAt IS NULL OR expiresAt > NOW())
  `;
  
  db.query(findCouponSql, [code.toUpperCase()], (err, couponResults) => {
    if (err) {
      console.error('Error finding coupon:', err);
      return res.status(500).json({ valid: false, message: 'Lỗi hệ thống' });
    }
    
    if (couponResults.length === 0) {
      return res.status(400).json({
        valid: false,
        message: 'Mã giảm giá không tồn tại hoặc đã hết hạn'
      });
    }
    
    const coupon = couponResults[0];
    
    // Kiểm tra số tiền tối thiểu
    if (totalAmount < coupon.minAmount) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng tối thiểu $${coupon.minAmount} để sử dụng mã này`
      });
    }
    
    // Kiểm tra usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        valid: false,
        message: 'Mã giảm giá đã hết lượt sử dụng'
      });
    }
    
    // Kiểm tra nếu user đã sử dụng mã này (cho mã firstTimeOnly)
    if (customerId) {
      const checkUsageSql = `
        SELECT COUNT(*) as usageCount 
        FROM coupon_usage 
        WHERE couponId = ? AND userId = ?
      `;
      
      db.query(checkUsageSql, [coupon.id, customerId], (err, usageResults) => {
        if (err) {
          console.error('Error checking coupon usage:', err);
          return res.status(500).json({ valid: false, message: 'Lỗi hệ thống' });
        }
        
        const usageCount = usageResults[0].usageCount;
        
        if (coupon.firstTimeOnly && usageCount > 0) {
          return res.status(400).json({
            valid: false,
            message: 'Bạn đã sử dụng mã giảm giá này rồi'
          });
        }
        
        // Kiểm tra nếu là mã dành cho lần đầu
        if (coupon.firstTimeOnly) {
          const checkFirstTimeSql = `
            SELECT COUNT(*) as bookingCount 
            FROM bookings 
            WHERE customerId = ? AND status IN ('completed', 'confirmed')
          `;
          
          db.query(checkFirstTimeSql, [customerId], (err, bookingResults) => {
            if (err) {
              console.error('Error checking first time customer:', err);
              return res.status(500).json({ valid: false, message: 'Lỗi hệ thống' });
            }
            
            const bookingCount = bookingResults[0].bookingCount;
            
            if (bookingCount > 0) {
              return res.status(400).json({
                valid: false,
                message: 'Mã giảm giá chỉ dành cho khách hàng mới'
              });
            }
            
            // Tính toán giảm giá
            calculateDiscount();
          });
        } else {
          calculateDiscount();
        }
      });
    } else {
      calculateDiscount();
    }
    
    function calculateDiscount() {
      let discountAmount = 0;
      
      if (coupon.type === 'percentage') {
        discountAmount = (Number(totalAmount) * Number(coupon.discount)) / 100;
        if (coupon.maxDiscount > 0 && discountAmount > Number(coupon.maxDiscount)) {
          discountAmount = Number(coupon.maxDiscount);
        }
      } else {
        discountAmount = Number(coupon.discount);
      }
      
      // Ensure discountAmount is a valid number
      discountAmount = Number(discountAmount) || 0;
      const finalAmount = Number(totalAmount) - discountAmount;
      
      res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description,
          discount: coupon.discount,
          type: coupon.type
        },
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalAmount: Math.round(finalAmount * 100) / 100,
        message: `Áp dụng thành công! Giảm $${discountAmount.toFixed(2)}`
      });
    }
  });
});

// ========================
// ADMIN COUPON MANAGEMENT APIs
// ========================

// API: Lấy tất cả coupons (Admin only)
app.get('/api/admin/coupons', (req, res) => {
  const sql = `
    SELECT * FROM coupons 
    ORDER BY createdAt DESC
  `;
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching coupons:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách mã giảm giá' });
    }
    
    res.json(results);
  });
});

// API: Tạo coupon mới (Admin only)
app.post('/api/admin/coupons', (req, res) => {
  const {
    code, description, discount, type, minAmount, maxDiscount,
    firstTimeOnly, isActive, usageLimit, expiresAt
  } = req.body;
  
  console.log('🎫 Creating new coupon:', { code, description, discount, type });
  
  // Validate required fields
  if (!code || !description || !discount || !type) {
    return res.status(400).json({ 
      error: 'Thiếu thông tin bắt buộc',
      message: 'Mã, mô tả, giá trị giảm và loại giảm giá là bắt buộc'
    });
  }
  
  // Check if code already exists
  const checkCodeSql = 'SELECT id FROM coupons WHERE code = ?';
  
  db.query(checkCodeSql, [code.toUpperCase()], (err, existing) => {
    if (err) {
      console.error('Error checking coupon code:', err);
      return res.status(500).json({ error: 'Lỗi kiểm tra mã giảm giá' });
    }
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        error: 'Mã giảm giá đã tồn tại',
        message: 'Vui lòng chọn mã khác'
      });
    }
    
    // Insert new coupon
    const insertSql = `
      INSERT INTO coupons (
        code, description, discount, type, minAmount, maxDiscount,
        firstTimeOnly, isActive, usageLimit, expiresAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      code.toUpperCase(),
      description,
      Number(discount),
      type,
      minAmount ? Number(minAmount) : 0,
      maxDiscount ? Number(maxDiscount) : 0,
      Boolean(firstTimeOnly),
      Boolean(isActive),
      usageLimit ? Number(usageLimit) : null,
      expiresAt || null
    ];
    
    db.query(insertSql, values, (err, result) => {
      if (err) {
        console.error('Error creating coupon:', err);
        return res.status(500).json({ error: 'Lỗi tạo mã giảm giá' });
      }
      
      console.log('✅ Coupon created successfully:', result.insertId);
      
      res.status(201).json({
        success: true,
        message: 'Tạo mã giảm giá thành công',
        couponId: result.insertId
      });
    });
  });
});

// API: Cập nhật coupon (Admin only)
app.put('/api/admin/coupons/:id', (req, res) => {
  const couponId = req.params.id;
  const {
    code, description, discount, type, minAmount, maxDiscount,
    firstTimeOnly, isActive, usageLimit, expiresAt
  } = req.body;
  
  console.log('🎫 Updating coupon:', couponId);
  
  // Check if coupon exists
  const checkSql = 'SELECT id FROM coupons WHERE id = ?';
  
  db.query(checkSql, [couponId], (err, existing) => {
    if (err) {
      console.error('Error checking coupon:', err);
      return res.status(500).json({ error: 'Lỗi kiểm tra mã giảm giá' });
    }
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });
    }
    
    // Check if code is unique (exclude current coupon)
    const checkCodeSql = 'SELECT id FROM coupons WHERE code = ? AND id != ?';
    
    db.query(checkCodeSql, [code.toUpperCase(), couponId], (err, duplicate) => {
      if (err) {
        console.error('Error checking duplicate code:', err);
        return res.status(500).json({ error: 'Lỗi kiểm tra mã giảm giá' });
      }
      
      if (duplicate.length > 0) {
        return res.status(400).json({ 
          error: 'Mã giảm giá đã tồn tại',
          message: 'Vui lòng chọn mã khác'
        });
      }
      
      // Update coupon
      const updateSql = `
        UPDATE coupons SET 
          code = ?, description = ?, discount = ?, type = ?, 
          minAmount = ?, maxDiscount = ?, firstTimeOnly = ?, 
          isActive = ?, usageLimit = ?, expiresAt = ?,
          updatedAt = NOW()
        WHERE id = ?
      `;
      
      const values = [
        code.toUpperCase(),
        description,
        Number(discount),
        type,
        minAmount ? Number(minAmount) : 0,
        maxDiscount ? Number(maxDiscount) : 0,
        Boolean(firstTimeOnly),
        Boolean(isActive),
        usageLimit ? Number(usageLimit) : null,
        expiresAt || null,
        couponId
      ];
      
      db.query(updateSql, values, (err, result) => {
        if (err) {
          console.error('Error updating coupon:', err);
          return res.status(500).json({ error: 'Lỗi cập nhật mã giảm giá' });
        }
        
        console.log('✅ Coupon updated successfully:', couponId);
        
        res.json({
          success: true,
          message: 'Cập nhật mã giảm giá thành công'
        });
      });
    });
  });
});

// API: Xóa coupon (Admin only)
app.delete('/api/admin/coupons/:id', (req, res) => {
  const couponId = req.params.id;
  
  console.log('🗑️ Deleting coupon:', couponId);
  
  // Check if coupon has been used
  const checkUsageSql = 'SELECT COUNT(*) as usageCount FROM coupon_usage WHERE couponId = ?';
  
  db.query(checkUsageSql, [couponId], (err, usage) => {
    if (err) {
      console.error('Error checking coupon usage:', err);
      return res.status(500).json({ error: 'Lỗi kiểm tra sử dụng mã giảm giá' });
    }
    
    const usageCount = usage[0].usageCount;
    
    if (usageCount > 0) {
      // If coupon has been used, just deactivate it instead of deleting
      const deactivateSql = 'UPDATE coupons SET isActive = FALSE, updatedAt = NOW() WHERE id = ?';
      
      db.query(deactivateSql, [couponId], (err, result) => {
        if (err) {
          console.error('Error deactivating coupon:', err);
          return res.status(500).json({ error: 'Lỗi vô hiệu hóa mã giảm giá' });
        }
        
        res.json({
          success: true,
          message: 'Mã giảm giá đã được vô hiệu hóa (do đã có người sử dụng)'
        });
      });
    } else {
      // If coupon hasn't been used, delete it completely
      const deleteSql = 'DELETE FROM coupons WHERE id = ?';
      
      db.query(deleteSql, [couponId], (err, result) => {
        if (err) {
          console.error('Error deleting coupon:', err);
          return res.status(500).json({ error: 'Lỗi xóa mã giảm giá' });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Không tìm thấy mã giảm giá' });
        }
        
        console.log('✅ Coupon deleted successfully:', couponId);
        
        res.json({
          success: true,
          message: 'Xóa mã giảm giá thành công'
        });
      });
    }
  });
});

// API: Lưu coupon usage khi booking thành công
app.post('/api/coupons/use', (req, res) => {
  const { couponId, userId, bookingId, discountAmount } = req.body;
  
  console.log('💰 Recording coupon usage:', { couponId, userId, bookingId, discountAmount });
  
  // Lưu coupon usage
  const insertUsageSql = `
    INSERT INTO coupon_usage (couponId, userId, bookingId, discountAmount) 
    VALUES (?, ?, ?, ?)
  `;
  
  db.query(insertUsageSql, [couponId, userId, bookingId, discountAmount], (err, result) => {
    if (err) {
      console.error('Error recording coupon usage:', err);
      return res.status(500).json({ error: 'Lỗi lưu thông tin sử dụng coupon' });
    }
    
    // Cập nhật usedCount trong bảng coupons
    const updateCountSql = `
      UPDATE coupons 
      SET usedCount = usedCount + 1, updatedAt = NOW() 
      WHERE id = ?
    `;
    
    db.query(updateCountSql, [couponId], (err) => {
      if (err) {
        console.error('Error updating coupon count:', err);
      }
    });
    
    res.json({
      success: true,
      message: 'Đã ghi nhận sử dụng mã giảm giá',
      usageId: result.insertId
    });
  });
});

server.listen(5000, () => console.log('Server running on port 5000 with WebSocket support'));
