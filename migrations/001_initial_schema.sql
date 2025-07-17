-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create cities table
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_province VARCHAR(50) NOT NULL,
    country VARCHAR(2) NOT NULL,
    coordinates POINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create venues table
CREATE TABLE venues (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES cities(id),
    name VARCHAR(200) NOT NULL,
    address TEXT,
    coordinates POINT NOT NULL,
    capacity INTEGER,
    website VARCHAR(500),
    prosper_rank INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create artists table
CREATE TABLE artists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    genres TEXT[],
    photo_url VARCHAR(500),
    profile_bio TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER REFERENCES venues(id),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    event_datetime TIMESTAMP NOT NULL,
    ticket_url VARCHAR(500),
    external_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create event_artists association table
CREATE TABLE event_artists (
    event_id INTEGER REFERENCES events(id),
    artist_id INTEGER REFERENCES artists(id),
    PRIMARY KEY (event_id, artist_id)
);

-- Create media table
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    artist_id INTEGER REFERENCES artists(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('photo', 'video')),
    url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_favorites table
CREATE TABLE user_favorites (
    user_id INTEGER NOT NULL,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('venue', 'artist')),
    entity_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Create indexes for better performance
CREATE INDEX idx_cities_coordinates ON cities USING GIST (coordinates);
CREATE INDEX idx_venues_coordinates ON venues USING GIST (coordinates);
CREATE INDEX idx_venues_city_id ON venues(city_id);
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_datetime ON events(event_datetime);
CREATE INDEX idx_event_artists_event_id ON event_artists(event_id);
CREATE INDEX idx_event_artists_artist_id ON event_artists(artist_id);
CREATE INDEX idx_media_artist_id ON media(artist_id);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_artists_genres ON artists USING GIN (genres);