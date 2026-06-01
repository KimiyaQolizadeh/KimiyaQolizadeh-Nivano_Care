import os
import uuid
from datetime import date, datetime, time
from uuid import UUID

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .dependencies import get_current_user
from .schemas import AdminDocumentResponse, DocumentCreate, DocumentResponse
from shared.database import Document, User, get_db, init_db
from shared.database.models import DocumentStatus, DocumentType, UserRole, UserStatus

app = FastAPI(title="Compliance Service", version="1.0.0")
UPLOAD_DIR = os.path.abspath(os.path.join(os.getcwd(), "storage", "documents"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


def cors_origins() -> list[str]:
    return [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]


def compliance_public_url() -> str:
    return os.getenv("COMPLIANCE_PUBLIC_URL", "http://localhost:8004").rstrip("/")


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    os.makedirs(UPLOAD_DIR, exist_ok=True)


app.mount("/documents/files", StaticFiles(directory=UPLOAD_DIR), name="document_files")


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "compliance-service"}


@app.get("/")
async def root():
    return {"message": "Compliance Service is running"}


def ensure_nurse(current_user: User) -> None:
    if current_user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only nurses can manage documents")


def ensure_admin(current_user: User) -> None:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can review documents")


def to_admin_document_response(document: Document) -> AdminDocumentResponse:
    nurse_profile = document.user.nurse_profile if document.user else None

    return AdminDocumentResponse(
        id=document.id,
        user_id=document.user_id,
        document_type=document.document_type,
        file_name=document.file_name,
        file_url=document.file_url,
        status=document.status,
        expiry_date=document.expiry_date,
        uploaded_at=document.uploaded_at,
        reviewed_by=document.reviewed_by,
        reviewed_at=document.reviewed_at,
        user_email=document.user.email if document.user else "Unknown user",
        user_status=document.user.status.value if document.user else None,
        nurse_full_name=nurse_profile.full_name if nurse_profile else None,
        nurse_profession=nurse_profile.profession if nurse_profile else None,
        nurse_license_number=nurse_profile.license_number if nurse_profile else None,
        nurse_years_experience=nurse_profile.years_experience if nurse_profile else None,
        nurse_city=nurse_profile.city if nurse_profile else None,
        reviewer_email=document.reviewer.email if document.reviewer else None,
    )


@app.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    payload: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_nurse(current_user)

    document = Document(
        user_id=current_user.id,
        document_type=payload.document_type,
        file_name=payload.file_name,
        file_url=payload.file_url,
        expiry_date=payload.expiry_datetime(),
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@app.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_file(
    document_type: DocumentType = Form(...),
    expiry_date: date | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_nurse(current_user)

    original_name = (file.filename or "").strip()
    if not original_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name is required")

    safe_name = os.path.basename(original_name).replace(" ", "_")
    stored_name = f"{uuid.uuid4()}_{safe_name}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file cannot be empty")

    with open(stored_path, "wb") as destination:
        destination.write(contents)

    document = Document(
        user_id=current_user.id,
        document_type=document_type,
        file_name=original_name,
        file_url=f"{compliance_public_url()}/documents/files/{stored_name}",
        expiry_date=datetime.combine(expiry_date, time.min) if expiry_date else None,
        status=DocumentStatus.PENDING,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@app.get("/documents/me", response_model=list[DocumentResponse])
def list_my_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_nurse(current_user)

    return (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .all()
    )


@app.get("/admin/documents", response_model=list[AdminDocumentResponse])
def list_admin_documents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(current_user)

    documents = db.query(Document).join(User, Document.user_id == User.id).all()
    documents.sort(key=lambda document: (document.status != DocumentStatus.PENDING, document.uploaded_at))
    return [to_admin_document_response(document) for document in documents]


@app.patch("/admin/documents/{document_id}/approve", response_model=AdminDocumentResponse)
def approve_document(document_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(current_user)

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not document.user or document.user.role != UserRole.NURSE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only nurse credentials can be approved")
    if document.user.status != UserStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nurse account must be approved before credentials can be approved.",
        )

    document.status = DocumentStatus.APPROVED
    document.reviewed_by = current_user.id
    document.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    return to_admin_document_response(document)


@app.patch("/admin/documents/{document_id}/reject", response_model=AdminDocumentResponse)
def reject_document(document_id: UUID, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(current_user)

    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = DocumentStatus.REJECTED
    document.reviewed_by = current_user.id
    document.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(document)
    return to_admin_document_response(document)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
