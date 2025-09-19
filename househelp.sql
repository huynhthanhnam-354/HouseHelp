-- Set charset
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Drop existing tables
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS recurring_bookings;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS housekeeper_services;
DROP TABLE IF EXISTS housekeepers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- ========================
-- users
-- ========================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role ENUM('customer','housekeeper','admin') DEFAULT 'customer',
  idCardFront LONGTEXT,
  idCardBack LONGTEXT,
  avatar VARCHAR(255),
  dateOfBirth DATE,
  gender ENUM('male','female','other'),
  address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  city VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  district VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  bio TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  languages VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  emergencyContact VARCHAR(20),
  emergencyContactName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  isVerified BOOLEAN DEFAULT FALSE,
  isApproved BOOLEAN DEFAULT FALSE,
  verifiedAt DATETIME,
  lastActiveAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- housekeepers
-- ========================
CREATE TABLE housekeepers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  rating FLOAT DEFAULT 0,
  totalReviews INT DEFAULT 0,
  services VARCHAR(500),
  price DECIMAL(10,2),
  priceType ENUM('hourly','daily','per_service') DEFAULT 'hourly',
  available BOOLEAN DEFAULT TRUE,
  description TEXT,
  experience INT DEFAULT 0,
  skills JSON,
  certifications JSON,
  workingDays JSON,
  workingHours VARCHAR(50),
  serviceRadius INT DEFAULT 10,
  profileImages JSON,
  hasInsurance BOOLEAN DEFAULT FALSE,
  insuranceInfo TEXT,
  specialOffers JSON,
  completedJobs INT DEFAULT 0,
  responseTime INT DEFAULT 60,
  cancellationRate FLOAT DEFAULT 0,
  isTopRated BOOLEAN DEFAULT FALSE,
  badges JSON,
  lastOnline DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- services
-- ========================
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE,
  description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  icon VARCHAR(100),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- housekeeper_services
-- ========================
CREATE TABLE housekeeper_services (
  housekeeperId INT,
  serviceId INT,
  priceOverride DECIMAL(10,2),
  PRIMARY KEY (housekeeperId, serviceId),
  FOREIGN KEY (housekeeperId) REFERENCES housekeepers(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

-- ========================
-- bookings (giữ nguyên startDate, endDate, totalPrice)
-- ========================
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  housekeeperId INT NOT NULL,
  serviceId INT,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  status ENUM('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
  totalPrice DECIMAL(10,2),
  notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  customerAddress TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Cột bổ sung cho tiện ích
  time VARCHAR(10),
  duration INT DEFAULT 2,
  location TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  customerName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  customerEmail VARCHAR(255),
  customerPhone VARCHAR(20),
  housekeeperName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  service VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (housekeeperId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- reviews
-- ========================
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT,
  housekeeperId INT NOT NULL,
  customerId INT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  isVisible BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE SET NULL,
  FOREIGN KEY (housekeeperId) REFERENCES housekeepers(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- notifications
-- ========================
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  bookingId INT NULL,
  data JSON NULL,
  read_status TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt),
  INDEX idx_read_status (read_status),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- payments (mới)
-- ========================
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT NOT NULL,
  customerId INT NOT NULL,
  method ENUM('cash','credit_card','bank_transfer','e_wallet') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  transactionCode VARCHAR(100),
  paidAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================
-- chat_messages (mới)
-- ========================
CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bookingId INT NOT NULL,
  senderId INT NOT NULL,
  receiverId INT NOT NULL,
  message TEXT,
  messageType ENUM('text','image','file') DEFAULT 'text',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================
-- recurring_bookings (mới)
-- ========================
CREATE TABLE recurring_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  housekeeperId INT,
  serviceId INT,
  frequency ENUM('daily','weekly','monthly') NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE,
  nextBookingDate DATE,
  status ENUM('active','paused','cancelled') DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (housekeeperId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE SET NULL
);

-- ========================
-- system_logs (mới)
-- ========================
CREATE TABLE system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  action VARCHAR(100),
  description TEXT,
  ipAddress VARCHAR(50),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- ========================
-- Sample Data (tương thích)
-- ========================
INSERT INTO services (name, description, icon) VALUES
('Dọn dẹp nhà cửa', 'Vệ sinh tổng thể nhà cửa, lau chùi, hút bụi', 'home-cleaning'),
('Giặt ủi quần áo', 'Giặt, ủi và sắp xếp quần áo gọn gàng', 'laundry'),
('Nấu ăn', 'Chuẩn bị và nấu các bữa ăn theo yêu cầu', 'cooking'),
('Chăm sóc trẻ em', 'Trông trẻ, chơi và chăm sóc trẻ em', 'childcare'),
('Chăm sóc người già', 'Hỗ trợ và chăm sóc người cao tuổi', 'eldercare'),
('Vệ sinh công nghiệp', 'Vệ sinh văn phòng, nhà xưởng quy mô lớn', 'industrial-cleaning');

INSERT INTO users (fullName, email, password, phone, role, avatar, dateOfBirth, gender, address, city, district, bio, languages, emergencyContact, emergencyContactName, isVerified, isApproved) VALUES
('Nguyễn Thị Lan', 'lan.nguyen@email.com', '$2b$10$example_hash_1', '0901234567', 'housekeeper', '/avatars/lan-nguyen.jpg', '1990-05-15', 'female', '123 Đường ABC, Phường 1', 'TP.HCM', 'Quận 1', 'Tôi có 5 năm kinh nghiệm làm việc nhà và luôn tận tâm với công việc.', 'Tiếng Việt, Tiếng Anh', '0987654321', 'Nguyễn Văn Nam', TRUE, TRUE),
('Trần Văn Minh', 'minh.tran@email.com', '$2b$10$example_hash_2', '0912345678', 'housekeeper', '/avatars/minh-tran.jpg', '1985-08-20', 'male', '456 Đường XYZ, Phường 2', 'TP.HCM', 'Quận 3', 'Chuyên về vệ sinh công nghiệp và làm sạch nhà cửa.', 'Tiếng Việt', '0976543210', 'Trần Thị Mai', TRUE, TRUE),
('Lê Thị Hoa', 'hoa.le@email.com', '$2b$10$example_hash_3', '0923456789', 'customer', '/avatars/hoa-le.jpg', '1992-12-10', 'female', '789 Đường DEF, Phường 3', 'TP.HCM', 'Quận 7', 'Tôi là khách hàng thường xuyên sử dụng dịch vụ giúp việc.', 'Tiếng Việt', '0965432109', 'Lê Văn Đức', FALSE, FALSE),
('Phạm Văn Tuấn', 'tuan.pham@email.com', '$2b$10$example_hash_4', '0934567890', 'customer', '/avatars/tuan-pham.jpg', '1988-03-25', 'male', '321 Đường GHI, Phường 4', 'Hà Nội', 'Quận Ba Đình', 'Chủ nhà thường xuyên cần dịch vụ vệ sinh.', 'Tiếng Việt, Tiếng Anh', '0954321098', 'Phạm Thị Lan', FALSE, FALSE),
('Admin System', 'admin@househelp.com', '$2b$10$example_admin', '0999999999', 'admin', '/avatars/admin.jpg', '1990-01-01', 'male', 'Trụ sở chính', 'Hà Nội', 'Cầu Giấy', 'Quản trị hệ thống HouseHelp', 'Tiếng Việt', NULL, NULL, TRUE, TRUE);

INSERT INTO housekeepers (userId, rating, totalReviews, services, price, priceType, description, experience, skills, certifications, workingDays, workingHours, serviceRadius, profileImages, hasInsurance, completedJobs, responseTime, isTopRated) VALUES
(1, 4.8, 127, 'Vệ sinh nhà cửa, Giặt ủi, Nấu ăn', 80000.00, 'hourly', 'Tôi có 5 năm kinh nghiệm trong lĩnh vực giúp việc nhà.', 5, 
JSON_ARRAY('Vệ sinh chuyên nghiệp', 'Nấu ăn ngon', 'Chăm sóc trẻ em', 'Giặt ủi'), 
JSON_ARRAY('Chứng chỉ vệ sinh an toàn thực phẩm', 'Chứng chỉ sơ cấp cứu'), 
JSON_ARRAY('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), 
'07:00-19:00', 15, JSON_ARRAY('/portfolio/lan-1.jpg','/portfolio/lan-2.jpg'), TRUE, 95, 15, TRUE),

(2, 4.5, 89, 'Vệ sinh công nghiệp, Vệ sinh nhà cửa', 70000.00, 'hourly', 'Chuyên về vệ sinh công nghiệp và vệ sinh nhà ở.', 8, 
JSON_ARRAY('Vệ sinh công nghiệp','Vệ sinh kính','Vệ sinh thảm','Bảo trì thiết bị'), 
JSON_ARRAY('Chứng chỉ vệ sinh công nghiệp','Chứng chỉ an toàn lao động'), 
JSON_ARRAY('Monday','Tuesday','Wednesday','Thursday','Friday'), 
'08:00-17:00', 20, JSON_ARRAY('/portfolio/minh-1.jpg','/portfolio/minh-2.jpg','/portfolio/minh-3.jpg'), TRUE, 156, 20, FALSE);

INSERT INTO housekeeper_services (housekeeperId, serviceId) VALUES
(1,1),(1,2),(1,3),(1,4),
(2,1),(2,6);

INSERT INTO bookings (customerId, housekeeperId, serviceId, startDate, endDate, status, totalPrice, notes, customerAddress, time, duration, location, customerName, customerEmail, customerPhone, housekeeperName, service) VALUES
(3,1,1,'2025-09-15 09:00:00','2025-09-15 12:00:00','confirmed',240000,'Cần dọn dẹp phòng khách và bếp','Quận 7, TP.HCM','09:00',3,'Quận 7, TP.HCM','Lê Thị Hoa','hoa.le@email.com','0923456789','Nguyễn Thị Lan','Dọn dẹp nhà cửa'),
(4,2,6,'2025-09-16 14:00:00','2025-09-16 18:00:00','pending',280000,'Làm sạch văn phòng nhỏ','Quận Ba Đình, Hà Nội','14:00',4,'Quận Ba Đình, Hà Nội','Phạm Văn Tuấn','tuan.pham@email.com','0934567890','Trần Văn Minh','Vệ sinh công nghiệp');

INSERT INTO reviews (bookingId, housekeeperId, customerId, rating, comment) VALUES
(1,1,3,5,'Rất hài lòng, chị Lan làm việc cẩn thận và sạch sẽ'),
(2,2,4,4,'Anh Minh làm tốt, nhưng cần cải thiện tốc độ một chút');

INSERT INTO payments (bookingId, customerId, method, amount, status, transactionCode, paidAt) VALUES
(1,3,'e_wallet',240000,'success','TXN123456','2025-09-15 11:30:00'),
(2,4,'cash',280000,'pending',NULL,NULL);

INSERT INTO chat_messages (bookingId, senderId, receiverId, message, messageType) VALUES
(1,3,1,'Chị Lan ơi, ngày mai chị đến đúng 9h nhé?','text'),
(1,1,3,'Ok em, chị sẽ có mặt đúng giờ!','text'),
(2,4,2,'Anh Minh, có thể mang theo dụng cụ vệ sinh kính không?','text');

INSERT INTO recurring_bookings (customerId, housekeeperId, serviceId, frequency, startDate, endDate, nextBookingDate, status) VALUES
(3,1,1,'weekly','2025-09-20','2025-12-20','2025-09-27','active'),
(4,2,6,'monthly','2025-09-25','2026-03-25','2025-10-25','active');

INSERT INTO system_logs (userId, action, description, ipAddress) VALUES
(5,'LOGIN','Admin đăng nhập hệ thống','192.168.1.10'),
(1,'UPDATE_PROFILE','Nguyễn Thị Lan cập nhật thông tin hồ sơ','192.168.1.15'),
(3,'BOOKING_CREATED','Lê Thị Hoa tạo đơn đặt dịch vụ dọn dẹp','192.168.1.20');
