# How each DBMS concept is used (viva notes)

Quick map of every required database feature → what it does → where it runs in the
app → the actual code. Files referenced are in `/database`.

---

## 1) VIEWS  (file: `02_views.sql`)
A view is a **saved query** you can read like a table. We have 3.

### `student_dues_view` — how much each student owes
```sql
CREATE OR REPLACE VIEW student_dues_view AS
SELECT s.student_id, s.name, s.email, s.balance AS wallet_balance,
       COALESCE(SUM(b.total_amount - b.paid_amount), 0) AS total_due,
       COUNT(b.bill_id) AS pending_bills
FROM students s
LEFT JOIN bills b ON b.student_id = s.student_id AND b.status <> 'paid'
GROUP BY s.student_id, s.name, s.email, s.balance;
```
**Used in:** student **Dashboard** (your dues) and admin **Students** table (everyone's
dues column). API: `GET /students`, `GET /students/me`.

### `daily_meal_count_view` — meals booked per day
**Used in:** admin **Mess Report** page. API: `GET /meals/daily-count`.

### `room_occupancy_view` — free/occupied beds per room
**Used in:** admin **Rooms** page. API: `GET /rooms`.

> Why a view? The dues calculation (a JOIN + SUM + GROUP BY) is reused on several
> screens, so we write it **once** in the database and every screen reads it.

---

## 2) STORED PROCEDURES  (file: `03_procedures.sql`)
A procedure is a **named block of SQL with logic** you call by name. We have 2.

### `allocate_room(student_id, room_id)` — assign a bed safely
It checks the room exists, isn't under maintenance, **has a free bed**, and that the
student doesn't already have a room — *then* inserts the allocation. If any check
fails it raises an error (`SIGNAL`).
```sql
IF v_free <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No vacancy: room is full';
END IF;
```
**Used in:** admin **Students → Allocate room**. API: `POST /rooms/allocate`
runs `CALL allocate_room(%s, %s)`.

### `generate_monthly_bill(student_id)` — make this month's bill
It adds up **rent** (from the active room) + **mess** (this month's meals) + **fines**,
and saves one bill.
```sql
INSERT INTO bills (student_id, bill_month, rent_amount, mess_amount, fine_amount)
VALUES (p_student_id, v_month, v_rent, v_mess, v_fine)
ON DUPLICATE KEY UPDATE rent_amount=v_rent, mess_amount=v_mess, fine_amount=v_fine;
```
**Used in:** admin **Billing → Generate bill**. API: `POST /billing/generate`.

> Why a procedure? The rules (vacancy check, bill total) live in the **database**, so
> they can't be bypassed and don't have to be re-written in the app.

---

## 3) TRIGGERS  (file: `04_triggers.sql`)
A trigger **runs automatically** when a row is inserted/updated. We have 4.

| Trigger | Runs automatically when… | What it does |
|---|---|---|
| `trg_alloc_after_insert` | a student is **allocated** a room | room's `available_beds − 1`; marks room `full` at 0 |
| `trg_alloc_after_update` | a student is **vacated** | room's `available_beds + 1`; re-opens the room |
| `trg_complaint_before_insert` | a student **raises** a complaint | forces `status='pending'` + sets `created_at` |
| `trg_complaint_before_update` | admin marks complaint **resolved** | auto-stamps `resolved_at` time |

Example (the bed counter):
```sql
CREATE TRIGGER trg_alloc_after_insert
AFTER INSERT ON room_allocations FOR EACH ROW
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE rooms
       SET available_beds = available_beds - 1,
           status = CASE WHEN available_beds - 1 <= 0 THEN 'full' ELSE status END
     WHERE room_id = NEW.room_id;
  END IF;
END
```
**Used in:** clicking **Allocate** / **Vacate** (admin) fires the bed triggers;
**raising / resolving** a complaint fires the complaint triggers. The app never
touches `available_beds` or `resolved_at` itself — the database keeps them correct.

---

## 4) TRANSACTION  (file: `05_transaction.sql`)
A transaction makes several writes **all-or-nothing**. Used for fee payment.

### `pay_bill(student_id, bill_id, amount)`
```sql
START TRANSACTION;
   -- (1) take money from wallet
   UPDATE students SET balance = balance - p_amount WHERE student_id = p_student_id;
   -- (2) record the payment
   INSERT INTO payments (student_id, bill_id, amount, method) VALUES (...);
   -- (3) update the bill
   UPDATE bills SET paid_amount = paid_amount + p_amount, status = ... WHERE bill_id = p_bill_id;
COMMIT;
-- if anything fails: DECLARE EXIT HANDLER FOR SQLEXCEPTION -> ROLLBACK;
```
If the student doesn't have enough balance, it **rolls back** — no money moves, no
half-payment. **Used in:** student **Fees → Pay**. API: `POST /billing/pay`.

> Why a transaction? Paying touches 3 tables. Without a transaction, a crash between
> steps could deduct money but not record the payment. The transaction guarantees
> they **all succeed or all fail together**.

---

## 5) CONSTRAINTS  (file: `01_schema.sql`)
Rules enforced by the database itself:
- **PRIMARY KEY** on every table (`student_id`, `room_id`, …).
- **FOREIGN KEY** links (e.g. `bills.student_id → students`), with `ON DELETE CASCADE`.
- **UNIQUE**: `email`; one **active** bed per student; one meal booking per
  (student, date, type); one bill per (student, month).
- **CHECK**: `balance >= 0`, `0 ≤ available_beds ≤ capacity`, `amount > 0`.
- **Generated column**: `bills.total_amount = rent + mess + fine` (always correct).

---

## 6) JOINS  (used everywhere)
Combining tables. Examples:
- 3-table join — current allocations: `room_allocations ⨝ students ⨝ rooms`
- `bills ⨝ students` (bills with names), `complaints ⨝ students`
- the `student_dues_view` uses a `LEFT JOIN students ⨝ bills`

---

## One-line answers for the viva
- **View** → "a saved query; I use `student_dues_view` to show pending fees on the dashboards."
- **Procedure** → "logic stored in the DB; `allocate_room` checks vacancy before assigning, `generate_monthly_bill` totals the bill."
- **Trigger** → "runs automatically; allocating a room auto-decrements beds, resolving a complaint auto-stamps the time."
- **Transaction** → "`pay_bill` deducts wallet + records payment + updates the bill as one atomic unit, with ROLLBACK on failure."
