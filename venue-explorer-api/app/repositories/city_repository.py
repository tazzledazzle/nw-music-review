"""
City repository for database operations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List, Dict, Any
import math

from app.models.orm import City, Venue
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


class CityRepository(BaseRepository[City]):
    """Repository for City entities"""
    
    def __init__(self, db: Session):
        super().__init__(db, City)
    
    async def find_by_name_and_region(
        self, 
        name: str, 
        state_province: str
    ) -> Optional[City]:
        """Find a city by name and state/province"""
        return self.db.query(City).filter(
            City.name == name,
            City.state_province == state_province
        ).first()
    
    async def find_by_state_province(
        self, 
        state_province: str,
        page: int = 1,
        limit: int = 20
    ) -> PaginationResult:
        """Find cities in a state/province with pagination"""
        query = self.db.query(City).filter(City.state_province == state_province)
        
        total = query.count()
        
        cities = query.order_by(City.name).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(cities, total, page, limit)
    
    async def find_by_country(
        self, 
        country: str,
        page: int = 1,
        limit: int = 20
    ) -> PaginationResult:
        """Find cities in a country with pagination"""
        query = self.db.query(City).filter(City.country == country)
        
        total = query.count()
        
        cities = query.order_by(City.state_province, City.name).offset(
            (page - 1) * limit
        ).limit(limit).all()
        
        return PaginationResult(cities, total, page, limit)
    
    async def get_cities_with_venue_count(
        self,
        state_province: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get cities with their venue counts"""
        
        query = self.db.query(
            City,
            func.count(Venue.id).label('venue_count')
        ).outerjoin(Venue)
        
        if state_province:
            query = query.filter(City.state_province == state_province)
        
        cities_with_counts = query.group_by(City.id).order_by(
            func.count(Venue.id).desc(),
            City.name
        ).limit(limit).all()
        
        # Format results
        results = []
        for city, venue_count in cities_with_counts:
            results.append({
                'city': city,
                'venue_count': venue_count
            })
        
        return results
    
    async def search_cities(self, search_term: str, limit: int = 20) -> List[City]:
        """Search cities by name"""
        search_pattern = f"%{search_term}%"
        
        return self.db.query(City).filter(
            City.name.ilike(search_pattern)
        ).order_by(City.name).limit(limit).all()
    
    async def get_regions(self) -> List[Dict[str, Any]]:
        """Get all unique regions (state/provinces) with city counts"""
        regions = self.db.query(
            City.state_province,
            City.country,
            func.count(City.id).label('city_count')
        ).group_by(
            City.state_province,
            City.country
        ).order_by(City.state_province).all()
        
        # Format results
        results = []
        for state_province, country, city_count in regions:
            results.append({
                'state_province': state_province,
                'country': country,
                'city_count': city_count
            })
        
        return results
