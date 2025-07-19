"""
Users API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.models import (
    UserCreate, UserLogin, UserResponse, 
    TokenResponse, FavoriteRequest
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()


@router.post("/users/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    auth_service = AuthService(db)
    user = await auth_service.register_user(user_data)
    return UserResponse.from_orm(user)


@router.post("/users/login", response_model=TokenResponse)
async def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Login user and get JWT token"""
    auth_service = AuthService(db)
    token = await auth_service.login_user(login_data)
    return token


@router.post("/users/logout")
async def logout_user():
    """Logout user (client-side token removal)"""
    return {"message": "Logged out successfully"}


@router.get("/users/me", response_model=UserResponse)
async def get_current_user(
    current_user = Depends(AuthService.get_current_user)
):
    """Get current user profile"""
    return UserResponse.from_orm(current_user)


@router.post("/users/favorites")
async def add_favorite(
    favorite_data: FavoriteRequest,
    current_user = Depends(AuthService.get_current_user),
    db: Session = Depends(get_db)
):
    """Add item to user favorites"""
    user_service = UserService(db)
    await user_service.add_favorite(
        current_user.id,
        favorite_data.entity_type,
        favorite_data.entity_id
    )
    return {"message": "Added to favorites"}


@router.get("/users/{user_id}/favorites")
async def get_user_favorites(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user favorites"""
    user_service = UserService(db)
    favorites = await user_service.get_favorites(user_id)
    return favorites


@router.get("/users/{user_id}/recommendations")
async def get_user_recommendations(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user recommendations"""
    user_service = UserService(db)
    recommendations = await user_service.get_recommendations(user_id)
    return recommendations
