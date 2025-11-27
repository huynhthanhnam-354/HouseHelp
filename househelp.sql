-- Set charset and SQL mode for compatibility
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

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
  password VARCHAR(255),
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
  -- Google OAuth fields
  googleId VARCHAR(255) UNIQUE,
  authProvider ENUM('local','google') DEFAULT 'local',
  profilePicture VARCHAR(500),
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
  paymentStatus ENUM('pending','success','failed') DEFAULT 'pending',
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
-- file_uploads (mới)
-- ========================
CREATE TABLE file_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  filePath VARCHAR(500) NOT NULL,
  fileType ENUM('avatar','id_card_front','id_card_back','profile_image','document') NOT NULL,
  mimeType VARCHAR(100),
  fileSize INT,
  uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId_fileType (userId, fileType)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
('Nguyễn Thị Lan', 'lan.nguyen@email.com', SHA2('123456', 256), '0901234567', 'housekeeper', '/avatars/lan-nguyen.jpg', '1990-05-15', 'female', '123 Đường ABC, Phường 1', 'TP.HCM', 'Quận 1', 'Tôi có 5 năm kinh nghiệm làm việc nhà và luôn tận tâm với công việc.', 'Tiếng Việt, Tiếng Anh', '0987654321', 'Nguyễn Văn Nam', TRUE, TRUE),
('Trần Văn Minh', 'minh.tran@email.com', SHA2('123456', 256), '0912345678', 'housekeeper', '/avatars/minh-tran.jpg', '1985-08-20', 'male', '456 Đường XYZ, Phường 2', 'TP.HCM', 'Quận 3', 'Chuyên về vệ sinh công nghiệp và làm sạch nhà cửa.', 'Tiếng Việt', '0976543210', 'Trần Thị Mai', TRUE, TRUE),
('Lê Thị Hoa', 'hoa.le@email.com', SHA2('123456', 256), '0923456789', 'customer', '/avatars/hoa-le.jpg', '1992-12-10', 'female', '789 Đường DEF, Phường 3', 'TP.HCM', 'Quận 7', 'Tôi là khách hàng thường xuyên sử dụng dịch vụ giúp việc.', 'Tiếng Việt', '0965432109', 'Lê Văn Đức', FALSE, FALSE),
('Phạm Văn Tuấn', 'tuan.pham@email.com', SHA2('123456', 256), '0934567890', 'customer', '/avatars/tuan-pham.jpg', '1988-03-25', 'male', '321 Đường GHI, Phường 4', 'Hà Nội', 'Quận Ba Đình', 'Chủ nhà thường xuyên cần dịch vụ vệ sinh.', 'Tiếng Việt, Tiếng Anh', '0954321098', 'Phạm Thị Lan', FALSE, FALSE),
('Admin System', 'admin@househelp.com', SHA2('admin123', 256), '0999999999', 'admin', '/avatars/admin.jpg', '1990-01-01', 'male', 'Trụ sở chính', 'Hà Nội', 'Cầu Giấy', 'Quản trị hệ thống HouseHelp', 'Tiếng Việt', NULL, NULL, TRUE, TRUE);

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

-- ========================
-- COMPLETION & PAYMENT DATA
-- ========================

-- Cập nhật một số booking thành trạng thái confirmed để test completion
UPDATE bookings SET status = 'confirmed' WHERE id IN (1, 2);

-- Thêm booking mẫu với trạng thái completed để test payment
INSERT INTO bookings (customerId, housekeeperId, serviceId, startDate, endDate, status, paymentStatus, totalPrice, notes, customerAddress, time, duration, location, customerName, customerEmail, customerPhone, housekeeperName, service, createdAt) VALUES
(3, 1, 1, '2025-10-17 10:00:00', '2025-10-17 13:00:00', 'completed', 'success', 300000, 'Đã hoàn thành dọn dẹp nhà cửa', 'Quận 7, TP.HCM', '10:00', 3, 'Quận 7, TP.HCM', 'Lê Thị Hoa', 'hoa.le@email.com', '0923456789', 'Nguyễn Thị Lan', 'Dọn dẹp nhà cửa', NOW()),
(4, 2, 2, '2025-10-17 14:00:00', '2025-10-17 17:00:00', 'completed', 'pending', 250000, 'Đã hoàn thành giặt ủi quần áo', 'Quận Ba Đình, Hà Nội', '14:00', 3, 'Quận Ba Đình, Hà Nội', 'Phạm Văn Tuấn', 'tuan.pham@email.com', '0934567890', 'Trần Văn Minh', 'Giặt ủi quần áo', NOW());

-- Thêm payment records cho các booking completed
INSERT INTO payments (bookingId, customerId, method, amount, status, transactionCode, paidAt, createdAt) VALUES
-- Payment cho booking vừa hoàn thành
((SELECT MAX(id)-1 FROM bookings), 3, 'e_wallet', 300000, 'success', CONCAT('PAY_', UNIX_TIMESTAMP()), NOW(), NOW()),
((SELECT MAX(id) FROM bookings), 4, 'bank_transfer', 250000, 'success', CONCAT('PAY_', UNIX_TIMESTAMP()), NOW(), NOW()),
-- Payment cho booking cũ
(1, 3, 'cash', 240000, 'success', 'PAY_CASH_001', NOW(), NOW());

-- Cập nhật completedJobs cho housekeepers
UPDATE housekeepers SET 
  completedJobs = completedJobs + 2,
  updatedAt = NOW()
WHERE id = 1; -- Nguyễn Thị Lan

UPDATE housekeepers SET 
  completedJobs = completedJobs + 1,
  updatedAt = NOW()
WHERE id = 2; -- Trần Văn Minh

-- Thêm reviews cho các booking đã hoàn thành
INSERT INTO reviews (bookingId, housekeeperId, customerId, rating, comment, createdAt) VALUES
((SELECT MAX(id)-1 FROM bookings), 1, 3, 5, 'Dịch vụ tuyệt vời! Nhà cửa sạch sẽ và gọn gàng. Sẽ sử dụng lại dịch vụ.', NOW()),
((SELECT MAX(id) FROM bookings), 2, 4, 4, 'Làm việc chuyên nghiệp, quần áo được giặt sạch và ủi phẳng. Hài lòng với dịch vụ.', NOW()),
(1, 1, 3, 5, 'Chị Lan làm việc rất tận tâm và cẩn thận. Highly recommended!', NOW());

-- Cập nhật rating trung bình cho housekeepers
UPDATE housekeepers h SET 
  rating = (SELECT AVG(r.rating) FROM reviews r WHERE r.housekeeperId = h.id),
  totalReviews = (SELECT COUNT(*) FROM reviews r WHERE r.housekeeperId = h.id),
  updatedAt = NOW()
WHERE h.id IN (1, 2);

-- Thêm notifications cho completion & payment flow
INSERT INTO notifications (userId, type, title, message, bookingId, data, createdAt, read_status) VALUES
-- Notification cho customer khi housekeeper hoàn thành
(3, 'booking_completed', 'Công việc đã hoàn thành', 'Nguyễn Thị Lan đã hoàn thành công việc. Vui lòng xác nhận và thanh toán.', (SELECT MAX(id)-1 FROM bookings), '{"paymentRequired": true}', NOW(), 0),
(4, 'booking_completed', 'Công việc đã hoàn thành', 'Trần Văn Minh đã hoàn thành công việc. Vui lòng xác nhận và thanh toán.', (SELECT MAX(id) FROM bookings), '{"paymentRequired": true}', NOW(), 0),

-- Notification cho housekeeper khi nhận được thanh toán
(1, 'payment_received', 'Đã nhận thanh toán', 'Lê Thị Hoa đã xác nhận và thanh toán 300,000 VND', (SELECT MAX(id)-1 FROM bookings), '{"amount": 300000, "method": "e_wallet"}', NOW(), 0),
(2, 'payment_received', 'Đã nhận thanh toán', 'Phạm Văn Tuấn đã xác nhận và thanh toán 250,000 VND', (SELECT MAX(id) FROM bookings), '{"amount": 250000, "method": "bank_transfer"}', NOW(), 0);

-- Thêm system logs cho completion & payment activities
INSERT INTO system_logs (userId, action, description, ipAddress, createdAt) VALUES
(1, 'BOOKING_COMPLETED', 'Housekeeper đánh dấu booking hoàn thành', '192.168.1.25', NOW()),
(2, 'BOOKING_COMPLETED', 'Housekeeper đánh dấu booking hoàn thành', '192.168.1.26', NOW()),
(3, 'PAYMENT_CONFIRMED', 'Customer xác nhận thanh toán booking', '192.168.1.30', NOW()),
(4, 'PAYMENT_CONFIRMED', 'Customer xác nhận thanh toán booking', '192.168.1.31', NOW()),
(5, 'ADMIN_VIEW_STATS', 'Admin xem thống kê doanh thu', '192.168.1.10', NOW());

-- Bảng trạng thái đọc tin nhắn
CREATE TABLE `chat_read_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `bookingId` int(11) NOT NULL,
  `lastReadAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_booking` (`userId`, `bookingId`),
  KEY `idx_userId` (`userId`),
  KEY `idx_bookingId` (`bookingId`),
  CONSTRAINT `fk_chat_read_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_read_booking` FOREIGN KEY (`bookingId`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- VERIFICATION QUERIES  
-- ========================

-- Kiểm tra dữ liệu completion & payment (queries riêng biệt để tránh lỗi collation)

-- Booking status
-- SELECT 'BOOKING STATUS' as info, status, COUNT(*) as count FROM bookings GROUP BY status;

-- Payment status  
-- SELECT 'PAYMENT STATUS' as info, status, COUNT(*) as count FROM payments GROUP BY status;

-- Total revenue
-- SELECT 'TOTAL REVENUE' as info, 'success' as status, COALESCE(SUM(amount), 0) as count FROM payments WHERE status = 'success';

-- Today revenue
-- SELECT 'TODAY REVENUE' as info, 'today' as status, COALESCE(SUM(amount), 0) as count FROM payments WHERE DATE(paidAt) = CURRENT_DATE AND status = 'success';

-- Completed jobs
-- SELECT 'COMPLETED JOBS' as info, 'housekeeper_1' as status, COALESCE(completedJobs, 0) as count FROM housekeepers WHERE id = 1;
-- SELECT 'COMPLETED JOBS' as info, 'housekeeper_2' as status, COALESCE(completedJobs, 0) as count FROM housekeepers WHERE id = 2;

-- Average ratings
-- SELECT 'AVG RATING' as info, 'housekeeper_1' as status, COALESCE(rating, 0) as count FROM housekeepers WHERE id = 1;
-- SELECT 'AVG RATING' as info, 'housekeeper_2' as status, COALESCE(rating, 0) as count FROM housekeepers WHERE id = 2;

-- ========================
-- DATABASE UPDATE COMMANDS
-- ========================

-- Thêm cột paymentStatus nếu chưa có (cho database hiện tại)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paymentStatus ENUM('pending','success','failed') DEFAULT 'pending' AFTER status;

-- Cập nhật paymentStatus cho các booking đã có payment thành công
UPDATE bookings b 
SET paymentStatus = 'success' 
WHERE EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.bookingId = b.id AND p.status = 'success'
);

-- Cập nhật trạng thái xác minh cho các housekeeper mẫu (để test)
UPDATE users SET isVerified = 1, isApproved = 1 WHERE role = 'housekeeper';

-- Kiểm tra kết quả cập nhật
SELECT 'PAYMENT STATUS UPDATE' as info, 
       id, status, paymentStatus, totalPrice 
FROM bookings 
WHERE status = 'completed' 
ORDER BY id DESC;

-- ========================
-- PACKAGE.JSON DEPENDENCIES UPDATE
-- ========================
-- Add these to backend/package.json dependencies:
-- "multer": "^1.4.5-lts.1"

-- ========================
-- GOOGLE OAUTH SETUP INSTRUCTIONS
-- ========================
-- 1. Go to Google Cloud Console: https://console.cloud.google.com/
-- 2. Create a new project or select existing project
-- 3. Enable Google+ API and Google Identity Services
-- 4. Create OAuth 2.0 credentials
-- 5. Add authorized origins: http://localhost:3000, http://localhost:5174
-- 6. Replace client_id in GoogleAuthButton.jsx with your actual client ID

-- ========================
-- VERIFICATION DOCUMENTS TABLE
-- ========================
CREATE TABLE verification_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  documentType ENUM('id_card_front','id_card_back','certificate','license','insurance','other') NOT NULL,
  filePath VARCHAR(500) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  adminNotes TEXT,
  reviewedBy INT NULL,
  reviewedAt DATETIME NULL,
  uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_status (userId, status),
  INDEX idx_status_type (status, documentType)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- VERIFICATION REQUESTS TABLE  
-- ========================
CREATE TABLE verification_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  requestType ENUM('initial_verification','document_update','resubmission') DEFAULT 'initial_verification',
  status ENUM('pending','under_review','approved','rejected','requires_more_info') DEFAULT 'pending',
  submittedDocuments JSON,
  adminNotes TEXT,
  userNotes TEXT,
  priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
  assignedTo INT NULL,
  submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewedAt DATETIME NULL,
  completedAt DATETIME NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status_priority (status, priority),
  INDEX idx_assigned_status (assignedTo, status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ========================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ========================
CREATE INDEX idx_users_email_auth ON users(email, authProvider);
CREATE INDEX idx_users_google_id ON users(googleId);
CREATE INDEX idx_users_verification_status ON users(isVerified, isApproved, role);
CREATE INDEX idx_file_uploads_user_type ON file_uploads(userId, fileType);

-- ========================
-- SAMPLE GOOGLE OAUTH USER
-- ========================
INSERT INTO users (fullName, email, googleId, authProvider, profilePicture, role, isVerified, isApproved, createdAt) VALUES
('Google Test User', 'googleuser@gmail.com', 'google_123456789', 'google', 'https://lh3.googleusercontent.com/a/default-user', 'customer', 1, 1, NOW());

-- ========================
-- SAMPLE VERIFICATION DATA
-- ========================

-- Thêm housekeeper chưa được xác thực
INSERT INTO users (fullName, email, password, phone, role, address, city, district, isVerified, isApproved, createdAt) VALUES
('Nguyễn Văn Tân', 'tan.nguyen@email.com', SHA2('123456', 256), '0945678901', 'housekeeper', '789 Đường PQR, Phường 5', 'TP.HCM', 'Quận 10', 0, 0, NOW()),
('Lê Thị Mai', 'mai.le@email.com', SHA2('123456', 256), '0956789012', 'housekeeper', '321 Đường STU, Phường 6', 'Hà Nội', 'Quận Đống Đa', 0, 0, NOW());

-- Tạo housekeeper records cho users mới
-- Sử dụng LAST_INSERT_ID() để lấy ID của user vừa tạo
SET @tanUserId = (SELECT id FROM users WHERE email = 'tan.nguyen@email.com');
SET @maiUserId = (SELECT id FROM users WHERE email = 'mai.le@email.com');

INSERT INTO housekeepers (userId, rating, services, price, available, description, experience) VALUES
(@tanUserId, 0, 'Dọn dẹp nhà cửa, Giặt ủi', 60000, 0, 'Người giúp việc mới, cần xác thực', 2),
(@maiUserId, 0, 'Nấu ăn, Chăm sóc trẻ em', 70000, 0, 'Có kinh nghiệm chăm sóc trẻ em', 3);

-- Tạo verification requests
INSERT INTO verification_requests (userId, requestType, userNotes, priority, submittedAt) VALUES
(@tanUserId, 'initial_verification', 'Tôi có 2 năm kinh nghiệm làm việc nhà. Mong admin xem xét sớm.', 'high', NOW()),
(@maiUserId, 'initial_verification', 'Tôi đã có chứng chỉ chăm sóc trẻ em và 3 năm kinh nghiệm.', 'normal', DATE_SUB(NOW(), INTERVAL 1 DAY));

-- Tạo sample verification documents
INSERT INTO verification_documents (userId, documentType, filePath, originalName, status) VALUES
(@tanUserId, 'id_card_front', '/uploads/id_cards/tan_id_front.jpg', 'CMND_mat_truoc.jpg', 'pending'),
(@tanUserId, 'id_card_back', '/uploads/id_cards/tan_id_back.jpg', 'CMND_mat_sau.jpg', 'pending'),
(@maiUserId, 'id_card_front', '/uploads/id_cards/mai_id_front.jpg', 'CCCD_mat_truoc.jpg', 'pending'),
(@maiUserId, 'id_card_back', '/uploads/id_cards/mai_id_back.jpg', 'CCCD_mat_sau.jpg', 'pending'),
(@maiUserId, 'certificate', '/uploads/certificates/mai_cert.pdf', 'Chung_chi_cham_soc_tre_em.pdf', 'pending');

-- Tạo notifications cho admin về verification requests
SET @adminId = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);

INSERT INTO notifications (userId, type, title, message, data, createdAt) VALUES
(@adminId, 'verification_request', 'Yêu cầu xác thực mới', 
 'Nguyễn Văn Tân đã gửi yêu cầu xác thực tài khoản housekeeper', 
 CONCAT('{"userId": ', @tanUserId, ', "userName": "Nguyễn Văn Tân", "requestType": "initial_verification"}'), NOW()),
(@adminId, 'verification_request', 'Yêu cầu xác thực mới', 
 'Lê Thị Mai đã gửi yêu cầu xác thực tài khoản housekeeper', 
 CONCAT('{"userId": ', @maiUserId, ', "userName": "Lê Thị Mai", "requestType": "initial_verification"}'), NOW());

-- ========================
-- UPDATE EXISTING USERS PASSWORD HASH
-- ========================
-- Convert existing plain text passwords to SHA256 hash for security
UPDATE users SET password = SHA2(password, 256) WHERE authProvider = 'local' AND password NOT LIKE '$%';

-- ========================
-- FIX LOGIN PASSWORDS FOR ALL USERS
-- ========================
-- Cập nhật password để đăng nhập được (sử dụng SHA256)

-- Admin password: admin123
UPDATE users SET password = SHA2('admin123', 256) WHERE email = 'admin@househelp.com';

-- Housekeeper passwords: 123456
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'lan.nguyen@email.com';
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'minh.tran@email.com';
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'tan.nguyen@email.com';
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'mai.le@email.com';

-- Customer passwords: 123456  
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'hoa.le@email.com';
UPDATE users SET password = SHA2('123456', 256) WHERE email = 'tuan.pham@email.com';

-- Google OAuth user (không cần password)
UPDATE users SET password = NULL WHERE email = 'googleuser@gmail.com' AND authProvider = 'google';

-- ========================
-- VERIFICATION DATA CHECK
-- ========================

-- Kiểm tra dữ liệu verification đã tạo
SELECT 'VERIFICATION SYSTEM STATUS' as info;
SELECT 'New Housekeepers Created' as status, COUNT(*) as count FROM users WHERE role = 'housekeeper' AND isVerified = 0;
SELECT 'Verification Requests' as status, COUNT(*) as count FROM verification_requests;
SELECT 'Verification Documents' as status, COUNT(*) as count FROM verification_documents;
SELECT 'Admin Notifications' as status, COUNT(*) as count FROM notifications WHERE type = 'verification_request';

-- Hiển thị thông tin housekeeper mới
SELECT 'NEW HOUSEKEEPERS INFO' as info;
SELECT fullName, email, isVerified, isApproved, createdAt FROM users WHERE email IN ('tan.nguyen@email.com', 'mai.le@email.com');

-- ========================
-- LOGIN CREDENTIALS INFO
-- ========================
SELECT '=== THÔNG TIN ĐĂNG NHẬP ===' as info;

SELECT 'ADMIN ACCOUNT' as account_type, 'admin@househelp.com' as email, 'admin123' as password, 'Quản trị hệ thống' as description;

SELECT 'HOUSEKEEPER ACCOUNTS' as account_type, '' as email, '' as password, '' as description;
SELECT '' as account_type, 'lan.nguyen@email.com' as email, '123456' as password, 'Đã xác thực - có thể nhận việc' as description;
SELECT '' as account_type, 'minh.tran@email.com' as email, '123456' as password, 'Đã xác thực - có thể nhận việc' as description;
SELECT '' as account_type, 'tan.nguyen@email.com' as email, '123456' as password, 'CHƯA xác thực - cần admin duyệt' as description;
SELECT '' as account_type, 'mai.le@email.com' as email, '123456' as password, 'CHƯA xác thực - cần admin duyệt' as description;

SELECT 'CUSTOMER ACCOUNTS' as account_type, '' as email, '' as password, '' as description;
SELECT '' as account_type, 'hoa.le@email.com' as email, '123456' as password, 'Khách hàng thường' as description;
SELECT '' as account_type, 'tuan.pham@email.com' as email, '123456' as password, 'Khách hàng thường' as description;

SELECT 'GOOGLE OAUTH TEST' as account_type, 'googleuser@gmail.com' as email, 'Không cần password' as password, 'Đăng nhập bằng Google' as description;

-- Commit transaction
COMMIT;