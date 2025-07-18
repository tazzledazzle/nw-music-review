import { elasticsearchService } from './elasticsearch';
import { VenueRepository } from '../repositories/venue-repository';
import { ArtistRepository } from '../repositories/artist-repository';
import { EventRepository } from '../repositories/event-repository';
import { Venue, Artist, Event, City } from '../models/types';

/**
 * Service for syncing database data with Elasticsearch indices
 */
export class IndexingService {
  private venueRepo: VenueRepository;
  private artistRepo: ArtistRepository;
  private eventRepo: EventRepository;

  constructor() {
    this.venueRepo = new VenueRepository();
    this.artistRepo = new ArtistRepository();
    this.eventRepo = new EventRepository();
  }

  /**
   * Initialize Elasticsearch indices and perform full sync
   */
  async initialize(): Promise<void> {
    console.log('Initializing Elasticsearch indices...');
    await elasticsearchService.initializeIndices();
    
    console.log('Performing full data sync...');
    await this.fullSync();
    
    console.log('Indexing service initialization complete');
  }

  /**
   * Perform a full sync of all data from database to Elasticsearch
   */
  async fullSync(): Promise<void> {
    await Promise.all([
      this.syncAllVenues(),
      this.syncAllArtists(),
      this.syncAllEvents()
    ]);

    await elasticsearchService.refreshIndices();
  }

  /**
   * Sync all venues from database to Elasticsearch
   */
  async syncAllVenues(): Promise<void> {
    console.log('Syncing venues...');
    
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const venues = await this.venueRepo.findAll({ page, limit });
      
      if (venues.data.length === 0) {
        hasMore = false;
        break;
      }

      const operations = venues.data.map(venue => ({
        index: 'venues',
        id: venue.id.toString(),
        document: this.transformVenueForIndex(venue)
      }));

      await elasticsearchService.bulkIndex(operations);
      
      console.log(`Synced ${venues.data.length} venues (page ${page})`);
      page++;
      hasMore = venues.data.length === limit;
    }
  }

  /**
   * Sync all artists from database to Elasticsearch
   */
  async syncAllArtists(): Promise<void> {
    console.log('Syncing artists...');
    
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const artists = await this.artistRepo.findAll({ page, limit });
      
      if (artists.data.length === 0) {
        hasMore = false;
        break;
      }

      const operations = artists.data.map(artist => ({
        index: 'artists',
        id: artist.id.toString(),
        document: this.transformArtistForIndex(artist)
      }));

      await elasticsearchService.bulkIndex(operations);
      
      console.log(`Synced ${artists.data.length} artists (page ${page})`);
      page++;
      hasMore = artists.data.length === limit;
    }
  }

  /**
   * Sync all events from database to Elasticsearch
   */
  async syncAllEvents(): Promise<void> {
    console.log('Syncing events...');
    
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const events = await this.eventRepo.findAll({ page, limit });
      
      if (events.data.length === 0) {
        hasMore = false;
        break;
      }

      const operations = [];
      for (const event of events.data) {
        const eventWithDetails = await this.eventRepo.findById(event.id);
        if (eventWithDetails) {
          operations.push({
            index: 'events',
            id: event.id.toString(),
            document: this.transformEventForIndex(eventWithDetails)
          });
        }
      }

      if (operations.length > 0) {
        await elasticsearchService.bulkIndex(operations);
      }
      
      console.log(`Synced ${operations.length} events (page ${page})`);
      page++;
      hasMore = events.data.length === limit;
    }
  }

  /**
   * Index a single venue
   */
  async indexVenue(venueId: number): Promise<void> {
    const venue = await this.venueRepo.findById(venueId);
    if (venue && venue.city) {
      await elasticsearchService.indexVenue(venue as Venue & { city: City });
    }
  }

  /**
   * Index a single artist
   */
  async indexArtist(artistId: number): Promise<void> {
    const artist = await this.artistRepo.findById(artistId);
    if (artist) {
      await elasticsearchService.indexArtist(artist);
    }
  }

  /**
   * Index a single event
   */
  async indexEvent(eventId: number): Promise<void> {
    const event = await this.eventRepo.findById(eventId);
    if (event && event.venue && event.artists) {
      await elasticsearchService.indexEvent(event as Event & { 
        venue: Venue & { city: City }, 
        artists: Artist[] 
      });
    }
  }

  /**
   * Remove a document from the search index
   */
  async removeFromIndex(type: 'venue' | 'artist' | 'event', id: number): Promise<void> {
    const indexMap = {
      venue: 'venues',
      artist: 'artists',
      event: 'events'
    };

    await elasticsearchService.deleteDocument(indexMap[type], id.toString());
  }

  /**
   * Transform venue data for Elasticsearch indexing
   */
  private transformVenueForIndex(venue: Venue & { city?: City }) {
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      location: {
        lat: venue.coordinates.y,
        lon: venue.coordinates.x
      },
      capacity: venue.capacity,
      website: venue.website,
      prosper_rank: venue.prosper_rank,
      city: venue.city ? {
        id: venue.city.id,
        name: venue.city.name,
        state_province: venue.city.state_province,
        country: venue.city.country
      } : null,
      created_at: venue.created_at.toISOString()
    };
  }

  /**
   * Transform artist data for Elasticsearch indexing
   */
  private transformArtistForIndex(artist: Artist) {
    return {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      photo_url: artist.photo_url,
      profile_bio: artist.profile_bio,
      created_at: artist.created_at.toISOString()
    };
  }

  /**
   * Transform event data for Elasticsearch indexing
   */
  private transformEventForIndex(event: Event & { venue?: Venue & { city?: City }, artists?: Artist[] }) {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      event_datetime: event.event_datetime.toISOString(),
      ticket_url: event.ticket_url,
      venue: event.venue ? {
        id: event.venue.id,
        name: event.venue.name,
        location: {
          lat: event.venue.coordinates.y,
          lon: event.venue.coordinates.x
        },
        city: event.venue.city ? {
          name: event.venue.city.name,
          state_province: event.venue.city.state_province,
          country: event.venue.city.country
        } : null
      } : null,
      artists: event.artists ? event.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres
      })) : [],
      created_at: event.created_at.toISOString()
    };
  }

  /**
   * Check if Elasticsearch is healthy and ready
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string }> {
    const isHealthy = await elasticsearchService.healthCheck();
    
    return {
      healthy: isHealthy,
      message: isHealthy ? 'Elasticsearch is healthy' : 'Elasticsearch is not available'
    };
  }
}

// Export singleton instance
export const indexingService = new IndexingService();