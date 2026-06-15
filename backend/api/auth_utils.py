"""
auth_utils.py - stateless JWT auth + password hashing + role decorators.

We authenticate against our own `students` / `admins` tables (raw SQL), not
Django's auth model. A JWT carries {id, role, name}; a custom DRF authentication
class decodes it and attaches a lightweight user object to the request.
"""
import datetime
from functools import wraps

import jwt
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response


# ---- the "user" we attach to each authenticated request --------------------
class ApiUser:
    is_authenticated = True

    def __init__(self, uid, role, name):
        self.id = uid
        self.role = role
        self.name = name


# ---- password hashing (Django's PBKDF2-SHA256) -----------------------------
def hash_password(raw):
    return make_password(raw)


def verify_password(raw, hashed):
    return check_password(raw, hashed)


# ---- JWT -------------------------------------------------------------------
def make_token(payload):
    data = {
        **payload,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(data, settings.JWT_SECRET, algorithm='HS256')


class JWTAuthentication(BaseAuthentication):
    """Reads `Authorization: Bearer <token>` and validates it."""

    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None  # -> request.user stays None (anonymous)
        token = header[7:]
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
        except jwt.PyJWTError:
            raise AuthenticationFailed('Invalid or expired token')
        return (ApiUser(payload['id'], payload['role'], payload['name']), token)


# ---- role decorators (wrap a DRF @api_view function) -----------------------
def _authed(request):
    return getattr(request.user, 'is_authenticated', False)


def auth_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not _authed(request):
            return Response({'error': 'Authentication required'}, status=401)
        return view(request, *args, **kwargs)
    return wrapper


def admin_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not _authed(request):
            return Response({'error': 'Authentication required'}, status=401)
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)
        return view(request, *args, **kwargs)
    return wrapper


def student_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        if not _authed(request):
            return Response({'error': 'Authentication required'}, status=401)
        if request.user.role != 'student':
            return Response({'error': 'Student access required'}, status=403)
        return view(request, *args, **kwargs)
    return wrapper
