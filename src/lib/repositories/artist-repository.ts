import { BaseRepository } from './base-repository';
import { Artist, Media, Event, EventSearchParams } from '../models/types';

/**
 * Repository for managing artist data and related operations
 */
export class ArtistRepository extends BaseRepository<Artist> {
  constructor() {
    super('artists');
  }

  /**
   * Find an artist by name (case-insensitive)
   * @param name Artist name
   */
  async findByName(name: string): Promise<Artist | null> {
    return this.createQueryBuilder()
      .where('LOWER(name) = LOWER($1)', name)
      .executeSingle<Artist>();
  }

  /**
   * Find an artist with their media
   * @param id Artist ID
   */
  async findByIdWithMedia(id: number): Promise<Artist | null> {
    const query = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'type', m.type,
              'url', m.url,
              'created_at', m.created_at,
              'updated_at', m.updated_at
            )
          ) FILTER (WHERE m.id IS NOT NULL), 
          '[]'
        ) as media
      FROM artists a
      LEFT JOIN media m ON a.id = m.artist_id
      WHERE a.id = $1
      GROUP BY a.id
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find upcoming events for an artist
   * @param artistId Artist ID
   * @param params Optional search parameters
   */
  async findUpcomingEvents(artistId: number, params?: EventSearchParams): Promise<Event[]> {
    let query = `
      SELECT 
        e.*,
        json_build_object(
          'id', v.id,
          'name', v.name,
          'address', v.address,
          'coordinates', ST_AsGeoJSON(v.coordinates)::json,
          'capacity', v.capacity,
          'website', v.website,
          'prosper_rank', v.prosper_rank,
          'city', json_build_object(
            'id', c.id,
            'name', c.name,
            'state_province', c.state_province,
            'country', c.country
          )
        ) as venue
      FROM events e
      JOIN event_artists ea ON e.id = ea.event_id
      JOIN venues v ON e.venue_id = v.id
      JOIN cities c ON v.city_id = c.id
      WHERE ea.artist_id = $1 
        AND e.event_datetime >= NOW()
    `;

    const queryParams: any[] = [artistId];
    let paramIndex = 2;

    // Add date filtering if provided
    if (params?.start_date) {
      query += ` AND e.event_datetime >= $${paramIndex}`;
      queryParams.push(params.start_date);
      paramIndex++;
    }

    if (params?.end_date) {
      query += ` AND e.event_datetime <= $${paramIndex}`;
      queryParams.push(params.end_date);
      paramIndex++;
    }

    // Add ordering
    query += ` ORDER BY e.event_datetime ASC`;

    // Add pagination if provided
    if (params?.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(params.limit);
      paramIndex++;

      if (params?.page && params.page > 1) {
        const offset = (params.page - 1) * params.limit;
        query += ` OFFSET $${paramIndex}`;
        queryParams.push(offset);
      }
    }

    const result = await this.pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Find media for an artist
   * @param artistId Artist ID
   * @param type Optional media type filter
   */
  async findMedia(artistId: number, type?: 'photo' | 'video'): Promise<Media[]> {
    let query = `
      SELECT * FROM media 
      WHERE artist_id = $1
    `;

    const queryParams: any[] = [artistId];

    if (type) {
      query += ` AND type = $2`;
      queryParams.push(type);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, queryParams);
    return result.rows;
  }

  /**
   * Search artists by name or genre
   * @param searchTerm Search term
   * @param limit Optional limit
   */
  async search(searchTerm: string, limit: number = 20): Promise<Artist[]> {
    const query = `
      SELECT * FROM artists
      WHERE 
        name ILIKE $1 
        OR $2 = ANY(genres)
      ORDER BY 
        CASE 
          WHEN LOWER(name) = LOWER($3) THEN 1
          WHEN name ILIKE $4 THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT $5
    `;

    const searchPattern = `%${searchTerm}%`;
    const exactMatch = searchTerm;
    const startsWith = `${searchTerm}%`;

    const result = await this.pool.query(query, [
      searchPattern,
      searchTerm,
      exactMatch,
      startsWith,
      limit
    ]);

    return result.rows;
  }
}