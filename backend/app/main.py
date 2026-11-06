"""
Drug Court Decision Support System - Backend API
-------------------------------------------------
FastAPI application serving the DSS backend.

IMPORTANT: This is a prototype using synthetic/demonstration data.
All predictions and recommendations are advisory only.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.connection import engine, schema_engine
from app.models.db_models import Base
from app.routers import (
    auth_router,
    participants_router,
    assessments_router,
    interventions_router,
    audit_router,
    model_router,
    users_router,
    reports_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Starting Drug Court DSS API...")
    if settings.ENVIRONMENT == "production":
        if (
            not settings.SECRET_KEY
            or settings.SECRET_KEY in ("dev-secret-key-change-in-production", "secret", "changeme")
            or len(settings.SECRET_KEY) < 32
        ):
            raise ValueError(
                "CRITICAL SECURITY CONFIGURATION ERROR: SECRET_KEY must be a cryptographically "
                "strong string with at least 32 characters in production."
            )
    try:
        Base.metadata.create_all(bind=schema_engine)
        logger.info("Database tables created/verified.")
        await seed_demo_users()
        try:
            from app.models.db_models import Participant
            from app.database.connection import SessionLocal
            check_db = SessionLocal()
            try:
                if check_db.query(Participant).count() == 0:
                    logger.info("Database has 0 participants. Auto-seeding initial court cases...")
                    import sys
                    from pathlib import Path
                    backend_root = Path(__file__).resolve().parent.parent
                    if str(backend_root) not in sys.path:
                        sys.path.insert(0, str(backend_root))
                    from seed_demo_data import seed
                    seed()
            finally:
                check_db.close()
        except Exception as e:
            logger.warning(f"Auto-seed check note: {e}")
    except Exception as e:
        logger.exception("Startup error")
        raise
    yield
    logger.info("Shutting down Drug Court DSS API...")


async def seed_demo_users():
    """Create demo user accounts if they don't exist."""
    from app.database.connection import SessionLocal
    from app.models.db_models import User, UserRole
    from app.auth.auth import get_password_hash

    db = SessionLocal()
    try:
        demo_users = [
            {
                "email": "admin@drugcourt.gov",
                "full_name": "System Administrator",
                "password": "admin123",
                "role": UserRole.ADMIN,
            },
            {
                "email": "judge@drugcourt.gov",
                "full_name": "Hon. Patricia Vance",
                "password": "judge123",
                "role": UserRole.JUDGE,
            },
            {
                "email": "casemanager@drugcourt.gov",
                "full_name": "Michael Henderson, MSW",
                "password": "case123",
                "role": UserRole.CASE_MANAGER,
            },
            {
                "email": "officer@drugcourt.gov",
                "full_name": "Officer Sarah Jenkins",
                "password": "officer123",
                "role": UserRole.PROBATION_OFFICER,
            },
        ]
        for u in demo_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                user = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                )
                db.add(user)
        db.commit()
        logger.info("Demo users seeded.")
    except Exception as e:
        logger.error(f"Seeding error: {e}")
        db.rollback()
    finally:
        db.close()


is_dev = settings.ENVIRONMENT == "development"

app = FastAPI(
    title="Drug Court Decision Support System",
    description=(
        "AI-powered decision support system for drug court professionals. "
        "PROTOTYPE using synthetic/demonstration data. All predictions are advisory only."
    ),
    version="1.0.0-prototype",
    lifespan=lifespan,
    docs_url="/docs" if is_dev else None,
    redoc_url="/api/redoc" if is_dev else None,
    openapi_url="/openapi.json" if is_dev else None,
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if not is_dev:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# CORS - Allow localhost, all vercel.app preview and production domains, and onrender.com
cors_origin_regex = (
    r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$|^https://.*\.vercel\.app$|^https://.*\.onrender\.com$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["https://decisionsupportsystem8.vercel.app"],
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router.router)
app.include_router(participants_router.router)
app.include_router(assessments_router.router)
app.include_router(interventions_router.router)
app.include_router(audit_router.router)
app.include_router(model_router.router)
app.include_router(users_router.router)
app.include_router(reports_router.router)


@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {
        "status": "healthy",
        "system": "Drug Court Decision Support System",
        "version": "1.0.0-prototype",
        "disclaimer": "Synthetic/demonstration prototype — not for operational use",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred. Please try again or contact the administrator."
        },
    )
