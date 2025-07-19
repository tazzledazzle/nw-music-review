"""
Search API endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.schemas.models import SearchParams, SearchResponse, NearbySearchParams
from app.services.search_service import SearchService

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    type: str = Query("all", pattern="^(venue|artist|event|all)$", description="Content type filter"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=50, description="Results per page"),
    genres: Optional[str] = Query(None, description="Comma-separated genres"),
    state_province: Optional[str] = Query(None, description="Comma-separated states/provinces"),
    country: Optional[str] = Query(None, description="Comma-separated countries"),
    capacity_min: Optional[int] = Query(None, ge=0, description="Minimum venue capacity"),
    capacity_max: Optional[int] = Query(None, ge=0, description="Maximum venue capacity"),
    prosper_rank_min: Optional[int] = Query(None, ge=0, description="Minimum prosper rank"),
    start_date: Optional[str] = Query(None, description="Start date filter (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date filter (ISO format)"),
    has_tickets: Optional[bool] = Query(None, description="Filter events with tickets"),
    has_bio: Optional[bool] = Query(None, description="Filter artists with bios"),
    has_photo: Optional[bool] = Query(None, description="Filter artists with photos"),
    sort_by: Optional[str] = Query(None, description="Sort field"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    db: Session = Depends(get_db)
):
    """
    Universal search endpoint
    
    Searches across venues, artists, and events with comprehensive filtering
    and categorization capabilities.
    
    Query Parameters:
    - q: Search query string (required)
    - type: Content type filter (venue|artist|event|all, default: all)
    - page: Page number for pagination (default: 1)
    - limit: Results per page (max 50, default: 10)
    - genres: Comma-separated list of genres to filter by
    - state_province: Comma-separated list of states/provinces
    - country: Comma-separated list of countries
    - capacity_min: Minimum venue capacity
    - capacity_max: Maximum venue capacity
    - prosper_rank_min: Minimum prosper rank for venues
    - start_date: Start date for event filtering (ISO string)
    - end_date: End date for event filtering (ISO string)
    - has_tickets: Filter events with ticket links
    - has_bio: Filter artists with bios
    - has_photo: Filter artists with photos
    - sort_by: Field to sort by
    - sort_dir: Sort direction (asc|desc, default: desc)
    
    Returns:
    - Categorized search results with scores
    - Aggregations for faceted search
    - Pagination information
    """
    
    # Parse comma-separated parameters
    genres_list = genres.split(',') if genres else None
    state_province_list = state_province.split(',') if state_province else None
    country_list = country.split(',') if country else None
    
    # Parse dates
    start_date_parsed = None
    end_date_parsed = None
    if start_date:
        from datetime import datetime
        start_date_parsed = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        from datetime import datetime
        end_date_parsed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    # Create search parameters
    search_params = SearchParams(
        q=q,
        type=type,
        page=page,
        limit=limit,
        genres=genres_list,
        state_province=state_province_list,
        country=country_list,
        capacity_min=capacity_min,
        capacity_max=capacity_max,
        prosper_rank_min=prosper_rank_min,
        start_date=start_date_parsed,
        end_date=end_date_parsed,
        has_tickets=has_tickets,
        has_bio=has_bio,
        has_photo=has_photo,
        sort_by=sort_by,
        sort_dir=sort_dir
    )
    
    # Perform search
    search_service = SearchService(db)
    results = await search_service.search(search_params)
    
    return results


@router.get("/search/nearby", response_model=SearchResponse)
async def search_nearby(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius: float = Query(10, gt=0, le=100, description="Search radius in kilometers"),
    q: Optional[str] = Query(None, description="Optional search query"),
    type: str = Query("all", pattern="^(venue|artist|event|all)$", description="Content type filter"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    Geographic proximity search
    
    Find venues, artists, and events near a specific location.
    
    Query Parameters:
    - lat: Latitude coordinate (required)
    - lon: Longitude coordinate (required) 
    - radius: Search radius in kilometers (default: 10km, max: 100km)
    - q: Optional text search query
    - type: Content type filter (venue|artist|event|all, default: all)
    - limit: Maximum results (default: 20, max: 50)
    
    Returns:
    - Location-based search results sorted by distance
    - Distance information for each result
    """
    
    nearby_params = NearbySearchParams(
        lat=lat,
        lon=lon, 
        radius=radius,
        limit=limit
    )
    
    # Perform nearby search
    search_service = SearchService(db)
    results = await search_service.search_nearby(nearby_params, query=q, content_type=type)
    
    return results
