from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import math
from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.db_models import User, Participant, Assessment, AuditLog
from app.schemas.schemas import (
    ParticipantCreate,
    ParticipantUpdate,
    ParticipantOut,
    ParticipantListOut,
    PaginatedParticipants,
    CaseNoteCreate,
    CaseNoteOut,
)
from datetime import datetime
import random
import string

router = APIRouter(prefix="/api/participants", tags=["Participants"])


def generate_participant_id():
    return "DC-" + "".join(random.choices(string.digits, k=6))


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


@router.get("", response_model=PaginatedParticipants)
def list_participants(
    search: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    program_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Participant)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Participant.first_name.ilike(search_term))
            | (Participant.last_name.ilike(search_term))
            | (Participant.participant_id.ilike(search_term))
        )

    if program_status:
        query = query.filter(Participant.program_status == program_status)

    total = query.count()
    participants = query.offset((page - 1) * size).limit(size).all()

    items = []
    for p in participants:
        latest = (
            db.query(Assessment)
            .filter(Assessment.participant_id == p.id)
            .order_by(Assessment.assessment_date.desc())
            .first()
        )

        item = ParticipantListOut(
            id=p.id,
            participant_id=p.participant_id,
            first_name=p.first_name,
            last_name=p.last_name,
            age=p.age,
            gender=p.gender,
            employment_status=p.employment_status,
            program_status=p.program_status,
            latest_risk_level=(
                latest.risk_level.value if latest and latest.risk_level else None
            ),
            latest_risk_score=latest.recidivism_probability if latest else None,
            latest_assessment_date=latest.assessment_date if latest else None,
            created_at=p.created_at,
        )
        items.append(item)

    if risk_level:
        items = [i for i in items if i.latest_risk_level == risk_level.upper()]
        total = len(items)

    return PaginatedParticipants(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=max(1, math.ceil(total / size)),
    )


@router.post("", response_model=ParticipantOut)
def create_participant(
    body: ParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pid = generate_participant_id()
    while db.query(Participant).filter(Participant.participant_id == pid).first():
        pid = generate_participant_id()

    participant = Participant(participant_id=pid, **body.model_dump())
    db.add(participant)
    db.commit()
    db.refresh(participant)

    log_action(
        db,
        current_user.id,
        "PARTICIPANT_CREATED",
        "participant",
        str(participant.id),
        {"participant_id": pid},
    )
    return participant


@router.get("/{participant_id}", response_model=ParticipantOut)
def get_participant(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    log_action(db, current_user.id, "PARTICIPANT_VIEWED", "participant", str(p.id))
    return p


@router.put("/{participant_id}", response_model=ParticipantOut)
def update_participant(
    participant_id: int,
    body: ParticipantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(p, key, value)
    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)

    log_action(db, current_user.id, "PARTICIPANT_UPDATED", "participant", str(p.id))
    return p


@router.get("/{participant_id}/notes", response_model=List[CaseNoteOut])
def get_notes(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.db_models import CaseNote

    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    return (
        db.query(CaseNote)
        .filter(CaseNote.participant_id == participant_id)
        .order_by(CaseNote.created_at.desc())
        .all()
    )


@router.post("/{participant_id}/notes", response_model=CaseNoteOut)
def add_note(
    participant_id: int,
    body: CaseNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.db_models import CaseNote

    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Participant not found")
    note = CaseNote(
        participant_id=participant_id,
        author_id=current_user.id,
        note_type=body.note_type,
        content=body.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    log_action(db, current_user.id, "NOTE_ADDED", "participant", str(participant_id))
    return note
