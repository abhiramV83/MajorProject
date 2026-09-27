"""
Drug Court Decision Support System - Backend API
-------------------------------------------------
FastAPI application serving the DSS backend.

IMPORTANT: This is a prototype using synthetic/demonstration data.
All predictions and recommendations are advisory only.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.connection import engine
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
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified.")
        await seed_demo_users()
    except Exception as e:
        logger.error(f"Startup error: {e}")
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
                "email": "admin@example.com",
                "full_name": "Admin User",
                "password": "Admin123!",
                "role": UserRole.ADMIN,
            },
            {
                "email": "judge@example.com",
                "full_name": "Judge Smith",
                "password": "Judge123!",
                "role": UserRole.JUDGE,
            },
            {
                "email": "manager@example.com",
                "full_name": "Case Manager Jones",
                "password": "Manager123!",
                "role": UserRole.CASE_MANAGER,
            },
            {
                "email": "provider@example.com",
                "full_name": "Treatment Provider Lee",
                "password": "Provider123!",
                "role": UserRole.TREATMENT_PROVIDER,
            },
            {
                "email": "officer@example.com",
                "full_name": "Officer Williams",
                "password": "Officer123!",
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


app = FastAPI(
    title="Drug Court Decision Support System",
    description=(
        "AI-powered decision support system for drug court professionals. "
        "PROTOTYPE using synthetic/demonstration data. All predictions are advisory only."
    ),
    version="1.0.0-prototype",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
