import { Client } from '@elastic/elasticsearch';
import { 
  Venue, 
  Artist, 
  Event, 
  City,
  GeoSearchParams,
  EventSearchParams,
  QueryParams 
} from '../models/types';
import { 
  VenueQueryBuilder, 
  ArtistQueryBuilder, 
  EventQueryBuilder,
  SuggestionQueryBuilder 
} from './query-builders';

// Elasticsearch client configuration
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_AUTH ? {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
  } : undefined,
});

// Index names
export const INDICES = {
  VENUES: 'venues',
  ARTISTS: 'artists',
  EVENTS: 'events'
} as const;

// Elasticsearch document interfaces
export interface VenueDocument {
  id: number;
  name: string;
  address: string;
  location: {
    lat: number;
    lon: number;
  };
  capacity: number | null;
  website: string | null;
  prosper_rank: number;
  city: {
    id: number;
    name: string;
    state_province: string;
    country: string;
  };
  created_at: string;
}

export interface ArtistDocument {
  id: number;
  name: string;
  genres: string[];
  photo_url: string | null;
  profile_bio: string | null;
  created_at: string;
}

export interface EventDocument {
  id: number;
  title: string;
  description: string | null;
  event_datetime: string;
  ticket_url: string | null;
  venue: {
    id: number;
    name: string;
    location: {
      lat: number;
      lon: number;
    };
    city: {
      name: string;
      state_province: string;
      country: string;
    };
  };
  artists: Array<{
    id: number;
    name: string;
    genres: string[];
  }>;
  created_at: string;
}

// Search result interfaces
export interface SearchResult<T> {
  total: number;
  hits: Array<{
    _id: string;
    _score: number;
    _source: T;
  }>;
}

export interface CategorizedSearchResults {
  venues: SearchResult<VenueDocument>;
  artists: SearchResult<ArtistDocument>;
  events: SearchResult<EventDocument>;
  total: number;
}

/**
 * Elasticsearch service class for managing search operations
 */
export class ElasticsearchService {
  private client: Client;

  constructor() {
    this.client = client;
  }

  /**
   * Initialize Elasticsearch indices with proper mappings
   */
  async initializeIndices(): Promise<void> {
    await this.createVenueIndex();
    await this.createArtistIndex();
    await this.createEventIndex();
  }

  /**
   * Create venue index with mapping
   */
  private async createVenueIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.VENUES });
    
    if (!exists) {
      await this.client.indices.create({
        index: INDICES.VENUES,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              address: { type: 'text' },
              location: { type: 'geo_point' },
              capacity: { type: 'integer' },
              website: { type: 'keyword' },
              prosper_rank: { type: 'integer' },
              city: {
                properties: {
                  id: { type: 'integer' },
                  name: { 
                    type: 'text',
                    fields: { keyword: { type: 'keyword' } }
                  },
                  state_province: { type: 'keyword' },
                  country: { type: 'keyword' }
                }
              },
              created_at: { type: 'date' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                venue_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding']
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * Create artist index with mapping
   */
  private async createArtistIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.ARTISTS });
    
    if (!exists) {
      await this.client.indices.create({
        index: INDICES.ARTISTS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              genres: { type: 'keyword' },
              photo_url: { type: 'keyword' },
              profile_bio: { type: 'text' },
              created_at: { type: 'date' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                artist_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding']
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * Create event index with mapping
   */
  private async createEventIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: INDICES.EVENTS });
    
    if (!exists) {
      await this.client.indices.create({
        index: INDICES.EVENTS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              description: { type: 'text' },
              event_datetime: { type: 'date' },
              ticket_url: { type: 'keyword' },
              venue: {
                properties: {
                  id: { type: 'integer' },
                  name: { 
                    type: 'text',
                    fields: { keyword: { type: 'keyword' } }
                  },
                  location: { type: 'geo_point' },
                  city: {
                    properties: {
                      name: { type: 'keyword' },
                      state_province: { type: 'keyword' },
                      country: { type: 'keyword' }
                    }
                  }
                }
              },
              artists: {
                type: 'nested',
                properties: {
                  id: { type: 'integer' },
                  name: { 
                    type: 'text',
                    fields: { keyword: { type: 'keyword' } }
                  },
                  genres: { type: 'keyword' }
                }
              },
              created_at: { type: 'date' }
            }
          },
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0
          }
        }
      });
    }
  }

  /**
   * Index a venue document
   */
  async indexVenue(venue: Venue & { city: City }): Promise<void> {
    const document: VenueDocument = {
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
      city: {
        id: venue.city.id,
        name: venue.city.name,
        state_province: venue.city.state_province,
        country: venue.city.country
      },
      created_at: venue.created_at.toISOString()
    };

    await this.client.index({
      index: INDICES.VENUES,
      id: venue.id.toString(),
      body: document
    });
  }

  /**
   * Index an artist document
   */
  async indexArtist(artist: Artist): Promise<void> {
    const document: ArtistDocument = {
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      photo_url: artist.photo_url,
      profile_bio: artist.profile_bio,
      created_at: artist.created_at.toISOString()
    };

    await this.client.index({
      index: INDICES.ARTISTS,
      id: artist.id.toString(),
      body: document
    });
  }

  /**
   * Index an event document
   */
  async indexEvent(event: Event & { venue: Venue & { city: City }, artists: Artist[] }): Promise<void> {
    const document: EventDocument = {
      id: event.id,
      title: event.title,
      description: event.description,
      event_datetime: event.event_datetime.toISOString(),
      ticket_url: event.ticket_url,
      venue: {
        id: event.venue.id,
        name: event.venue.name,
        location: {
          lat: event.venue.coordinates.y,
          lon: event.venue.coordinates.x
        },
        city: {
          name: event.venue.city.name,
          state_province: event.venue.city.state_province,
          country: event.venue.city.country
        }
      },
      artists: event.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres
      })),
      created_at: event.created_at.toISOString()
    };

    await this.client.index({
      index: INDICES.EVENTS,
      id: event.id.toString(),
      body: document
    });
  }

  /**
   * Search across all content types
   */
  async searchAll(query: string, params: QueryParams = {}): Promise<CategorizedSearchResults> {
    const { page = 1, limit = 10 } = params;
    const from = (page - 1) * limit;

    const searchBody = {
      query: {
        multi_match: {
          query,
          fields: ['name^2', 'title^2', 'description', 'profile_bio'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      },
      from,
      size: limit,
      sort: [
        { _score: { order: 'desc' } },
        { created_at: { order: 'desc' } }
      ]
    };

    const [venueResults, artistResults, eventResults] = await Promise.all([
      this.client.search({ index: INDICES.VENUES, body: searchBody }),
      this.client.search({ index: INDICES.ARTISTS, body: searchBody }),
      this.client.search({ index: INDICES.EVENTS, body: searchBody })
    ]);

    return {
      venues: {
        total: venueResults.body.hits.total.value,
        hits: venueResults.body.hits.hits
      },
      artists: {
        total: artistResults.body.hits.total.value,
        hits: artistResults.body.hits.hits
      },
      events: {
        total: eventResults.body.hits.total.value,
        hits: eventResults.body.hits.hits
      },
      total: venueResults.body.hits.total.value + 
             artistResults.body.hits.total.value + 
             eventResults.body.hits.total.value
    };
  }

  /**
   * Search venues with geographic filtering
   */
  async searchVenues(query: string, params: GeoSearchParams & { 
    capacity_min?: number;
    capacity_max?: number;
    prosper_rank_min?: number;
    state_province?: string[];
    country?: string[];
  }): Promise<SearchResult<VenueDocument>> {
    const searchBody = VenueQueryBuilder.buildSearchQuery(query, params);

    const result = await this.client.search({
      index: INDICES.VENUES,
      body: searchBody
    });

    return {
      total: result.body.hits.total.value,
      hits: result.body.hits.hits
    };
  }

  /**
   * Search artists by name and genre
   */
  async searchArtists(query: string, params: QueryParams & { 
    genres?: string[];
    has_bio?: boolean;
    has_photo?: boolean;
  } = {}): Promise<SearchResult<ArtistDocument>> {
    const searchBody = ArtistQueryBuilder.buildSearchQuery(query, params);

    const result = await this.client.search({
      index: INDICES.ARTISTS,
      body: searchBody
    });

    return {
      total: result.body.hits.total.value,
      hits: result.body.hits.hits
    };
  }

  /**
   * Search events with date and location filtering
   */
  async searchEvents(query: string, params: EventSearchParams & GeoSearchParams & {
    genres?: string[];
    has_tickets?: boolean;
  }): Promise<SearchResult<EventDocument>> {
    const searchBody = EventQueryBuilder.buildSearchQuery(query, params);

    const result = await this.client.search({
      index: INDICES.EVENTS,
      body: searchBody
    });

    return {
      total: result.body.hits.total.value,
      hits: result.body.hits.hits
    };
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(query: string, type?: 'venue' | 'artist' | 'event'): Promise<string[]> {
    const indices = type ? [INDICES[type.toUpperCase() as keyof typeof INDICES]] : Object.values(INDICES);
    
    const searchBody = SuggestionQueryBuilder.buildSuggestionQuery(query);

    const results = await Promise.all(
      indices.map(index => 
        this.client.search({ index, body: searchBody })
      )
    );

    const suggestions = new Set<string>();
    results.forEach(result => {
      result.body.suggest.suggestions[0].options.forEach((option: any) => {
        suggestions.add(option.text);
      });
    });

    return Array.from(suggestions).slice(0, 10);
  }

  /**
   * Get upcoming events for a venue or artist
   */
  async getUpcomingEvents(params: {
    venue_id?: number;
    artist_id?: number;
    city_id?: number;
    days_ahead?: number;
    page?: number;
    limit?: number;
  }): Promise<SearchResult<EventDocument>> {
    const searchBody = EventQueryBuilder.buildUpcomingEventsQuery(params);

    const result = await this.client.search({
      index: INDICES.EVENTS,
      body: searchBody
    });

    return {
      total: result.body.hits.total.value,
      hits: result.body.hits.hits
    };
  }

  /**
   * Delete a document from an index
   */
  async deleteDocument(index: string, id: string): Promise<void> {
    await this.client.delete({ index, id });
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(operations: Array<{ index: string; id: string; document: any }>): Promise<void> {
    const body = operations.flatMap(op => [
      { index: { _index: op.index, _id: op.id } },
      op.document
    ]);

    await this.client.bulk({ body });
  }

  /**
   * Refresh indices to make documents searchable immediately
   */
  async refreshIndices(): Promise<void> {
    await this.client.indices.refresh({ index: Object.values(INDICES) });
  }

  /**
   * Check if Elasticsearch is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.statusCode === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const elasticsearchService = new ElasticsearchService();