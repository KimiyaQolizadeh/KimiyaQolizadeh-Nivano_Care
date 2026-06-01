from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional
from uuid import UUID

from shared.database.models import ShiftApplicationStatus, ShiftStatus, ShiftUrgency, UserRole


class ShiftCreate(BaseModel):
    role_required: str
    unit_type: str
    start_time: datetime
    end_time: datetime
    city: str
    required_credentials: str
    urgency: ShiftUrgency
    notes: Optional[str] = None

    @field_validator("role_required", "unit_type", "city", "required_credentials")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("This field is required.")
        return text

    @model_validator(mode="after")
    def validate_schedule(self) -> "ShiftCreate":
        if self.start_time >= self.end_time:
            raise ValueError("Shift start time must be before end time.")
        duration_hours = (self.end_time - self.start_time).total_seconds() / 3600
        if duration_hours <= 0:
            raise ValueError("Shift duration must be positive.")
        return self


class PricingBreakdown(BaseModel):
    base_rate: float
    urgency_bonus: float
    experience_premium: float
    shift_hours: float


class ShiftResponse(BaseModel):
    id: UUID
    facility_id: UUID
    facility_name: Optional[str] = None
    confirmed_nurse_name: Optional[str] = None
    role_required: str
    unit_type: str
    start_time: datetime
    end_time: datetime
    city: str
    required_credentials: str
    urgency: ShiftUrgency
    notes: Optional[str] = None
    status: ShiftStatus
    confirmed_nurse_id: Optional[UUID] = None
    arrival_confirmed_at: Optional[datetime] = None
    shift_ended_at: Optional[datetime] = None
    facility_verified_at: Optional[datetime] = None
    timesheet_status: str = "not_started"
    created_at: datetime
    updated_at: datetime
    match_reason: Optional[str] = None
    estimated_hourly_rate: Optional[float] = None
    estimated_total_pay: Optional[float] = None
    pricing_breakdown: Optional[PricingBreakdown] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationResponse(BaseModel):
    id: UUID
    shift_id: UUID
    nurse_id: UUID
    status: ShiftApplicationStatus
    applied_at: datetime
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ShiftSummary(BaseModel):
    id: UUID
    role_required: str
    unit_type: str
    city: str
    required_credentials: Optional[str] = None
    urgency: Optional[ShiftUrgency] = None
    notes: Optional[str] = None
    start_time: datetime
    end_time: datetime
    status: ShiftStatus
    timesheet_status: str = "not_started"
    arrival_confirmed_at: Optional[datetime] = None
    shift_ended_at: Optional[datetime] = None
    facility_verified_at: Optional[datetime] = None
    estimated_hourly_rate: Optional[float] = None
    estimated_total_pay: Optional[float] = None
    pricing_breakdown: Optional[PricingBreakdown] = None

    model_config = ConfigDict(from_attributes=True)


class NurseSummary(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    profession: str
    license_number: Optional[str] = None
    city: str
    years_experience: int
    email: Optional[str] = None
    phone: Optional[str] = None
    account_status: Optional[str] = None
    availability_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FacilitySummary(BaseModel):
    id: UUID
    user_id: UUID
    organization_name: str
    facility_type: Optional[str] = None
    city: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    street_address: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminApplicationResponse(BaseModel):
    id: UUID
    status: ShiftApplicationStatus
    applied_at: datetime
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    shift: ShiftSummary
    nurse: NurseSummary
    facility: FacilitySummary

    model_config = ConfigDict(from_attributes=True)
