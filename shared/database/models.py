import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


# Enums
class UserRole(str, PyEnum):
    """User role enumeration."""

    NURSE = "nurse"
    FACILITY = "facility"
    ADMIN = "admin"


class UserStatus(str, PyEnum):
    """User status enumeration."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class DocumentStatus(str, PyEnum):
    """Document status enumeration."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ShiftUrgency(str, PyEnum):
    """Shift urgency enumeration."""

    NORMAL = "normal"
    URGENT = "urgent"


class ShiftStatus(str, PyEnum):
    """Shift status enumeration."""

    OPEN = "open"
    UNDER_REVIEW = "under_review"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ShiftApplicationStatus(str, PyEnum):
    """Shift application status enumeration."""

    APPLIED = "applied"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class DocumentType(str, PyEnum):
    """Document type enumeration."""

    LICENSE = "license"
    CERTIFICATION = "certification"
    VACCINATION = "vaccination"
    BACKGROUND_CHECK = "background_check"
    OTHER = "other"


class AvailabilityStatus(str, PyEnum):
    """Nurse availability status enumeration."""

    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    ON_SHIFT = "on_shift"


# Models
class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    nurse_profile = relationship("NurseProfile", back_populates="user", uselist=False)
    facility_profile = relationship("FacilityProfile", back_populates="user", uselist=False)
    documents = relationship(
        "Document",
        back_populates="user",
        foreign_keys="Document.user_id",
    )
    audit_logs_as_actor = relationship(
        "AuditLog",
        back_populates="actor",
        foreign_keys="AuditLog.actor_user_id",
    )
    reviewed_documents = relationship(
        "Document",
        back_populates="reviewer",
        foreign_keys="Document.reviewed_by",
    )
    reviewed_applications = relationship(
        "ShiftApplication",
        back_populates="reviewer",
        foreign_keys="ShiftApplication.reviewed_by",
    )

    __table_args__ = (UniqueConstraint("email", name="uq_user_email"),)


class NurseProfile(Base):
    """Nurse profile model."""

    __tablename__ = "nurse_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    profession = Column(String(255), nullable=False)
    license_number = Column(String(255), unique=True, nullable=False, index=True)
    years_experience = Column(Integer, nullable=False)
    city = Column(String(255), nullable=False)
    availability_status = Column(Enum(AvailabilityStatus), default=AvailabilityStatus.UNAVAILABLE)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="nurse_profile")
    shift_applications = relationship("ShiftApplication", back_populates="nurse")
    confirmed_shifts = relationship("Shift", back_populates="confirmed_nurse")

    __table_args__ = (UniqueConstraint("license_number", name="uq_nurse_license_number"),)


class FacilityProfile(Base):
    """Facility profile model."""

    __tablename__ = "facility_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    organization_name = Column(String(255), nullable=False)
    facility_type = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    street_address = Column(String(255), nullable=True)
    city = Column(String(255), nullable=False)
    province = Column(String(64), nullable=True)
    postal_code = Column(String(16), nullable=True)
    contact_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="facility_profile")
    shifts = relationship("Shift", back_populates="facility")


class Document(Base):
    """Document model."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_type = Column(Enum(DocumentType), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="documents", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class Shift(Base):
    """Shift model."""

    __tablename__ = "shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facility_profiles.id"), nullable=False)
    role_required = Column(String(255), nullable=False)
    unit_type = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    city = Column(String(255), nullable=False)
    required_credentials = Column(Text, nullable=False)
    urgency = Column(Enum(ShiftUrgency), default=ShiftUrgency.NORMAL, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(Enum(ShiftStatus), default=ShiftStatus.OPEN, nullable=False)
    confirmed_nurse_id = Column(UUID(as_uuid=True), ForeignKey("nurse_profiles.id"), nullable=True)
    arrival_confirmed_at = Column(DateTime, nullable=True)
    shift_ended_at = Column(DateTime, nullable=True)
    facility_verified_at = Column(DateTime, nullable=True)
    timesheet_status = Column(String(50), default="not_started", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    facility = relationship("FacilityProfile", back_populates="shifts")
    confirmed_nurse = relationship("NurseProfile", back_populates="confirmed_shifts")
    applications = relationship("ShiftApplication", back_populates="shift")


class ShiftApplication(Base):
    """Shift application model."""

    __tablename__ = "shift_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shift_id = Column(UUID(as_uuid=True), ForeignKey("shifts.id"), nullable=False)
    nurse_id = Column(UUID(as_uuid=True), ForeignKey("nurse_profiles.id"), nullable=False)
    status = Column(Enum(ShiftApplicationStatus), default=ShiftApplicationStatus.APPLIED, nullable=False)
    applied_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    shift = relationship("Shift", back_populates="applications")
    nurse = relationship("NurseProfile", back_populates="shift_applications")
    reviewer = relationship(
        "User",
        back_populates="reviewed_applications",
        foreign_keys=[reviewed_by],
    )


class AuditLog(Base):
    """Audit log model."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(255), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    actor = relationship(
        "User",
        back_populates="audit_logs_as_actor",
        foreign_keys=[actor_user_id],
    )
