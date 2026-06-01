import os
from datetime import datetime
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .dependencies import get_current_user
from .schemas import (
    AdminApplicationResponse,
    ApplicationResponse,
    FacilitySummary,
    NurseSummary,
    PricingBreakdown,
    ShiftCreate,
    ShiftResponse,
    ShiftSummary,
)
from shared.database import (
    AuditLog,
    FacilityProfile,
    NurseProfile,
    Shift,
    ShiftApplication,
    User,
    Document,
    get_db,
    init_db,
)
from shared.database.models import (
    DocumentStatus,
    ShiftApplicationStatus,
    ShiftStatus,
    UserRole,
    UserStatus,
)

app = FastAPI(title="Shift Service", version="1.0.0")


def cors_origins() -> list[str]:
    return [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]


@app.on_event("startup")
def startup_event() -> None:
    init_db()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "shift-service"}


@app.get("/")
async def root():
    return {"message": "Shift Service is running"}


def get_facility_profile(current_user: User, db: Session) -> FacilityProfile | None:
    return current_user.facility_profile or db.query(FacilityProfile).filter(FacilityProfile.user_id == current_user.id).first()


def get_nurse_profile(current_user: User, db: Session) -> NurseProfile | None:
    return current_user.nurse_profile or db.query(NurseProfile).filter(NurseProfile.user_id == current_user.id).first()


def normalize_match_text(value: str | None) -> str:
    return (value or "").strip().lower()


def role_matches_shift(nurse_profile: NurseProfile, shift: Shift) -> bool:
    nurse_profession = normalize_match_text(nurse_profile.profession)
    role_required = normalize_match_text(shift.role_required)
    return bool(nurse_profession and role_required and (nurse_profession in role_required or role_required in nurse_profession))


def city_matches_shift(nurse_profile: NurseProfile, shift: Shift) -> bool:
    return normalize_match_text(nurse_profile.city) == normalize_match_text(shift.city)


def shift_match_reason(nurse_profile: NurseProfile, shift: Shift) -> str:
    if role_matches_shift(nurse_profile, shift) and city_matches_shift(nurse_profile, shift):
        return "Matched by profession and city"
    return "Open shift available"


def base_rate_for_unit(unit_type: str | None) -> float:
    normalized_unit = normalize_match_text(unit_type)
    if normalized_unit == "long-term care":
        return 35
    if normalized_unit == "hospital":
        return 42
    if normalized_unit == "er":
        return 50
    if normalized_unit == "icu":
        return 55
    return 35


def urgency_bonus_for_shift(shift: Shift) -> float:
    return 5 if shift.urgency.value == "urgent" else 0


def normalize_years_experience(years_experience: int | str | None) -> int:
    try:
        return int(years_experience or 0)
    except (TypeError, ValueError):
        return 0


def experience_premium_for_years(years_experience: int | str | None) -> float:
    years = normalize_years_experience(years_experience)
    if years >= 5:
        return 5
    if years >= 2:
        return 2
    return 0


def shift_hours(shift: Shift) -> float:
    duration_seconds = (shift.end_time - shift.start_time).total_seconds()
    return round(max(duration_seconds, 0) / 3600, 2)


def calculate_pricing(shift: Shift, years_experience: int | str | None = 0) -> tuple[float, float, PricingBreakdown]:
    base_rate = base_rate_for_unit(shift.unit_type)
    urgency_bonus = urgency_bonus_for_shift(shift)
    experience_premium = experience_premium_for_years(years_experience)
    hours = shift_hours(shift)
    hourly_rate = base_rate + urgency_bonus + experience_premium
    total_pay = round(hourly_rate * hours, 2)
    breakdown = PricingBreakdown(
        base_rate=base_rate,
        urgency_bonus=urgency_bonus,
        experience_premium=experience_premium,
        shift_hours=hours,
    )
    return hourly_rate, total_pay, breakdown


def shift_to_response(
    shift: Shift,
    match_reason: str | None = None,
    years_experience: int | str | None = 0,
) -> ShiftResponse:
    hourly_rate, total_pay, breakdown = calculate_pricing(shift, years_experience)
    return ShiftResponse.model_validate(shift).model_copy(
        update={
            "match_reason": match_reason,
            "facility_name": shift.facility.organization_name if shift.facility else None,
            "confirmed_nurse_name": shift.confirmed_nurse.full_name if shift.confirmed_nurse else None,
            "estimated_hourly_rate": hourly_rate,
            "estimated_total_pay": total_pay,
            "pricing_breakdown": breakdown,
        }
    )


def shift_to_summary(shift: Shift, years_experience: int | str | None = 0) -> ShiftSummary:
    hourly_rate, total_pay, breakdown = calculate_pricing(shift, years_experience)
    return ShiftSummary.model_validate(shift).model_copy(
        update={
            "estimated_hourly_rate": hourly_rate,
            "estimated_total_pay": total_pay,
            "pricing_breakdown": breakdown,
        }
    )


def application_to_admin_response(application: ShiftApplication) -> AdminApplicationResponse:
    nurse = application.nurse
    facility = application.shift.facility

    return AdminApplicationResponse(
        id=application.id,
        status=application.status,
        applied_at=application.applied_at,
        reviewed_by=application.reviewed_by,
        reviewed_at=application.reviewed_at,
        shift=shift_to_summary(application.shift, application.nurse.years_experience),
        nurse=NurseSummary.model_validate(nurse).model_copy(
            update={
                "email": nurse.user.email if nurse.user else None,
                "phone": nurse.phone,
                "account_status": nurse.user.status.value if nurse.user else None,
                "availability_status": nurse.availability_status.value if nurse.availability_status else None,
            }
        ),
        facility=FacilitySummary.model_validate(facility).model_copy(
            update={
                "facility_type": facility.facility_type,
                "contact_name": facility.contact_name,
                "phone": facility.phone,
                "address": facility.address,
                "street_address": facility.street_address,
                "province": facility.province or "Ontario",
                "postal_code": facility.postal_code or extract_postal_code(facility.address),
            }
        ),
    )


def extract_postal_code(address: str | None) -> str | None:
    if not address:
        return None
    parts = address.replace(",", " ").split()
    if len(parts) < 2:
        return None
    for index in range(len(parts) - 1):
        candidate = f"{parts[index]} {parts[index + 1]}".upper()
        if len(candidate) == 7 and candidate[0].isalpha() and candidate[1].isdigit():
            return candidate
    return None


def require_shift(shift_id: UUID, db: Session) -> Shift:
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")
    return shift


def require_confirmed_nurse_for_shift(current_user: User, db: Session, shift: Shift) -> NurseProfile:
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can update shift attendance")

    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    if shift.confirmed_nurse_id != nurse_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the confirmed nurse can update this shift")

    return nurse_profile


def require_facility_owner_for_shift(current_user: User, db: Session, shift: Shift) -> FacilityProfile:
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can verify attendance")

    facility_profile = get_facility_profile(current_user, db)
    if not facility_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility profile not found")

    if shift.facility_id != facility_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owning facility can verify attendance")

    return facility_profile


@app.post("/shifts", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(
    payload: ShiftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can create shifts")

    facility_profile = get_facility_profile(current_user, db)
    if not facility_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility profile not found")

    shift = Shift(
        facility_id=facility_profile.id,
        status=ShiftStatus.OPEN,
        **payload.dict(),
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="shift_created",
        entity_type="shift",
        entity_id=shift.id,
        details={"facility_profile_id": str(facility_profile.id), "shift_id": str(shift.id)},
    )
    db.add(audit)
    db.commit()

    return shift_to_response(shift)


@app.get("/facilities/shifts", response_model=list[ShiftResponse])
def list_facility_shifts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can view facility shifts")

    facility_profile = get_facility_profile(current_user, db)
    if not facility_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility profile not found")

    return [shift_to_response(shift, years_experience=0) for shift in db.query(Shift).filter(Shift.facility_id == facility_profile.id).all()]


@app.get("/shifts/{shift_id}", response_model=ShiftResponse)
def get_shift(shift_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    shift = require_shift(shift_id, db)
    return shift_to_response(shift)


@app.get("/shifts", response_model=list[ShiftResponse])
def list_open_shifts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can view open shifts")

    shifts = db.query(Shift).filter(Shift.status == ShiftStatus.OPEN).all()
    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        return [shift_to_response(shift, "Open shift available", years_experience=0) for shift in shifts]

    shifts.sort(
        key=lambda shift: (
            not (role_matches_shift(nurse_profile, shift) and city_matches_shift(nurse_profile, shift)),
            shift.start_time,
        )
    )
    return [shift_to_response(shift, shift_match_reason(nurse_profile, shift), nurse_profile.years_experience) for shift in shifts]


@app.post("/shifts/{shift_id}/apply", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_shift(shift_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can apply to shifts")

    if current_user.status != UserStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account approval required before applying to shifts.")

    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift not found")

    if shift.status != ShiftStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Shift is not open for applications")

    existing_application = (
        db.query(ShiftApplication)
        .filter(
            ShiftApplication.shift_id == shift.id,
            ShiftApplication.nurse_id == nurse_profile.id,
        )
        .first()
    )
    if existing_application:
        if existing_application.status == ShiftApplicationStatus.WITHDRAWN:
            db.delete(existing_application)
            db.flush()
        else:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Application already exists for this nurse and shift")

    application = ShiftApplication(
        shift_id=shift.id,
        nurse_id=nurse_profile.id,
        status=ShiftApplicationStatus.APPLIED,
    )
    shift.status = ShiftStatus.UNDER_REVIEW
    db.add(application)
    db.add(shift)
    db.commit()
    db.refresh(application)

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="shift_applied",
        entity_type="shift_application",
        entity_id=application.id,
        details={"shift_id": str(shift.id), "nurse_profile_id": str(nurse_profile.id)},
    )
    db.add(audit)
    db.commit()

    return application


@app.get("/nurses/applications", response_model=list[ApplicationResponse])
def list_nurse_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can view applications")

    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    return db.query(ShiftApplication).filter(ShiftApplication.nurse_id == nurse_profile.id).all()


@app.patch("/shifts/applications/{application_id}/withdraw", response_model=ApplicationResponse)
def withdraw_application(application_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can withdraw applications")

    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    application = db.query(ShiftApplication).filter(ShiftApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.nurse_id != nurse_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only withdraw your own application")

    if application.status not in (ShiftApplicationStatus.APPLIED, ShiftApplicationStatus.UNDER_REVIEW):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending applications can be withdrawn")

    now = datetime.utcnow()
    application.status = ShiftApplicationStatus.WITHDRAWN
    application.reviewed_at = now

    shift = application.shift
    active_application_count = (
        db.query(ShiftApplication)
        .filter(
            ShiftApplication.shift_id == shift.id,
            ShiftApplication.id != application.id,
            ShiftApplication.status.in_([ShiftApplicationStatus.APPLIED, ShiftApplicationStatus.UNDER_REVIEW]),
        )
        .count()
    )
    if active_application_count == 0 and shift.status == ShiftStatus.UNDER_REVIEW:
        shift.status = ShiftStatus.OPEN

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="application_withdrawn",
        entity_type="shift_application",
        entity_id=application.id,
        details={"shift_id": str(shift.id), "nurse_profile_id": str(nurse_profile.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(application)

    return application


@app.get("/nurses/confirmed-shifts", response_model=list[ShiftResponse])
def list_nurse_confirmed_shifts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can view confirmed shifts")

    nurse_profile = get_nurse_profile(current_user, db)
    if not nurse_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    shifts = (
        db.query(Shift)
        .filter(
            Shift.confirmed_nurse_id == nurse_profile.id,
            Shift.status.in_([ShiftStatus.CONFIRMED, ShiftStatus.COMPLETED]),
        )
        .order_by(Shift.start_time.asc())
        .all()
    )
    return [shift_to_response(shift, years_experience=nurse_profile.years_experience) for shift in shifts]


@app.post("/shifts/{shift_id}/confirm-arrival", response_model=ShiftResponse)
def confirm_arrival(shift_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = require_shift(shift_id, db)
    nurse_profile = require_confirmed_nurse_for_shift(current_user, db, shift)

    if shift.status != ShiftStatus.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Shift must be confirmed before arrival can be recorded")

    if shift.timesheet_status not in ("not_started", None):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Arrival has already been recorded for this shift")

    now = datetime.utcnow()
    shift.arrival_confirmed_at = now
    shift.timesheet_status = "arrival_confirmed"
    shift.updated_at = now

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="arrival_confirmed",
        entity_type="shift",
        entity_id=shift.id,
        details={"shift_id": str(shift.id), "nurse_profile_id": str(nurse_profile.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(shift)

    return shift_to_response(shift, years_experience=nurse_profile.years_experience)


@app.post("/shifts/{shift_id}/end-shift", response_model=ShiftResponse)
def end_shift(shift_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = require_shift(shift_id, db)
    nurse_profile = require_confirmed_nurse_for_shift(current_user, db, shift)

    if shift.status != ShiftStatus.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Shift must be confirmed before it can be submitted")

    if shift.timesheet_status != "arrival_confirmed" or not shift.arrival_confirmed_at:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Arrival must be confirmed before ending the shift")

    now = datetime.utcnow()
    shift.shift_ended_at = now
    shift.timesheet_status = "submitted"
    shift.updated_at = now

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="shift_submitted",
        entity_type="shift",
        entity_id=shift.id,
        details={"shift_id": str(shift.id), "nurse_profile_id": str(nurse_profile.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(shift)

    return shift_to_response(shift, years_experience=nurse_profile.years_experience)


@app.post("/shifts/{shift_id}/verify-attendance", response_model=ShiftResponse)
def verify_attendance(shift_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = require_shift(shift_id, db)
    facility_profile = require_facility_owner_for_shift(current_user, db, shift)

    if shift.timesheet_status != "submitted" or not shift.shift_ended_at:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Timesheet must be submitted before attendance can be verified")

    now = datetime.utcnow()
    shift.facility_verified_at = now
    shift.timesheet_status = "verified"
    shift.status = ShiftStatus.COMPLETED
    shift.updated_at = now

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="attendance_verified",
        entity_type="shift",
        entity_id=shift.id,
        details={"shift_id": str(shift.id), "facility_profile_id": str(facility_profile.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(shift)

    return shift_to_response(shift)


@app.post("/shifts/{shift_id}/dispute-attendance", response_model=ShiftResponse)
def dispute_attendance(shift_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = require_shift(shift_id, db)
    facility_profile = require_facility_owner_for_shift(current_user, db, shift)

    if shift.timesheet_status != "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only submitted attendance can be disputed")

    now = datetime.utcnow()
    shift.timesheet_status = "disputed"
    shift.updated_at = now

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="attendance_disputed",
        entity_type="shift",
        entity_id=shift.id,
        details={"shift_id": str(shift.id), "facility_profile_id": str(facility_profile.id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(shift)

    return shift_to_response(shift)


@app.get("/admin/applications", response_model=list[AdminApplicationResponse])
def list_admin_applications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view applications")

    applications = db.query(ShiftApplication).all()
    return [application_to_admin_response(application) for application in applications]


@app.patch("/admin/applications/{application_id}/approve", response_model=AdminApplicationResponse)
def approve_application(application_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can approve applications")

    application = db.query(ShiftApplication).filter(ShiftApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.status == ShiftApplicationStatus.WITHDRAWN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Withdrawn applications cannot be approved")

    if application.status != ShiftApplicationStatus.APPLIED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only applied applications can be approved")

    shift = application.shift
    if shift.status == ShiftStatus.CONFIRMED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Shift is already confirmed")
    if not application.nurse.user or application.nurse.user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate account and credentials must be approved before confirming coverage.",
        )
    has_approved_credentials = (
        db.query(Document)
        .filter(Document.user_id == application.nurse.user_id, Document.status == DocumentStatus.APPROVED)
        .first()
        is not None
    )
    if not has_approved_credentials:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate account and credentials must be approved before confirming coverage.",
        )

    application.status = ShiftApplicationStatus.APPROVED
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()

    shift.status = ShiftStatus.CONFIRMED
    shift.confirmed_nurse_id = application.nurse_id

    other_applications = (
        db.query(ShiftApplication)
        .filter(ShiftApplication.shift_id == shift.id, ShiftApplication.id != application.id)
        .all()
    )
    for other in other_applications:
        if other.status not in (ShiftApplicationStatus.REJECTED, ShiftApplicationStatus.WITHDRAWN):
            other.status = ShiftApplicationStatus.REJECTED
            other.reviewed_by = current_user.id
            other.reviewed_at = datetime.utcnow()

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="application_approved",
        entity_type="shift_application",
        entity_id=application.id,
        details={"shift_id": str(shift.id), "approved_nurse_id": str(application.nurse_id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(application)

    return application_to_admin_response(application)


@app.patch("/admin/applications/{application_id}/reject", response_model=ApplicationResponse)
def reject_application(application_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can reject applications")

    application = db.query(ShiftApplication).filter(ShiftApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.status == ShiftApplicationStatus.WITHDRAWN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Withdrawn applications cannot be rejected")

    if application.status == ShiftApplicationStatus.REJECTED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Application is already rejected")

    if application.status == ShiftApplicationStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Approved application cannot be rejected")

    application.status = ShiftApplicationStatus.REJECTED
    application.reviewed_by = current_user.id
    application.reviewed_at = datetime.utcnow()

    shift = application.shift
    remaining_open_applications = (
        db.query(ShiftApplication)
        .filter(ShiftApplication.shift_id == shift.id, ShiftApplication.status.in_([ShiftApplicationStatus.APPLIED, ShiftApplicationStatus.UNDER_REVIEW]))
        .count()
    )

    if remaining_open_applications == 0 and shift.status != ShiftStatus.CONFIRMED:
        shift.status = ShiftStatus.OPEN

    audit = AuditLog(
        actor_user_id=current_user.id,
        action="application_rejected",
        entity_type="shift_application",
        entity_id=application.id,
        details={"shift_id": str(shift.id), "rejected_nurse_id": str(application.nurse_id)},
    )
    db.add(audit)
    db.commit()
    db.refresh(application)

    return application


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
