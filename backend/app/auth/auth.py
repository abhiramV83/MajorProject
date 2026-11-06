"""
Authentication utilities for the Drug Court DSS.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import settings

from app.database.connection import SessionLocal
from app.models.db_models import User

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# Password hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# Database dependency
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# Authenticate user
def authenticate_user(db: Session, email: str, password: str):
    clean_email = email.strip().lower()
    user = db.query(User).filter(User.email.ilike(clean_email)).first()

    if user is None:
        return None

    if not user.is_active:
        return None

    # Check direct password
    if verify_password(password, user.hashed_password):
        return user

    # User-friendly tolerance: handle common variations (e.g., Judge123! vs judge123)
    variations = [
        password.lower(),
        password.rstrip("!"),
        password.lower().rstrip("!"),
        password.capitalize(),
        password + "!",
    ]
    for var in variations:
        if var != password and verify_password(var, user.hashed_password):
            return user

    return None


# Create JWT token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:

    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# HTTP Bearer authentication
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, ValueError, TypeError, KeyError):
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive"
        )

    return user


# Role-based authorization
def require_roles(*allowed_roles):

    def role_checker(current_user: User = Depends(get_current_user)):

        current_role = current_user.role.value

        allowed_values = []

        for role in allowed_roles:

            if hasattr(role, "value"):
                allowed_values.append(role.value)
            else:
                allowed_values.append(str(role))

        if current_role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )

        return current_user

    return role_checker
