import os

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .dependencies import get_current_user
from .schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from .security import create_access_token, hash_password, verify_password
from shared.database import User, get_db, init_db
from shared.database.models import UserRole, UserStatus

app = FastAPI(title="Auth Service", version="1.0.0")


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


@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if request.role == UserRole.ADMIN.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator accounts are created internally.")

    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        role=UserRole(request.role),
        status=UserStatus.PENDING,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token(subject=str(user.id))
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        id=user.id,
        email=user.email,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        status=user.status.value if hasattr(user.status, "value") else str(user.status),
    )


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}


@app.get("/")
async def root():
    return {"message": "Auth Service is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
