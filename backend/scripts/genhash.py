"""
genhash.py - print PBKDF2 password hashes for the seed data.

The backend stores passwords with Django's make_password (PBKDF2-SHA256).
06_seed.sql ships with hashes produced by this script for the demo passwords.
If you ever want to regenerate them:

    cd backend
    source venv/bin/activate
    python scripts/genhash.py admin123 student123
"""
import os
import sys

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hostel_api.settings')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
django.setup()

from django.contrib.auth.hashers import make_password  # noqa: E402

for raw in (sys.argv[1:] or ['admin123', 'student123']):
    print(f"{raw} -> {make_password(raw)}")
