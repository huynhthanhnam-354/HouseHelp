DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS housekeeper_services;
DROP TABLE IF EXISTS housekeepers;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullName VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('customer', 'housekeeper'),
  idCardFront VARCHAR(255),
  idCardBack VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE housekeepers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  rating FLOAT,
  services VARCHAR(255),
  price FLOAT,
  available BOOLEAN,
  description TEXT,
  FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customerId INT,
  housekeeperId INT,
  service VARCHAR(100),
  date DATETIME,
  status VARCHAR(50),
  price FLOAT,
  FOREIGN KEY (customerId) REFERENCES users(id),
  FOREIGN KEY (housekeeperId) REFERENCES users(id)
);

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE
);

CREATE TABLE housekeeper_services (
  housekeeperId INT,
  serviceId INT,
  PRIMARY KEY (housekeeperId, serviceId),
  FOREIGN KEY (housekeeperId) REFERENCES housekeepers(id),
  FOREIGN KEY (serviceId) REFERENCES services(id)
);

CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  housekeeperId INT,
  customerId INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (housekeeperId) REFERENCES housekeepers(id),
  FOREIGN KEY (customerId) REFERENCES users(id)
);

ALTER TABLE housekeepers ADD INDEX idx_rating (rating);
ALTER TABLE housekeepers ADD INDEX idx_price (price);
ALTER TABLE housekeepers ADD INDEX idx_available (available);