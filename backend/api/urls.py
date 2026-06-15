"""URL routing for the api app. All paths are relative to /api/."""
from django.urls import path
from . import views

urlpatterns = [
    # auth
    path('auth/register', views.register),
    path('auth/login', views.login),
    path('auth/me', views.me),

    # students (+ dues view)
    path('students', views.students_list),
    path('students/me', views.student_me),
    path('students/<int:sid>', views.student_detail),

    # rooms (+ allocate procedure, bed triggers)
    path('rooms', views.rooms),
    path('rooms/allocate', views.allocate),
    path('rooms/vacate', views.vacate),
    path('rooms/allocations', views.allocations),

    # meals (+ daily meal count view)
    path('meals', views.meal_book),
    path('meals/me', views.meal_mine),
    path('meals/daily-count', views.meal_daily_count),
    path('meals/<int:bid>', views.meal_cancel),

    # billing (+ generate_monthly_bill procedure, pay_bill transaction)
    path('billing/generate', views.bill_generate),
    path('billing/bills', views.bills_all),
    path('billing/bills/me', views.bills_mine),
    path('billing/pay', views.pay),
    path('billing/topup', views.topup),
    path('billing/payments/me', views.payments_mine),
    path('billing/fines', views.fine_add),
    path('billing/fines/me', views.fines_mine),

    # complaints (+ insert/update triggers)
    path('complaints', views.complaints),
    path('complaints/me', views.complaints_mine),
    path('complaints/<int:cid>/status', views.complaint_status),

    # admin dashboard
    path('admin/stats', views.admin_stats),
]
