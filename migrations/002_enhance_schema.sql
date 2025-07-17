-- Add additional PostGIS spatial indexes and data validation rules

-- Add spatial indexes for geographic queries
-- Create spatial index on cities.coordinates using PostGIS
DROP INDEX IF EXISTS idx_cities_coordinates;
CREATE INDEX idx_cities_coordinates ON cities USING GIST (coordinates);

-- Create spatial index on venues.coordinates using PostGIS
DROP INDEX IF EXISTS idx_venues_coordinates;
CREATE INDEX idx_venues_coordinates ON venues USING GIST (coordinates);

-- Add data validation constraints

-- Ensure city names are not empty
ALTER TABLE cities ADD CONSTRAINT cities_name_not_empty CHECK (length(trim(name)) > 0);

-- Ensure state/province names are not empty
ALTER TABLE cities ADD CONSTRAINT cities_state_province_not_empty CHECK (length(trim(state_province)) > 0);

-- Ensure country codes are valid (2 characters)
ALTER TABLE cities ADD CONSTRAINT cities_country_valid CHECK (length(country) = 2);

-- Ensure venue names are not empty
ALTER TABLE venues ADD CONSTRAINT venues_name_not_empty CHECK (length(trim(name)) > 0);

-- Ensure event titles are not empty
ALTER TABLE events ADD CONSTRAINT events_title_not_empty CHECK (length(trim(title)) > 0);

-- Ensure event dates are not in the past
ALTER TABLE events ADD CONSTRAINT events_date_valid CHECK (event_datetime >= NOW());

-- Ensure artist names are not empty
ALTER TABLE artists ADD CONSTRAINT artists_name_not_empty CHECK (length(trim(name)) > 0);

-- Ensure media URLs are valid
ALTER TABLE media ADD CONSTRAINT media_url_valid CHECK (length(trim(url)) > 0);

-- Add foreign key constraint with cascade delete for event_artists
ALTER TABLE event_artists DROP CONSTRAINT IF EXISTS event_artists_event_id_fkey;
ALTER TABLE event_artists ADD CONSTRAINT event_artists_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_artists DROP CONSTRAINT IF EXISTS event_artists_artist_id_fkey;
ALTER TABLE event_artists ADD CONSTRAINT event_artists_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- Add foreign key constraint with cascade delete for media
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_artist_id_fkey;
ALTER TABLE media ADD CONSTRAINT media_artist_id_fkey 
    FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE;

-- Add foreign key constraint with cascade delete for events
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_venue_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_venue_id_fkey 
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE;

-- Add foreign key constraint with cascade delete for venues
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_city_id_fkey;
ALTER TABLE venues ADD CONSTRAINT venues_city_id_fkey 
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE;

-- Create function to update timestamp on record update
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add updated_at column to all tables and create triggers
ALTER TABLE cities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE cities SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE cities ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER update_cities_modtime
BEFORE UPDATE ON cities
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE venues SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE venues ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER update_venues_modtime
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

ALTER TABLE artists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE artists SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE artists ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER update_artists_modtime
BEFORE UPDATE ON artists
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE events SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE events ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER update_events_modtime
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
UPDATE media SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE media ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TRIGGER update_media_modtime
BEFORE UPDATE ON media
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create additional indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(event_datetime) 
    WHERE event_datetime >= NOW();

CREATE INDEX IF NOT EXISTS idx_venues_name_trgm ON venues USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_title_trgm ON events USING GIN (title gin_trgm_ops);

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;