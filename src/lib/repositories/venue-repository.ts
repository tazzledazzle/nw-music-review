import { QueryBuilder } from '../db/query-builder';
import { BaseRepository } from './base-repository';
import { Venue, GeoPoint, QueryParams, PaginatedResult } from '../models/types';

/**
 * Repository for Venue entities
 */
export class VenueRepository extends BaseRepository<Venue> {
  constructor() {
    super('venues');
  }

  /**
   * Find venues by city ID
   * @param cityId City ID
   * @param params Optional query parameters
   */
  async findByCityId(cityId: number, params?: QueryParams): Promise<PaginatedResult<Venue>> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    
    const builder = this.createQueryBuilder()
      .where('city_id = $1', cityId);
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.executePaginated<Venue>(page, limit);
  }

  /**
   * Find venues near a geographic point
   * @param point Geographic point (longitude, latitude)
   * @param radiusKm Radius in kilometers
   * @param limit Maximum number of results
   */
  async findNearby(point: GeoPoint, radiusKm: number, limit: number = 20): Promise<Venue[]> {
    // Use PostGIS ST_DWithin to find venues within the radius
    const builder = this.createQueryBuilder()
      .select([
        'venues.*',
        'ST_Distance(venues.coordinates, ST_MakePoint($1, $2)::geometry) / 1000 AS distance_km'
      ])
      .where('ST_DWithin(venues.coordinates, ST_MakePoint($1, $2)::geometry, $3 * 1000)', 
        point.x, point.y, radiusKm)
      .orderBy('distance_km', 'ASC')
      .limit(limit);
    
    return builder.execute<Venue & { distance_km: number }>();
  }

  /**
   * Find venues with city information
   * @param params Optional query parameters
   */
  async findWithCity(params?: QueryParams): Promise<Venue[]> {
    const builder = this.createQueryBuilder()
      .select([
        'venues.*',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .join('LEFT JOIN cities ON venues.city_id = cities.id');
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    const venues = await builder.execute<Venue & { 
      city_name: string;
      state_province: string;
      country: string;
    }>();
    
    // Transform the result to include city object
    return venues.map(venue => ({
      ...venue,
      city: {
        id: venue.city_id,
        name: venue.city_name,
        state_province: venue.state_province,
        country: venue.country,
        coordinates: { x: 0, y: 0 }, // We don't have city coordinates in this query
        created_at: new Date(),
        updated_at: new Date()
      }
    }));
  }

  /**
   * Find a venue by ID with city information
   * @param id Venue ID
   */
  async findByIdWithCity(id: number): Promise<Venue | null> {
    const query = `
      SELECT 
        v.*,
        c.name AS city_name,
        c.state_province,
        c.country,
        c.coordinates AS city_coordinates
      FROM venues v
      LEFT JOIN cities c ON v.city_id = c.id
      WHERE v.id = $1
    `;
    
    const result = await QueryBuilder.raw<Venue & { 
      city_name: string;
      state_province: string;
      country: string;
      city_coordinates: GeoPoint;
    }>(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const venue = result.rows[0];
    
    // Transform the result to include city object
    return {
      ...venue,
      city: {
        id: venue.city_id,
        name: venue.city_name,
        state_province: venue.state_province,
        country: venue.country,
        coordinates: venue.city_coordinates,
        created_at: new Date(),
        updated_at: new Date()
      }
    };
  }

  /**
   * Search venues by name
   * @param query Search query
   * @param limit Maximum number of results
   */
  async searchByName(query: string, limit: number = 20): Promise<Venue[]> {
    const builder = this.createQueryBuilder()
      .where('name ILIKE $1', `%${query}%`)
      .limit(limit);
    
    return builder.execute<Venue>();
  }

  /**
   * Get venue counts by city
   */
  async getVenueCountsByCity(): Promise<{ city_id: number, city_name: string, venue_count: number }[]> {
    const query = `
      SELECT 
        c.id AS city_id,
        c.name AS city_name,
        COUNT(v.id) AS venue_count
      FROM cities c
      LEFT JOIN venues v ON c.id = v.city_id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `;
    
    const result = await QueryBuilder.raw<{ 
      city_id: number;
      city_name: string;
      venue_count: number;
    }>(query);
    
    return result.rows;
  }

  /**
   * Find venues with geographic filtering and enhanced sorting
   * @param params Query parameters including geographic filters
   */
  async findWithGeographicFiltering(params: QueryParams & {
    lat?: number;
    lon?: number;
    radius?: number;
    min_capacity?: number;
    max_capacity?: number;
    state_province?: string;
    country?: string;
  }): Promise<PaginatedResult<Venue & { distance_km?: number }>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    let builder = this.createQueryBuilder();
    
    // Add city join for geographic filtering
    builder = builder.join('LEFT JOIN cities ON venues.city_id = cities.id');
    
    // Select venue columns and optionally distance
    if (params.lat && params.lon) {
      builder = builder.select([
        'venues.*',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country',
        'ST_Distance(venues.coordinates, ST_MakePoint($1, $2)::geometry) / 1000 AS distance_km'
      ]);
      
      // Add geographic radius filter if specified
      if (params.radius) {
        builder = builder.where(
          'ST_DWithin(venues.coordinates, ST_MakePoint($1, $2)::geometry, $3 * 1000)',
          params.lat, params.lon, params.radius
        );
      }
    } else {
      builder = builder.select([
        'venues.*',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ]);
    }
    
    // Add capacity filters
    if (params.min_capacity) {
      builder = builder.where('venues.capacity >= $1', params.min_capacity);
    }
    if (params.max_capacity) {
      builder = builder.where('venues.capacity <= $1', params.max_capacity);
    }
    
    // Add geographic filters
    if (params.state_province) {
      builder = builder.where('cities.state_province = $1', params.state_province);
    }
    if (params.country) {
      builder = builder.where('cities.country = $1', params.country);
    }
    
    // Apply sorting - prioritize by prosper_rank and distance if available
    if (params.lat && params.lon && !params.sort_by) {
      builder = builder.orderBy('distance_km', 'ASC');
    } else if (!params.sort_by) {
      builder = builder.orderBy('venues.prosper_rank', 'DESC');
    } else {
      const sortColumn = params.sort_by.includes('.') ? params.sort_by : `venues.${params.sort_by}`;
      const direction = params.sort_dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      builder = builder.orderBy(sortColumn, direction as 'ASC' | 'DESC');
    }
    
    return builder.executePaginated<Venue & { 
      distance_km?: number;
      city_name: string;
      state_province: string;
      country: string;
    }>(page, limit);
  }

  /**
   * Search venues by multiple criteria
   * @param searchTerm Search term for venue name
   * @param params Additional query parameters
   */
  async searchVenues(
    searchTerm: string, 
    params?: QueryParams & { state_province?: string; country?: string }
  ): Promise<Venue[]> {
    let builder = this.createQueryBuilder()
      .join('LEFT JOIN cities ON venues.city_id = cities.id')
      .select([
        'venues.*',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ])
      .where('venues.name ILIKE $1', `%${searchTerm}%`);
    
    // Add geographic filters
    if (params?.state_province) {
      builder = builder.where('cities.state_province = $1', params.state_province);
    }
    if (params?.country) {
      builder = builder.where('cities.country = $1', params.country);
    }
    
    // Order by prosper_rank for better results
    builder = builder.orderBy('venues.prosper_rank', 'DESC');
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.execute<Venue & { 
      city_name: string;
      state_province: string;
      country: string;
    }>();
  }
}