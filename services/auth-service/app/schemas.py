from datetime import datetime
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["nurse", "facility", "admin"]

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must include an uppercase letter.")
        if not re.search(r"[a-z]", value):
            raise ValueError("Password must include a lowercase letter.")
        if not re.search(r"\d", value):
            raise ValueError("Password must include a number.")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must include a special character.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: UUID
    email: EmailStr
    role: str
    status: str

    model_config = {"from_attributes": True}
