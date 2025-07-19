"""
Region repository for database operations
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import math

from app.models.orm import City, Venue
from app.repositories.city_repository import CityRepository, PaginationResult


class RegionRepository:
    """Repository for region-related operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.city_repo = CityRepository(db)
    
    async def find_all(self) -> List[Dict[str, Any]]:
        """Get all regions with statistics"""
        regions = self.db.query(
            City.state_province,
            City.country,
            func.count(func.distinct(City.id)).label('city_count'),
            func.count(func.distinct(Venue.id)).label('venue_count')
        ).outerjoin(Venue).group_by(
            City.state_province,
            City.country
        ).order_by(City.state_province).all()
        
        # Format results
        results = []
        for state_province, country, city_count, venue_count in regions:
            results.append({
                'name': state_province,
                'country': country,
                'city_count': city_count,
                'venue_count': venue_count,
                'display_name': f"{state_province}, {country}"
            })
        
        return results
    
    async def find_cities_by_region(
        self,
        region: str,
        page: int = 1,
        limit: int = 20
    ) -> PaginationResult:
        """Find cities in a specific region with venue counts"""
        
        # Get cities with venue counts
        query = self.db.query(
            City,
            func.count(Venue.id).label('venue_count')
        ).outerjoin(Venue).filter(
            City.state_province == region
        )
        
        total = query.group_by(City.id).count()
        
        cities_with_counts = query.group_by(City.id).order_by(
            func.count(Venue.id).desc(),
            City.name
        ).offset((page - 1) * limit).limit(limit).all()
        
        # Format data
        data = []
        for city, venue_count in cities_with_counts:
            city_dict = {
                'id': city.id,
                'name': city.name,
                'state_province': city.state_province,
                'country': city.country,
                'coordinates': city.coordinates,
                'created_at': city.created_at,
                'venue_count': venue_count
            }
            data.append(city_dict)
        
        return PaginationResult(data, total, page, limit)
    
    async def get_region_stats(self, region: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a region"""
        
        # Basic counts
        city_count = self.db.query(City).filter(City.state_province == region).count()
        venue_count = self.db.query(Venue).join(City).filter(City.state_province == region).count()
        
        # Get the most active city (by venue count)
        most_active_city = self.db.query(
            City.name,
            func.count(Venue.id).label('venue_count')
        ).outerjoin(Venue).filter(
            City.state_province == region
        ).group_by(City.id, City.name).order_by(
            func.count(Venue.id).desc()
        ).first()
        
        return {
            'region': region,
            'city_count': city_count,
            'venue_count': venue_count,
            'most_active_city': {
                'name': most_active_city.name if most_active_city else None,
                'venue_count': most_active_city.venue_count if most_active_city else 0
            } if most_active_city else None
        }
