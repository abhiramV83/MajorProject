"""
Reports API routes for the Drug Court DSS.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.auth.auth import get_current_user
from app.models.db_models import User

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/summary")
def get_report_summary(current_user: User = Depends(get_current_user)):
    """
    Return a summary suitable for the DSS reporting dashboard.

    This prototype endpoint currently returns demonstration values.
    """

    return {
        "status": "success",
        "prototype": True,
        "message": "Report summary endpoint is available.",
        "data": {
            "total_participants": 1284,
            "total_assessments": 326,
            "high_risk_participants": 187,
            "pending_reviews": 42,
        },
    }


@router.get("/health")
def reports_health():
    return {"status": "healthy", "module": "reports"}
