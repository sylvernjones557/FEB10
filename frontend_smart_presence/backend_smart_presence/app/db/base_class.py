
import uuid as _uuid
from sqlalchemy import String, TypeDecorator
from sqlalchemy.orm import DeclarativeBase


class StringUUID(TypeDecorator):
    """Platform-independent UUID type. Stores as String(36) in SQLite,
    but accepts both str and uuid.UUID objects in Python."""
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        return value


class Base(DeclarativeBase):
    pass
