/**
 * Ticketmaster API service for fetching event and venue data
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

interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: Array<{
    ratio: string;
    url: string;
    width: number;
    height: number;
    fallback: boolean;
  }>;
  sales: {
    public: {
      startDateTime: string;
      startTBD: boolean;
      endDateTime: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
      dateTBD: boolean;
      dateTBA: boolean;
      timeTBA: boolean;
      noSpecificTime: boolean;
    };
    timezone: string;
    status: {
      code: string;
    };
  };
  classifications: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    };
    subGenre: {
      id: string;
      name: string;
    };
  }>;
  _embedded?: {
    venues: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      locale: string;
      images: Array<{
        ratio: string;
        url: string;
        width: number;
        height: number;
        fallback: boolean;
      }>;
      postalCode: string;
      timezone: string;
      city: {
        name: string;
      };
      state: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      address: {
        line1: string;
      };
      location: {
        longitude: string;
        latitude: string;
      };
      markets: Array<{
        name: string;
        id: string;
      }>;
      dmas: Array<{
        id: number;
      }>;
      boxOfficeInfo?: {
        phoneNumberDetail: string;
        openHoursDetail: string;
        acceptedPaymentDetail: string;
        willCallDetail: string;
      };
      parkingDetail?: string;
      accessibleSeatingDetail?: string;
      generalInfo?: {
        generalRule: string;
        childRule: string;
      };
    }>;
    attractions?: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
      locale: string;
      images: Array<{
        ratio: string;
        url: string;
        width: number;
        height: number;
        fallback: boolean;
      }>;
      classifications: Array<{
        primary: boolean;
        segment: {
          id: string;
          name: string;
        };
        genre: {
          id: string;
          name: string;
        };
        subGenre: {
          id: string;
          name: string;
        };
      }>;
      externalLinks?: {
        youtube?: Array<{
          url: string;
        }>;
        twitter?: Array<{
          url: string;
        }>;
        itunes?: Array<{
          url: string;
        }>;
        lastfm?: Array<{
          url: string;
        }>;
        facebook?: Array<{
          url: string;
        }>;
        wiki?: Array<{
          url: string;
        }>;
        musicbrainz?: Array<{
          id: string;
        }>;
        homepage?: Array<{
          url: string;
        }>;
      };
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: {
    events: TicketmasterEvent[];
  };
  _links: {
    self: {
      href: string;
    };
    next?: {
      href: string;
    };
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

export class TicketmasterService extends BaseApiService {
  constructor(apiKey: string) {
    const config: ApiServiceConfig = {
      apiKey,
      baseUrl: 'https://app.ticketmaster.com/discovery/v2',
      rateLimitPerMinute: 200,
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
      classificationName: 'music',
      size: (params.limit || 200).toString(),
      page: ((params.page || 1) - 1).toString(),
    });

    // Add location parameters
    if (params.latitude && params.longitude) {
      queryParams.append('latlong', `${params.latitude},${params.longitude}`);
      if (params.radius) {
        queryParams.append('radius', params.radius.toString());
        queryParams.append('unit', 'km');
      }
    } else if (params.location) {
      queryParams.append('city', params.location);
    }

    // Add date range
    if (params.startDate) {
      const startDate = params.startDate.toISOString().split('T')[0];
      const endDate = params.endDate?.toISOString().split('T')[0] || '2025-12-31';
      queryParams.append('startDateTime', `${startDate}T00:00:00Z`);
      queryParams.append('endDateTime', `${endDate}T23:59:59Z`);
    }

    // Filter to target regions
    queryParams.append('stateCode', 'WA,OR,ID');
    queryParams.append('countryCode', 'US,CA');

    const endpoint = `/events.json?${queryParams.toString()}`;
    const response = await this.makeRequest<TicketmasterResponse>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const events = response.data._embedded?.events || [];
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
      classificationName: 'music',
      keyword: artistName,
      size: (params.limit || 200).toString(),
      page: ((params.page || 1) - 1).toString(),
    });

    // Add date range
    if (params.startDate) {
      const startDate = params.startDate.toISOString().split('T')[0];
      const endDate = params.endDate?.toISOString().split('T')[0] || '2025-12-31';
      queryParams.append('startDateTime', `${startDate}T00:00:00Z`);
      queryParams.append('endDateTime', `${endDate}T23:59:59Z`);
    }

    // Filter to target regions
    queryParams.append('stateCode', 'WA,OR,ID');
    queryParams.append('countryCode', 'US,CA');

    const endpoint = `/events.json?${queryParams.toString()}`;
    const response = await this.makeRequest<TicketmasterResponse>(endpoint);

    if (!response.success || !response.data) {
      return response as ExternalApiResponse<ExternalEvent[]>;
    }

    const events = response.data._embedded?.events || [];
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
   * Transform Ticketmaster event data to our standard format
   */
  private transformEvent(ticketmasterEvent: TicketmasterEvent): TransformationResult<ExternalEvent> {
    try {
      // Parse datetime
      let datetime: Date;
      if (ticketmasterEvent.dates.start.dateTime) {
        datetime = new Date(ticketmasterEvent.dates.start.dateTime);
      } else if (ticketmasterEvent.dates.start.localTime) {
        datetime = new Date(`${ticketmasterEvent.dates.start.localDate}T${ticketmasterEvent.dates.start.localTime}`);
      } else {
        datetime = new Date(`${ticketmasterEvent.dates.start.localDate}T00:00:00`);
      }

      // Transform venue
      const venue = ticketmasterEvent._embedded?.venues?.[0];
      if (!venue) {
        return {
          success: false,
          errors: ['No venue data found in Ticketmaster event'],
          warnings: [],
        };
      }

      const transformedVenue = {
        id: venue.id,
        name: venue.name,
        address: venue.address?.line1,
        city: venue.city.name,
        state: venue.state?.stateCode,
        country: venue.country.countryCode,
        latitude: parseFloat(venue.location.latitude),
        longitude: parseFloat(venue.location.longitude),
      };

      // Transform artists
      const attractions = ticketmasterEvent._embedded?.attractions || [];
      const artists = attractions.map(attraction => ({
        id: attraction.id,
        name: attraction.name,
        genres: attraction.classifications
          .filter(c => c.primary)
          .map(c => c.genre.name)
          .filter(Boolean),
        website: attraction.externalLinks?.homepage?.[0]?.url,
        socialLinks: {
          facebook: attraction.externalLinks?.facebook?.[0]?.url,
          twitter: attraction.externalLinks?.twitter?.[0]?.url,
        },
      }));

      const event: ExternalEvent = {
        id: ticketmasterEvent.id,
        title: ticketmasterEvent.name,
        datetime,
        venue: transformedVenue,
        artists,
        ticketUrl: ticketmasterEvent.url,
        source: 'ticketmaster',
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
        errors: [`Failed to transform Ticketmaster event: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Check if event is in target regions (WA, OR, ID, BC)
   */
  private isInTargetRegion(event: ExternalEvent): boolean {
    const targetRegions = ['WA', 'OR', 'ID', 'BC'];
    const venue = event.venue;
    
    return targetRegions.includes(venue.state || '') || 
           (venue.country === 'CA' && venue.state === 'BC');
  }
}