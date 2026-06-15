"""
views.py - all REST endpoints for the Hostel / Mess Management System.

Each view is a thin wrapper around hand-written SQL (api/db.py). Where the SQL
layer enforces rules (procedures that SIGNAL, UNIQUE/CHECK constraints) we map
the resulting MySQL error to a clean HTTP response.

Endpoint map (see api/urls.py):
  AUTH       POST  /auth/register, POST /auth/login, GET /auth/me
  STUDENTS   GET   /students (admin), GET /students/me, GET /students/<id> (admin)
  ROOMS      GET/POST /rooms, POST /rooms/allocate|vacate, GET /rooms/allocations
  MEALS      POST /meals, GET /meals/me, DELETE /meals/<id>, GET /meals/daily-count
  BILLING    POST /billing/generate, GET /billing/bills[/me], POST /billing/pay,
             POST /billing/topup, GET /billing/payments/me, fines...
  COMPLAINTS POST /complaints, GET /complaints[/me], PUT /complaints/<id>/status
  ADMIN      GET  /admin/stats
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import db
from .auth_utils import (
    hash_password, verify_password, make_token,
    auth_required, admin_required, student_required,
)

MEAL_PRICE = {'breakfast': 40, 'lunch': 70, 'dinner': 60}


# ===========================================================================
# AUTH
# ===========================================================================
@api_view(['POST'])
def register(request):
    d = request.data
    name, email, password = d.get('name'), d.get('email'), d.get('password')
    if not (name and email and password):
        return Response({'error': 'name, email and password are required'}, status=400)
    try:
        _, sid = db.execute(
            """INSERT INTO students (name, email, password_hash, phone, gender, course, year_of_study)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            [name, email, hash_password(password), d.get('phone'),
             d.get('gender', 'other'), d.get('course'), d.get('year_of_study')],
        )
    except Exception as exc:
        errno, _ = db.mysql_errno(exc)
        if errno == 1062:
            return Response({'error': 'An account with this email already exists'}, status=409)
        raise
    user = {'id': sid, 'role': 'student', 'name': name}
    return Response({'token': make_token(user), 'user': user}, status=201)


@api_view(['POST'])
def login(request):
    email, password = request.data.get('email'), request.data.get('password')
    if not (email and password):
        return Response({'error': 'email and password are required'}, status=400)

    admin = db.query_one('SELECT * FROM admins WHERE email = %s', [email])
    if admin and verify_password(password, admin['password_hash']):
        user = {'id': admin['admin_id'], 'role': 'admin', 'name': admin['name']}
        return Response({'token': make_token(user), 'user': user})

    student = db.query_one('SELECT * FROM students WHERE email = %s', [email])
    if student and verify_password(password, student['password_hash']):
        user = {'id': student['student_id'], 'role': 'student', 'name': student['name']}
        return Response({'token': make_token(user), 'user': user})

    return Response({'error': 'Invalid credentials'}, status=401)


@api_view(['GET'])
@auth_required
def me(request):
    return Response({'user': {'id': request.user.id, 'role': request.user.role,
                              'name': request.user.name}})


# ===========================================================================
# STUDENTS  (+ the student_dues_view VIEW)
# ===========================================================================
@api_view(['GET'])
@admin_required
def students_list(request):
    rows = db.query(
        """SELECT s.student_id, s.name, s.email, s.phone, s.gender, s.course,
                  s.year_of_study, s.balance, d.total_due, d.pending_bills
             FROM students s
             JOIN student_dues_view d ON d.student_id = s.student_id
            ORDER BY s.student_id"""
    )
    return Response(rows)


@api_view(['GET'])
@auth_required
def student_me(request):
    sid = request.user.id
    profile = db.query_one(
        """SELECT s.student_id, s.name, s.email, s.phone, s.gender, s.course,
                  s.year_of_study, s.balance, d.total_due, d.pending_bills
             FROM students s
             JOIN student_dues_view d ON d.student_id = s.student_id
            WHERE s.student_id = %s""",
        [sid],
    )
    if not profile:
        return Response({'error': 'Student not found'}, status=404)
    profile['room'] = db.query_one(
        """SELECT r.room_number, r.block, r.room_type, r.monthly_rent, ra.allocated_on
             FROM room_allocations ra JOIN rooms r ON r.room_id = ra.room_id
            WHERE ra.student_id = %s AND ra.status = 'active' LIMIT 1""",
        [sid],
    )
    return Response(profile)


@api_view(['GET'])
@admin_required
def student_detail(request, sid):
    row = db.query_one(
        """SELECT student_id, name, email, phone, gender, course, year_of_study, balance
             FROM students WHERE student_id = %s""", [sid])
    if not row:
        return Response({'error': 'Student not found'}, status=404)
    return Response(row)


# ===========================================================================
# ROOMS  (+ allocate_room PROCEDURE, +/- bed TRIGGERS, room_occupancy_view)
# ===========================================================================
@api_view(['GET', 'POST'])
@auth_required
def rooms(request):
    if request.method == 'GET':
        return Response(db.query('SELECT * FROM room_occupancy_view ORDER BY room_number'))

    # POST = create room (admin only)
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    d = request.data
    if not (d.get('room_number') and d.get('block') and d.get('capacity')):
        return Response({'error': 'room_number, block and capacity are required'}, status=400)
    try:
        _, rid = db.execute(
            """INSERT INTO rooms (room_number, block, floor, room_type, capacity, available_beds, monthly_rent)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            [d['room_number'], d['block'], d.get('floor', 0),
             d.get('room_type', 'double'), d['capacity'], d['capacity'],
             d.get('monthly_rent', 0)],
        )
    except Exception as exc:
        errno, _ = db.mysql_errno(exc)
        if errno == 1062:
            return Response({'error': 'Room number already exists'}, status=409)
        raise
    return Response({'room_id': rid}, status=201)


@api_view(['POST'])
@admin_required
def allocate(request):
    sid, rid = request.data.get('student_id'), request.data.get('room_id')
    if not (sid and rid):
        return Response({'error': 'student_id and room_id are required'}, status=400)
    try:
        db.call('CALL allocate_room(%s, %s)', [sid, rid])
    except Exception as exc:
        errno, msg = db.mysql_errno(exc)
        if errno == 1644:  # SIGNAL raised inside the procedure
            return Response({'error': msg}, status=400)
        raise
    return Response({'message': 'Room allocated successfully'}, status=201)


@api_view(['POST'])
@admin_required
def vacate(request):
    sid = request.data.get('student_id')
    rowcount, _ = db.execute(
        """UPDATE room_allocations SET status = 'vacated', vacated_on = CURRENT_DATE
            WHERE student_id = %s AND status = 'active'""", [sid])
    if not rowcount:
        return Response({'error': 'No active allocation for this student'}, status=404)
    return Response({'message': 'Allocation vacated'})


@api_view(['GET'])
@admin_required
def allocations(request):
    rows = db.query(
        """SELECT ra.allocation_id, ra.allocated_on,
                  s.student_id, s.name AS student_name,
                  r.room_id, r.room_number, r.block
             FROM room_allocations ra
             JOIN students s ON s.student_id = ra.student_id
             JOIN rooms r    ON r.room_id    = ra.room_id
            WHERE ra.status = 'active'
            ORDER BY r.room_number""")
    return Response(rows)


# ===========================================================================
# MEALS  (+ daily_meal_count_view VIEW)
# ===========================================================================
@api_view(['POST'])
@student_required
def meal_book(request):
    meal_date, meal_type = request.data.get('meal_date'), request.data.get('meal_type')
    if not meal_date or meal_type not in MEAL_PRICE:
        return Response({'error': 'Valid meal_date and meal_type are required'}, status=400)
    try:
        _, bid = db.execute(
            """INSERT INTO meal_bookings (student_id, meal_date, meal_type, price)
               VALUES (%s, %s, %s, %s)""",
            [request.user.id, meal_date, meal_type, MEAL_PRICE[meal_type]])
    except Exception as exc:
        errno, _ = db.mysql_errno(exc)
        if errno == 1062:
            return Response({'error': 'You have already booked this meal'}, status=409)
        raise
    return Response({'booking_id': bid, 'price': MEAL_PRICE[meal_type]}, status=201)


@api_view(['GET'])
@student_required
def meal_mine(request):
    rows = db.query(
        """SELECT booking_id, meal_date, meal_type, price, status
             FROM meal_bookings WHERE student_id = %s
            ORDER BY meal_date DESC, FIELD(meal_type,'breakfast','lunch','dinner')""",
        [request.user.id])
    return Response(rows)


@api_view(['DELETE'])
@student_required
def meal_cancel(request, bid):
    rowcount, _ = db.execute(
        """UPDATE meal_bookings SET status = 'cancelled'
            WHERE booking_id = %s AND student_id = %s AND status = 'booked'""",
        [bid, request.user.id])
    if not rowcount:
        return Response({'error': 'Booking not found or cannot be cancelled'}, status=404)
    return Response({'message': 'Booking cancelled'})


@api_view(['GET'])
@admin_required
def meal_daily_count(request):
    return Response(db.query('SELECT * FROM daily_meal_count_view'))


# ===========================================================================
# BILLING  (+ generate_monthly_bill PROCEDURE, + pay_bill TRANSACTION)
# ===========================================================================
@api_view(['POST'])
@admin_required
def bill_generate(request):
    sid = request.data.get('student_id')
    if not sid:
        return Response({'error': 'student_id is required'}, status=400)
    db.call('CALL generate_monthly_bill(%s)', [sid])
    return Response({'message': 'Monthly bill generated'})


@api_view(['GET'])
@admin_required
def bills_all(request):
    rows = db.query(
        """SELECT b.*, s.name AS student_name
             FROM bills b JOIN students s ON s.student_id = b.student_id
            ORDER BY b.bill_month DESC, s.name""")
    return Response(rows)


@api_view(['GET'])
@student_required
def bills_mine(request):
    rows = db.query('SELECT * FROM bills WHERE student_id = %s ORDER BY bill_month DESC',
                    [request.user.id])
    return Response(rows)


@api_view(['POST'])
@student_required
def pay(request):
    """Pay a bill via the pay_bill TRANSACTION (START TRANSACTION/COMMIT/ROLLBACK)."""
    bill_id, amount = request.data.get('bill_id'), request.data.get('amount')
    if not (bill_id and amount):
        return Response({'error': 'bill_id and amount are required'}, status=400)
    try:
        db.call('CALL pay_bill(%s, %s, %s)', [request.user.id, bill_id, amount])
    except Exception as exc:
        errno, msg = db.mysql_errno(exc)
        if errno == 1644:  # e.g. "Insufficient wallet balance" -> txn ROLLED BACK
            return Response({'error': msg}, status=400)
        raise
    return Response({'message': 'Payment successful'})


@api_view(['POST'])
@student_required
def topup(request):
    amount = request.data.get('amount')
    if not amount or float(amount) <= 0:
        return Response({'error': 'amount must be positive'}, status=400)
    db.execute('UPDATE students SET balance = balance + %s WHERE student_id = %s',
               [amount, request.user.id])
    row = db.query_one('SELECT balance FROM students WHERE student_id = %s', [request.user.id])
    return Response({'message': 'Wallet topped up', 'balance': row['balance']})


@api_view(['GET'])
@student_required
def payments_mine(request):
    rows = db.query(
        """SELECT payment_id, bill_id, amount, method, payment_date
             FROM payments WHERE student_id = %s ORDER BY payment_date DESC""",
        [request.user.id])
    return Response(rows)


@api_view(['POST'])
@admin_required
def fine_add(request):
    d = request.data
    if not (d.get('student_id') and d.get('reason') and d.get('amount')):
        return Response({'error': 'student_id, reason and amount are required'}, status=400)
    _, fid = db.execute('INSERT INTO fines (student_id, reason, amount) VALUES (%s, %s, %s)',
                        [d['student_id'], d['reason'], d['amount']])
    return Response({'fine_id': fid}, status=201)


@api_view(['GET'])
@student_required
def fines_mine(request):
    rows = db.query(
        """SELECT fine_id, reason, amount, status, created_at
             FROM fines WHERE student_id = %s ORDER BY created_at DESC""",
        [request.user.id])
    return Response(rows)


# ===========================================================================
# COMPLAINTS  (+ BEFORE INSERT / BEFORE UPDATE TRIGGERS)
# ===========================================================================
@api_view(['GET', 'POST'])
@auth_required
def complaints(request):
    if request.method == 'POST':
        if request.user.role != 'student':
            return Response({'error': 'Student access required'}, status=403)
        d = request.data
        if not d.get('subject'):
            return Response({'error': 'subject is required'}, status=400)
        # status + created_at are forced by trg_complaint_before_insert
        _, cid = db.execute(
            """INSERT INTO complaints (student_id, category, subject, description)
               VALUES (%s, %s, %s, %s)""",
            [request.user.id, d.get('category', 'other'), d['subject'], d.get('description')])
        return Response({'complaint_id': cid}, status=201)

    # GET = admin sees all
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=403)
    rows = db.query(
        """SELECT c.*, s.name AS student_name
             FROM complaints c JOIN students s ON s.student_id = c.student_id
            ORDER BY FIELD(c.status,'pending','in_progress','resolved'), c.created_at DESC""")
    return Response(rows)


@api_view(['GET'])
@student_required
def complaints_mine(request):
    rows = db.query(
        """SELECT complaint_id, category, subject, description, status,
                  admin_remark, created_at, resolved_at
             FROM complaints WHERE student_id = %s ORDER BY created_at DESC""",
        [request.user.id])
    return Response(rows)


@api_view(['PUT'])
@admin_required
def complaint_status(request, cid):
    status = request.data.get('status')
    if status not in ('pending', 'in_progress', 'resolved'):
        return Response({'error': 'Invalid status'}, status=400)
    # resolved_at is stamped by trg_complaint_before_update
    rowcount, _ = db.execute(
        'UPDATE complaints SET status = %s, admin_remark = %s WHERE complaint_id = %s',
        [status, request.data.get('admin_remark'), cid])
    if not rowcount:
        return Response({'error': 'Complaint not found'}, status=404)
    return Response({'message': 'Complaint updated'})


# ===========================================================================
# ADMIN DASHBOARD
# ===========================================================================
@api_view(['GET'])
@admin_required
def admin_stats(request):
    stats = db.query_one("""
      SELECT
        (SELECT COUNT(*) FROM students)                              AS total_students,
        (SELECT COUNT(*) FROM rooms)                                 AS total_rooms,
        (SELECT COALESCE(SUM(available_beds),0) FROM rooms)          AS free_beds,
        (SELECT COUNT(*) FROM complaints WHERE status <> 'resolved') AS open_complaints,
        (SELECT COALESCE(SUM(total_amount - paid_amount),0)
           FROM bills WHERE status <> 'paid')                        AS total_outstanding,
        (SELECT COALESCE(SUM(amount),0)
           FROM payments WHERE DATE(payment_date) = CURRENT_DATE)    AS collected_today
    """)
    return Response(stats)
