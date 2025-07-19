"""
Authentication service for user management and JWT token handling
"""

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.orm import User, UserFavorite
from app.schemas.models import UserCreate, UserLogin, UserResponse, TokenResponse, FavoriteRequest
from app.core.config import Settings


class AuthService:
    """Authentication service for user registration, login, and token management"""
    
    def __init__(self, db: Session, settings: Settings):
        self.db = db
        self.settings = settings
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24 * 7  # 7 days
        self.bcrypt_salt_rounds = 12
    
    async def register(self, user_data: UserCreate) -> Dict[str, Any]:
        """
        Register a new user
        
        Args:
            user_data: User registration data
            
        Returns:
            Dictionary containing user data and access token
            
        Raises:
            ValueError: If email already exists or validation fails
        """
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ValueError("Email already registered")
        
        # Hash password
        password_hash = bcrypt.hashpw(
            user_data.password.encode('utf-8'), 
            bcrypt.gensalt(rounds=self.bcrypt_salt_rounds)
        ).decode('utf-8')
        
        # Create user
        try:
            user = User(
                email=user_data.email,
                password_hash=password_hash,
                name=user_data.name,
                role='user',
                email_verified=False
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError:
            self.db.rollback()
            raise ValueError("Email already registered")
        
        # Generate access token
        access_token = self._create_access_token({"sub": str(user.id), "email": user.email})
        
        return {
            "user": UserResponse.from_orm(user),
            "token": TokenResponse(
                access_token=access_token,
                expires_in=self.access_token_expire_minutes * 60
            )
        }
    
    async def login(self, login_data: UserLogin) -> Dict[str, Any]:
        """
        Authenticate user and return access token
        
        Args:
            login_data: User login credentials
            
        Returns:
            Dictionary containing user data and access token
            
        Raises:
            ValueError: If credentials are invalid
        """
        # Find user by email
        user = self.db.query(User).filter(User.email == login_data.email).first()
        if not user:
            raise ValueError("Invalid email or password")
        
        # Verify password
        if not bcrypt.checkpw(login_data.password.encode('utf-8'), user.password_hash.encode('utf-8')):
            raise ValueError("Invalid email or password")
        
        # Generate access token
        access_token = self._create_access_token({"sub": str(user.id), "email": user.email})
        
        return {
            "user": UserResponse.from_orm(user),
            "token": TokenResponse(
                access_token=access_token,
                expires_in=self.access_token_expire_minutes * 60
            )
        }
    
    async def get_current_user(self, token: str) -> Optional[User]:
        """
        Get current user from JWT token
        
        Args:
            token: JWT access token
            
        Returns:
            User object if token is valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id = payload.get("sub")
            if user_id is None:
                return None
            
            user = self.db.query(User).filter(User.id == int(user_id)).first()
            return user
        except (jwt.PyJWTError, ValueError):
            return None
    
    async def refresh_token(self, token: str) -> Optional[TokenResponse]:
        """
        Refresh an access token
        
        Args:
            token: Current JWT access token
            
        Returns:
            New token response if valid, None otherwise
        """
        user = await self.get_current_user(token)
        if not user:
            return None
        
        access_token = self._create_access_token({"sub": str(user.id), "email": user.email})
        return TokenResponse(
            access_token=access_token,
            expires_in=self.access_token_expire_minutes * 60
        )
    
    async def add_favorite(self, user_id: int, favorite_data: FavoriteRequest) -> Dict[str, Any]:
        """
        Add item to user favorites
        
        Args:
            user_id: User ID
            favorite_data: Favorite item data
            
        Returns:
            Success message
            
        Raises:
            ValueError: If favorite already exists
        """
        # Check if favorite already exists
        existing_favorite = self.db.query(UserFavorite).filter(
            UserFavorite.user_id == user_id,
            UserFavorite.entity_type == favorite_data.entity_type,
            UserFavorite.entity_id == favorite_data.entity_id
        ).first()
        
        if existing_favorite:
            raise ValueError("Item already in favorites")
        
        # Create favorite
        favorite = UserFavorite(
            user_id=user_id,
            entity_type=favorite_data.entity_type,
            entity_id=favorite_data.entity_id
        )
        self.db.add(favorite)
        self.db.commit()
        
        return {"message": "Item added to favorites successfully"}
    
    async def remove_favorite(self, user_id: int, entity_type: str, entity_id: int) -> Dict[str, Any]:
        """
        Remove item from user favorites
        
        Args:
            user_id: User ID
            entity_type: Type of entity (venue, artist)
            entity_id: Entity ID
            
        Returns:
            Success message
            
        Raises:
            ValueError: If favorite doesn't exist
        """
        favorite = self.db.query(UserFavorite).filter(
            UserFavorite.user_id == user_id,
            UserFavorite.entity_type == entity_type,
            UserFavorite.entity_id == entity_id
        ).first()
        
        if not favorite:
            raise ValueError("Item not found in favorites")
        
        self.db.delete(favorite)
        self.db.commit()
        
        return {"message": "Item removed from favorites successfully"}
    
    async def get_user_favorites(self, user_id: int) -> Dict[str, Any]:
        """
        Get user's favorite items
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary containing favorite venues and artists
        """
        favorites = self.db.query(UserFavorite).filter(UserFavorite.user_id == user_id).all()
        
        venues = []
        artists = []
        
        for favorite in favorites:
            if favorite.entity_type == 'venue':
                venues.append(favorite.entity_id)
            elif favorite.entity_type == 'artist':
                artists.append(favorite.entity_id)
        
        return {
            "venues": venues,
            "artists": artists,
            "total": len(favorites)
        }
    
    async def update_user_profile(self, user_id: int, name: Optional[str] = None) -> UserResponse:
        """
        Update user profile information
        
        Args:
            user_id: User ID
            name: New name (optional)
            
        Returns:
            Updated user response
            
        Raises:
            ValueError: If user not found
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if name is not None:
            user.name = name
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        
        return UserResponse.from_orm(user)
    
    async def change_password(self, user_id: int, current_password: str, new_password: str) -> Dict[str, Any]:
        """
        Change user password
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            
        Returns:
            Success message
            
        Raises:
            ValueError: If current password is invalid or user not found
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Verify current password
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            raise ValueError("Current password is incorrect")
        
        # Hash new password
        new_password_hash = bcrypt.hashpw(
            new_password.encode('utf-8'), 
            bcrypt.gensalt(rounds=self.bcrypt_salt_rounds)
        ).decode('utf-8')
        
        user.password_hash = new_password_hash
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return {"message": "Password changed successfully"}
    
    async def verify_email(self, user_id: int) -> Dict[str, Any]:
        """
        Mark user email as verified
        
        Args:
            user_id: User ID
            
        Returns:
            Success message
            
        Raises:
            ValueError: If user not found
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        user.email_verified = True
        user.updated_at = datetime.utcnow()
        self.db.commit()
        
        return {"message": "Email verified successfully"}
    
    def _create_access_token(self, data: Dict[str, Any]) -> str:
        """
        Create JWT access token
        
        Args:
            data: Token payload data
            
        Returns:
            JWT token string
        """
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "type": "access"
        })
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def _verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode JWT token
        
        Args:
            token: JWT token string
            
        Returns:
            Decoded payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.PyJWTError:
            return None
