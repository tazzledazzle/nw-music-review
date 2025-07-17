import { Pool } from 'pg';
import pool from '../db'
import { QueryBuilder } from '../db/query-builder';
import { BaseEntity, QueryParams, PaginatedResult } from '../models/types';

/**
 * Base repository class that implements common CRUD operations
 * @template T The entity type
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected pool: Pool;
  protected tableName: string;

  /**
   * Create a new repository instance
   * @param tableName The database table name
   * @param pool Optional database pool (uses default if not provided)
   */
  constructor(tableName: string, other_pool?: Pool) {
    this.pool = pool || other_pool;
    this.tableName = tableName;
  }

  /**
   * Create a new query builder instance
   */
  protected createQueryBuilder(): QueryBuilder {
    return new QueryBuilder(this.tableName, this.pool);
  }

  /**
   * Find an entity by ID
   * @param id Entity ID
   */
  async findById(id: number): Promise<T | null> {
    return this.createQueryBuilder()
      .where('id = $1', id)
      .executeSingle<T>();
  }

  /**
   * Find all entities
   * @param params Optional query parameters
   */
  async findAll(params?: QueryParams): Promise<T[]> {
    const builder = this.createQueryBuilder();
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    return builder.execute<T>();
  }

  /**
   * Find entities with pagination
   * @param params Query parameters
   */
  async findPaginated(params: QueryParams): Promise<PaginatedResult<T>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    
    const builder = this.createQueryBuilder();
    builder.applyQueryParams(params);
    
    return builder.executePaginated<T>(page, limit);
  }

  /**
   * Create a new entity
   * @param data Entity data
   */
  async create(data: Partial<T>): Promise<T> {
    return this.createQueryBuilder().insert<T>(data);
  }

  /**
   * Update an existing entity
   * @param id Entity ID
   * @param data Updated entity data
   */
  async update(id: number, data: Partial<T>): Promise<T | null> {
    return this.createQueryBuilder().update<T>(id, data);
  }

  /**
   * Delete an entity
   * @param id Entity ID
   */
  async delete(id: number): Promise<boolean> {
    return this.createQueryBuilder().delete(id);
  }

  /**
   * Count entities matching the given criteria
   * @param params Query parameters
   */
  async count(params?: QueryParams): Promise<number> {
    const builder = this.createQueryBuilder().select(['COUNT(*) as count']);
    
    if (params) {
      builder.applyQueryParams(params);
    }
    
    const result = await builder.executeSingle<{ count: string }>();
    return result ? parseInt(result.count, 10) : 0;
  }
}