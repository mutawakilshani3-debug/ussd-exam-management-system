-- ============================================================
-- USSD Exam Management System - Database Schema (MySQL 8+)
-- ============================================================

CREATE DATABASE IF NOT EXISTS ussd_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ussd_db;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- Faculties / Departments / Programmes (academic structure)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS faculties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  faculty_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_department (faculty_id, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS programmes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_programme (department_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Users (single table, differentiated by role)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','examiner','invigilator','student') NOT NULL,
  programme_id INT NULL,
  level VARCHAR(10) NULL,
  index_number VARCHAR(30) NULL UNIQUE,
  staff_id VARCHAR(30) NULL UNIQUE,
  profile_picture VARCHAR(255) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_role (role),
  INDEX idx_programme_level (programme_id, level)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Courses
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  programme_id INT NOT NULL,
  level VARCHAR(10) NOT NULL,
  semester VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (programme_id) REFERENCES programmes(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_course_search (code, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_examiners (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  examiner_id INT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (examiner_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_course_examiner (course_id, examiner_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Exam Timetable
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_timetable (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  exam_date DATE NOT NULL,
  exam_day VARCHAR(15) NOT NULL,
  venue VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  examiner_id INT NULL,
  invigilator_id INT NULL,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (examiner_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_timetable_date (exam_date),
  INDEX idx_timetable_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Password reset tokens
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_token (token)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- Activity logs
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_log_user (user_id),
  INDEX idx_log_action (action)
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- File upload logs (bulk imports)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS file_upload_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uploaded_by INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  import_type ENUM('students','examiners','invigilators') NOT NULL,
  total_rows INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  error_report LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
