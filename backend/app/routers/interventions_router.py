from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.db_models import User, InterventionPlan, AuditLog
from app.schemas.schemas import (
    InterventionPlanCreate,
    InterventionPlanUpdate,
    InterventionPlanOut,
)
from datetime import datetime

router = APIRouter(prefix="/api", tags=["Interventions"])


def log_action(db, user_id, action, resource_type=None, resource_id=None, details=None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        status="success",
    )
    db.add(log)
    db.commit()


@router.get(
    "/participants/{participant_id}/interventions",
    response_model=List[InterventionPlanOut],
)
def get_interventions(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(InterventionPlan)
        .filter(InterventionPlan.participant_id == participant_id)
        .order_by(InterventionPlan.created_at.desc())
        .all()
    )


@router.post(
    "/participants/{participant_id}/interventions", response_model=InterventionPlanOut
)
def create_intervention(
    participant_id: int,
    body: InterventionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = InterventionPlan(
        participant_id=participant_id, created_by=current_user.id, **body.model_dump()
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    log_action(
        db,
        current_user.id,
        "INTERVENTION_CREATED",
        "intervention",
        str(plan.id),
        {"participant_id": participant_id},
    )
    return plan


@router.put("/interventions/{intervention_id}", response_model=InterventionPlanOut)
def update_intervention(
    intervention_id: int,
    body: InterventionPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = (
        db.query(InterventionPlan)
        .filter(InterventionPlan.id == intervention_id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="Intervention plan not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)
    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    log_action(
        db,
        current_user.id,
        "INTERVENTION_UPDATED",
        "intervention",
        str(intervention_id),
        {"status": str(plan.status)},
    )
    return plan
