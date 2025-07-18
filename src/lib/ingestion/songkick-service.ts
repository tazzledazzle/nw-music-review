/**
 * Songkick API service for fetching event and venue data
 */

import { BaseApiService } from './base-api-service';
import { 
  ApiServiceConfig, 
  ExternalApiResponse, 
  ExternalEvent, 
  ExternalSearchParams,
  TransformationResult 
} from './types';

interface SongkickEvent {
  id: number;
  displayName: string;
  type: string;
  uri: string;
  status: string;
  popularity: number;
  start: {
    date: string;
    time?: string;
    datetime?: string;
  };
  performance: Array<{
    id: number;
    displayName: string;
    billing: string;
    artist: {
      id: number;
      displayName: string;
      uri: string;
    };
  }>;
  venue: {
    id: number;
    displayName: string;
    uri: string;
    lng?: number;
    lat?: number;
    metroArea: {
      displayName: string;
      country: {
        displayName: string;
      };
      state?: {
        displayName: string;
      };
    };
  };
}

interface SongkickResponse {
  resultsPage: {
    status: string;
    results: {
      event?: SongkickEvent[];
    };
    totalEntries: number;
    perPage: number;
    page: number;
  };
}

export class SongkickService extends BaseApiService {
  constructor(apiKey: string) {
    const config: ApiServiceConfig = {
      apiKey,
      baseUrl: 'https://api.songkick.com/api/3.0',
      rateLimitPerMinute: 60,
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
    const queryParams = new URLSearchParams({
      apikey: this.config.apiKey,
      per_page: (params.limit || 50).toString(),
      page: (params.page || 1).toString(),
    });

    if (params.latitude && params.longitude) {
      queryParams.append('location', `geo:${params.latitude},${params.longitude}`);
    } else if (params.location) {
      queryParams.append('location', params.location);
    }

    if (params.startDate) {
      queryParams.append('min_date', params.startDate.toISOString().split('T')[0]);
    }

    if (params.endDate) {
      queryParams.append('max_date', params.endDate.toISOString().split('T')[0]);
    }

    const endpoint = `/events.json?${queryParams.toString()}`;
    const response = await this.makeRequest<SongkickResponse>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const events = response.data.resultsPage.results.event || [];
    const transformedEvents = events
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
      apikey: this.config.apiKey,
      artist_name: artistName,
      per_page: (params.limit || 50).toString(),
      page: (params.page || 1).toString(),
    });

    if (params.startDate) {
      queryParams.append('min_date', params.startDate.toISOString().split('T')[0]);
    }

    if (params.endDate) {
      queryParams.append('max_date', params.endDate.toISOString().split('T')[0]);
    }

    const endpoint = `/events.json?${queryParams.toString()}`;
    const response = await this.makeRequest<SongkickResponse>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const events = response.data.resultsPage.results.event || [];
    const transformedEvents = events
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
   * Transform Songkick event data to our standard format
   */
  private transformEvent(songkickEvent: SongkickEvent): TransformationResult<ExternalEvent> {
    try {
      // Parse datetime
      let datetime: Date;
      if (songkickEvent.start.datetime) {
        datetime = new Date(songkickEvent.start.datetime);
      } else if (songkickEvent.start.time) {
        datetime = new Date(`${songkickEvent.start.date}T${songkickEvent.start.time}`);
      } else {
        datetime = new Date(`${songkickEvent.start.date}T00:00:00`);
      }

      // Transform artists
      const artists = songkickEvent.performance.map(perf => ({
        id: perf.artist.id.toString(),
        name: perf.artist.displayName,
      }));

      // Transform venue
      const venue = {
        id: songkickEvent.venue.id.toString(),
        name: songkickEvent.venue.displayName,
        city: songkickEvent.venue.metroArea.displayName,
        state: songkickEvent.venue.metroArea.state?.displayName,
        country: songkickEvent.venue.metroArea.country.displayName,
        latitude: songkickEvent.venue.lat,
        longitude: songkickEvent.venue.lng,
      };

      const event: ExternalEvent = {
        id: songkickEvent.id.toString(),
        title: songkickEvent.displayName,
        datetime,
        venue,
        artists,
        ticketUrl: songkickEvent.uri,
        source: 'songkick',
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
        errors: [`Failed to transform Songkick event: ${error}`],
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