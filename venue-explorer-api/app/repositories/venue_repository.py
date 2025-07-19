"""
Venue repository for database operations
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.schemas.models import Venue, GeoPoint


class VenueRepository:
    def __init__(self, db: Session):
        self.db = db

    async def find_by_id(self, venue_id: int) -> Optional[Venue]:
        """Find venue by ID"""
        return self.db.query(Venue).filter(Venue.id == venue_id).first()

    async def find_by_id_with_city(self, venue_id: int) -> Optional[Venue]:
        """Find venue by ID with city information"""
        # Implement join with city table if needed
        return self.db.query(Venue).filter(Venue.id == venue_id).first()

    async def find_nearby(
        self, 
        point: GeoPoint, 
        radius_km: float, 
        limit: int, 
        min_capacity: Optional[int] = None
    ) -> List[Venue]:
        """Find venues near a geographic point"""
        query = self.db.query(Venue)
        
        if min_capacity is not None:
            query = query.filter(Venue.capacity >= min_capacity)
        
        # Add distance calculation and filtering logic here
        # For now, return limited results
        return query.limit(limit).all()
    
    async def find_by_city(
        self, 
        city_id: int, 
        page: int = 1, 
        limit: int = 10
    ) -> List[Venue]:
        """Find venues in a specific city with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.city_id == city_id)
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_city(self, city_id: int) -> int:
        """Count venues in a specific city"""
        return self.db.query(func.count(Venue.id)).filter(Venue.city_id == city_id).scalar()
    
    async def count_nearby(
        self, 
        point: GeoPoint, 
        radius_km: float, 
        min_capacity: Optional[int] = None
    ) -> int:
        """Count venues near a geographic point"""
        query = self.db.query(func.count(Venue.id))
        
        if min_capacity is not None:
            query = query.filter(Venue.capacity >= min_capacity)
        
        # Add distance calculation and filtering logic here
        return query.scalar()

    async def find_by_state_province(
        self, 
        state_province: str,
        page: int = 1, 
        limit: int = 10
    ) -> List[Venue]:
        """Find venues in a specific state/province with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.state_province == state_province)
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_state_province(self, state_province: str) -> int:
        """Count venues in a specific state/province"""
        return self.db.query(func.count(Venue.id)).filter(Venue.state_province == state_province).scalar()

    async def find_by_country(
        self, 
        country: str,
        page: int = 1, 
        limit: int = 10
    ) -> List[Venue]:
        """Find venues in a specific country with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.country == country)
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_country(self, country: str) -> int:
        """Count venues in a specific country"""
        return self.db.query(func.count(Venue.id)).filter(Venue.country == country).scalar()
    
    async def find_by_genre(
        self,
        genre: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by genre with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.genres.any(name=genre))
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_genre(self, genre: str) -> int:
        """Count venues by genre"""
        return self.db.query(func.count(Venue.id)).filter(Venue.genres.any(name=genre)).scalar()

    async def find_by_name(
        self, 
        name: str,
        page: int = 1, 
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by name with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.name.ilike(f"%{name}%"))
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_name(self, name: str) -> int:
        """Count venues by name"""
        return self.db.query(func.count(Venue.id)).filter(Venue.name.ilike(f"%{name}%")).scalar()

    async def find_by_capacity(
        self, 
        min_capacity: int,
        page: int = 1, 
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by minimum capacity with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.capacity >= min_capacity)
            .offset(offset)
            .limit(limit)
            .all()
        )
    
    async def count_by_capacity(self, min_capacity: int) -> int:
        """Count venues by minimum capacity"""
        return self.db.query(func.count(Venue.id)).filter(Venue.capacity >= min_capacity).scalar()

    async def find_by_city_and_genre(
        self, 
        city_id: int,
        genre: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by city and genre with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.city_id == city_id, Venue.genres.any(name=genre))
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_city_and_genre(self, city_id: int, genre: str) -> int:
        """Count venues by city and genre"""
        return self.db.query(func.count(Venue.id)).filter(Venue.city_id == city_id, Venue.genres.any(name=genre)).scalar()
    
    async def find_by_city_and_state_province(
        self,
        city_id: int,
        state_province: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by city and state/province with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.city_id == city_id, Venue.state_province == state_province)
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_city_and_state_province(self, city_id: int, state_province: str) -> int:
        """Count venues by city and state/province"""
        return self.db.query(func.count(Venue.id)).filter(Venue.city_id == city_id, Venue.state_province == state_province).scalar()
    
    async def find_by_city_and_country(
        self,
        city_id: int,
        country: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by city and country with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.city_id == city_id, Venue.country == country)
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_city_and_country(self, city_id: int, country: str) -> int:
        """Count venues by city and country"""
        return self.db.query(func.count(Venue.id)).filter(Venue.city_id == city_id, Venue.country == country).scalar()

    async def find_by_state_province_and_genre(
        self,
        state_province: str,
        genre: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by state/province and genre with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.state_province == state_province, Venue.genres.any(name=genre))
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_state_province_and_genre(self, state_province: str, genre: str) -> int:
        """Count venues by state/province and genre"""
        return self.db.query(func.count(Venue.id)).filter(Venue.state_province == state_province, Venue.genres.any(name=genre)).scalar()

    async def find_by_country_and_genre(
        self,
        country: str,
        genre: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by country and genre with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.country == country, Venue.genres.any(name=genre))
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_country_and_genre(self, country: str, genre: str) -> int:
        """Count venues by country and genre"""
        return self.db.query(func.count(Venue.id)).filter(Venue.country == country, Venue.genres.any(name=genre)).scalar()

    async def find_by_state_province_and_country(
        self,
        state_province: str,
        country: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by state/province and country with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.state_province == state_province, Venue.country == country)
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_state_province_and_country(self, state_province: str, country: str) -> int:
        """Count venues by state/province and country"""
        return self.db.query(func.count(Venue.id)).filter(Venue.state_province == state_province, Venue.country == country).scalar()

    async def find_by_city_state_province_country(
        self,
        city_id: int,   
        state_province: str,
        country: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by city, state/province, and country with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(
                Venue.city_id == city_id,
                Venue.state_province == state_province,
                Venue.country == country
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    async def count_by_city_state_province_country(
        self,
        city_id: int,
        state_province: str,
        country: str
    ) -> int:
        """Count venues by city, state/province, and country"""
        return self.db.query(func.count(Venue.id)).filter(
            Venue.city_id == city_id,
            Venue.state_province == state_province,
            Venue.country == country
        ).scalar()

    async def find_by_city_and_name(
        self,
        city_id: int,
        name: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by city and name with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.city_id == city_id, Venue.name.ilike(f"%{name}%"))
            .offset(offset)
            .limit(limit)
            .all()
        )
    async def count_by_city_and_name(self, city_id: int, name: str) -> int:
        """Count venues by city and name"""
        return self.db.query(func.count(Venue.id)).filter(Venue.city_id == city_id, Venue.name.ilike(f"%{name}%")).scalar()

    async def find_by_state_province_and_name(
        self,
        state_province: str,
        name: str,
        page: int = 1,
        limit: int = 10
    ) -> List[Venue]:
        """Find venues by state/province and name with pagination"""
        offset = (page - 1) * limit
        return (
            self.db.query(Venue)
            .filter(Venue.state_province == state_province, Venue.name.ilike(f"%{name}%"))
            .offset(offset)
            .limit(limit)
            .all()
        )
    async def count_by_state_province_and_name(self, state_province: str, name: str) -> int:
        """Count venues by state/province and name"""
        return self.db.query(func.count(Venue.id)).filter(Venue.state_province == state_province, Venue.name.ilike(f"%{name}%")).scalar()
    

    