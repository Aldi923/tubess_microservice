CREATE DATABASE IF NOT EXISTS travel_microservice;
USE travel_microservice;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Destinations Table
CREATE TABLE IF NOT EXISTS destinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  image VARCHAR(512),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  destinationId INT NOT NULL,
  totalPerson INT NOT NULL,
  totalPrice DECIMAL(10, 2) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (destinationId) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  transaction_id VARCHAR(255) NULL,
  gross_amount DECIMAL(10, 2) NOT NULL,
  payment_type VARCHAR(100) NULL,
  status ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert Seed Data
-- Default user password is '123456' hashed with bcrypt (cost 10): $2b$10$n4O5yU.gN5/bB.6rIhyH.uxjYt9pUqT4DksrR13dO6Jd64sI/Osu2
INSERT INTO users (id, name, email, password) VALUES
(1, 'John Doe', 'john@mail.com', '$2b$10$n4O5yU.gN5/bB.6rIhyH.uxjYt9pUqT4DksrR13dO6Jd64sI/Osu2'),
(2, 'Jane Smith', 'jane@mail.com', '$2b$10$n4O5yU.gN5/bB.6rIhyH.uxjYt9pUqT4DksrR13dO6Jd64sI/Osu2');

INSERT INTO destinations (id, name, city, price, description, image) VALUES
(1, 'Bali', 'Denpasar', 1500000.00, 'Wisata pantai eksotis dengan kebudayaan yang kental.', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4'),
(2, 'Labuan Bajo', 'Manggarai Barat', 3500000.00, 'Keindahan alam bawah laut dan habitat Komodo.', 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf'),
(3, 'Lombok', 'Mataram', 2000000.00, 'Keindahan Gili Trawangan dan Gunung Rinjani.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e'),
(4, 'Yogyakarta', 'Sleman', 750000.00, 'Candi Borobudur dan kebudayaan Jawa yang autentik.', 'https://images.unsplash.com/photo-1584810359583-96fc3448beaa');

INSERT INTO bookings (id, userId, destinationId, totalPerson, totalPrice) VALUES
(1, 1, 1, 2, 3000000.00);

INSERT INTO payments (id, booking_id, transaction_id, gross_amount, payment_type, status) VALUES
(1, 1, 'TRX-123456', 3000000.00, 'credit_card', 'PAID');
