"""
Event repository for database operations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, or_
from typing import Optional, List, Dict, Any
from datetime import datetime
import math

from app.models.orm import Event, EventArtist, Venue, City, Artist
from app.repositories.base_repository import BaseRepository


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


class EventRepository(BaseRepository[Event]):
    """Repository for Event entities"""
    
    def __init__(self, db: Session):
        super().__init__(db, Event)
    
    async def find_by_id_with_details(self, event_id: int) -> Optional[Event]:
        """Find an event with venue, city, and artist details"""
        return self.db.query(Event).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(Event.id == event_id).first()
    
    async def count_upcoming_by_venue(self, venue_id: int) -> int:
        """Count upcoming events for a venue"""
        return self.db.query(Event).filter(
            and_(
                Event.venue_id == venue_id,
                Event.event_datetime >= datetime.utcnow()
            )
        ).count()
    
    async def count_upcoming_by_artist(self, artist_id: int) -> int:
        """Count upcoming events for an artist"""
        return self.db.query(Event).join(EventArtist).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime >= datetime.utcnow()
            )
        ).count()
    
    async def find_upcoming_by_venue(
        self, 
        venue_id: int, 
        page: int = 1, 
        limit: int = 10
    ) -> PaginationResult:
        """Find upcoming events for a venue with pagination"""
        query = self.db.query(Event).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(
            and_(
                Event.venue_id == venue_id,
                Event.event_datetime >= datetime.utcnow()
            )
        )
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_by_venue(
        self, 
        venue_id: int, 
        page: int = 1, 
        limit: int = 10
    ) -> PaginationResult:
        """Find all events for a venue with pagination"""
        query = self.db.query(Event).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(Event.venue_id == venue_id)
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.desc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_upcoming_by_artist(
        self, 
        artist_id: int, 
        page: int = 1, 
        limit: int = 10
    ) -> PaginationResult:
        """Find upcoming events for an artist with pagination"""
        query = self.db.query(Event).join(EventArtist).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(
            and_(
                EventArtist.artist_id == artist_id,
                Event.event_datetime >= datetime.utcnow()
            )
        )
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_by_artist(
        self, 
        artist_id: int, 
        page: int = 1, 
        limit: int = 10
    ) -> PaginationResult:
        """Find all events for an artist with pagination"""
        query = self.db.query(Event).join(EventArtist).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(EventArtist.artist_id == artist_id)
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.desc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_upcoming_events(
        self,
        page: int = 1,
        limit: int = 20,
        city_id: Optional[int] = None,
        state_province: Optional[str] = None,
        genre: Optional[str] = None
    ) -> PaginationResult:
        """Find upcoming events with optional filters"""
        query = self.db.query(Event).join(Venue).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(Event.event_datetime >= datetime.utcnow())
        
        # Apply filters
        if city_id:
            query = query.filter(Venue.city_id == city_id)
        
        if state_province:
            query = query.join(City).filter(City.state_province == state_province)
        
        if genre:
            query = query.join(EventArtist).join(Artist).filter(
                Artist.genres.op("&&")(func.array([genre]))
            )
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def find_events_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        page: int = 1,
        limit: int = 20
    ) -> PaginationResult:
        """Find events within a date range"""
        query = self.db.query(Event).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(
            and_(
                Event.event_datetime >= start_date,
                Event.event_datetime <= end_date
            )
        )
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
    
    async def search_events(
        self,
        search_term: str,
        page: int = 1,
        limit: int = 20
    ) -> PaginationResult:
        """Search events by title, description, or artist name"""
        search_pattern = f"%{search_term}%"
        
        query = self.db.query(Event).join(EventArtist).join(Artist).options(
            joinedload(Event.venue).joinedload(Venue.city),
            joinedload(Event.artist_associations).joinedload(EventArtist.artist)
        ).filter(
            or_(
                Event.title.ilike(search_pattern),
                Event.description.ilike(search_pattern),
                Artist.name.ilike(search_pattern)
            )
        )
        
        total = query.count()
        
        events = query.order_by(Event.event_datetime.asc()).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(events, total, page, limit)
