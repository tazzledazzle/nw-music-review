"""
Base repository class with common database operations
"""

from sqlalchemy.orm import Session
from typing import TypeVar, Generic, Optional, List, Type, Any
from app.models.orm import Base

T = TypeVar('T', bound=Base)


class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations"""
    
    def __init__(self, db: Session, model: Type[T]):
        self.db = db
        self.model = model
    
    async def find_by_id(self, id: int) -> Optional[T]:
        """Find a record by ID"""
        return self.db.query(self.model).filter(self.model.id == id).first()
    
    async def find_all(self, limit: Optional[int] = None) -> List[T]:
        """Find all records with optional limit"""
        query = self.db.query(self.model)
        if limit:
            query = query.limit(limit)
        return query.all()
    
    async def create(self, **kwargs) -> T:
        """Create a new record"""
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance
    
    async def update(self, id: int, **kwargs) -> Optional[T]:
        """Update a record by ID"""
        instance = await self.find_by_id(id)
        if not instance:
            return None
        
        for key, value in kwargs.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        
        self.db.commit()
        self.db.refresh(instance)
        return instance
    
    async def delete(self, id: int) -> bool:
        """Delete a record by ID"""
        instance = await self.find_by_id(id)
        if not instance:
            return False
        
        self.db.delete(instance)
        self.db.commit()
        return True
    
    async def count(self) -> int:
        """Count total records"""
        return self.db.query(self.model).count()
