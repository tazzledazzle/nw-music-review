-- Migration: Add performance indexes for query optimization
-- This migration adds indexes to improve query performance for common operations

-- Venues table indexes
CREATE INDEX IF NOT EXISTS idx_venues_city_id ON venues(city_id);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_venues_prosper_rank ON venues(prosper_rank DESC);
CREATE INDEX IF NOT EXISTS idx_venues_coordinates ON venues USING GIST(coordinates);

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_venue_id ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_datetime ON events(event_datetime);
CREATE INDEX IF NOT EXISTS idx_events_title ON events(title);

-- Artists table indexes
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_genres ON artists USING GIN(genres);

-- Event-Artist association indexes
CREATE INDEX IF NOT EXISTS idx_event_artists_event_id ON event_artists(event_id);
CREATE INDEX IF NOT EXISTS idx_event_artists_artist_id ON event_artists(artist_id);

-- Cities table indexes
CREATE INDEX IF NOT EXISTS idx_cities_state_province ON cities(state_province);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_coordinates ON cities USING GIST(coordinates);

-- User favorites indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_entity_type ON user_favorites(entity_type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_entity_id ON user_favorites(entity_id);

-- Media table indexes
CREATE INDEX IF NOT EXISTS idx_media_artist_id ON media(artist_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_venue_datetime ON events(venue_id, event_datetime);
CREATE INDEX IF NOT EXISTS idx_user_favorites_composite ON user_favorites(user_id, entity_type, entity_id);

-- Add function-based index for case-insensitive name searches
CREATE INDEX IF NOT EXISTS idx_venues_name_lower ON venues(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_artists_name_lower ON artists(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_cities_name_lower ON cities(LOWER(name));

-- Add partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_datetime) 
WHERE event_datetime >= CURRENT_DATE;

-- Add index for prosper ranking with city filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_venues_city_rank ON venues(city_id, prosper_rank DESC);

-- Comment explaining the purpose of these indexes
COMMENT ON INDEX idx_venues_city_id IS 'Improves performance of venue queries filtered by city';
COMMENT ON INDEX idx_venues_coordinates IS 'Improves performance of geographic queries using PostGIS';
COMMENT ON INDEX idx_artists_genres IS 'Optimizes genre filtering on artists';
COMMENT ON INDEX idx_events_upcoming IS 'Partial index to optimize queries for upcoming events only';