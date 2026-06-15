"""
db.py - tiny raw-SQL helpers over Django's default MySQL connection.

We deliberately bypass the ORM so the VIEWS, STORED PROCEDURES, TRIGGERS and the
pay_bill TRANSACTION written in /database are exactly what runs in production.
All placeholders use %s (the format the MySQL driver expects).
"""
from django.db import connection


def _rows(cursor):
    """Turn a cursor's result set into a list of dicts keyed by column name."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def query(sql, params=None):
    """Run a SELECT and return all rows as dicts."""
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        return _rows(cur)


def query_one(sql, params=None):
    """Run a SELECT and return the first row (or None)."""
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=None):
    """Run an INSERT/UPDATE/DELETE. Returns (rowcount, lastrowid)."""
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        return cur.rowcount, cur.lastrowid


def call(sql, params=None):
    """Run a CALL <procedure>(...) statement."""
    with connection.cursor() as cur:
        cur.execute(sql, params or [])


def mysql_errno(exc):
    """
    Extract (errno, message) from a raised DB exception so views can map known
    MySQL errors to friendly HTTP responses, e.g.:
       1644 -> a SIGNAL raised by one of our stored procedures
       1062 -> duplicate UNIQUE key
       3819 -> CHECK constraint violated
    """
    cause = exc.__cause__ or exc
    args = getattr(cause, 'args', None)
    if args and isinstance(args[0], int):
        return args[0], (args[1] if len(args) > 1 else str(cause))
    return None, str(exc)
