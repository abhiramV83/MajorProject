from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.auth.auth import get_current_user, require_roles
from app.models.db_models import User, UserRole
from app.schemas.schemas import UserOut, UserCreate, UserUpdate
from app.auth.auth import get_password_hash
from datetime import datetime

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db), current_user: User = Depends(require_roles("ADMIN"))
):
    return db.query(User).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


@router.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    from app.models.db_models import (
        Participant,
        Assessment,
        RiskLevel as RL,
        InterventionPlan,
    )
    from sqlalchemy import func

    total_participants = db.query(Participant).count()
    assessed = db.query(Assessment.participant_id).distinct().count()

    high_risk = db.query(Assessment).filter(Assessment.risk_level == RL.HIGH).count()
    medium_risk = (
        db.query(Assessment).filter(Assessment.risk_level == RL.MEDIUM).count()
    )
    low_risk = db.query(Assessment).filter(Assessment.risk_level == RL.LOW).count()

    pending = (
        db.query(Assessment)
        .filter(
            Assessment.reviewed_at == None, Assessment.recidivism_probability != None
        )
        .count()
    )

    total_assessments = db.query(Assessment).count()
    total_interventions = db.query(InterventionPlan).count()

    # Monthly trend (last 6 assessments counts grouped by month simulation)
    recent_assessments = (
        db.query(Assessment)
        .order_by(Assessment.assessment_date.desc())
        .limit(100)
        .all()
    )

    return {
        "total_participants": total_participants,
        "assessed_participants": assessed,
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk,
        "pending_reviews": pending,
        "total_assessments": total_assessments,
        "total_interventions": total_interventions,
    }
