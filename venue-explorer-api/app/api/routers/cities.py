"""
Cities API endpoints
"""

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.error_handler import ErrorHandler
from app.schemas.models import City, PaginatedResponse, PaginationParams
from app.repositories.city_repository import CityRepository
from app.repositories.venue_repository import VenueRepository

router = APIRouter()


@router.get("/cities/{city_id}/venues", response_model=PaginatedResponse)
async def get_city_venues(
    city_id: int = Path(..., gt=0, description="City ID"),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """Get venues in a specific city"""
    city_repo = CityRepository(db)
    venue_repo = VenueRepository(db)
    
    # Verify city exists
    city = await city_repo.find_by_id(city_id)
    if not city:
        raise ErrorHandler.not_found("City", city_id)
    
    # Get venues
    result = await venue_repo.find_by_city(
        city_id,
        page=pagination.page,
        limit=pagination.limit
    )
    
    return PaginatedResponse(
        data=result.data,
        pagination={
            "page": pagination.page,
            "limit": pagination.limit,
            "total_pages": result.total_pages,
            "has_next": result.has_next,
            "has_prev": result.has_prev
        },
        total=result.total
    )
