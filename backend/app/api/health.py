"""Health check endpoints"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy"}


@router.get("/health/ready")
async def readiness_check():
    """Readiness check - verifies core dependencies are available"""
    checks = {
        "parselmouth": False,
    }

    try:
        import parselmouth
        checks["parselmouth"] = True
    except ImportError:
        pass

    all_ready = all(checks.values())
    return {
        "status": "ready" if all_ready else "not_ready",
        "checks": checks,
    }
