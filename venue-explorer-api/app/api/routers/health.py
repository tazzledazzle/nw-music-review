"""
Health check API endpoints
"""

from fastapi import APIRouter, Request
from datetime import datetime
import uuid

from app.core.monitoring import HealthMonitor, PerformanceMonitor
from app.schemas.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request):
    """
    Health check endpoint
    
    Returns comprehensive system health information including:
    - Overall system status
    - Component health (database, elasticsearch)
    - Performance metrics
    - Request tracking information
    """
    request_id = str(uuid.uuid4())
    
    # Get comprehensive system health
    system_health = await HealthMonitor.get_system_health()
    
    # Get performance metrics for this endpoint
    avg_response_time = PerformanceMonitor.get_average_response_time("/api/health")
    
    return HealthResponse(
        status="ok" if system_health["status"] == "healthy" else system_health["status"],
        timestamp=datetime.now(),
        request_id=request_id,
        health=system_health,
        performance={
            "average_response_time": avg_response_time
        }
    )
