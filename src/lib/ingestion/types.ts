/**
 * Types and interfaces for external API data ingestion
 */

// Base interface for external API responses
export interface ExternalApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

// External event data structure
export interface ExternalEvent {
  id: string;
  title: string;
  description?: string;
  datetime: Date;
  venue: ExternalVenue;
  artists: ExternalArtist[];
  ticketUrl?: string;
  source: 'songkick' | 'bandsintown' | 'ticketmaster';
}

// External venue data structure
export interface ExternalVenue {
  id: string;
  name: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  website?: string;
}

// External artist data structure
export interface ExternalArtist {
  id: string;
  name: string;
  genres?: string[];
  bio?: string;
  imageUrl?: string;
  website?: string;
  socialLinks?: {
    spotify?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
}

// Configuration for external API services
export interface ApiServiceConfig {
  apiKey: string;
  baseUrl: string;
  rateLimitPerMinute: number;
  timeout: number;
}

// Search parameters for external APIs
export interface ExternalSearchParams {
  location?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate?: Date;
  endDate?: Date;
  artist?: string;
  venue?: string;
  limit?: number;
  page?: number;
}

// Data transformation result
export interface TransformationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}