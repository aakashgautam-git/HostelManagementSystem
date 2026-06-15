"""
models.py - read-only mappings of the hand-written MySQL tables.

These exist ONLY so Django's admin panel can display the data. Every model is
`managed = False`, which tells Django:  "this table already exists - never
create, alter or drop it; just read it."  The real schema lives in
/database/01_schema.sql, and the REST API still uses raw SQL (api/db.py).

Generated columns (bills.total_amount, room_allocations.active_flag) are mapped
so we can SHOW them; the admin is registered read-only so they are never written.
"""
from django.db import models


class Admin(models.Model):
    admin_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'admins'

    def __str__(self):
        return self.name


class Student(models.Model):
    student_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, null=True)
    gender = models.CharField(max_length=10)
    course = models.CharField(max_length=100, null=True)
    year_of_study = models.IntegerField(null=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'students'

    def __str__(self):
        return f'{self.name} ({self.email})'


class Room(models.Model):
    room_id = models.AutoField(primary_key=True)
    room_number = models.CharField(max_length=20)
    block = models.CharField(max_length=20)
    floor = models.IntegerField()
    room_type = models.CharField(max_length=20)
    capacity = models.IntegerField()
    available_beds = models.IntegerField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'rooms'

    def __str__(self):
        return self.room_number


class RoomAllocation(models.Model):
    allocation_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    room = models.ForeignKey(Room, models.DO_NOTHING, db_column='room_id')
    allocated_on = models.DateField()
    vacated_on = models.DateField(null=True)
    status = models.CharField(max_length=10)

    class Meta:
        managed = False
        db_table = 'room_allocations'


class MealBooking(models.Model):
    booking_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    meal_date = models.DateField()
    meal_type = models.CharField(max_length=10)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=10)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'meal_bookings'


class Fine(models.Model):
    fine_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    reason = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'fines'


class Bill(models.Model):
    bill_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    bill_month = models.DateField()
    rent_amount = models.DecimalField(max_digits=10, decimal_places=2)
    mess_amount = models.DecimalField(max_digits=10, decimal_places=2)
    fine_amount = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)  # generated
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10)
    generated_on = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'bills'


class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    bill = models.ForeignKey(Bill, models.DO_NOTHING, db_column='bill_id', null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=10)
    payment_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'payments'


class Complaint(models.Model):
    complaint_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(Student, models.DO_NOTHING, db_column='student_id')
    category = models.CharField(max_length=20)
    subject = models.CharField(max_length=150)
    description = models.TextField(null=True)
    status = models.CharField(max_length=20)
    admin_remark = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = 'complaints'
