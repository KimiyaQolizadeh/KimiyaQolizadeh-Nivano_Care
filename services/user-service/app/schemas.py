from datetime import datetime
import re
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from shared.database.models import AvailabilityStatus, UserRole, UserStatus

ONTARIO_CITIES = {
    "Toronto",
    "Mississauga",
    "Brampton",
    "Vaughan",
    "Markham",
    "Richmond Hill",
    "North York",
    "Scarborough",
    "Etobicoke",
    "Hamilton",
    "Ottawa",
    "London",
    "Kitchener",
    "Waterloo",
    "Windsor",
    "Barrie",
    "Oshawa",
}


def require_text(value: str, field_name: str) -> str:
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} is required.")
    return text


def validate_ontario_city(value: str) -> str:
    text = require_text(value, "City")
    if text not in ONTARIO_CITIES:
        raise ValueError("City must be a supported Ontario city.")
    return text


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10:
        raise ValueError("Phone number must be a valid Canadian or US number.")
    return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"


def normalize_canadian_postal_code(value: str) -> str:
    text = re.sub(r"\s+", "", value or "").upper()
    if not re.fullmatch(r"[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d", text):
        raise ValueError("Postal code must be a valid Canadian postal code.")
    return f"{text[:3]} {text[3:]}"


def normalize_address(value: str) -> str:
    text = require_text(value, "Street address")
    parts = [part.strip() for part in text.split(",")]
    if len(parts) >= 2:
        last = parts[-1]
        province_postal = last.split(maxsplit=1)
        if province_postal and province_postal[0].upper() in {"ON", "ONTARIO"} and len(province_postal) > 1:
            postal_code = normalize_canadian_postal_code(province_postal[1])
            parts[-1] = f"Ontario {postal_code}"
            return ", ".join(parts)
    return text


class NurseProfileBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    profession: str
    license_number: str
    years_experience: int = Field(..., ge=0)
    city: str
    availability_status: AvailabilityStatus

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        return require_text(value, "Full name")

    @field_validator("profession")
    @classmethod
    def validate_profession(cls, value: str) -> str:
        return require_text(value, "Profession")

    @field_validator("license_number")
    @classmethod
    def validate_license_number(cls, value: str) -> str:
        return require_text(value, "License number")

    @field_validator("phone")
    @classmethod
    def validate_nurse_phone(cls, value: Optional[str]) -> Optional[str]:
        return normalize_phone(value) if value else value

    @field_validator("city")
    @classmethod
    def validate_city(cls, value: str) -> str:
        return validate_ontario_city(value)


class NurseProfileCreate(NurseProfileBase):
    pass


class NurseProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profession: Optional[str] = None
    license_number: Optional[str] = None
    years_experience: Optional[int] = Field(default=None, ge=0)
    city: Optional[str] = None
    availability_status: Optional[AvailabilityStatus] = None

    @field_validator("full_name", "profession", "license_number")
    @classmethod
    def validate_optional_text(cls, value: Optional[str]) -> Optional[str]:
        return require_text(value, "Field") if value is not None else value

    @field_validator("city")
    @classmethod
    def validate_optional_city(cls, value: Optional[str]) -> Optional[str]:
        return validate_ontario_city(value) if value is not None else value

    @field_validator("phone")
    @classmethod
    def validate_optional_nurse_phone(cls, value: Optional[str]) -> Optional[str]:
        return normalize_phone(value) if value else value


class NurseProfileResponse(NurseProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FacilityProfileBase(BaseModel):
    organization_name: str
    facility_type: str
    address: str
    street_address: Optional[str] = None
    city: str
    province: Optional[str] = "Ontario"
    postal_code: Optional[str] = None
    contact_name: str
    phone: str

    @field_validator("organization_name")
    @classmethod
    def validate_organization_name(cls, value: str) -> str:
        return require_text(value, "Organization name")

    @field_validator("facility_type")
    @classmethod
    def validate_facility_type(cls, value: str) -> str:
        return require_text(value, "Organization type")

    @field_validator("address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        return normalize_address(value)

    @field_validator("street_address")
    @classmethod
    def validate_street_address(cls, value: Optional[str]) -> Optional[str]:
        return require_text(value, "Street address") if value is not None else value

    @field_validator("city")
    @classmethod
    def validate_facility_city(cls, value: str) -> str:
        return validate_ontario_city(value)

    @field_validator("province")
    @classmethod
    def validate_province(cls, value: Optional[str]) -> str:
        text = (value or "Ontario").strip()
        if text.lower() not in {"on", "ontario"}:
            raise ValueError("Province must be Ontario.")
        return "Ontario"

    @field_validator("postal_code")
    @classmethod
    def validate_postal_code(cls, value: Optional[str]) -> Optional[str]:
        return normalize_canadian_postal_code(value) if value else value

    @field_validator("contact_name")
    @classmethod
    def validate_contact_name(cls, value: str) -> str:
        return require_text(value, "Primary contact")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return normalize_phone(value)


class FacilityProfileCreate(FacilityProfileBase):
    pass


class FacilityProfileUpdate(BaseModel):
    organization_name: Optional[str] = None
    facility_type: Optional[str] = None
    address: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("organization_name", "facility_type", "contact_name")
    @classmethod
    def validate_optional_facility_text(cls, value: Optional[str]) -> Optional[str]:
        return require_text(value, "Field") if value is not None else value

    @field_validator("address")
    @classmethod
    def validate_optional_address(cls, value: Optional[str]) -> Optional[str]:
        return normalize_address(value) if value is not None else value

    @field_validator("street_address")
    @classmethod
    def validate_optional_street_address(cls, value: Optional[str]) -> Optional[str]:
        return require_text(value, "Street address") if value is not None else value

    @field_validator("city")
    @classmethod
    def validate_optional_facility_city(cls, value: Optional[str]) -> Optional[str]:
        return validate_ontario_city(value) if value is not None else value

    @field_validator("province")
    @classmethod
    def validate_optional_province(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        text = value.strip()
        if text.lower() not in {"on", "ontario"}:
            raise ValueError("Province must be Ontario.")
        return "Ontario"

    @field_validator("postal_code")
    @classmethod
    def validate_optional_postal_code(cls, value: Optional[str]) -> Optional[str]:
        return normalize_canadian_postal_code(value) if value else value

    @field_validator("phone")
    @classmethod
    def validate_optional_phone(cls, value: Optional[str]) -> Optional[str]:
        return normalize_phone(value) if value is not None else value


class FacilityProfileResponse(FacilityProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    nurse_full_name: Optional[str] = None
    nurse_phone: Optional[str] = None
    nurse_profession: Optional[str] = None
    nurse_license_number: Optional[str] = None
    nurse_years_experience: Optional[int] = None
    nurse_city: Optional[str] = None
    nurse_availability_status: Optional[str] = None
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    organization_address: Optional[str] = None
    organization_street_address: Optional[str] = None
    organization_city: Optional[str] = None
    organization_province: Optional[str] = None
    organization_postal_code: Optional[str] = None
    organization_contact_name: Optional[str] = None
    organization_phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
