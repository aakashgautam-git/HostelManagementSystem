"""
Django settings for the Hostel / Mess Management REST API.

Design notes for the examiner:
  * We do NOT use the Django ORM for the domain tables. The schema, views,
    procedures and triggers are hand-written SQL (see /database). The REST API
    runs raw SQL via connection.cursor().
  * The `api/models.py` models exist ONLY to power Django's read-only admin
    panel (a convenient web DB browser). They are `managed = False`, so Django
    never creates or alters our hand-written tables - it only reads them.
  * The app's own login is stateless JWT (PyJWT) against our `students` /
    `admins` tables. The /admin panel is a SEPARATE Django superuser login.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-insecure-secret-change-me')
JWT_SECRET = os.environ.get('JWT_SECRET', SECRET_KEY)

DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    # Django's built-in admin panel (read-only DB browser) + its dependencies
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # our stack
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'hostel_api.urls'
WSGI_APPLICATION = 'hostel_api.wsgi.application'

# Templates - the admin needs these context processors.
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]

# Static files (serves the admin's CSS/JS in development).
STATIC_URL = 'static/'

# ---- Database: the hand-written MySQL schema ------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'hostel_db'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'OPTIONS': {'charset': 'utf8mb4'},
    }
}

# ---- Django REST Framework -------------------------------------------------
REST_FRAMEWORK = {
    # custom stateless JWT auth against our own tables
    'DEFAULT_AUTHENTICATION_CLASSES': ['api.auth_utils.JWTAuthentication'],
    # endpoints opt-in to their own role checks via decorators
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'UNAUTHENTICATED_USER': None,
}

# ---- CORS (React dev server) ----------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True  # fine for a local academic project

# ---- i18n / tz -------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
# Raw SQL returns naive datetimes; keep USE_TZ off to avoid conversions.
USE_TZ = False

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
