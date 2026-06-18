# Hostel & Mess Management System

A full-stack hostel/mess management web application built as a **DBMS academic
project**. The database layer is intentionally rich — it uses **views, stored
procedures, triggers and transactions** — and the application is a thin, clean
layer on top of that hand-written SQL so every database concept is easy to point
at and explain.

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 18 + Vite + React Router (SPA)        |
| Backend   | Django 5 + Django REST Framework (JSON API) |
| Database  | MySQL 8 (raw SQL — no ORM models)           |
| Auth      | Stateless JWT (PyJWT) + PBKDF2 hashing      |

> **Why raw SQL instead of the Django ORM?** This is a database course project.
> The schema, views, procedures and triggers are the graded artifacts, so they
> are written by hand in `/database/*.sql`. Django connects with
> `connection.cursor()` and `CALL`s the procedures — what runs is exactly the
> SQL you can read and defend.

---

##  Features

- **Student registration & login** (JWT auth, separate admin login)
- **Room allocation** — students assigned to rooms with bed capacity tracking
- **Mess meal booking** — book/cancel breakfast, lunch, dinner
- **Fee payment** — wallet, monthly bills (rent + mess + fines), atomic payments
- **Complaint system** — students raise, admins resolve
- **Admin dashboard** — manage students, rooms, billing, complaints, mess report

---

##  Repository structure

```
dbms/
├── database/                 # ① the graded SQL — run in numeric order
│   ├── 01_schema.sql         #   tables, PK/FK/UNIQUE/CHECK constraints
│   ├── 02_views.sql          #   3 VIEWS
│   ├── 03_procedures.sql     #   2 PROCEDURES (allocate_room, generate_monthly_bill)
│   ├── 04_triggers.sql       #   4 TRIGGERS
│   ├── 05_transaction.sql    #   pay_bill TRANSACTION (START/COMMIT/ROLLBACK)
│   └── 06_seed.sql           #   demo data + live demo of the objects
├── backend/                  # ② Django REST API
│   ├── hostel_api/           #   project (settings, urls, wsgi)
│   ├── api/                  #   db.py, auth_utils.py, views.py, urls.py
│   ├── scripts/genhash.py    #   regenerate seed password hashes
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # ③ React SPA
│   └── src/
│       ├── pages/student/    #   Dashboard, Meals, Fees, Complaints
│       ├── pages/admin/      #   Dashboard, Students, Rooms, Billing, Meals, Complaints
│       └── components/, api.js, auth.jsx
├── docker-compose.yml        # optional one-command MySQL with schema preloaded
└── README.md
```

---

##  Prerequisites

- **MySQL 8** (or use the bundled `docker-compose.yml`)
- **Python 3.10–3.13** — Django 5.1 does **not** support Python 3.14 yet. If your
  default `python3` is 3.14, create the venv with `python3.12` or `python3.13`
  (e.g. `python3.12 -m venv venv`).
- **Node.js 18+**

---

##  Setup

### Step 1 — Database

**Option A — Docker (fastest; loads everything automatically):**

```bash
docker compose up -d
# MySQL is now on localhost:3306, root password = rootpw,
# and all six SQL files have been executed in order.
```

**Option B — your own MySQL:**

```bash
# from the project root, run the files IN ORDER:
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_views.sql
mysql -u root -p < database/03_procedures.sql
mysql -u root -p < database/04_triggers.sql
mysql -u root -p < database/05_transaction.sql
mysql -u root -p < database/06_seed.sql
```

> Order matters: views/procedures/triggers reference the tables, and the seed
> file calls the procedures. Always run `01 → 06`.

### Step 2 — Backend (Django API)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then edit DB_PASSWORD (use rootpw for Docker)

# (optional) enable the read-only admin DB browser at /admin:
python manage.py migrate          # creates Django's own auth/session tables
python manage.py createsuperuser  # make a login for the panel

python manage.py runserver        # API on http://localhost:8000
```

The **domain tables** are never created by Django — they come from the
hand-written SQL. `migrate` only creates Django's *own* `auth_*` / `django_*`
tables so the admin panel at **http://localhost:8000/admin** can log you in and
display the data (read-only). The app's `api/models.py` are `managed = False`
mirrors used purely for that browser.

### Step 3 — Frontend (React SPA)

```bash
cd frontend
npm install
npm run dev                       # app on http://localhost:5173
```

Open **http://localhost:5173**.

### Demo accounts (from `06_seed.sql`)

| Role    | Email              | Password     |
|---------|--------------------|--------------|
| Admin   | admin@hostel.com   | `admin123`   |
| Student | aarav@stu.edu      | `student123` |
| Student | diya@stu.edu       | `student123` |

(every seeded student uses `student123`)

---

##  Database components (the graded bits)

### Views — `database/02_views.sql`

| View                     | What it shows                                   | Used by |
|--------------------------|-------------------------------------------------|---------|
| `student_dues_view`      | Pending fees per student `Σ(total − paid)`      | `GET /api/students`, `GET /api/students/me` → student dashboard & admin "Students" table |
| `daily_meal_count_view`  | Meals booked per day by type (+ revenue)        | `GET /api/meals/daily-count` → admin "Mess Report" |
| `room_occupancy_view`    | Live occupied/free beds per room                | `GET /api/rooms` → admin "Rooms" page |

### Stored procedures — `database/03_procedures.sql`

- **`allocate_room(student_id, room_id)`** — checks the room exists, isn't under
  maintenance, **has a free bed**, and that the student has no active room; then
  inserts the allocation. Locks the room row (`FOR UPDATE`) to prevent two
  students grabbing the last bed. Raises `SIGNAL` on any violation.
  → called by `POST /api/rooms/allocate` (admin "Students" page).
- **`generate_monthly_bill(student_id)`** — totals **rent** (from the active
  room) + **mess** (this month's booked meals) + **fines** (unpaid) into the
  current month's bill (idempotent via `ON DUPLICATE KEY UPDATE`).
  → called by `POST /api/billing/generate` (admin "Billing" page).

### Triggers — `database/04_triggers.sql`

| Trigger                          | Fires                         | Effect |
|----------------------------------|-------------------------------|--------|
| `trg_alloc_after_insert`         | AFTER INSERT room_allocations | **available_beds − 1**, sets room `full` at 0 |
| `trg_alloc_after_update`         | AFTER UPDATE room_allocations | on vacate: **available_beds + 1**, re-opens room |
| `trg_complaint_before_insert`    | BEFORE INSERT complaints      | forces `status='pending'` + `created_at=NOW()` |
| `trg_complaint_before_update`    | BEFORE UPDATE complaints      | stamps `resolved_at` when marked resolved |

### Transaction — `database/05_transaction.sql`

**`pay_bill(student_id, bill_id, amount)`** wraps three writes in
`START TRANSACTION … COMMIT`, with `DECLARE EXIT HANDLER FOR SQLEXCEPTION` →
`ROLLBACK`:

1. deduct `amount` from the student's wallet balance,
2. insert a row into the `payments` ledger,
3. update the bill's `paid_amount` and `status`.

If validation fails (insufficient balance, amount exceeds due, bad ids) it
`SIGNAL`s and the whole thing **rolls back** — money is never half-moved.
→ called by `POST /api/billing/pay` (student "Fees & Payments" page).

---

## 🔌 API reference

All routes are under `http://localhost:8000/api`. Protected routes need
`Authorization: Bearer <token>`.

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | – | student sign-up |
| POST | `/auth/login` | – | login (admin or student) |
| GET  | `/auth/me` | any | current identity |
| GET  | `/students` | admin | all students + dues *(view)* |
| GET  | `/students/me` | student | own profile + room + dues *(view)* |
| GET  | `/rooms` | any | rooms + occupancy *(view)* |
| POST | `/rooms` | admin | create room |
| POST | `/rooms/allocate` | admin | **allocate_room procedure** |
| POST | `/rooms/vacate` | admin | vacate (fires +bed trigger) |
| GET  | `/rooms/allocations` | admin | active allocations |
| POST | `/meals` | student | book a meal |
| GET  | `/meals/me` | student | own bookings |
| DELETE | `/meals/{id}` | student | cancel booking |
| GET  | `/meals/daily-count` | admin | **daily_meal_count_view** |
| POST | `/billing/generate` | admin | **generate_monthly_bill procedure** |
| GET  | `/billing/bills` | admin | all bills |
| GET  | `/billing/bills/me` | student | own bills |
| POST | `/billing/pay` | student | **pay_bill transaction** |
| POST | `/billing/topup` | student | add wallet balance |
| GET  | `/billing/payments/me` | student | payment history |
| POST | `/billing/fines` | admin | add a fine |
| GET  | `/billing/fines/me` | student | own fines |
| POST | `/complaints` | student | raise (insert trigger) |
| GET  | `/complaints/me` | student | own complaints |
| GET  | `/complaints` | admin | all complaints |
| PUT  | `/complaints/{id}/status` | admin | resolve (update trigger) |
| GET  | `/admin/stats` | admin | dashboard counters |

---

##  How this was verified

The database layer was loaded into a real **MySQL 8** instance and every object
was exercised:

- triggers correctly drove `available_beds` to 0 / `full` and auto-stamped
  `resolved_at`;
- `generate_monthly_bill` produced `rent 5000 + mess 300 + fine 200 = 5500`;
- `pay_bill` debited the wallet, wrote the payment and set the bill to `partial`
  atomically — and an over-payment attempt **rolled back** with the balance and
  ledger unchanged;
- the Django API passed a 21-check end-to-end smoke test (auth, role guards,
  views, the allocate procedure and its rejection paths, and the payment
  transaction + rollback).

You can reproduce the DB check instantly with `docker compose up -d` and then
inspect, e.g.:

```sql
SELECT * FROM student_dues_view;
SELECT * FROM room_occupancy_view;        -- A-101 should be 'full', 0 beds
CALL allocate_room(5, 1);                 -- -> ERROR 1644 "No vacancy: room is full"
```

---

##  Requirement → file map (for grading)

| Requirement | Where |
|-------------|-------|
| Schema with PK/FK/constraints | `database/01_schema.sql` |
| ≥ 2 Views | `database/02_views.sql` (3 provided) |
| ≥ 2 Stored procedures | `database/03_procedures.sql` |
| ≥ 2 Triggers | `database/04_triggers.sql` (4 provided) |
| ≥ 1 Transaction (START/COMMIT/ROLLBACK) | `database/05_transaction.sql` |
| REST API for every feature | `backend/api/views.py` + `urls.py` |
| React student + admin views | `frontend/src/pages/` |
