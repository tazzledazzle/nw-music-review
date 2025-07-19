"""
Artist API endpoints
"""

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.error_handler import ErrorHandler
from app.schemas.models import (
    ArtistResponse, PaginatedResponse, 
    Event, Media, PaginationParams
)
from app.repositories.artist_repository import ArtistRepository
from app.repositories.event_repository import EventRepository
from app.repositories.media_repository import MediaRepository

router = APIRouter()


@router.get("/artists/{artist_id}", response_model=ArtistResponse)
async def get_artist(
    artist_id: int = Path(..., gt=0, description="Artist ID"),
    db: Session = Depends(get_db)
):
    """
    Get detailed artist information
    
    Returns:
    - Artist details with bio and photo
    - Upcoming events count
    - Media count
    """
    artist_repo = ArtistRepository(db)
    
    artist = await artist_repo.find_by_id(artist_id)
    
    if not artist:
        raise ErrorHandler.not_found("Artist", artist_id)
    
    # Get additional counts
    event_repo = EventRepository(db)
    media_repo = MediaRepository(db)
    
    upcoming_count = await event_repo.count_upcoming_by_artist(artist_id)
    media_count = await media_repo.count_by_artist(artist_id)
    
    # Convert to response model
    artist_response = ArtistResponse.from_orm(artist)
    artist_response.upcoming_events_count = upcoming_count
    artist_response.media_count = media_count
    
    return artist_response


@router.get("/artists/{artist_id}/events", response_model=PaginatedResponse)
async def get_artist_events(
    artist_id: int = Path(..., gt=0, description="Artist ID"),
    pagination: PaginationParams = Depends(),
    upcoming_only: bool = Query(True, description="Show only upcoming events"),
    db: Session = Depends(get_db)
):
    """
    Get events for a specific artist
    
    Query Parameters:
    - page: Page number (default: 1)
    - limit: Results per page (default: 10, max: 50)
    - upcoming_only: Filter to upcoming events only (default: true)
    """
    artist_repo = ArtistRepository(db)
    event_repo = EventRepository(db)
    
    # Verify artist exists
    artist = await artist_repo.find_by_id(artist_id)
    if not artist:
        raise ErrorHandler.not_found("Artist", artist_id)
    
    # Get events
    if upcoming_only:
        result = await event_repo.find_upcoming_by_artist(
            artist_id,
            page=pagination.page,
            limit=pagination.limit
        )
    else:
        result = await event_repo.find_by_artist(
            artist_id,
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


@router.get("/artists/{artist_id}/media", response_model=List[Media])
async def get_artist_media(
    artist_id: int = Path(..., gt=0, description="Artist ID"),
    media_type: Optional[str] = Query(None, pattern="^(photo|video)$", description="Media type filter"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Get media for a specific artist
    
    Query Parameters:
    - media_type: Filter by media type (photo|video)
    - limit: Maximum results (default: 20, max: 50)
    """
    artist_repo = ArtistRepository(db)
    media_repo = MediaRepository(db)
    
    # Verify artist exists
    artist = await artist_repo.find_by_id(artist_id)
    if not artist:
        raise ErrorHandler.not_found("Artist", artist_id)
    
    # Get media
    media = await media_repo.find_by_artist(
        artist_id,
        media_type=media_type,
        limit=limit
    )
    
    return media
