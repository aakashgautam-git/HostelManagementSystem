
USE hostel_db;

-- ---- Admin -----------------------------------------------------------------
INSERT INTO admins (name, email, password_hash) VALUES
('Warden Sharma', 'admin@hostel.com',
 'pbkdf2_sha256$870000$vDJnN2yjLoaqfh7NCScliC$mNsBX80ThGiQz6WV0vwYrrJXIjua/4W6iggHsvOcJYo=');

-- ---- Students (all password = student123) ----------------------------------
INSERT INTO students (name, email, password_hash, phone, gender, course, year_of_study, balance) VALUES
('Aarav Mehta',  'aarav@stu.edu',  'pbkdf2_sha256$870000$KfIqXKZGRmtcduzgZbwwMq$J/p5n4Hcg3ArDKUqzk2s+RtSJuq1EcO1We+DrZP1m74=', '9876500001', 'male',   'B.Tech CSE', 2, 6000.00),
('Diya Nair',    'diya@stu.edu',   'pbkdf2_sha256$870000$KfIqXKZGRmtcduzgZbwwMq$J/p5n4Hcg3ArDKUqzk2s+RtSJuq1EcO1We+DrZP1m74=', '9876500002', 'female', 'B.Tech ECE', 3, 6000.00),
('Kabir Singh',  'kabir@stu.edu',  'pbkdf2_sha256$870000$KfIqXKZGRmtcduzgZbwwMq$J/p5n4Hcg3ArDKUqzk2s+RtSJuq1EcO1We+DrZP1m74=', '9876500003', 'male',   'B.Sc Maths', 1, 4500.00),
('Isha Verma',   'isha@stu.edu',   'pbkdf2_sha256$870000$KfIqXKZGRmtcduzgZbwwMq$J/p5n4Hcg3ArDKUqzk2s+RtSJuq1EcO1We+DrZP1m74=', '9876500004', 'female', 'BBA',        2, 1000.00),
('Rohan Gupta',  'rohan@stu.edu',  'pbkdf2_sha256$870000$KfIqXKZGRmtcduzgZbwwMq$J/p5n4Hcg3ArDKUqzk2s+RtSJuq1EcO1We+DrZP1m74=', '9876500005', 'male',   'B.Tech ME',  4,    0.00);

-- ---- Rooms (available_beds starts == capacity) -----------------------------
INSERT INTO rooms (room_number, block, floor, room_type, capacity, available_beds, monthly_rent) VALUES
('A-101', 'A', 1, 'double',     2, 2, 5000.00),
('A-102', 'A', 1, 'double',     2, 2, 5000.00),
('B-201', 'B', 2, 'triple',     3, 3, 4000.00),
('B-202', 'B', 2, 'single',     1, 1, 8000.00),
('C-301', 'C', 3, 'dormitory',  4, 4, 3000.00);


INSERT INTO room_allocations (student_id, room_id) VALUES
(1, 1),   -- Aarav -> A-101
(2, 1),   -- Diya  -> A-101  (now full)
(3, 3);   -- Kabir -> B-201

-- ---- Meal bookings for the CURRENT month (so the bill picks them up) --------
SET @m = DATE_FORMAT(CURRENT_DATE, '%Y-%m-01');
INSERT INTO meal_bookings (student_id, meal_date, meal_type, price) VALUES
(1, @m + INTERVAL 0 DAY, 'breakfast', 40), (1, @m + INTERVAL 0 DAY, 'lunch', 70), (1, @m + INTERVAL 0 DAY, 'dinner', 60),
(1, @m + INTERVAL 1 DAY, 'lunch', 70),     (1, @m + INTERVAL 1 DAY, 'dinner', 60),
(2, @m + INTERVAL 0 DAY, 'breakfast', 40), (2, @m + INTERVAL 0 DAY, 'dinner', 60),
(3, @m + INTERVAL 0 DAY, 'lunch', 70);

-- ---- Fines (unpaid -> will be rolled into the next generated bill) ----------
INSERT INTO fines (student_id, reason, amount) VALUES
(1, 'Late mess payment', 200.00),
(3, 'Damaged furniture', 500.00);

-- ---- Complaints (trigger forces status='pending' + created_at) -------------
INSERT INTO complaints (student_id, category, subject, description) VALUES
(1, 'wifi',        'WiFi not working in A-101',  'No internet since last night.'),
(2, 'mess',        'Food quality',               'Dinner was cold yesterday.'),
(3, 'maintenance', 'Leaking tap',                'Bathroom tap leaking in B-201.');

-- Resolve one complaint -> trg_complaint_before_update stamps resolved_at.
UPDATE complaints
   SET status = 'resolved', admin_remark = 'Router restarted, working now.'
 WHERE subject = 'WiFi not working in A-101';

-- ---- Exercise the PROCEDURE: build this month's bills -----------------------
CALL generate_monthly_bill(1);   -- rent 5000 + mess 300 + fine 200 = 5500
CALL generate_monthly_bill(2);   -- rent 5000 + mess 100          = 5100

-- ---- Exercise the TRANSACTION: Aarav part-pays bill #1 ----------------------
-- (deducts wallet, inserts payment, updates bill -> status 'partial', all atomic)
CALL pay_bill(1, 1, 2000.00);
