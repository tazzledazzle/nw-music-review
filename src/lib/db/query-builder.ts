import { Pool, QueryResult, QueryResultRow } from 'pg';
import pool from '../db';
import { QueryParams, PaginatedResult } from '../models/types';

/**
 * Database query builder utility class
 * Provides methods for building and executing SQL queries
 */
export class QueryBuilder {
  private pool: Pool;
  private table: string;
  private selectColumns: string[];
  private whereConditions: string[];
  private whereParams: unknown[];
  private orderByClause: string | null;
  private limitValue: number | null;
  private offsetValue: number | null;
  private joinClauses: string[];
  private groupByClause: string | null;
  private paramCount: number;
  private genreFilter: string | null;

  /**
   * Create a new QueryBuilder instance
   * @param table The database table name
   * @param pool Optional database pool (uses default if not provided)
   */
  constructor(table: string, _pool?: Pool) {
    this.pool = pool || _pool;
    this.table = table;
    this.selectColumns = ['*'];
    this.whereConditions = [];
    this.whereParams = [];
    this.orderByClause = null;
    this.limitValue = null;
    this.offsetValue = null;
    this.joinClauses = [];
    this.groupByClause = null;
    this.paramCount = 0;
    this.genreFilter = null;
  }
  
  /**
   * Set genre filter for content filtering
   * @param genre Genre to filter by
   */
  setGenreFilter(genre: string | null): QueryBuilder {
    this.genreFilter = genre;
    return this;
  }

  /**
   * Set the columns to select
   * @param columns Array of column names or expressions
   */
  select(columns: string[]): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  /**
   * Add a WHERE condition
   * @param condition SQL condition with $1, $2, etc. placeholders
   * @param params Parameters for the condition
   */
  where(condition: string, ...params: unknown[]): QueryBuilder {
    this.whereConditions.push(condition);
    this.whereParams.push(...params);
    return this;
  }

  /**
   * Add a JOIN clause
   * @param joinClause Complete join clause (e.g., "LEFT JOIN users ON users.id = posts.user_id")
   */
  join(joinClause: string): QueryBuilder {
    this.joinClauses.push(joinClause);
    return this;
  }

  /**
   * Set the ORDER BY clause
   * @param column Column name or expression
   * @param direction Sort direction ('ASC' or 'DESC')
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `${column} ${direction}`;
    return this;
  }

  /**
   * Set the LIMIT clause
   * @param limit Maximum number of rows to return
   */
  limit(limit: number): QueryBuilder {
    this.limitValue = limit;
    return this;
  }

  /**
   * Set the OFFSET clause
   * @param offset Number of rows to skip
   */
  offset(offset: number): QueryBuilder {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Set the GROUP BY clause
   * @param columns Columns to group by
   */
  groupBy(columns: string): QueryBuilder {
    this.groupByClause = columns;
    return this;
  }

  /**
   * Apply pagination parameters
   * @param page Page number (1-based)
   * @param limit Items per page
   */
  paginate(page: number = 1, limit: number = 20): QueryBuilder {
    const offset = (page - 1) * limit;
    this.limit(limit);
    this.offset(offset);
    return this;
  }

  /**
   * Apply query parameters for filtering and pagination
   * @param params Query parameters object
   */
  applyQueryParams(params: QueryParams): QueryBuilder {
    // Apply pagination
    if (params.page && params.limit) {
      this.paginate(params.page, params.limit);
    }

    // Apply sorting
    if (params.sort_by) {
      const direction = params.sort_dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      this.orderBy(params.sort_by, direction as 'ASC' | 'DESC');
    }

    // Filter out pagination and sorting params
    const filterParams = { ...params };
    delete filterParams.page;
    delete filterParams.limit;
    delete filterParams.sort_by;
    delete filterParams.sort_dir;

    // Apply remaining params as filters
    Object.entries(filterParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        this.paramCount++;
        this.where(`${key} = $${this.paramCount}`, value);
      }
    });

    return this;
  }

  /**
   * Build the complete SQL query
   */
  buildQuery(): { text: string; values: unknown[] } {
    let query = `SELECT ${this.selectColumns.join(', ')} FROM ${this.table}`;

    // Add joins
    if (this.joinClauses.length > 0) {
      query += ' ' + this.joinClauses.join(' ');
    }

    // Add where conditions
    const hasWhereConditions = this.whereConditions.length > 0;
    
    // Start WHERE clause if there are conditions
    if (hasWhereConditions) {
      query += ' WHERE ' + this.whereConditions.join(' AND ');
    }
    
    // Add genre filtering if applicable
    // This is handled differently depending on the table
    if (this.genreFilter) {
      // For artists table, filter directly by genres array
      if (this.table === 'artists') {
        const paramIndex = this.whereParams.length + 1;
        const genreCondition = `$${paramIndex} = ANY(genres)`;
        query += hasWhereConditions ? ` AND ${genreCondition}` : ` WHERE ${genreCondition}`;
        this.whereParams.push(this.genreFilter);
      }
      // For events table, join with artists and filter by their genres
      else if (this.table === 'events') {
        // Only add the join if it's not already present
        if (!this.joinClauses.some(join => join.includes('event_artists'))) {
          query += ` LEFT JOIN event_artists ON ${this.table}.id = event_artists.event_id`;
          query += ` LEFT JOIN artists ON event_artists.artist_id = artists.id`;
        }
        
        const paramIndex = this.whereParams.length + 1;
        const genreCondition = `$${paramIndex} = ANY(artists.genres)`;
        query += hasWhereConditions ? ` AND ${genreCondition}` : ` WHERE ${genreCondition}`;
        this.whereParams.push(this.genreFilter);
      }
      // For venues table, join with events and artists to filter by genre
      else if (this.table === 'venues') {
        // Only add the joins if they're not already present
        if (!this.joinClauses.some(join => join.includes('events'))) {
          query += ` LEFT JOIN events ON ${this.table}.id = events.venue_id`;
          query += ` LEFT JOIN event_artists ON events.id = event_artists.event_id`;
          query += ` LEFT JOIN artists ON event_artists.artist_id = artists.id`;
        }
        
        const paramIndex = this.whereParams.length + 1;
        const genreCondition = `$${paramIndex} = ANY(artists.genres)`;
        query += hasWhereConditions ? ` AND ${genreCondition}` : ` WHERE ${genreCondition}`;
        this.whereParams.push(this.genreFilter);
        
        // Add DISTINCT to avoid duplicate venues
        if (!this.selectColumns.some(col => col.includes('DISTINCT'))) {
          query = query.replace('SELECT ', 'SELECT DISTINCT ');
        }
      }
    }

    // Add group by
    if (this.groupByClause) {
      query += ` GROUP BY ${this.groupByClause}`;
    }

    // Add order by
    if (this.orderByClause) {
      query += ` ORDER BY ${this.orderByClause}`;
    }

    // Add limit and offset
    if (this.limitValue !== null) {
      query += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== null) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return {
      text: query,
      values: this.whereParams,
    };
  }

  /**
   * Execute the query and return all results
   */
  async execute<T>(): Promise<T[]> {
    const { text, values } = this.buildQuery();
    const result = await this.pool.query(text, values);
    return result.rows as T[];
  }

  /**
   * Execute the query and return a single result
   */
  async executeSingle<T>(): Promise<T | null> {
    const { text, values } = this.buildQuery();
    const result = await this.pool.query(text, values);
    return result.rows.length > 0 ? (result.rows[0] as T) : null;
  }

  /**
   * Execute the query and return paginated results
   */
  async executePaginated<T>(page: number = 1, limit: number = 20): Promise<PaginatedResult<T>> {
    // Clone the current query builder for the count query
    const countBuilder = new QueryBuilder(this.table, this.pool);
    countBuilder.selectColumns = ['COUNT(*) AS total'];
    countBuilder.whereConditions = [...this.whereConditions];
    countBuilder.whereParams = [...this.whereParams];
    countBuilder.joinClauses = [...this.joinClauses];
    countBuilder.genreFilter = this.genreFilter; // Copy genre filter

    // Execute count query
    const countResult = await countBuilder.executeSingle<{ total: string }>();
    const total = countResult ? parseInt(countResult.total, 10) : 0;

    // Apply pagination to the original query
    this.paginate(page, limit);

    // Execute the paginated query
    const data = await this.execute<T>();

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  /**
   * Insert a new record
   * @param data Object with column values
   */
  async insert<T>(data: Record<string, unknown>): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = {
      text: `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    };

    const result = await this.pool.query(query);
    return result.rows[0] as T;
  }

  /**
   * Update an existing record
   * @param id Record ID
   * @param data Object with column values to update
   */
  async update<T>(id: number, data: Record<string, unknown>): Promise<T | null> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const query = {
      text: `UPDATE ${this.table} SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      values: [...values, id],
    };

    const result = await this.pool.query(query);
    return result.rows.length > 0 ? (result.rows[0] as T) : null;
  }

  /**
   * Delete a record
   * @param id Record ID
   */
  async delete(id: number): Promise<boolean> {
    const query = {
      text: `DELETE FROM ${this.table} WHERE id = $1`,
      values: [id],
    };

    const result = await this.pool.query(query);
    return result.rowCount! > 0;
  }

  /**
   * Execute a raw SQL query
   * @param text SQL query text
   * @param values Query parameters
   */
  static async raw<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    return await pool.query(text, values);
  }
}