"""
admin.py - registers every table in Django's admin panel as a READ-ONLY view.

This turns http://localhost:8000/admin into a clean web browser for the
database. It's view-only on purpose: the data is owned by the SQL layer
(procedures/triggers/transactions), so the admin must not write to it.
"""
from django.contrib import admin
from . import models as m

admin.site.site_header = 'Hostel & Mess — Database'
admin.site.site_title = 'Hostel DB'
admin.site.index_title = 'Browse tables'


class ReadOnlyAdmin(admin.ModelAdmin):
    """Base class: list + view rows, but no add / change / delete."""
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(m.Student)
class StudentAdmin(ReadOnlyAdmin):
    list_display = ('student_id', 'name', 'email', 'course', 'year_of_study', 'balance')
    search_fields = ('name', 'email')


@admin.register(m.Admin)
class AdminAdmin(ReadOnlyAdmin):
    list_display = ('admin_id', 'name', 'email', 'created_at')


@admin.register(m.Room)
class RoomAdmin(ReadOnlyAdmin):
    list_display = ('room_id', 'room_number', 'block', 'room_type', 'capacity',
                    'available_beds', 'monthly_rent', 'status')
    list_filter = ('status', 'room_type', 'block')


@admin.register(m.RoomAllocation)
class RoomAllocationAdmin(ReadOnlyAdmin):
    list_display = ('allocation_id', 'student', 'room', 'allocated_on', 'vacated_on', 'status')
    list_filter = ('status',)


@admin.register(m.MealBooking)
class MealBookingAdmin(ReadOnlyAdmin):
    list_display = ('booking_id', 'student', 'meal_date', 'meal_type', 'price', 'status')
    list_filter = ('meal_type', 'status', 'meal_date')


@admin.register(m.Fine)
class FineAdmin(ReadOnlyAdmin):
    list_display = ('fine_id', 'student', 'reason', 'amount', 'status')
    list_filter = ('status',)


@admin.register(m.Bill)
class BillAdmin(ReadOnlyAdmin):
    list_display = ('bill_id', 'student', 'bill_month', 'rent_amount', 'mess_amount',
                    'fine_amount', 'total_amount', 'paid_amount', 'status')
    list_filter = ('status', 'bill_month')


@admin.register(m.Payment)
class PaymentAdmin(ReadOnlyAdmin):
    list_display = ('payment_id', 'student', 'bill', 'amount', 'method', 'payment_date')
    list_filter = ('method',)


@admin.register(m.Complaint)
class ComplaintAdmin(ReadOnlyAdmin):
    list_display = ('complaint_id', 'student', 'subject', 'category', 'status',
                    'created_at', 'resolved_at')
    list_filter = ('status', 'category')
