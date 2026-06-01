import os
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .dependencies import get_current_user
from .schemas import (
    AdminUserResponse,
    FacilityProfileCreate,
    FacilityProfileResponse,
    FacilityProfileUpdate,
    NurseProfileCreate,
    NurseProfileResponse,
    NurseProfileUpdate,
)
from shared.database import FacilityProfile, NurseProfile, User, get_db, init_db
from shared.database.models import UserRole, UserStatus

app = FastAPI(title="User Service", version="1.0.0")


def cors_origins() -> list[str]:
    return [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]


def to_admin_user_response(user: User) -> AdminUserResponse:
    nurse_profile = user.nurse_profile
    facility_profile = user.facility_profile

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at,
        nurse_full_name=nurse_profile.full_name if nurse_profile else None,
        nurse_phone=nurse_profile.phone if nurse_profile else None,
        nurse_profession=nurse_profile.profession if nurse_profile else None,
        nurse_license_number=nurse_profile.license_number if nurse_profile else None,
        nurse_years_experience=nurse_profile.years_experience if nurse_profile else None,
        nurse_city=nurse_profile.city if nurse_profile else None,
        nurse_availability_status=nurse_profile.availability_status.value if nurse_profile and nurse_profile.availability_status else None,
        organization_name=facility_profile.organization_name if facility_profile else None,
        organization_type=facility_profile.facility_type if facility_profile else None,
        organization_address=facility_profile.address if facility_profile else None,
        organization_street_address=facility_profile.street_address if facility_profile else None,
        organization_city=facility_profile.city if facility_profile else None,
        organization_province=facility_profile.province if facility_profile else None,
        organization_postal_code=facility_profile.postal_code if facility_profile else None,
        organization_contact_name=facility_profile.contact_name if facility_profile else None,
        organization_phone=facility_profile.phone if facility_profile else None,
    )


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
    return {"status": "healthy", "service": "user-service"}


@app.get("/")
async def root():
    return {"message": "User Service is running"}


@app.post("/nurses/profile", response_model=NurseProfileResponse, status_code=status.HTTP_201_CREATED)
def create_nurse_profile(
    payload: NurseProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can create nurse profiles")

    if current_user.nurse_profile is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nurse profile already exists")

    existing_license = db.query(NurseProfile).filter(NurseProfile.license_number == payload.license_number).first()
    if existing_license:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already in use")

    profile = NurseProfile(user_id=current_user.id, **payload.dict())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/nurses/me", response_model=NurseProfileResponse)
def get_nurse_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can access nurse profiles")

    profile = current_user.nurse_profile or db.query(NurseProfile).filter(NurseProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    return profile


@app.patch("/nurses/me", response_model=NurseProfileResponse)
def update_nurse_profile(
    payload: NurseProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can update nurse profiles")

    profile = current_user.nurse_profile or db.query(NurseProfile).filter(NurseProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nurse profile not found")

    update_data = payload.dict(exclude_unset=True)
    if update_data.get("license_number"):
        existing_license = (
            db.query(NurseProfile)
            .filter(NurseProfile.license_number == update_data["license_number"], NurseProfile.user_id != current_user.id)
            .first()
        )
        if existing_license:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="License number already in use")

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@app.post("/facilities/profile", response_model=FacilityProfileResponse, status_code=status.HTTP_201_CREATED)
def create_facility_profile(
    payload: FacilityProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can create facility profiles")

    if current_user.facility_profile is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Facility profile already exists")

    profile = FacilityProfile(user_id=current_user.id, **payload.dict())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/facilities/me", response_model=FacilityProfileResponse)
def get_facility_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can access facility profiles")

    profile = current_user.facility_profile or db.query(FacilityProfile).filter(FacilityProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility profile not found")

    return profile


@app.patch("/facilities/me", response_model=FacilityProfileResponse)
def update_facility_profile(
    payload: FacilityProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.FACILITY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only facility users can update facility profiles")

    profile = current_user.facility_profile or db.query(FacilityProfile).filter(FacilityProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility profile not found")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@app.get("/admin/users", response_model=list[AdminUserResponse])
def list_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can access user review data")

    return [to_admin_user_response(user) for user in db.query(User).all()]


@app.patch("/admin/users/{user_id}/approve", response_model=AdminUserResponse)
def approve_user(user_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can approve users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.status = UserStatus.APPROVED
    db.commit()
    db.refresh(user)
    return to_admin_user_response(user)


@app.patch("/admin/users/{user_id}/reject", response_model=AdminUserResponse)
def reject_user(user_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can reject users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.status = UserStatus.REJECTED
    db.commit()
    db.refresh(user)
    return to_admin_user_response(user)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
