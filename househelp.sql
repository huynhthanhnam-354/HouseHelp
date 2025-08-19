-- Set charset to handle Vietnamese characters
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Drop existing tables in correct order
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS housekeeper_services;
DROP TABLE IF EXISTS housekeepers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

-- Create users table with profile information
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  phone VARCHAR(20),
  role ENUM('customer', 'housekeeper') DEFAULT 'customer',
  idCardFront LONGTEXT,  -- Store base64 image data
  idCardBack LONGTEXT,   -- Store base64 image data
  avatar VARCHAR(255),
  dateOfBirth DATE,
  gender ENUM('male', 'female', 'other'),
  address TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  city VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  district VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  bio TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  languages VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  emergencyContact VARCHAR(20),
  emergencyContactName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  isVerified BOOLEAN DEFAULT FALSE,
  verifiedAt DATETIME,
  lastActiveAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create housekeepers table with extended profile
CREATE TABLE housekeepers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  rating FLOAT DEFAULT 0,
  totalReviews INT DEFAULT 0,
  services VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  price DECIMAL(10,2),
  priceType ENUM('hourly', 'daily', 'per_service') DEFAULT 'hourly',
  available BOOLEAN DEFAULT TRUE,
  description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  experience INT DEFAULT 0,
  skills JSON,
  certifications JSON,
  workingDays JSON,
  workingHours VARCHAR(50),
  serviceRadius INT DEFAULT 10,
  profileImages JSON,
  hasInsurance BOOLEAN DEFAULT FALSE,
  insuranceInfo TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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

-- Create services table
CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci UNIQUE,
  description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  icon VARCHAR(100),
  isActive BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create junction table for housekeeper services
CREATE TABLE housekeeper_services (
  housekeeperId INT,
  serviceId INT,
  priceOverride DECIMAL(10,2),
  PRIMARY KEY (housekeeperId, serviceId),
  FOREIGN KEY (housekeeperId) REFERENCES housekeepers(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
);

-- Create bookings table
CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT NOT NULL,
  housekeeperId INT NOT NULL,
  serviceId INT,
  startDate DATETIME NOT NULL,
  endDate DATETIME,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  totalPrice DECIMAL(10,2),
  notes TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  customerAddress TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (housekeeperId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (serviceId) REFERENCES services(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create reviews table
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

-- Add indexes for better performance
ALTER TABLE housekeepers ADD INDEX idx_rating (rating);
ALTER TABLE housekeepers ADD INDEX idx_price (price);
ALTER TABLE housekeepers ADD INDEX idx_available (available);
ALTER TABLE housekeepers ADD INDEX idx_user_id (userId);
ALTER TABLE users ADD INDEX idx_city (city);
ALTER TABLE users ADD INDEX idx_role (role);
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE bookings ADD INDEX idx_customer (customerId);
ALTER TABLE bookings ADD INDEX idx_housekeeper (housekeeperId);
ALTER TABLE bookings ADD INDEX idx_status (status);
ALTER TABLE bookings ADD INDEX idx_date (startDate);

-- Insert sample services
INSERT INTO services (name, description, icon) VALUES
('Dọn dẹp nhà cửa', 'Vệ sinh tổng thể nhà cửa, lau chùi, hút bụi', 'home-cleaning'),
('Giặt ủi quần áo', 'Giặt, ủi và sắp xếp quần áo gọn gàng', 'laundry'),
('Nấu ăn', 'Chuẩn bị và nấu các bữa ăn theo yêu cầu', 'cooking'),
('Chăm sóc trẻ em', 'Trông trẻ, chơi và chăm sóc trẻ em', 'childcare'),
('Chăm sóc người già', 'Hỗ trợ và chăm sóc người cao tuổi', 'eldercare'),
('Vệ sinh công nghiệp', 'Vệ sinh văn phòng, nhà xưởng quy mô lớn', 'industrial-cleaning');

-- Insert sample users
INSERT INTO users (fullName, email, password, phone, role, avatar, dateOfBirth, gender, address, city, district, bio, languages, emergencyContact, emergencyContactName, isVerified) VALUES
('Nguyễn Thị Lan', 'lan.nguyen@email.com', '$2b$10$example_hash_1', '0901234567', 'housekeeper', '/avatars/lan-nguyen.jpg', '1990-05-15', 'female', '123 Đường ABC, Phường 1', 'TP.HCM', 'Quận 1', 'Tôi có 5 năm kinh nghiệm làm việc nhà và luôn tận tâm với công việc.', 'Tiếng Việt, Tiếng Anh', '0987654321', 'Nguyễn Văn Nam', TRUE),
('Trần Văn Minh', 'minh.tran@email.com', '$2b$10$example_hash_2', '0912345678', 'housekeeper', '/avatars/minh-tran.jpg', '1985-08-20', 'male', '456 Đường XYZ, Phường 2', 'TP.HCM', 'Quận 3', 'Chuyên về vệ sinh công nghiệp và làm sạch nhà cửa.', 'Tiếng Việt', '0976543210', 'Trần Thị Mai', TRUE),
('Lê Thị Hoa', 'hoa.le@email.com', '$2b$10$example_hash_3', '0923456789', 'customer', '/avatars/hoa-le.jpg', '1992-12-10', 'female', '789 Đường DEF, Phường 3', 'TP.HCM', 'Quận 7', 'Tôi là khách hàng thường xuyên sử dụng dịch vụ giúp việc.', 'Tiếng Việt', '0965432109', 'Lê Văn Đức', FALSE),
('Phạm Văn Tuấn', 'tuan.pham@email.com', '$2b$10$example_hash_4', '0934567890', 'customer', '/avatars/tuan-pham.jpg', '1988-03-25', 'male', '321 Đường GHI, Phường 4', 'Hà Nội', 'Quận Ba Đình', 'Chủ nhà thường xuyên cần dịch vụ vệ sinh.', 'Tiếng Việt, Tiếng Anh', '0954321098', 'Phạm Thị Lan', FALSE);

-- Insert sample housekeepers
INSERT INTO housekeepers (userId, rating, totalReviews, services, price, priceType, description, experience, skills, certifications, workingDays, workingHours, serviceRadius, profileImages, hasInsurance, completedJobs, responseTime, isTopRated) VALUES
(1, 4.8, 127, 'Vệ sinh nhà cửa, Giặt ủi, Nấu ăn', 80000.00, 'hourly', 'Tôi có 5 năm kinh nghiệm trong lĩnh vực giúp việc nhà. Tôi làm việc tận tâm, cẩn thận và luôn đảm bảo chất lượng tốt nhất cho khách hàng.', 5, 
JSON_ARRAY('Vệ sinh chuyên nghiệp', 'Nấu ăn ngon', 'Chăm sóc trẻ em', 'Giặt ủi'), 
JSON_ARRAY('Chứng chỉ vệ sinh an toàn thực phẩm', 'Chứng chỉ sơ cấp cứu'), 
JSON_ARRAY('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), 
'07:00-19:00', 15, 
JSON_ARRAY('/portfolio/lan-1.jpg', '/portfolio/lan-2.jpg'), 
TRUE, 95, 15, TRUE),

(2, 4.5, 89, 'Vệ sinh công nghiệp, Vệ sinh nhà cửa', 70000.00, 'hourly', 'Chuyên về vệ sinh công nghiệp và vệ sinh nhà ở. Có kinh nghiệm làm việc với các công ty lớn và gia đình.', 8, 
JSON_ARRAY('Vệ sinh công nghiệp', 'Vệ sinh kính', 'Vệ sinh thảm', 'Bảo trì thiết bị'), 
JSON_ARRAY('Chứng chỉ vệ sinh công nghiệp', 'Chứng chỉ an toàn lao động'), 
JSON_ARRAY('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'), 
'08:00-17:00', 20, 
JSON_ARRAY('/portfolio/minh-1.jpg', '/portfolio/minh-2.jpg', '/portfolio/minh-3.jpg'), 
TRUE, 156, 20, FALSE);

-- Insert sample housekeeper services relationships
INSERT INTO housekeeper_services (housekeeperId, serviceId) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 6);

-- Update bookings table to add new columns for enhanced booking functionality
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS time VARCHAR(10),
ADD COLUMN IF NOT EXISTS duration INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS location TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
ADD COLUMN IF NOT EXISTS customerName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
ADD COLUMN IF NOT EXISTS customerEmail VARCHAR(255),
ADD COLUMN IF NOT EXISTS customerPhone VARCHAR(20),
ADD COLUMN IF NOT EXISTS housekeeperName VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
ADD COLUMN IF NOT EXISTS service VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Rename existing columns to avoid conflicts
ALTER TABLE bookings 
CHANGE COLUMN startDate date DATE,
CHANGE COLUMN totalPrice totalPrice DECIMAL(10,2);

-- Create notifications table for real-time messaging system
CREATE TABLE IF NOT EXISTS notifications (
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