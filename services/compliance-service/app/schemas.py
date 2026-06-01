from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from shared.database.models import DocumentStatus, DocumentType


class DocumentCreate(BaseModel):
    document_type: DocumentType
    file_name: str
    file_url: str
    expiry_date: Optional[date] = None

    @field_validator("file_name", "file_url")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        clean_value = value.strip()
        if not clean_value:
            raise ValueError("Field cannot be empty")
        return clean_value

    def expiry_datetime(self) -> Optional[datetime]:
        if self.expiry_date is None:
            return None
        return datetime.combine(self.expiry_date, time.min)


class DocumentResponse(BaseModel):
    id: UUID
    user_id: UUID
    document_type: DocumentType
    file_name: str
    file_url: str
    status: DocumentStatus
    expiry_date: Optional[datetime] = None
    uploaded_at: datetime
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AdminDocumentResponse(DocumentResponse):
    user_email: str
    user_status: Optional[str] = None
    nurse_full_name: Optional[str] = None
    nurse_profession: Optional[str] = None
    nurse_license_number: Optional[str] = None
    nurse_years_experience: Optional[int] = None
    nurse_city: Optional[str] = None
    reviewer_email: Optional[str] = None
