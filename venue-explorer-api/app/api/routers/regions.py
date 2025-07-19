"""
Regions API endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.schemas.models import City, PaginatedResponse, PaginationParams
from app.repositories.region_repository import RegionRepository

router = APIRouter()


@router.get("/regions", response_model=List[dict])
async def get_regions(db: Session = Depends(get_db)):
    """Get all regions"""
    region_repo = RegionRepository(db)
    regions = await region_repo.find_all()
    return regions


@router.get("/regions/{region}/cities", response_model=PaginatedResponse)
async def get_region_cities(
    region: str,
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db)
):
    """Get cities in a specific region"""
    region_repo = RegionRepository(db)
    
    result = await region_repo.find_cities_by_region(
        region,
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
