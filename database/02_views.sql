
USE hostel_db;


CREATE OR REPLACE VIEW student_dues_view AS
SELECT
    s.student_id,
    s.name,
    s.email,
    s.balance                                                   AS wallet_balance,
    COALESCE(SUM(b.total_amount - b.paid_amount), 0)            AS total_due,
    COUNT(b.bill_id)                                            AS pending_bills
FROM students s
LEFT JOIN bills b
       ON b.student_id = s.student_id
      AND b.status <> 'paid'
GROUP BY s.student_id, s.name, s.email, s.balance;


CREATE OR REPLACE VIEW daily_meal_count_view AS
SELECT
    meal_date,
    SUM(meal_type = 'breakfast') AS breakfast_count,
    SUM(meal_type = 'lunch')     AS lunch_count,
    SUM(meal_type = 'dinner')    AS dinner_count,
    COUNT(*)                     AS total_meals,
    SUM(price)                   AS total_revenue
FROM meal_bookings
WHERE status <> 'cancelled'
GROUP BY meal_date
ORDER BY meal_date DESC;


CREATE OR REPLACE VIEW room_occupancy_view AS
SELECT
    r.room_id,
    r.room_number,
    r.block,
    r.room_type,
    r.capacity,
    r.available_beds,
    (r.capacity - r.available_beds) AS occupied_beds,
    r.monthly_rent,
    r.status
FROM rooms r;
