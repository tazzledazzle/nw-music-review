/**
 * Core data model interfaces for the Venue Explorer platform
 */

// Base interface for all entities with common fields
export interface BaseEntity {
  id: number;
  created_at: Date;
  updated_at: Date;
}

// User role type
export type UserRole = 'user' | 'admin';

// Geographic point interface for PostGIS coordinates
export interface GeoPoint {
  x: number; // longitude
  y: number; // latitude
}

// City model interface
export interface City extends BaseEntity {
  name: string;
  state_province: string;
  country: string;
  coordinates: GeoPoint;
}

// Venue model interface
export interface Venue extends BaseEntity {
  city_id: number;
  name: string;
  address: string;
  coordinates: GeoPoint;
  capacity: number | null;
  website: string | null;
  prosper_rank: number;
  city?: City; // Optional joined city data
}

// Artist model interface
export interface Artist extends BaseEntity {
  name: string;
  genres: string[];
  photo_url: string | null;
  profile_bio: string | null;
  media?: Media[]; // Optional joined media data
  events?: Event[]; // Optional joined events data
}

// Event model interface
export interface Event extends BaseEntity {
  venue_id: number;
  title: string;
  description: string | null;
  event_datetime: Date;
  ticket_url: string | null;
  external_id: string | null;
  venue?: Venue; // Optional joined venue data
  artists?: Artist[]; // Optional joined artists data
}

// Media model interface
export interface Media extends BaseEntity {
  artist_id: number;
  type: 'photo' | 'video';
  url: string;
  artist?: Artist; // Optional joined artist data
}

// User model interface
export interface User extends BaseEntity {
  email: string;
  password_hash: string;
  name: string | null;
  role: UserRole;
  email_verified: boolean;
}

// Session model interface
export interface Session extends BaseEntity {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

// Password reset token interface
export interface PasswordResetToken extends BaseEntity {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

// User favorite model interface
export interface UserFavorite extends BaseEntity {
  user_id: number;
  entity_type: 'venue' | 'artist';
  entity_id: number;
}

// Query parameters interface for filtering and pagination
export interface QueryParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: unknown; // Additional filter parameters
}

// Pagination result interface
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Geographic search parameters
export interface GeoSearchParams extends QueryParams {
  lat: number;
  lon: number;
  radius: number; // in kilometers
}

// Event search parameters
export interface EventSearchParams extends QueryParams {
  start_date?: Date;
  end_date?: Date;
  artist_id?: number;
  venue_id?: number;
  city_id?: number;
}