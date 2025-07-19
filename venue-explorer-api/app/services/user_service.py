"""
User service for handling user-related operations
"""

from sqlalchemy.orm import Session
from app.models.orm import User, UserFavorite


class UserService:
    def __init__(self, db: Session):
        self.db = db

    async def add_favorite(self, user_id: int, entity_type: str, entity_id: int):
        """Add item to user favorites"""
        favorite = UserFavorite(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id
        )
        self.db.add(favorite)
        self.db.commit()
        return favorite

    async def get_favorites(self, user_id: int):
        """Get user favorites"""
        favorites = self.db.query(UserFavorite).filter(
            UserFavorite.user_id == user_id
        ).all()
        return favorites

    async def get_recommendations(self, user_id: int):
        """Get user recommendations"""
        # Placeholder for recommendation logic
        return []