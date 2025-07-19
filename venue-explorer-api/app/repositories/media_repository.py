"""
Media repository for database operations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from typing import Optional, List
from datetime import datetime

from app.models.orm import Media, Artist
from app.repositories.base_repository import BaseRepository


class MediaRepository(BaseRepository[Media]):
    """Repository for Media entities"""
    
    def __init__(self, db: Session):
        super().__init__(db, Media)
    
    async def find_by_artist(
        self, 
        artist_id: int, 
        media_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Media]:
        """Find media for a specific artist"""
        query = self.db.query(Media).filter(Media.artist_id == artist_id)
        
        if media_type:
            query = query.filter(Media.type == media_type)
        
        return query.order_by(Media.created_at.desc()).limit(limit).all()
    
    async def count_by_artist(
        self, 
        artist_id: int, 
        media_type: Optional[str] = None
    ) -> int:
        """Count media items for an artist"""
        query = self.db.query(Media).filter(Media.artist_id == artist_id)
        
        if media_type:
            query = query.filter(Media.type == media_type)
        
        return query.count()
    
    async def find_recent_media(
        self, 
        media_type: Optional[str] = None,
        limit: int = 20
    ) -> List[Media]:
        """Find recently added media"""
        query = self.db.query(Media).options(joinedload(Media.artist))
        
        if media_type:
            query = query.filter(Media.type == media_type)
        
        return query.order_by(Media.created_at.desc()).limit(limit).all()
    
    async def add_media(
        self, 
        artist_id: int, 
        media_type: str, 
        url: str
    ) -> Media:
        """Add media for an artist"""
        media = Media(
            artist_id=artist_id,
            type=media_type,
            url=url
        )
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        return media
