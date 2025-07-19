"""
Pydantic models for request/response schemas
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class GeoPoint(BaseModel):
    """Geographic coordinate point"""
    x: float = Field(..., description="Longitude")
    y: float = Field(..., description="Latitude")


class BaseEntity(BaseModel):
    """Base entity with common fields"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class City(BaseEntity):
    """City model"""
    name: str
    state_province: str
    country: str
    coordinates: GeoPoint


class Venue(BaseEntity):
    """Venue model"""
    name: str
    city_id: int
    address: Optional[str] = None
    coordinates: GeoPoint
    capacity: Optional[int] = None
    website: Optional[str] = None
    prosper_rank: int = 0
    
    # Related data
    city: Optional[City] = None


class Artist(BaseEntity):
    """Artist model"""
    name: str
    genres: List[str] = []
    photo_url: Optional[str] = None
    profile_bio: Optional[str] = None


class Event(BaseEntity):
    """Event model"""
    venue_id: int
    title: str
    description: Optional[str] = None
    event_datetime: datetime
    ticket_url: Optional[str] = None
    external_id: Optional[str] = None
    
    # Related data
    venue: Optional[Venue] = None
    artists: List[Artist] = []


class Media(BaseEntity):
    """Media model"""
    artist_id: int
    type: str = Field(..., pattern="^(photo|video)$")
    url: str


class UserFavorite(BaseModel):
    """User favorite model"""
    user_id: int
    entity_type: str = Field(..., pattern="^(venue|artist)$")
    entity_id: int
    created_at: datetime


# Request/Response schemas

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(10, ge=1, le=50, description="Items per page")


class SortParams(BaseModel):
    """Sorting parameters"""
    sort_by: Optional[str] = None
    sort_dir: str = Field("desc", pattern="^(asc|desc)$")


class SearchParams(PaginationParams, SortParams):
    """Search parameters"""
    q: str = Field(..., min_length=1, description="Search query")
    type: str = Field("all", pattern="^(venue|artist|event|all)$")
    genres: Optional[List[str]] = None
    state_province: Optional[List[str]] = None
    country: Optional[List[str]] = None
    capacity_min: Optional[int] = Field(None, ge=0)
    capacity_max: Optional[int] = Field(None, ge=0)
    prosper_rank_min: Optional[int] = Field(None, ge=0)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    has_tickets: Optional[bool] = None
    has_bio: Optional[bool] = None
    has_photo: Optional[bool] = None


class NearbySearchParams(BaseModel):
    """Nearby search parameters"""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lon: float = Field(..., ge=-180, le=180, description="Longitude")
    radius: float = Field(10, gt=0, le=100, description="Search radius in kilometers")
    limit: int = Field(20, ge=1, le=50, description="Maximum results")


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    data: List[Any]
    pagination: Dict[str, Any]
    total: int


class VenueResponse(Venue):
    """Venue response with additional fields"""
    distance_km: Optional[float] = None
    upcoming_events_count: Optional[int] = None


class ArtistResponse(Artist):
    """Artist response with additional fields"""
    upcoming_events_count: Optional[int] = None
    media_count: Optional[int] = None


class EventResponse(Event):
    """Event response with additional fields"""
    days_until_event: Optional[int] = None


class SearchResultItem(BaseModel):
    """Individual search result item"""
    type: str  # venue, artist, or event
    id: int
    name: str
    description: Optional[str] = None
    score: float
    data: Union[VenueResponse, ArtistResponse, EventResponse]


class SearchResponse(BaseModel):
    """Search response"""
    query: str
    total: int
    results: List[SearchResultItem]
    aggregations: Dict[str, Any] = {}
    pagination: Dict[str, Any]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: datetime
    request_id: str
    health: Dict[str, Any]
    performance: Dict[str, Any]


class ErrorResponse(BaseModel):
    """Error response"""
    error: Dict[str, Any]


# User-related schemas

class UserCreate(BaseModel):
    """User creation request"""
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    password: str = Field(..., min_length=8)
    name: Optional[str] = None


class UserLogin(BaseModel):
    """User login request"""
    email: str
    password: str


class UserResponse(BaseModel):
    """User response"""
    id: int
    email: str
    name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class FavoriteRequest(BaseModel):
    """Add favorite request"""
    entity_type: str = Field(..., pattern="^(venue|artist)$")
    entity_id: int = Field(..., gt=0)
