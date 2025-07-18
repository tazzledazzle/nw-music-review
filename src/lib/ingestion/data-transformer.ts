/**
 * Data transformation service for normalizing external API data to internal models
 */

import { 
  ExternalEvent, 
  ExternalVenue, 
  ExternalArtist, 
  TransformationResult 
} from './types';
import { 
  Event, 
  Venue, 
  Artist, 
  City, 
  Media 
} from '../models/types';

export class DataTransformer {
  /**
   * Transform external event to internal event model
   */
  static transformEvent(
    externalEvent: ExternalEvent, 
    venueId: number, 
    cityId: number
  ): TransformationResult<Partial<Event>> {
    try {
      const event: Partial<Event> = {
        venue_id: venueId,
        title: externalEvent.title,
        description: externalEvent.description || null,
        event_datetime: externalEvent.datetime,
        ticket_url: externalEvent.ticketUrl || null,
        external_id: `${externalEvent.source}_${externalEvent.id}`,
      };

      return {
        success: true,
        data: event,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform event: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform external venue to internal venue model
   */
  static transformVenue(
    externalVenue: ExternalVenue, 
    cityId: number
  ): TransformationResult<Partial<Venue>> {
    try {
      const venue: Partial<Venue> = {
        city_id: cityId,
        name: externalVenue.name,
        address: externalVenue.address || null,
        coordinates: externalVenue.latitude && externalVenue.longitude ? {
          x: externalVenue.longitude,
          y: externalVenue.latitude,
        } : { x: 0, y: 0 },
        capacity: externalVenue.capacity || null,
        website: externalVenue.website || null,
        prosper_rank: 0, // Default rank, can be updated later
      };

      const warnings: string[] = [];
      if (!externalVenue.latitude || !externalVenue.longitude) {
        warnings.push('Missing coordinates for venue');
      }

      return {
        success: true,
        data: venue,
        errors: [],
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform venue: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform external artist to internal artist model
   */
  static transformArtist(externalArtist: ExternalArtist): TransformationResult<Partial<Artist>> {
    try {
      const artist: Partial<Artist> = {
        name: externalArtist.name,
        genres: externalArtist.genres || [],
        photo_url: externalArtist.imageUrl || null,
        profile_bio: externalArtist.bio || null,
      };

      return {
        success: true,
        data: artist,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to transform artist: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Extract city information from external venue
   */
  static extractCityFromVenue(externalVenue: ExternalVenue): TransformationResult<Partial<City>> {
    try {
      // Normalize state/province codes
      const stateProvince = this.normalizeStateProvince(
        externalVenue.state || '', 
        externalVenue.country
      );

      const city: Partial<City> = {
        name: externalVenue.city,
        state_province: stateProvince,
        country: this.normalizeCountryCode(externalVenue.country),
        coordinates: externalVenue.latitude && externalVenue.longitude ? {
          x: externalVenue.longitude,
          y: externalVenue.latitude,
        } : { x: 0, y: 0 },
      };

      const warnings: string[] = [];
      if (!externalVenue.latitude || !externalVenue.longitude) {
        warnings.push('Missing coordinates for city');
      }

      return {
        success: true,
        data: city,
        errors: [],
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to extract city: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Create media entries from external artist data
   */
  static extractMediaFromArtist(
    externalArtist: ExternalArtist, 
    artistId: number
  ): TransformationResult<Partial<Media>[]> {
    try {
      const mediaEntries: Partial<Media>[] = [];

      // Add photo if available
      if (externalArtist.imageUrl) {
        mediaEntries.push({
          artist_id: artistId,
          type: 'photo',
          url: externalArtist.imageUrl,
        });
      }

      return {
        success: true,
        data: mediaEntries,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to extract media: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Normalize state/province codes to standard format
   */
  private static normalizeStateProvince(state: string, country: string): string {
    const stateMap: Record<string, string> = {
      // US States
      'Washington': 'WA',
      'Oregon': 'OR',
      'Idaho': 'ID',
      // Canadian Provinces
      'British Columbia': 'BC',
      'BC': 'BC',
    };

    return stateMap[state] || state;
  }

  /**
   * Normalize country codes to standard format
   */
  private static normalizeCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'CAN': 'CA',
    };

    return countryMap[country] || country;
  }

  /**
   * Validate that venue is in target regions
   */
  static isInTargetRegion(venue: Partial<Venue> | ExternalVenue): boolean {
    const targetRegions = ['WA', 'OR', 'ID', 'BC'];
    
    if ('state_province' in venue) {
      return targetRegions.includes(venue.state_province || '');
    } else {
      const normalizedState = this.normalizeStateProvince(
        venue.state || '', 
        venue.country
      );
      return targetRegions.includes(normalizedState);
    }
  }

  /**
   * Generate unique external ID for deduplication
   */
  static generateExternalId(source: string, id: string, type: 'event' | 'venue' | 'artist'): string {
    return `${source}_${type}_${id}`;
  }

  /**
   * Clean and normalize text fields
   */
  static cleanText(text: string | null | undefined): string | null {
    if (!text) return null;
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters except basic punctuation
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate and normalize URL
   */
  static normalizeUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    
    try {
      const normalizedUrl = new URL(url);
      return normalizedUrl.toString();
    } catch {
      // If URL is invalid, try adding https://
      try {
        const withProtocol = new URL(`https://${url}`);
        return withProtocol.toString();
      } catch {
        return null;
      }
    }
  }
}