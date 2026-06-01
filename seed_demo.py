from datetime import datetime, timedelta

from passlib.context import CryptContext

from shared.database import (
    AuditLog,
    Document,
    FacilityProfile,
    NurseProfile,
    Shift,
    ShiftApplication,
    User,
    SessionLocal,
    init_db,
)
from shared.database.models import DocumentStatus, DocumentType, ShiftApplicationStatus, ShiftStatus, ShiftUrgency, UserRole, UserStatus

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

SEED_USERS = [
    {
        "email": "admin@test.com",
        "password": "Admin123!",
        "role": UserRole.ADMIN,
        "status": UserStatus.APPROVED,
    },
    {
        "email": "facility@test.com",
        "password": "Facility123!",
        "role": UserRole.FACILITY,
        "status": UserStatus.APPROVED,
    },
    {
        "email": "nurse@test.com",
        "password": "Nurse123!",
        "role": UserRole.NURSE,
        "status": UserStatus.APPROVED,
    },
]

FACILITY_PROFILE_DATA = {
    "organization_name": "Toronto Care Centre",
    "facility_type": "Long-Term Care",
    "address": "125 King Street West",
    "street_address": "125 King Street West",
    "city": "Toronto",
    "province": "Ontario",
    "postal_code": "M5V 2T6",
    "contact_name": "Emma Carter",
    "phone": "416-555-0184",
}

NURSE_PROFILE_DATA = {
    "full_name": "Sarah Mitchell",
    "phone": "416-555-0138",
    "profession": "Registered Nurse (RN)",
    "license_number": "RN-842913",
    "years_experience": 3,
    "city": "Toronto",
    "availability_status": "available",
}

SHIFT_DATA = {
    "role_required": "Registered Nurse (RN)",
    "unit_type": "Long-Term Care",
    "start_time": datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=7),
    "end_time": datetime.utcnow().replace(hour=17, minute=0, second=0, microsecond=0) + timedelta(days=7),
    "city": "Toronto",
    "required_credentials": "Active nursing license, CPR certification",
    "urgency": ShiftUrgency.NORMAL,
    "notes": "Day shift coverage requested for resident care support.",
    "status": ShiftStatus.UNDER_REVIEW,
}

DOCUMENT_DATA = {
    "document_type": DocumentType.LICENSE,
    "file_name": "Sarah-Mitchell-Nursing-License.pdf",
    "file_url": "uploaded://Sarah-Mitchell-Nursing-License.pdf",
    "expiry_date": datetime(2027, 12, 31),
    "status": DocumentStatus.APPROVED,
}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def looks_non_production(value: str | None) -> bool:
    return bool(value and any(marker in value.lower() for marker in ("phase", "demo", "test", "testville", "sample", "string", "mock", "placeholder", "dynamic pricing")))


def looks_generated_name(value: str | None) -> bool:
    return bool(value and any(character.isdigit() for character in value))


def looks_like_bad_phone(value: str | None) -> bool:
    digits = "".join(character for character in (value or "") if character.isdigit())
    return bool(digits and len(digits) < 10)


def cleanup_bad_records(db) -> None:
    seed_emails = {"admin@test.com", "facility@test.com", "nurse@test.com"}

    db.query(AuditLog).delete(synchronize_session=False)
    db.query(ShiftApplication).delete(synchronize_session=False)
    db.query(Shift).delete(synchronize_session=False)
    db.query(Document).delete(synchronize_session=False)
    db.commit()

    bad_facility_profile_ids = [
        profile.id
        for profile in db.query(FacilityProfile).all()
        if (
            looks_non_production(profile.organization_name)
            or looks_generated_name(profile.organization_name)
            or looks_non_production(profile.city)
            or looks_non_production(profile.facility_type)
            or looks_non_production(profile.address)
            or looks_non_production(profile.contact_name)
            or looks_like_bad_phone(profile.phone)
            or not profile.user
            or profile.user.email not in seed_emails
        )
    ]
    if bad_facility_profile_ids:
        db.query(FacilityProfile).filter(FacilityProfile.id.in_(bad_facility_profile_ids)).delete(synchronize_session=False)

    bad_nurse_profile_ids = [
        profile.id
        for profile in db.query(NurseProfile).all()
        if (
            looks_non_production(profile.full_name)
            or looks_generated_name(profile.full_name)
            or looks_non_production(profile.city)
            or looks_non_production(profile.profession)
            or looks_non_production(profile.license_number)
            or not profile.user
            or profile.user.email not in seed_emails
        )
    ]
    if bad_nurse_profile_ids:
        db.query(NurseProfile).filter(NurseProfile.id.in_(bad_nurse_profile_ids)).delete(synchronize_session=False)

    bad_user_ids = [
        user.id
        for user in db.query(User).all()
        if user.email not in seed_emails and (looks_non_production(user.email) or looks_generated_name(user.email))
    ]
    if bad_user_ids:
        db.query(User).filter(User.id.in_(bad_user_ids)).delete(synchronize_session=False)

    inconsistent_documents = (
        db.query(Document)
        .join(User, Document.user_id == User.id)
        .filter(User.status != UserStatus.APPROVED, Document.status == DocumentStatus.APPROVED)
        .all()
    )
    for document in inconsistent_documents:
        document.status = DocumentStatus.PENDING
        document.reviewed_by = None
        document.reviewed_at = None

    db.commit()


def seed() -> None:
    init_db()

    with SessionLocal() as db:
        cleanup_bad_records(db)
        admin_user = None
        facility_user = None
        nurse_user = None

        for user_data in SEED_USERS:
            user = db.query(User).filter(User.email == user_data["email"]).first()
            if not user:
                user = User(
                    email=user_data["email"],
                    hashed_password=hash_password(user_data["password"]),
                    role=user_data["role"],
                    status=user_data["status"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.role = user_data["role"]
                user.status = user_data["status"]
                db.commit()
                db.refresh(user)
            if user.role == UserRole.ADMIN:
                admin_user = user
            elif user.role == UserRole.FACILITY:
                facility_user = user
            elif user.role == UserRole.NURSE:
                nurse_user = user

        if not facility_user:
            raise RuntimeError("Failed to seed facility user")
        if not nurse_user:
            raise RuntimeError("Failed to seed nurse user")

        facility_profile = (
            db.query(FacilityProfile)
            .filter(FacilityProfile.user_id == facility_user.id)
            .first()
        )
        if not facility_profile:
            facility_profile = FacilityProfile(user_id=facility_user.id, **FACILITY_PROFILE_DATA)
            db.add(facility_profile)
            db.commit()
            db.refresh(facility_profile)
        else:
            for field, value in FACILITY_PROFILE_DATA.items():
                setattr(facility_profile, field, value)
            db.commit()
            db.refresh(facility_profile)

        nurse_profile = (
            db.query(NurseProfile)
            .filter(NurseProfile.user_id == nurse_user.id)
            .first()
        )
        if not nurse_profile:
            nurse_profile = NurseProfile(user_id=nurse_user.id, **NURSE_PROFILE_DATA)
            db.add(nurse_profile)
            db.commit()
            db.refresh(nurse_profile)
        else:
            for field, value in NURSE_PROFILE_DATA.items():
                setattr(nurse_profile, field, value)
            db.commit()
            db.refresh(nurse_profile)

        shift = (
            db.query(Shift)
            .filter(
                Shift.facility_id == facility_profile.id,
                Shift.role_required == SHIFT_DATA["role_required"],
                Shift.unit_type == SHIFT_DATA["unit_type"],
            )
            .first()
        )
        if not shift:
            shift = Shift(facility_id=facility_profile.id, **SHIFT_DATA)
            db.add(shift)
            db.commit()
            db.refresh(shift)
        else:
            for field, value in SHIFT_DATA.items():
                setattr(shift, field, value)
            db.commit()
            db.refresh(shift)

        document = (
            db.query(Document)
            .filter(Document.user_id == nurse_user.id, Document.document_type == DocumentType.LICENSE)
            .first()
        )
        if not document:
            document = Document(user_id=nurse_user.id, **DOCUMENT_DATA)
            db.add(document)
            db.commit()
            db.refresh(document)
        else:
            for field, value in DOCUMENT_DATA.items():
                setattr(document, field, value)
            db.commit()
            db.refresh(document)

        application = (
            db.query(ShiftApplication)
            .filter(ShiftApplication.shift_id == shift.id, ShiftApplication.nurse_id == nurse_profile.id)
            .first()
        )
        if not application:
            application = ShiftApplication(
                shift_id=shift.id,
                nurse_id=nurse_profile.id,
                status=ShiftApplicationStatus.APPLIED,
                applied_at=datetime.utcnow(),
            )
            db.add(application)
            db.commit()
            db.refresh(application)
        else:
            application.status = ShiftApplicationStatus.APPLIED
            application.reviewed_by = None
            application.reviewed_at = None
            db.commit()
            db.refresh(application)

        print("Seed complete:")
        print(f"  admin: {admin_user.email}")
        print(f"  facility: {facility_user.email}")
        print(f"  nurse: {nurse_user.email}")
        print(f"  facility profile id: {facility_profile.id}")
        print(f"  nurse profile id: {nurse_profile.id}")
        print(f"  shift id: {shift.id}")
        print(f"  document id: {document.id}")
        print(f"  application id: {application.id}")


if __name__ == "__main__":
    seed()
