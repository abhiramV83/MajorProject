from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    JUDGE = "JUDGE"
    CASE_MANAGER = "CASE_MANAGER"
    TREATMENT_PROVIDER = "TREATMENT_PROVIDER"
    PROBATION_OFFICER = "PROBATION_OFFICER"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class InterventionStatus(str, Enum):
    SUGGESTED = "SUGGESTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


# ---- AUTH ----
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: str
    password: str


# ---- USER ----
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.CASE_MANAGER


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- PARTICIPANT ----
class ParticipantCreate(BaseModel):
    first_name: str
    last_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    marital_status: Optional[str] = None
    employment_status: Optional[str] = None
    monthly_income: Optional[float] = None
    education_level: Optional[str] = None
    num_dependents: Optional[int] = 0
    housing_status: Optional[str] = None
    child_support: Optional[bool] = False
    prior_arrests: Optional[int] = 0
    prior_felonies: Optional[int] = 0
    age_first_arrest: Optional[int] = None
    arrest_frequency: Optional[float] = 0.0
    sanctions_count: Optional[int] = 0
    incentives_count: Optional[int] = 0
    risk_assessment_score: Optional[float] = None
    substance_use_frequency: Optional[str] = None
    trauma_score: Optional[float] = 0.0
    ace_score: Optional[int] = 0
    program_status: Optional[str] = "Active"


class ParticipantUpdate(ParticipantCreate):
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class ParticipantOut(BaseModel):
    id: int
    participant_id: str
    first_name: str
    last_name: str
    age: Optional[int]
    gender: Optional[str]
    race: Optional[str]
    ethnicity: Optional[str]
    marital_status: Optional[str]
    employment_status: Optional[str]
    monthly_income: Optional[float]
    education_level: Optional[str]
    num_dependents: Optional[int]
    housing_status: Optional[str]
    child_support: Optional[bool]
    prior_arrests: Optional[int]
    prior_felonies: Optional[int]
    age_first_arrest: Optional[int]
    arrest_frequency: Optional[float]
    sanctions_count: Optional[int]
    incentives_count: Optional[int]
    risk_assessment_score: Optional[float]
    substance_use_frequency: Optional[str]
    trauma_score: Optional[float]
    ace_score: Optional[int]
    program_status: Optional[str]
    enrollment_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class ParticipantListOut(BaseModel):
    id: int
    participant_id: str
    first_name: str
    last_name: str
    age: Optional[int]
    gender: Optional[str]
    employment_status: Optional[str]
    program_status: Optional[str]
    latest_risk_level: Optional[str] = None
    latest_risk_score: Optional[float] = None
    latest_assessment_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- ASSESSMENT ----
class AssessmentCreate(BaseModel):
    participant_id: int


class SHAPFeature(BaseModel):
    feature: str
    value: Any
    shap_value: float
    direction: str
    description: Optional[str] = None


class InterventionRecommendationOut(BaseModel):
    id: int
    title: str
    why_relevant: Optional[str]
    suggested_action: Optional[str]
    priority: int
    generated_by: str

    class Config:
        from_attributes = True


class AssessmentOut(BaseModel):
    id: int
    participant_id: int
    assessor_id: int
    assessment_date: datetime
    recidivism_probability: Optional[float]
    risk_level: Optional[str]
    model_version: Optional[str]
    model_confidence: Optional[float]
    shap_values: Optional[Dict]
    top_features: Optional[List]
    narrative: Optional[str]
    narrative_generated_by: Optional[str]
    reviewer_decision: Optional[str]
    reviewer_notes: Optional[str]
    reviewed_at: Optional[datetime]
    intervention_recommendations: List[InterventionRecommendationOut] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    decision: str
    notes: Optional[str] = None


# ---- INTERVENTION PLAN ----
class InterventionPlanCreate(BaseModel):
    assessment_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    status: Optional[InterventionStatus] = InterventionStatus.SUGGESTED
    priority: Optional[str] = "Medium"
    assigned_to: Optional[int] = None
    target_date: Optional[datetime] = None
    notes: Optional[str] = None


class InterventionPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[InterventionStatus] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None
    target_date: Optional[datetime] = None
    notes: Optional[str] = None


class InterventionPlanOut(BaseModel):
    id: int
    participant_id: int
    assessment_id: Optional[int]
    title: str
    description: Optional[str]
    status: str
    priority: str
    assigned_to: Optional[int]
    target_date: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---- CASE NOTE ----
class CaseNoteCreate(BaseModel):
    note_type: str = "general"
    content: str


class CaseNoteOut(BaseModel):
    id: int
    participant_id: int
    author_id: int
    note_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- AUDIT LOG ----
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[Dict]
    ip_address: Optional[str]
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


# ---- MODEL PERFORMANCE ----
class ModelPerformanceOut(BaseModel):
    model_name: str
    version: str
    accuracy: Optional[float]
    precision_score: Optional[float]
    recall_score: Optional[float]
    f1_score: Optional[float]
    roc_auc: Optional[float]
    training_samples: Optional[int]
    test_samples: Optional[int]
    feature_count: Optional[int]
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    performance_data: Optional[Dict]

    class Config:
        from_attributes = True


# ---- PAGINATION ----
class PaginatedParticipants(BaseModel):
    items: List[ParticipantListOut]
    total: int
    page: int
    size: int
    pages: int


Token.model_rebuild()
