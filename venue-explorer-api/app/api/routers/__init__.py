"""
Initialize API routers
"""

from app.api.routers import (
    health,
    venues,
    artists,
    events,
    cities,
    regions,
    search,
    users
)

__all__ = [
    "health",
    "venues", 
    "artists",
    "events",
    "cities",
    "regions",
    "search",
    "users"
]
