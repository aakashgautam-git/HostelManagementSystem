"""Quick check that the admin pages render (run after the server is wired up).

    python scripts/admin_check.py
"""
import os
import sys

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hostel_api.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.test import Client  # noqa: E402

c = Client()
print('login as admin/admin123:', c.login(username='admin', password='admin123'))

for path in ['/admin/', '/admin/api/student/', '/admin/api/room/',
             '/admin/api/bill/', '/admin/api/payment/', '/admin/auth/user/']:
    r = c.get(path)
    print(f'  {r.status_code}  GET {path}')
