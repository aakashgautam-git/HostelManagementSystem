

DROP DATABASE IF EXISTS hostel_db;
CREATE DATABASE hostel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_db;


CREATE TABLE admins (
    admin_id      INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE rooms (
    room_id        INT AUTO_INCREMENT PRIMARY KEY,
    room_number    VARCHAR(20)   NOT NULL UNIQUE,
    block          VARCHAR(20)   NOT NULL,
    floor          INT           NOT NULL DEFAULT 0,
    room_type      ENUM('single','double','triple','dormitory') NOT NULL DEFAULT 'double',
    capacity       INT           NOT NULL,
    available_beds INT           NOT NULL,
    monthly_rent   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status         ENUM('available','full','maintenance') NOT NULL DEFAULT 'available',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_capacity      CHECK (capacity > 0),
    CONSTRAINT chk_available     CHECK (available_beds >= 0 AND available_beds <= capacity),
    CONSTRAINT chk_rent_positive CHECK (monthly_rent >= 0)
) ENGINE=InnoDB;


CREATE TABLE students (
    student_id    INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    phone         VARCHAR(20),
    gender        ENUM('male','female','other') NOT NULL DEFAULT 'other',
    course        VARCHAR(100),
    year_of_study INT,
    balance       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_balance CHECK (balance >= 0),
    CONSTRAINT chk_year     CHECK (year_of_study IS NULL OR year_of_study BETWEEN 1 AND 6)
) ENGINE=InnoDB;


CREATE TABLE room_allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id    INT NOT NULL,
    room_id       INT NOT NULL,
    allocated_on  DATE NOT NULL DEFAULT (CURRENT_DATE),
    vacated_on    DATE NULL,
    status        ENUM('active','vacated') NOT NULL DEFAULT 'active',

    CONSTRAINT fk_alloc_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_alloc_room FOREIGN KEY (room_id)
        REFERENCES rooms(room_id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE room_allocations
    ADD COLUMN active_flag TINYINT
        GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN 1 ELSE NULL END) STORED,
    ADD CONSTRAINT uq_one_active_bed UNIQUE (student_id, active_flag);


CREATE TABLE meal_bookings (
    booking_id  INT AUTO_INCREMENT PRIMARY KEY,
    student_id  INT NOT NULL,
    meal_date   DATE NOT NULL,
    meal_type   ENUM('breakfast','lunch','dinner') NOT NULL,
    price       DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    status      ENUM('booked','cancelled','served') NOT NULL DEFAULT 'booked',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_meal_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT uq_one_meal UNIQUE (student_id, meal_date, meal_type),
    CONSTRAINT chk_meal_price CHECK (price >= 0)
) ENGINE=InnoDB;


CREATE TABLE fines (
    fine_id    INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    reason     VARCHAR(255) NOT NULL,
    amount     DECIMAL(10,2) NOT NULL,
    status     ENUM('unpaid','billed','paid') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fine_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT chk_fine_amount CHECK (amount >= 0)
) ENGINE=InnoDB;


CREATE TABLE bills (
    bill_id      INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT NOT NULL,
    bill_month   DATE NOT NULL,                 -- first day of the billed month
    rent_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    mess_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fine_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS
                 (rent_amount + mess_amount + fine_amount) STORED,
    paid_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status       ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending',
    generated_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bill_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE,
    -- only one bill per student per month
    CONSTRAINT uq_bill_month UNIQUE (student_id, bill_month),
    CONSTRAINT chk_paid CHECK (paid_amount >= 0)
) ENGINE=InnoDB;


    payment_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT NOT NULL,
    bill_id      INT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    method       ENUM('wallet','cash','card','upi') NOT NULL DEFAULT 'wallet',
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pay_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_bill FOREIGN KEY (bill_id)
        REFERENCES bills(bill_id) ON DELETE SET NULL,
    CONSTRAINT chk_pay_amount CHECK (amount > 0)
) ENGINE=InnoDB;


    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id   INT NOT NULL,
    category     ENUM('maintenance','mess','cleanliness','wifi','other')
                 NOT NULL DEFAULT 'other',
    subject      VARCHAR(150) NOT NULL,
    description  TEXT,
    status       ENUM('pending','in_progress','resolved') NOT NULL DEFAULT 'pending',
    admin_remark VARCHAR(255) NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at  TIMESTAMP NULL,

    CONSTRAINT fk_complaint_student FOREIGN KEY (student_id)
        REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE INDEX idx_meal_date     ON meal_bookings (meal_date);
CREATE INDEX idx_bill_status   ON bills (status);
CREATE INDEX idx_complaint_st  ON complaints (status);
