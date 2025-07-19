"""
Venue API endpoints
"""

from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.error_handler import ErrorHandler
from app.schemas.models import (
    Venue, VenueResponse, PaginatedResponse, 
    Event, PaginationParams, GeoPoint
)
from app.repositories.venue_repository import VenueRepository
from app.repositories.event_repository import EventRepository

router = APIRouter()


@router.get("/venues/{venue_id}", response_model=VenueResponse)
async def get_venue(
    venue_id: int = Path(..., gt=0, description="Venue ID"),
    db: Session = Depends(get_db)
):
    """
    Get detailed venue information
    
    Returns:
    - Venue details with city information
    - Distance (if location context provided)
    - Upcoming events count
    """
    venue_repo = VenueRepository(db)
    
    # Get venue with city information
    venue = await venue_repo.find_by_id_with_city(venue_id)
    
    if not venue:
        raise ErrorHandler.not_found("Venue", venue_id)
    
    # Get upcoming events count
    event_repo = EventRepository(db)
    upcoming_count = await event_repo.count_upcoming_by_venue(venue_id)
    
    # Convert to response model
    venue_response = VenueResponse.from_orm(venue)
    venue_response.upcoming_events_count = upcoming_count
    
    return venue_response


@router.get("/venues/{venue_id}/events", response_model=PaginatedResponse)
async def get_venue_events(
    venue_id: int = Path(..., gt=0, description="Venue ID"),
    pagination: PaginationParams = Depends(),
    upcoming_only: bool = Query(True, description="Show only upcoming events"),
    db: Session = Depends(get_db)
):
    """
    Get events for a specific venue
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Results per page (default: 10, max: 50)
    - upcoming_only: Filter to upcoming events only (default: true)
    """
    venue_repo = VenueRepository(db)
    event_repo = EventRepository(db)
    
    # Verify venue exists
    venue = await venue_repo.find_by_id(venue_id)
    if not venue:
        raise ErrorHandler.not_found("Venue", venue_id)
    
    # Get events
    if upcoming_only:
        result = await event_repo.find_upcoming_by_venue(
            venue_id, 
            page=pagination.page,
            limit=pagination.limit
        )
    else:
        result = await event_repo.find_by_venue(
            venue_id,
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


@router.get("/venues/nearby", response_model=List[VenueResponse])
async def get_nearby_venues(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"), 
    radius: float = Query(10, gt=0, le=100, description="Search radius in kilometers"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    min_capacity: Optional[int] = Query(None, ge=0, description="Minimum venue capacity"),
    db: Session = Depends(get_db)
):
    """
    Find venues near a geographic location
    
    Query Parameters:
    - lat: Latitude coordinate (required)
    - lon: Longitude coordinate (required)
    - radius: Search radius in kilometers (default: 10km, max: 100km)
    - limit: Maximum number of results (default: 20, max: 50)
    - min_capacity: Minimum venue capacity filter
    """
    venue_repo = VenueRepository(db)
    
    point = GeoPoint(x=lon, y=lat)
    
    venues = await venue_repo.find_nearby(
        point=point,
        radius_km=radius,
        limit=limit,
        min_capacity=min_capacity
    )
    
    # Convert to response models with distance
    response_venues = []
    for venue in venues:
        venue_response = VenueResponse.from_orm(venue)
        if hasattr(venue, 'distance_km'):
            venue_response.distance_km = venue.distance_km
        response_venues.append(venue_response)
    
    return response_venues
