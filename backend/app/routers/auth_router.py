from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database.connection import get_db
from app.auth.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from app.models.db_models import User, AuditLog, UserRole
from app.schemas.schemas import Token, LoginRequest, UserOut, UserCreate
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def log_action(
    db: Session,
    user_id: int,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    ip: str = None,
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip,
        status="success",
    )
    db.add(log)
    db.commit()


@router.post("/login", response_model=Token)
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if not user:
        # Log failed attempt
        log = AuditLog(
            action="LOGIN_FAILED",
            resource_type="auth",
            details={"email": body.email},
            ip_address=request.client.host if request.client else None,
            status="failure",
        )
        db.add(log)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    log_action(
        db,
        user.id,
        "LOGIN",
        "auth",
        str(user.id),
        {"email": user.email, "role": user.role.value},
        request.client.host if request.client else None,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserOut)
def register(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can register users")
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(body.password),
        role=UserRole(body.role),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
