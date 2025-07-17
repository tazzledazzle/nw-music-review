import { QueryBuilder } from '../db/query-builder';
import { BaseRepository } from './base-repository';
import { Event, EventSearchParams, PaginatedResult } from '../models/types';

/**
 * Repository for Event entities
 */
export class EventRepository extends BaseRepository<Event> {
  constructor() {
    super('events');
  }

  /**
   * Find events by venue ID with date filtering
   * @param venueId Venue ID
   * @param params Optional search parameters including date filters
   */
  async findByVenueId(venueId: number, params?: EventSearchParams): Promise<PaginatedResult<Event>> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    
    let builder = this.createQueryBuilder()
      .select([
        'events.*',
        'venues.name AS venue_name',
        'venues.address AS venue_address',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .join('LEFT JOIN venues ON events.venue_id = venues.id')
      .join('LEFT JOIN cities ON venues.city_id = cities.id')
      .where('events.venue_id = $1', venueId);
    
    // Add date filtering
    if (params?.start_date) {
      builder = builder.where('events.event_datetime >= $1', params.start_date);
    }
    if (params?.end_date) {
      builder = builder.where('events.event_datetime <= $1', params.end_date);
    }
    
    // Default to upcoming events only if no date filters specified
    if (!params?.start_date && !params?.end_date) {
      builder = builder.where('events.event_datetime >= NOW()');
    }
    
    // Order by event date
    builder = builder.orderBy('events.event_datetime', 'ASC');
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.executePaginated<Event>(page, limit);
  }

  /**
   * Find an event by ID with full details including venue and artists
   * @param id Event ID
   */
  async findByIdWithDetails(id: number): Promise<Event | null> {
    const query = `
      SELECT 
        e.*,
        v.name AS venue_name,
        v.address AS venue_address,
        v.capacity AS venue_capacity,
        v.website AS venue_website,
        c.name AS city_name,
        c.state_province,
        c.country,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', a.id,
              'name', a.name,
              'genres', a.genres,
              'photo_url', a.photo_url,
              'profile_bio', a.profile_bio
            )
          ) FILTER (WHERE a.id IS NOT NULL), 
          '[]'::json
        ) AS artists
      FROM events e
      LEFT JOIN venues v ON e.venue_id = v.id
      LEFT JOIN cities c ON v.city_id = c.id
      LEFT JOIN event_artists ea ON e.id = ea.event_id
      LEFT JOIN artists a ON ea.artist_id = a.id
      WHERE e.id = $1
      GROUP BY e.id, v.id, c.id
    `;
    
    const result = await QueryBuilder.raw<Event & { 
      venue_name: string;
      venue_address: string;
      venue_capacity: number;
      venue_website: string;
      city_name: string;
      state_province: string;
      country: string;
      artists: any[];
    }>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const event = result.rows[0];
    
    // Transform the result to include venue and artists objects
    return {
      ...event,
      venue: {
        id: event.venue_id,
        name: event.venue_name,
        address: event.venue_address,
        capacity: event.venue_capacity,
        website: event.venue_website,
        city_id: 0, // We don't have this in the query
        coordinates: { x: 0, y: 0 }, // We don't have this in the query
        prosper_rank: 0, // We don't have this in the query
        created_at: new Date(),
        updated_at: new Date(),
        city: {
          id: 0, // We don't have this in the query
          name: event.city_name,
          state_province: event.state_province,
          country: event.country,
          coordinates: { x: 0, y: 0 }, // We don't have this in the query
          created_at: new Date(),
          updated_at: new Date()
        }
      },
      artists: event.artists || []
    };
  }

  /**
   * Find upcoming events by artist ID
   * @param artistId Artist ID
   * @param params Optional search parameters
   */
  async findByArtistId(artistId: number, params?: EventSearchParams): Promise<PaginatedResult<Event>> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    
    let builder = this.createQueryBuilder()
      .select([
        'events.*',
        'venues.name AS venue_name',
        'venues.address AS venue_address',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .join('LEFT JOIN event_artists ea ON events.id = ea.event_id')
      .join('LEFT JOIN venues ON events.venue_id = venues.id')
      .join('LEFT JOIN cities ON venues.city_id = cities.id')
      .where('ea.artist_id = $1', artistId);
    
    // Add date filtering
    if (params?.start_date) {
      builder = builder.where('events.event_datetime >= $1', params.start_date);
    }
    if (params?.end_date) {
      builder = builder.where('events.event_datetime <= $1', params.end_date);
    }
    
    // Default to upcoming events only if no date filters specified
    if (!params?.start_date && !params?.end_date) {
      builder = builder.where('events.event_datetime >= NOW()');
    }
    
    // Order by event date
    builder = builder.orderBy('events.event_datetime', 'ASC');
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.executePaginated<Event>(page, limit);
  }

  /**
   * Find upcoming events with optional filtering
   * @param params Search parameters
   */
  async findUpcoming(params?: EventSearchParams): Promise<PaginatedResult<Event>> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    
    let builder = this.createQueryBuilder()
      .select([
        'events.*',
        'venues.name AS venue_name',
        'venues.address AS venue_address',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .join('LEFT JOIN venues ON events.venue_id = venues.id')
      .join('LEFT JOIN cities ON venues.city_id = cities.id')
      .where('events.event_datetime >= NOW()');
    
    // Add optional filters
    if (params?.venue_id) {
      builder = builder.where('events.venue_id = $1', params.venue_id);
    }
    if (params?.city_id) {
      builder = builder.where('venues.city_id = $1', params.city_id);
    }
    if (params?.start_date) {
      builder = builder.where('events.event_datetime >= $1', params.start_date);
    }
    if (params?.end_date) {
      builder = builder.where('events.event_datetime <= $1', params.end_date);
    }
    
    // Order by event date
    builder = builder.orderBy('events.event_datetime', 'ASC');
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.executePaginated<Event>(page, limit);
  }

  /**
   * Search events by title
   * @param query Search query
   * @param params Optional search parameters
   */
  async searchByTitle(query: string, params?: EventSearchParams): Promise<Event[]> {
    let builder = this.createQueryBuilder()
      .select([
        'events.*',
        'venues.name AS venue_name',
        'venues.address AS venue_address',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .join('LEFT JOIN venues ON events.venue_id = venues.id')
      .join('LEFT JOIN cities ON venues.city_id = cities.id')
      .where('events.title ILIKE $1', `%${query}%`)
      .where('events.event_datetime >= NOW()'); // Only upcoming events
    
    // Add optional filters
    if (params?.venue_id) {
      builder = builder.where('events.venue_id = $1', params.venue_id);
    }
    if (params?.city_id) {
      builder = builder.where('venues.city_id = $1', params.city_id);
    }
    
    // Order by event date
    builder = builder.orderBy('events.event_datetime', 'ASC');
    
    const limit = params?.limit || 20;
    builder = builder.limit(limit);
    
    return builder.execute<Event>();
  }

  /**
   * Get event counts by venue
   */
  async getEventCountsByVenue(): Promise<{ venue_id: number, venue_name: string, event_count: number }[]> {
    const query = `
      SELECT 
        v.id AS venue_id,
        v.name AS venue_name,
        COUNT(e.id) AS event_count
      FROM venues v
      LEFT JOIN events e ON v.id = e.venue_id AND e.event_datetime >= NOW()
      GROUP BY v.id, v.name
      ORDER BY event_count DESC, v.name
    `;
    
    const result = await QueryBuilder.raw<{ 
      venue_id: number;
      venue_name: string;
      event_count: number;
    }>(query);
    
    return result.rows;
  }
}