import { QueryBuilder } from '../db/query-builder';
import { Artist, Venue, Event, PaginatedResult } from '../models/types';

/**
 * Repository for generating personalized recommendations based on user favorites
 */
export class RecommendationRepository {
  private queryBuilder: QueryBuilder;

  constructor() {
    this.queryBuilder = new QueryBuilder('user_favorites');
  }

  /**
   * Get recommended venues based on user's favorite artists and venues
   * @param userId User ID
   * @param limit Maximum number of recommendations
   * @returns Array of recommended venues with score
   */
  async getRecommendedVenues(userId: number, limit: number = 10): Promise<(Venue & { score: number })[]> {
    // This query finds venues based on:
    // 1. Venues hosting events with artists the user has favorited
    // 2. Venues similar to ones the user has favorited (by city, capacity)
    // 3. Venues with high prosper_rank in cities where the user has favorited venues
    const query = `
      WITH user_favorite_artists AS (
        SELECT entity_id as artist_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'artist'
      ),
      user_favorite_venues AS (
        SELECT entity_id as venue_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'venue'
      ),
      favorite_cities AS (
        SELECT DISTINCT v.city_id
        FROM venues v
        JOIN user_favorite_venues ufv ON v.id = ufv.venue_id
      ),
      artist_venues AS (
        -- Venues hosting events with artists the user has favorited
        SELECT DISTINCT 
          v.id,
          COUNT(DISTINCT ea.artist_id) as matching_artists,
          1 as score_type
        FROM venues v
        JOIN events e ON v.id = e.venue_id
        JOIN event_artists ea ON e.id = ea.event_id
        JOIN user_favorite_artists ufa ON ea.artist_id = ufa.artist_id
        WHERE e.event_datetime >= NOW()
        GROUP BY v.id
      ),
      similar_venues AS (
        -- Venues similar to ones the user has favorited
        SELECT DISTINCT
          v.id,
          0.8 * COUNT(DISTINCT ufv.venue_id) as similarity_score,
          2 as score_type
        FROM venues v
        JOIN venues fv ON v.city_id = fv.city_id
        JOIN user_favorite_venues ufv ON fv.id = ufv.venue_id
        WHERE 
          v.id NOT IN (SELECT venue_id FROM user_favorite_venues)
          AND (
            -- Similar capacity (within 30%)
            (fv.capacity IS NOT NULL AND v.capacity IS NOT NULL AND 
             v.capacity BETWEEN fv.capacity * 0.7 AND fv.capacity * 1.3)
            OR
            -- Similar prosper_rank (within 2 points)
            (ABS(v.prosper_rank - fv.prosper_rank) <= 2)
          )
        GROUP BY v.id
      ),
      city_top_venues AS (
        -- Top venues by prosper_rank in cities the user has shown interest in
        SELECT DISTINCT
          v.id,
          0.6 * v.prosper_rank as rank_score,
          3 as score_type
        FROM venues v
        JOIN favorite_cities fc ON v.city_id = fc.city_id
        WHERE v.id NOT IN (SELECT venue_id FROM user_favorite_venues)
        ORDER BY v.prosper_rank DESC
        LIMIT 20
      ),
      combined_scores AS (
        SELECT id, matching_artists as score, score_type FROM artist_venues
        UNION ALL
        SELECT id, similarity_score as score, score_type FROM similar_venues
        UNION ALL
        SELECT id, rank_score as score, score_type FROM city_top_venues
      ),
      aggregated_scores AS (
        SELECT 
          id,
          SUM(score) as total_score,
          MIN(score_type) as best_score_type
        FROM combined_scores
        GROUP BY id
      )
      SELECT 
        v.*,
        c.name as city_name,
        c.state_province,
        c.country,
        ags.total_score as score,
        ags.best_score_type
      FROM venues v
      JOIN cities c ON v.city_id = c.id
      JOIN aggregated_scores ags ON v.id = ags.id
      WHERE v.id NOT IN (SELECT venue_id FROM user_favorite_venues)
      ORDER BY 
        ags.best_score_type ASC,
        ags.total_score DESC,
        v.prosper_rank DESC
      LIMIT $2
    `;

    const result = await QueryBuilder.raw<Venue & { 
      city_name: string;
      state_province: string;
      country: string;
      score: number;
      best_score_type: number;
    }>(query, [userId, limit]);

    // Transform the result to include city object
    return result.rows.map(venue => ({
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
   * Get recommended artists based on user's favorite artists and venues
   * @param userId User ID
   * @param limit Maximum number of recommendations
   * @returns Array of recommended artists with score
   */
  async getRecommendedArtists(userId: number, limit: number = 10): Promise<(Artist & { score: number })[]> {
    // This query finds artists based on:
    // 1. Artists who perform with artists the user has favorited
    // 2. Artists who perform at venues the user has favorited
    // 3. Artists with similar genres to the user's favorite artists
    const query = `
      WITH user_favorite_artists AS (
        SELECT entity_id as artist_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'artist'
      ),
      user_favorite_venues AS (
        SELECT entity_id as venue_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'venue'
      ),
      favorite_genres AS (
        SELECT DISTINCT unnest(a.genres) as genre
        FROM artists a
        JOIN user_favorite_artists ufa ON a.id = ufa.artist_id
      ),
      co_performers AS (
        -- Artists who perform with artists the user has favorited
        SELECT DISTINCT 
          a.id,
          COUNT(DISTINCT ufa.artist_id) as connection_strength,
          1 as score_type
        FROM artists a
        JOIN event_artists ea1 ON a.id = ea1.artist_id
        JOIN events e ON ea1.event_id = e.id
        JOIN event_artists ea2 ON e.id = ea2.event_id
        JOIN user_favorite_artists ufa ON ea2.artist_id = ufa.artist_id
        WHERE a.id NOT IN (SELECT artist_id FROM user_favorite_artists)
        GROUP BY a.id
      ),
      venue_performers AS (
        -- Artists who perform at venues the user has favorited
        SELECT DISTINCT
          a.id,
          0.8 * COUNT(DISTINCT ufv.venue_id) as venue_score,
          2 as score_type
        FROM artists a
        JOIN event_artists ea ON a.id = ea.artist_id
        JOIN events e ON ea.event_id = e.id
        JOIN user_favorite_venues ufv ON e.venue_id = ufv.venue_id
        WHERE 
          a.id NOT IN (SELECT artist_id FROM user_favorite_artists)
          AND e.event_datetime >= NOW()
        GROUP BY a.id
      ),
      genre_matches AS (
        -- Artists with similar genres to the user's favorite artists
        SELECT DISTINCT
          a.id,
          0.6 * COUNT(DISTINCT fg.genre) as genre_score,
          3 as score_type
        FROM artists a
        JOIN favorite_genres fg ON fg.genre = ANY(a.genres)
        WHERE a.id NOT IN (SELECT artist_id FROM user_favorite_artists)
        GROUP BY a.id
      ),
      combined_scores AS (
        SELECT id, connection_strength as score, score_type FROM co_performers
        UNION ALL
        SELECT id, venue_score as score, score_type FROM venue_performers
        UNION ALL
        SELECT id, genre_score as score, score_type FROM genre_matches
      ),
      aggregated_scores AS (
        SELECT 
          id,
          SUM(score) as total_score,
          MIN(score_type) as best_score_type
        FROM combined_scores
        GROUP BY id
      )
      SELECT 
        a.*,
        ags.total_score as score,
        ags.best_score_type
      FROM artists a
      JOIN aggregated_scores ags ON a.id = ags.id
      ORDER BY 
        ags.best_score_type ASC,
        ags.total_score DESC
      LIMIT $2
    `;

    const result = await QueryBuilder.raw<Artist & { 
      score: number;
      best_score_type: number;
    }>(query, [userId, limit]);

    return result.rows;
  }

  /**
   * Get recommended events based on user's favorite artists and venues
   * @param userId User ID
   * @param limit Maximum number of recommendations
   * @returns Array of recommended events with score
   */
  async getRecommendedEvents(userId: number, limit: number = 10): Promise<(Event & { score: number })[]> {
    // This query finds events based on:
    // 1. Events featuring artists the user has favorited
    // 2. Events at venues the user has favorited
    // 3. Events with artists similar to the user's favorites (by genre)
    const query = `
      WITH user_favorite_artists AS (
        SELECT entity_id as artist_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'artist'
      ),
      user_favorite_venues AS (
        SELECT entity_id as venue_id
        FROM user_favorites
        WHERE user_id = $1 AND entity_type = 'venue'
      ),
      favorite_genres AS (
        SELECT DISTINCT unnest(a.genres) as genre
        FROM artists a
        JOIN user_favorite_artists ufa ON a.id = ufa.artist_id
      ),
      artist_events AS (
        -- Events featuring artists the user has favorited
        SELECT DISTINCT 
          e.id,
          2.0 * COUNT(DISTINCT ufa.artist_id) as artist_score,
          1 as score_type
        FROM events e
        JOIN event_artists ea ON e.id = ea.event_id
        JOIN user_favorite_artists ufa ON ea.artist_id = ufa.artist_id
        WHERE e.event_datetime >= NOW()
        GROUP BY e.id
      ),
      venue_events AS (
        -- Events at venues the user has favorited
        SELECT DISTINCT
          e.id,
          1.5 as venue_score,
          2 as score_type
        FROM events e
        JOIN user_favorite_venues ufv ON e.venue_id = ufv.venue_id
        WHERE e.event_datetime >= NOW()
      ),
      genre_events AS (
        -- Events with artists similar to the user's favorites (by genre)
        SELECT DISTINCT
          e.id,
          0.8 * COUNT(DISTINCT fg.genre) as genre_score,
          3 as score_type
        FROM events e
        JOIN event_artists ea ON e.id = ea.event_id
        JOIN artists a ON ea.artist_id = a.id
        JOIN favorite_genres fg ON fg.genre = ANY(a.genres)
        WHERE 
          e.event_datetime >= NOW()
          AND e.id NOT IN (SELECT id FROM artist_events)
          AND e.id NOT IN (SELECT id FROM venue_events)
        GROUP BY e.id
      ),
      combined_scores AS (
        SELECT id, artist_score as score, score_type FROM artist_events
        UNION ALL
        SELECT id, venue_score as score, score_type FROM venue_events
        UNION ALL
        SELECT id, genre_score as score, score_type FROM genre_events
      ),
      aggregated_scores AS (
        SELECT 
          id,
          SUM(score) as total_score,
          MIN(score_type) as best_score_type
        FROM combined_scores
        GROUP BY id
      )
      SELECT 
        e.*,
        v.name as venue_name,
        v.address as venue_address,
        c.name as city_name,
        c.state_province,
        c.country,
        ags.total_score as score,
        ags.best_score_type,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', a.id,
              'name', a.name,
              'genres', a.genres,
              'photo_url', a.photo_url
            )
          ) FILTER (WHERE a.id IS NOT NULL), 
          '[]'::json
        ) AS artists
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      JOIN cities c ON v.city_id = c.id
      LEFT JOIN event_artists ea ON e.id = ea.event_id
      LEFT JOIN artists a ON ea.artist_id = a.id
      JOIN aggregated_scores ags ON e.id = ags.id
      GROUP BY e.id, v.id, c.id, ags.total_score, ags.best_score_type
      ORDER BY 
        ags.best_score_type ASC,
        ags.total_score DESC,
        e.event_datetime ASC
      LIMIT $2
    `;

    const result = await QueryBuilder.raw<Event & { 
      venue_name: string;
      venue_address: string;
      city_name: string;
      state_province: string;
      country: string;
      score: number;
      best_score_type: number;
      artists: any[];
    }>(query, [userId, limit]);

    // Transform the result to include venue and artists objects
    return result.rows.map(event => ({
      ...event,
      venue: {
        id: event.venue_id,
        name: event.venue_name,
        address: event.venue_address,
        city_id: 0, // We don't have this in the query
        coordinates: { x: 0, y: 0 }, // We don't have this in the query
        capacity: null,
        website: null,
        prosper_rank: 0,
        created_at: new Date(),
        updated_at: new Date(),
        city: {
          id: 0,
          name: event.city_name,
          state_province: event.state_province,
          country: event.country,
          coordinates: { x: 0, y: 0 },
          created_at: new Date(),
          updated_at: new Date()
        }
      },
      artists: event.artists || []
    }));
  }

  /**
   * Get all recommendations for a user (venues, artists, events)
   * @param userId User ID
   * @param limit Maximum number of each type of recommendation
   * @returns Object with arrays of recommended venues, artists, and events
   */
  async getAllRecommendations(userId: number, limit: number = 5): Promise<{
    venues: (Venue & { score: number })[];
    artists: (Artist & { score: number })[];
    events: (Event & { score: number })[];
  }> {
    const [venues, artists, events] = await Promise.all([
      this.getRecommendedVenues(userId, limit),
      this.getRecommendedArtists(userId, limit),
      this.getRecommendedEvents(userId, limit)
    ]);

    return { venues, artists, events };
  }
}