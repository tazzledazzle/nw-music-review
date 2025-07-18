/**
 * Main ingestion service that orchestrates data fetching from external APIs
 */

import { SongkickService } from './songkick-service';
import { BandsintownService } from './bandsintown-service';
import { TicketmasterService } from './ticketmaster-service';
import { DataTransformer } from './data-transformer';
import { ExternalSearchParams, ExternalEvent, ExternalArtist } from './types';

// Repository imports
import { VenueRepository } from '../repositories/venue-repository';
import { ArtistRepository } from '../repositories/artist-repository';
import { EventRepository } from '../repositories/event-repository';
import { CityRepository } from '../repositories/city-repository';

// Model imports
import { Event, Venue, Artist, City } from '../models/types';

interface IngestionConfig {
  songkickApiKey?: string;
  bandsintownApiKey?: string;
  ticketmasterApiKey?: string;
}

interface IngestionResult {
  success: boolean;
  eventsProcessed: number;
  venuesProcessed: number;
  artistsProcessed: number;
  errors: string[];
  warnings: string[];
}

export class IngestionService {
  private songkickService?: SongkickService;
  private bandsintownService?: BandsintownService;
  private ticketmasterService?: TicketmasterService;
  
  private venueRepository: VenueRepository;
  private artistRepository: ArtistRepository;
  private eventRepository: EventRepository;
  private cityRepository: CityRepository;

  constructor(config: IngestionConfig) {
    // Initialize API services
    if (config.songkickApiKey) {
      this.songkickService = new SongkickService(config.songkickApiKey);
    }
    if (config.bandsintownApiKey) {
      this.bandsintownService = new BandsintownService(config.bandsintownApiKey);
    }
    if (config.ticketmasterApiKey) {
      this.ticketmasterService = new TicketmasterService(config.ticketmasterApiKey);
    }

    // Initialize repositories
    this.venueRepository = new VenueRepository();
    this.artistRepository = new ArtistRepository();
    this.eventRepository = new EventRepository();
    this.cityRepository = new CityRepository();
  }

  /**
   * Ingest events by location from all available APIs
   */
  async ingestEventsByLocation(params: ExternalSearchParams): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      eventsProcessed: 0,
      venuesProcessed: 0,
      artistsProcessed: 0,
      errors: [],
      warnings: [],
    };

    const allEvents: ExternalEvent[] = [];

    // Fetch from all available services
    const services = [
      { name: 'Songkick', service: this.songkickService },
      { name: 'Bandsintown', service: this.bandsintownService },
      { name: 'Ticketmaster', service: this.ticketmasterService },
    ];

    for (const { name, service } of services) {
      if (!service) continue;

      try {
        const response = await service.searchEventsByLocation(params);
        if (response.success && response.data) {
          allEvents.push(...response.data);
          console.log(`Fetched ${response.data.length} events from ${name}`);
        } else {
          result.errors.push(`Failed to fetch from ${name}: ${response.error}`);
        }
      } catch (error) {
        result.errors.push(`Error fetching from ${name}: ${error}`);
      }
    }

    // Process and store events
    const processResult = await this.processEvents(allEvents);
    result.eventsProcessed = processResult.eventsProcessed;
    result.venuesProcessed = processResult.venuesProcessed;
    result.artistsProcessed = processResult.artistsProcessed;
    result.errors.push(...processResult.errors);
    result.warnings.push(...processResult.warnings);

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  /**
   * Ingest events by artist from all available APIs
   */
  async ingestEventsByArtist(artistName: string, params: ExternalSearchParams = {}): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      eventsProcessed: 0,
      venuesProcessed: 0,
      artistsProcessed: 0,
      errors: [],
      warnings: [],
    };

    const allEvents: ExternalEvent[] = [];

    // Fetch from all available services
    const services = [
      { name: 'Songkick', service: this.songkickService },
      { name: 'Bandsintown', service: this.bandsintownService },
      { name: 'Ticketmaster', service: this.ticketmasterService },
    ];

    for (const { name, service } of services) {
      if (!service) continue;

      try {
        const response = await service.searchEventsByArtist(artistName, params);
        if (response.success && response.data) {
          allEvents.push(...response.data);
          console.log(`Fetched ${response.data.length} events for ${artistName} from ${name}`);
        } else {
          result.errors.push(`Failed to fetch ${artistName} from ${name}: ${response.error}`);
        }
      } catch (error) {
        result.errors.push(`Error fetching ${artistName} from ${name}: ${error}`);
      }
    }

    // Process and store events
    const processResult = await this.processEvents(allEvents);
    result.eventsProcessed = processResult.eventsProcessed;
    result.venuesProcessed = processResult.venuesProcessed;
    result.artistsProcessed = processResult.artistsProcessed;
    result.errors.push(...processResult.errors);
    result.warnings.push(...processResult.warnings);

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  }

  /**
   * Process and store external events in the database
   */
  private async processEvents(externalEvents: ExternalEvent[]): Promise<IngestionResult> {
    const result: IngestionResult = {
      success: true,
      eventsProcessed: 0,
      venuesProcessed: 0,
      artistsProcessed: 0,
      errors: [],
      warnings: [],
    };

    // Remove duplicates based on external ID
    const uniqueEvents = this.deduplicateEvents(externalEvents);
    console.log(`Processing ${uniqueEvents.length} unique events`);

    for (const externalEvent of uniqueEvents) {
      try {
        // Skip events not in target regions
        if (!DataTransformer.isInTargetRegion(externalEvent.venue)) {
          continue;
        }

        // Process city
        const cityResult = await this.processCity(externalEvent.venue);
        if (!cityResult.success) {
          result.errors.push(...cityResult.errors);
          continue;
        }
        const cityId = cityResult.cityId!;

        // Process venue
        const venueResult = await this.processVenue(externalEvent.venue, cityId);
        if (!venueResult.success) {
          result.errors.push(...venueResult.errors);
          continue;
        }
        const venueId = venueResult.venueId!;
        if (venueResult.isNew) {
          result.venuesProcessed++;
        }

        // Process artists
        const artistIds: number[] = [];
        for (const externalArtist of externalEvent.artists) {
          const artistResult = await this.processArtist(externalArtist);
          if (artistResult.success && artistResult.artistId) {
            artistIds.push(artistResult.artistId);
            if (artistResult.isNew) {
              result.artistsProcessed++;
            }
          } else {
            result.warnings.push(`Failed to process artist: ${externalArtist.name}`);
          }
        }

        // Process event
        const eventResult = await this.processEvent(externalEvent, venueId, artistIds);
        if (eventResult.success) {
          result.eventsProcessed++;
        } else {
          result.errors.push(...eventResult.errors);
        }

      } catch (error) {
        result.errors.push(`Error processing event ${externalEvent.id}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Process and store city data
   */
  private async processCity(externalVenue: any): Promise<{ success: boolean; cityId?: number; errors: string[] }> {
    try {
      const cityTransform = DataTransformer.extractCityFromVenue(externalVenue);
      if (!cityTransform.success) {
        return { success: false, errors: cityTransform.errors };
      }

      const cityData = cityTransform.data!;
      
      // Check if city already exists
      const existingCities = await this.cityRepository.findAll({
        name: cityData.name,
        state_province: cityData.state_province,
        country: cityData.country,
      });

      if (existingCities.length > 0) {
        return { success: true, cityId: existingCities[0].id, errors: [] };
      }

      // Create new city
      const newCity = await this.cityRepository.create(cityData);
      return { success: true, cityId: newCity.id, errors: [] };

    } catch (error) {
      return { success: false, errors: [`Failed to process city: ${error}`] };
    }
  }

  /**
   * Process and store venue data
   */
  private async processVenue(
    externalVenue: any, 
    cityId: number
  ): Promise<{ success: boolean; venueId?: number; isNew: boolean; errors: string[] }> {
    try {
      const venueTransform = DataTransformer.transformVenue(externalVenue, cityId);
      if (!venueTransform.success) {
        return { success: false, isNew: false, errors: venueTransform.errors };
      }

      const venueData = venueTransform.data!;
      
      // Check if venue already exists
      const existingVenues = await this.venueRepository.findAll({
        name: venueData.name,
        city_id: cityId,
      });

      if (existingVenues.length > 0) {
        return { success: true, venueId: existingVenues[0].id, isNew: false, errors: [] };
      }

      // Create new venue
      const newVenue = await this.venueRepository.create(venueData);
      return { success: true, venueId: newVenue.id, isNew: true, errors: [] };

    } catch (error) {
      return { success: false, isNew: false, errors: [`Failed to process venue: ${error}`] };
    }
  }

  /**
   * Process and store artist data
   */
  private async processArtist(
    externalArtist: ExternalArtist
  ): Promise<{ success: boolean; artistId?: number; isNew: boolean; errors: string[] }> {
    try {
      const artistTransform = DataTransformer.transformArtist(externalArtist);
      if (!artistTransform.success) {
        return { success: false, isNew: false, errors: artistTransform.errors };
      }

      const artistData = artistTransform.data!;
      
      // Check if artist already exists
      const existingArtists = await this.artistRepository.findAll({
        name: artistData.name,
      });

      if (existingArtists.length > 0) {
        return { success: true, artistId: existingArtists[0].id, isNew: false, errors: [] };
      }

      // Create new artist
      const newArtist = await this.artistRepository.create(artistData);
      return { success: true, artistId: newArtist.id, isNew: true, errors: [] };

    } catch (error) {
      return { success: false, isNew: false, errors: [`Failed to process artist: ${error}`] };
    }
  }

  /**
   * Process and store event data
   */
  private async processEvent(
    externalEvent: ExternalEvent,
    venueId: number,
    artistIds: number[]
  ): Promise<{ success: boolean; errors: string[] }> {
    try {
      const eventTransform = DataTransformer.transformEvent(externalEvent, venueId, 0);
      if (!eventTransform.success) {
        return { success: false, errors: eventTransform.errors };
      }

      const eventData = eventTransform.data!;
      
      // Check if event already exists
      const existingEvents = await this.eventRepository.findAll({
        external_id: eventData.external_id,
      });

      if (existingEvents.length > 0) {
        return { success: true, errors: [] };
      }

      // Create new event
      const newEvent = await this.eventRepository.create(eventData);
      
      // Associate artists with event
      for (const artistId of artistIds) {
        await this.eventRepository.addArtistToEvent(newEvent.id, artistId);
      }

      return { success: true, errors: [] };

    } catch (error) {
      return { success: false, errors: [`Failed to process event: ${error}`] };
    }
  }

  /**
   * Remove duplicate events based on external ID
   */
  private deduplicateEvents(events: ExternalEvent[]): ExternalEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      const key = `${event.source}_${event.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}