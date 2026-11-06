from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
import time
from collections import defaultdict
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

# In-memory sliding window brute-force protection (per client-ip and email)
_FAILED_LOGIN_ATTEMPTS = defaultdict(list)
_LOGIN_WINDOW_SECONDS = 180
_MAX_FAILED_ATTEMPTS = 50


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_login_rate_limit(key: str):
    now = time.time()
    attempts = [t for t in _FAILED_LOGIN_ATTEMPTS[key] if now - t < _LOGIN_WINDOW_SECONDS]
    _FAILED_LOGIN_ATTEMPTS[key] = attempts
    if len(attempts) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait 3 minutes before trying again.",
        )


def record_failed_attempt(key: str):
    _FAILED_LOGIN_ATTEMPTS[key].append(time.time())


def clear_failed_attempts(key: str):
    _FAILED_LOGIN_ATTEMPTS.pop(key, None)


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
    client_ip = get_client_ip(request)
    rate_key = f"{client_ip}:{body.email.strip().lower()}"

    user = authenticate_user(db, body.email.strip(), body.password)
    if not user:
        record_failed_attempt(rate_key)
        # Log failed attempt
        log = AuditLog(
            action="LOGIN_FAILED",
            resource_type="auth",
            details={"email": body.email},
            ip_address=client_ip,
            status="failure",
        )
        db.add(log)
        db.commit()
        check_login_rate_limit(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Valid login: clear failed attempts
    clear_failed_attempts(rate_key)

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
