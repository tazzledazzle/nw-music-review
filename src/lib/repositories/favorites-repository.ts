import { QueryBuilder } from '../db/query-builder';
import { UserFavorite, Artist, Venue, PaginatedResult } from '../models/types';

/**
 * Repository for user favorites-related database operations
 */
export class FavoritesRepository {
  private queryBuilder: QueryBuilder;

  constructor() {
    this.queryBuilder = new QueryBuilder('user_favorites');
  }

  /**
   * Add a favorite item for a user
   * @param userId User ID
   * @param entityType Type of entity ('venue' or 'artist')
   * @param entityId Entity ID
   * @returns Created favorite object
   */
  async addFavorite(userId: number, entityType: 'venue' | 'artist', entityId: number): Promise<UserFavorite> {
    try {
      return await this.queryBuilder.insert<UserFavorite>({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
      });
    } catch (error: any) {
      // Handle duplicate key error (favorite already exists)
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        // Return the existing favorite
        return await this.getFavorite(userId, entityType, entityId) as UserFavorite;
      }
      throw error;
    }
  }

  /**
   * Remove a favorite item for a user
   * @param userId User ID
   * @param entityType Type of entity ('venue' or 'artist')
   * @param entityId Entity ID
   * @returns True if removed, false if not found
   */
  async removeFavorite(userId: number, entityType: 'venue' | 'artist', entityId: number): Promise<boolean> {
    const result = await QueryBuilder.raw(
      'DELETE FROM user_favorites WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3',
      [userId, entityType, entityId]
    );
    return result.rowCount > 0;
  }

  /**
   * Check if an item is a favorite for a user
   * @param userId User ID
   * @param entityType Type of entity ('venue' or 'artist')
   * @param entityId Entity ID
   * @returns Favorite object or null if not found
   */
  async getFavorite(userId: number, entityType: 'venue' | 'artist', entityId: number): Promise<UserFavorite | null> {
    return await new QueryBuilder('user_favorites')
      .where('user_id = $1', userId)
      .where('entity_type = $2', entityType)
      .where('entity_id = $3', entityId)
      .executeSingle<UserFavorite>();
  }

  /**
   * Get all favorites for a user
   * @param userId User ID
   * @param entityType Optional entity type filter ('venue' or 'artist')
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated favorites
   */
  async getUserFavorites(
    userId: number,
    entityType?: 'venue' | 'artist',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<UserFavorite>> {
    const builder = new QueryBuilder('user_favorites')
      .where('user_id = $1', userId);

    if (entityType) {
      builder.where('entity_type = $2', entityType);
    }

    return await builder
      .orderBy('created_at', 'DESC')
      .executePaginated<UserFavorite>(page, limit);
  }

  /**
   * Get favorite venues for a user with venue details
   * @param userId User ID
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated venue objects
   */
  async getUserFavoriteVenues(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Venue>> {
    const offset = (page - 1) * limit;
    
    // Count total favorites
    const countResult = await QueryBuilder.raw<{ total: string }>(
      `SELECT COUNT(*) as total FROM user_favorites uf
       JOIN venues v ON uf.entity_id = v.id
       WHERE uf.user_id = $1 AND uf.entity_type = 'venue'`,
      [userId]
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get favorite venues with details
    const result = await QueryBuilder.raw<Venue>(
      `SELECT v.* FROM user_favorites uf
       JOIN venues v ON uf.entity_id = v.id
       WHERE uf.user_id = $1 AND uf.entity_type = 'venue'
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return {
      data: result.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get favorite artists for a user with artist details
   * @param userId User ID
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated artist objects
   */
  async getUserFavoriteArtists(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<Artist>> {
    const offset = (page - 1) * limit;
    
    // Count total favorites
    const countResult = await QueryBuilder.raw<{ total: string }>(
      `SELECT COUNT(*) as total FROM user_favorites uf
       JOIN artists a ON uf.entity_id = a.id
       WHERE uf.user_id = $1 AND uf.entity_type = 'artist'`,
      [userId]
    );
    
    const total = parseInt(countResult.rows[0].total, 10);
    
    // Get favorite artists with details
    const result = await QueryBuilder.raw<Artist>(
      `SELECT a.* FROM user_favorites uf
       JOIN artists a ON uf.entity_id = a.id
       WHERE uf.user_id = $1 AND uf.entity_type = 'artist'
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return {
      data: result.rows,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }
}