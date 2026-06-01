# Database module
from .config import DATABASE_URL, ASYNC_DATABASE_URL, DatabaseConfig
from .models import Base, User, NurseProfile, FacilityProfile, Document, Shift, ShiftApplication, AuditLog
from .session import SessionLocal, engine, get_db


def init_db() -> None:
    """Initialize the database schema by creating any missing tables."""
    Base.metadata.create_all(bind=engine)


__all__ = [
    "DATABASE_URL",
    "ASYNC_DATABASE_URL",
    "DatabaseConfig",
    "Base",
    "User",
    "NurseProfile",
    "FacilityProfile",
    "Document",
    "Shift",
    "ShiftApplication",
    "AuditLog",
    "SessionLocal",
    "engine",
    "get_db",
    "init_db",
]
