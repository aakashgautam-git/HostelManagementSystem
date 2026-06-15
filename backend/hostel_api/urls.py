"""Root URL config.

  /admin/  -> Django's built-in admin panel (read-only DB browser)
  /api/    -> our REST API (see api/urls.py)
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
