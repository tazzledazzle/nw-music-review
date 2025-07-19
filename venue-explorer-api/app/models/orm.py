"""
SQLAlchemy ORM models for database tables
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, CheckConstraint, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY
from geoalchemy2 import Geometry
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model for authentication and user management"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100))
    role = Column(String(20), default='user', nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    favorites = relationship("UserFavorite", back_populates="user")


class City(Base):
    """City model"""
    __tablename__ = "cities"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    state_province = Column(String(50), nullable=False)
    country = Column(String(2), nullable=False)
    coordinates = Column(Geometry("POINT"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    venues = relationship("Venue", back_populates="city")


class Venue(Base):
    """Venue model"""
    __tablename__ = "venues"
    
    id = Column(Integer, primary_key=True)
    city_id = Column(Integer, ForeignKey("cities.id"))
    name = Column(String(200), nullable=False)
    address = Column(Text)
    coordinates = Column(Geometry("POINT"), nullable=False)
    capacity = Column(Integer)
    website = Column(String(500))
    prosper_rank = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    city = relationship("City", back_populates="venues")
    events = relationship("Event", back_populates="venue")


class Artist(Base):
    """Artist model"""
    __tablename__ = "artists"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    genres = Column(ARRAY(Text))
    photo_url = Column(String(500))
    profile_bio = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    media = relationship("Media", back_populates="artist")
    event_associations = relationship("EventArtist", back_populates="artist")


class Event(Base):
    """Event model"""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True)
    venue_id = Column(Integer, ForeignKey("venues.id"))
    title = Column(String(300), nullable=False)
    description = Column(Text)
    event_datetime = Column(DateTime, nullable=False)
    ticket_url = Column(String(500))
    external_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    venue = relationship("Venue", back_populates="events")
    artist_associations = relationship("EventArtist", back_populates="event")


class EventArtist(Base):
    """Event-Artist association table"""
    __tablename__ = "event_artists"
    
    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    artist_id = Column(Integer, ForeignKey("artists.id"), primary_key=True)
    
    # Relationships
    event = relationship("Event", back_populates="artist_associations")
    artist = relationship("Artist", back_populates="event_associations")


class Media(Base):
    """Media model"""
    __tablename__ = "media"
    
    id = Column(Integer, primary_key=True)
    artist_id = Column(Integer, ForeignKey("artists.id"))
    type = Column(String(20), CheckConstraint("type IN ('photo', 'video')"), nullable=False)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    artist = relationship("Artist", back_populates="media")


class UserFavorite(Base):
    """User favorite model"""
    __tablename__ = "user_favorites"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    entity_type = Column(String(20), CheckConstraint("entity_type IN ('venue', 'artist')"), primary_key=True)
    entity_id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="favorites")
