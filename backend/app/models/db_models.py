import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Enum as SAEnum,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database.connection import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    JUDGE = "JUDGE"
    CASE_MANAGER = "CASE_MANAGER"
    TREATMENT_PROVIDER = "TREATMENT_PROVIDER"
    PROBATION_OFFICER = "PROBATION_OFFICER"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class InterventionStatus(str, enum.Enum):
    SUGGESTED = "SUGGESTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.CASE_MANAGER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessments = relationship(
        "Assessment", back_populates="assessor", foreign_keys="Assessment.assessor_id"
    )
    case_notes = relationship("CaseNote", back_populates="author")
    audit_logs = relationship("AuditLog", back_populates="user")


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(String(20), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)

    # Demographics (kept for display; excluded from model training)
    age = Column(Integer)
    gender = Column(String(50))
    race = Column(String(100))
    ethnicity = Column(String(100))
    marital_status = Column(String(50))

    # Socioeconomic
    employment_status = Column(String(50))
    monthly_income = Column(Float)
    education_level = Column(String(50))
    num_dependents = Column(Integer, default=0)
    housing_status = Column(String(50))
    child_support = Column(Boolean, default=False)

    # Criminal history
    prior_arrests = Column(Integer, default=0)
    prior_felonies = Column(Integer, default=0)
    age_first_arrest = Column(Integer)
    arrest_frequency = Column(Float, default=0.0)

    # Program metrics
    sanctions_count = Column(Integer, default=0)
    incentives_count = Column(Integer, default=0)
    risk_assessment_score = Column(Float)

    # Behavioral indicators
    substance_use_frequency = Column(String(50))
    trauma_score = Column(Float, default=0.0)
    ace_score = Column(Integer, default=0)

    # Status
    program_status = Column(String(50), default="Active")
    enrollment_date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessments = relationship("Assessment", back_populates="participant")
    case_notes = relationship("CaseNote", back_populates="participant")
    intervention_plans = relationship("InterventionPlan", back_populates="participant")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    assessor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessment_date = Column(DateTime, default=datetime.utcnow)

    # Prediction results
    recidivism_probability = Column(Float)
    risk_level = Column(SAEnum(RiskLevel))
    model_version = Column(String(50), default="random_forest_v1")
    model_confidence = Column(Float)

    # SHAP stored as JSON
    shap_values = Column(JSON)
    top_features = Column(JSON)

    # GenAI narrative
    narrative = Column(Text)
    narrative_generated_by = Column(String(50), default="rule_based")

    # Professional review
    reviewer_decision = Column(String(100))
    reviewer_notes = Column(Text)
    reviewed_at = Column(DateTime)
    reviewed_by = Column(Integer, ForeignKey("users.id"))

    created_at = Column(DateTime, default=datetime.utcnow)

    participant = relationship("Participant", back_populates="assessments")
    assessor = relationship(
        "User", back_populates="assessments", foreign_keys=[assessor_id]
    )
    intervention_recommendations = relationship(
        "InterventionRecommendation", back_populates="assessment"
    )


class InterventionRecommendation(Base):
    __tablename__ = "intervention_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    title = Column(String(200), nullable=False)
    why_relevant = Column(Text)
    suggested_action = Column(Text)
    priority = Column(Integer, default=1)
    generated_by = Column(String(50), default="rule_based")
    created_at = Column(DateTime, default=datetime.utcnow)

    assessment = relationship(
        "Assessment", back_populates="intervention_recommendations"
    )


class InterventionPlan(Base):
    __tablename__ = "intervention_plans"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    assessment_id = Column(Integer, ForeignKey("assessments.id"))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(SAEnum(InterventionStatus), default=InterventionStatus.SUGGESTED)
    priority = Column(String(20), default="Medium")
    assigned_to = Column(Integer, ForeignKey("users.id"))
    target_date = Column(DateTime)
    notes = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    participant = relationship("Participant", back_populates="intervention_plans")


class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_type = Column(String(50), default="general")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    participant = relationship("Participant", back_populates="case_notes")
    author = relationship("User", back_populates="case_notes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(200), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(100))
    details = Column(JSON)
    ip_address = Column(String(45))
    status = Column(String(20), default="success")
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    accuracy = Column(Float)
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    roc_auc = Column(Float)
    training_samples = Column(Integer)
    test_samples = Column(Integer)
    feature_count = Column(Integer)
    notes = Column(Text)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    performance_data = Column(JSON)
