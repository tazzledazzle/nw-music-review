"""
Artist repository for database operations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, or_, text
from typing import Optional, List, Dict, Any
from datetime import datetime
import math

from app.models.orm import Artist, Media, Event, EventArtist, Venue, City
from app.schemas.models import PaginatedResponse


class PaginationResult:
    """Helper class for pagination results"""
    def __init__(self, data: List[Any], total: int, page: int, limit: int):
        self.data = data
        self.total = total
        self.page = page
        self.limit = limit
        self.total_pages = math.ceil(total / limit) if limit > 0 else 0
        self.has_next = page < self.total_pages
        self.has_prev = page > 1


class ArtistRepository:
    """Repository for Artist entities with comprehensive database operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def find_by_id(self, artist_id: int) -> Optional[Artist]:
        """Find an artist by ID"""
        return self.db.query(Artist).filter(Artist.id == artist_id).first()
    
    async def find_by_name(self, name: str) -> Optional[Artist]:
        """Find an artist by name (case-insensitive)"""
        return self.db.query(Artist).filter(
            func.lower(Artist.name) == func.lower(name)
        ).first()
    
    async def find_by_id_with_media(self, artist_id: int) -> Optional[Artist]:
        """Find an artist with their media loaded"""
        return self.db.query(Artist).options(
            joinedload(Artist.media)
        ).filter(Artist.id == artist_id).first()
    
    async def search_by_name_or_genre(self, search_term: str, limit: int = 20) -> List[Artist]:
        """
        Search artists by name or genre with intelligent ranking
        
        Ranking logic:
        1. Exact name matches first
        2. Names starting with search term
        3. Names containing search term
        4. Genre matches
        """
        # Build the search query with ranking
        search_pattern = f"%{search_term}%"
        starts_with_pattern = f"{search_term}%"
        
        # Create ranking case expression
        ranking_case = func.case(
            (func.lower(Artist.name) == func.lower(search_term), 1),
            (func.lower(Artist.name).like(func.lower(starts_with_pattern)), 2),
            (func.lower(Artist.name).like(func.lower(search_pattern)), 3),
            (Artist.genres.op("&&")(func.array([search_term])), 4),
            else_=5
        )
        
        return self.db.query(Artist).filter(
            or_(
                Artist.name.ilike(search_pattern),
                Artist.genres.op("&&")(func.array([search_term]))
            )
        ).order_by(ranking_case, Artist.name).limit(limit).all()
    
    async def find_upcoming_events(
        self, 
        artist_id: int, 
        page: int = 1, 
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> PaginationResult:
        """Find upcoming events for an artist with pagination and optional date filtering"""
        
        # Base query for upcoming events
        query = self.db.query(Event).join(EventArtist).options(
            joinedload(Event.venue).joinedload(Venue.city)
        ).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime >= datetime.utcnow()
            )
        )
        
        # Add date filtering if provided
        if start_date:
            query = query.filter(Event.event_datetime >= start_date)
        
        if end_date:
            query = query.filter(Event.event_datetime <= end_date)
        
        # Get total count for pagination
        total = query.count()
        
        # Apply pagination and ordering
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_all_events(
        self,
        artist_id: int,
        page: int = 1,
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> PaginationResult:
        """Find all events for an artist (including past) with pagination"""
        
        # Base query for all events
        query = self.db.query(Event).join(EventArtist).options(
            joinedload(Event.venue).joinedload(Venue.city)
        ).filter(EventArtist.artist_id == artist_id)
        
        # Add date filtering if provided
        if start_date:
            query = query.filter(Event.event_datetime >= start_date)
        
        if end_date:
            query = query.filter(Event.event_datetime <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering (most recent first)
        events = query.order_by(Event.event_datetime.desc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_media(
        self, 
        artist_id: int, 
        media_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Media]:
        """Find media for an artist with optional type filtering"""
        
        query = self.db.query(Media).filter(Media.artist_id == artist_id)
        
        if media_type:
            query = query.filter(Media.type == media_type)
        
        return query.order_by(Media.created_at.desc()).limit(limit).all()
    
    async def count_upcoming_events(self, artist_id: int) -> int:
        """Count upcoming events for an artist"""
        return self.db.query(Event).join(EventArtist).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime >= datetime.utcnow()
            )
        ).count()
    
    async def count_media(self, artist_id: int, media_type: Optional[str] = None) -> int:
        """Count media items for an artist"""
        query = self.db.query(Media).filter(Media.artist_id == artist_id)
        
        if media_type:
            query = query.filter(Media.type == media_type)
        
        return query.count()
    
    async def find_by_genre(self, genre: str, limit: int = 20) -> List[Artist]:
        """Find artists by genre"""
        return self.db.query(Artist).filter(
            Artist.genres.op("&&")(func.array([genre]))
        ).order_by(Artist.name).limit(limit).all()
    
    async def find_artists_with_upcoming_shows(
        self,
        city_id: Optional[int] = None,
        state_province: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Find artists who have upcoming shows, optionally filtered by location
        Returns artists with their next show information
        """
        
        # Build the base query
        query = self.db.query(
            Artist,
            func.min(Event.event_datetime).label('next_show_date'),
            func.count(Event.id).label('upcoming_shows_count')
        ).join(EventArtist).join(Event).join(Venue)
        
        # Filter for upcoming events only
        query = query.filter(Event.event_datetime >= datetime.utcnow())
        
        # Add location filters if provided
        if city_id:
            query = query.filter(Venue.city_id == city_id)
        
        if state_province:
            query = query.join(City).filter(City.state_province == state_province)
        
        # Group by artist and order by next show date
        artists_with_shows = query.group_by(Artist.id).order_by(
            func.min(Event.event_datetime)
        ).limit(limit).all()
        
        # Format results
        results = []
        for artist, next_show_date, upcoming_count in artists_with_shows:
            results.append({
                'artist': artist,
                'next_show_date': next_show_date,
                'upcoming_shows_count': upcoming_count
            })
        
        return results
    
    async def get_artist_stats(self, artist_id: int) -> Dict[str, Any]:
        """Get comprehensive statistics for an artist"""
        
        # Get basic counts
        total_events = self.db.query(Event).join(EventArtist).filter(
            EventArtist.artist_id == artist_id
        ).count()
        
        upcoming_events = await self.count_upcoming_events(artist_id)
        total_media = await self.count_media(artist_id)
        photo_count = await self.count_media(artist_id, 'photo')
        video_count = await self.count_media(artist_id, 'video')
        
        # Get venue statistics
        venue_stats = self.db.query(
            func.count(func.distinct(Venue.id)).label('unique_venues'),
            func.count(func.distinct(City.id)).label('unique_cities'),
            func.count(func.distinct(City.state_province)).label('unique_regions')
        ).select_from(Event).join(EventArtist).join(Venue).join(City).filter(
            EventArtist.artist_id == artist_id
        ).first()
        
        # Get last and next show dates
        last_show = self.db.query(func.max(Event.event_datetime)).join(EventArtist).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime < datetime.utcnow()
            )
        ).scalar()
        
        next_show = self.db.query(func.min(Event.event_datetime)).join(EventArtist).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime >= datetime.utcnow()
            )
        ).scalar()
        
        return {
            'total_events': total_events,
            'upcoming_events': upcoming_events,
            'past_events': total_events - upcoming_events,
            'total_media': total_media,
            'photo_count': photo_count,
            'video_count': video_count,
            'unique_venues': venue_stats.unique_venues or 0,
            'unique_cities': venue_stats.unique_cities or 0,
            'unique_regions': venue_stats.unique_regions or 0,
            'last_show_date': last_show,
            'next_show_date': next_show
        }
    
    async def create_artist(self, name: str, genres: List[str] = None, **kwargs) -> Artist:
        """Create a new artist"""
        artist = Artist(
            name=name,
            genres=genres or [],
            **kwargs
        )
        self.db.add(artist)
        self.db.commit()
        self.db.refresh(artist)
        return artist
    
    async def update_artist(self, artist_id: int, **kwargs) -> Optional[Artist]:
        """Update an artist"""
        artist = await self.find_by_id(artist_id)
        if not artist:
            return None
        
        for key, value in kwargs.items():
            if hasattr(artist, key):
                setattr(artist, key, value)
        
        self.db.commit()
        self.db.refresh(artist)
        return artist
    
    async def delete_artist(self, artist_id: int) -> bool:
        """Delete an artist"""
        artist = await self.find_by_id(artist_id)
        if not artist:
            return False
        
        self.db.delete(artist)
        self.db.commit()
        return True
