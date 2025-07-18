/**
 * Bandsintown API service for fetching event and artist data
 */

import { BaseApiService } from './base-api-service';
import { 
  ApiServiceConfig, 
  ExternalApiResponse, 
  ExternalEvent, 
  ExternalArtist,
  ExternalSearchParams,
  TransformationResult 
} from './types';

interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  description: string;
  venue: {
    name: string;
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
}

interface BandsintownArtist {
  id: string;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  facebook_page_url: string;
  mbid: string;
  tracker_count: number;
  upcoming_event_count: number;
}

export class BandsintownService extends BaseApiService {
  constructor(apiKey: string) {
    const config: ApiServiceConfig = {
      apiKey,
      baseUrl: 'https://rest.bandsintown.com',
      rateLimitPerMinute: 120,
      timeout: 10000,
    };
    super(config);
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'User-Agent': 'VenueExplorer/1.0',
    };
  }

  /**
   * Search for events by location
   */
  async searchEventsByLocation(params: ExternalSearchParams): Promise<ExternalApiResponse<ExternalEvent[]>> {
    if (!params.location && (!params.latitude || !params.longitude)) {
      return {
        success: false,
        error: 'Location or coordinates required for Bandsintown search',
      };
    }

    const queryParams = new URLSearchParams({
      app_id: this.config.apiKey,
    });

    if (params.startDate) {
      queryParams.append('date', `${params.startDate.toISOString().split('T')[0]},${params.endDate?.toISOString().split('T')[0] || '2025-12-31'}`);
    }

    let location = params.location;
    if (params.latitude && params.longitude) {
      location = `${params.latitude},${params.longitude}`;
    }

    const endpoint = `/events?location=${encodeURIComponent(location!)}&${queryParams.toString()}`;
    const response = await this.makeRequest<BandsintownEvent[]>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const transformedEvents = response.data
      .map(event => this.transformEvent(event))
      .filter(result => result.success)
      .map(result => result.data!)
      .filter(event => this.isInTargetRegion(event));

    return {
      success: true,
      data: transformedEvents,
      rateLimitRemaining: response.rateLimitRemaining,
      rateLimitReset: response.rateLimitReset,
    };
  }

  /**
   * Search for events by artist
   */
  async searchEventsByArtist(artistName: string, params: ExternalSearchParams = {}): Promise<ExternalApiResponse<ExternalEvent[]>> {
    const queryParams = new URLSearchParams({
      app_id: this.config.apiKey,
    });

    if (params.startDate) {
      queryParams.append('date', `${params.startDate.toISOString().split('T')[0]},${params.endDate?.toISOString().split('T')[0] || '2025-12-31'}`);
    }

    const endpoint = `/artists/${encodeURIComponent(artistName)}/events?${queryParams.toString()}`;
    const response = await this.makeRequest<BandsintownEvent[]>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const transformedEvents = response.data
      .map(event => this.transformEvent(event))
      .filter(result => result.success)
      .map(result => result.data!)
      .filter(event => this.isInTargetRegion(event));

    return {
      success: true,
      data: transformedEvents,
      rateLimitRemaining: response.rateLimitRemaining,
      rateLimitReset: response.rateLimitReset,
    };
  }

  /**
   * Get artist information
   */
  async getArtist(artistName: string): Promise<ExternalApiResponse<ExternalArtist>> {
    const queryParams = new URLSearchParams({
      app_id: this.config.apiKey,
    });

    const endpoint = `/artists/${encodeURIComponent(artistName)}?${queryParams.toString()}`;
    const response = await this.makeRequest<BandsintownArtist>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalArtist>;
    }

    const transformedArtist = this.transformArtist(response.data);
    
    if (!transformedArtist.success) {
      return {
        success: false,
        error: transformedArtist.errors.join(', '),
      };
    }

    return {
      success: true,
      data: transformedArtist.data!,
      rateLimitRemaining: response.rateLimitRemaining,
      rateLimitReset: response.rateLimitReset,
    };
  }

  /**
   * Transform Bandsintown event data to our standard format
   */
  private transformEvent(bandsintownEvent: BandsintownEvent): TransformationResult<ExternalEvent> {
    try {
      const datetime = new Date(bandsintownEvent.datetime);
      
      // Transform artists from lineup
      const artists = bandsintownEvent.lineup.map(artistName => ({
        id: `bandsintown_${artistName.toLowerCase().replace(/\s+/g, '_')}`,
        name: artistName,
      }));

      // Transform venue
      const venue = {
        id: `bandsintown_${bandsintownEvent.venue.name.toLowerCase().replace(/\s+/g, '_')}_${bandsintownEvent.venue.city}`,
        name: bandsintownEvent.venue.name,
        city: bandsintownEvent.venue.city,
        state: bandsintownEvent.venue.region,
        country: bandsintownEvent.venue.country,
        latitude: parseFloat(bandsintownEvent.venue.latitude),
        longitude: parseFloat(bandsintownEvent.venue.longitude),
      };

      // Get ticket URL from offers
      const ticketOffer = bandsintownEvent.offers.find(offer => offer.type === 'Tickets');

      const event: ExternalEvent = {
        id: bandsintownEvent.id,
        title: bandsintownEvent.lineup.join(', '),
        description: bandsintownEvent.description,
        datetime,
        venue,
        artists,
        ticketUrl: ticketOffer?.url || bandsintownEvent.url,
        source: 'bandsintown',
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
        errors: [`Failed to transform Bandsintown event: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Transform Bandsintown artist data to our standard format
   */
  private transformArtist(bandsintownArtist: BandsintownArtist): TransformationResult<ExternalArtist> {
    try {
      const artist: ExternalArtist = {
        id: bandsintownArtist.id,
        name: bandsintownArtist.name,
        imageUrl: bandsintownArtist.image_url,
        website: bandsintownArtist.url,
        socialLinks: {
          facebook: bandsintownArtist.facebook_page_url,
        },
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
        errors: [`Failed to transform Bandsintown artist: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Check if event is in target regions (WA, OR, ID, BC)
   */
  private isInTargetRegion(event: ExternalEvent): boolean {
    const targetRegions = ['WA', 'OR', 'ID', 'BC', 'Washington', 'Oregon', 'Idaho', 'British Columbia'];
    const venue = event.venue;
    
    return targetRegions.some(region => 
      venue.state?.includes(region) || 
      venue.country?.includes(region) ||
      (venue.country === 'Canada' && venue.state === 'BC')
    );
  }
}