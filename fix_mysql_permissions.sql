-- Fix MySQL permissions for XAMPP
-- Chạy script này trong phpMyAdmin hoặc MySQL command line

-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS househelp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tạo user root cho localhost và 127.0.0.1
CREATE USER IF NOT EXISTS 'root'@'localhost' IDENTIFIED BY '';
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '';
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '';

-- Cấp tất cả quyền
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- Refresh privileges
FLUSH PRIVILEGES;

-- Hiển thị user để kiểm tra
SELECT user, host FROM mysql.user WHERE user = 'root';

