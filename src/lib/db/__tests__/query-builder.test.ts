import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryBuilder } from '../query-builder';

// Mock the database pool
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn()
};

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    vi.clearAllMocks();
    queryBuilder = new QueryBuilder('test_table', mockPool as any);
  });

  describe('Basic Query Building', () => {
    it('should build a simple SELECT query', () => {
      const query = queryBuilder.select(['id', 'name']).build();
      
      expect(query.text).toBe('SELECT id, name FROM test_table');
      expect(query.values).toEqual([]);
    });

    it('should build a SELECT query with WHERE clause', () => {
      const query = queryBuilder
        .select(['*'])
        .where('id = $1', 123)
        .build();
      
      expect(query.text).toBe('SELECT * FROM test_table WHERE id = $1');
      expect(query.values).toEqual([123]);
    });

    it('should build a query with multiple WHERE clauses', () => {
      const query = queryBuilder
        .select(['*'])
        .where('id = $1', 123)
        .where('name ILIKE $2', '%test%')
        .build();
      
      expect(query.text).toBe('SELECT * FROM test_table WHERE id = $1 AND name ILIKE $2');
      expect(query.values).toEqual([123, '%test%']);
    });

    it('should build a query with JOIN', () => {
      const query = queryBuilder
        .select(['t1.*', 't2.name'])
        .join('LEFT JOIN other_table t2 ON t1.other_id = t2.id')
        .build();
      
      expect(query.text).toBe('SELECT t1.*, t2.name FROM test_table t1 LEFT JOIN other_table t2 ON t1.other_id = t2.id');
    });

    it('should build a query with ORDER BY', () => {
      const query = queryBuilder
        .select(['*'])
        .orderBy('name', 'ASC')
        .build();
      
      expect(query.text).toBe('SELECT * FROM test_table ORDER BY name ASC');
    });

    it('should build a query with LIMIT', () => {
      const query = queryBuilder
        .select(['*'])
        .limit(10)
        .build();
      
      expect(query.text).toBe('SELECT * FROM test_table LIMIT 10');
    });

    it('should build a query with OFFSET', () => {
      const query = queryBuilder
        .select(['*'])
        .limit(10)
        .offset(20)
        .build();
      
      expect(query.text).toBe('SELECT * FROM test_table LIMIT 10 OFFSET 20');
    });
  });

  describe('Complex Query Building', () => {
    it('should build a complex query with all clauses', () => {
      const query = queryBuilder
        .select(['t1.*', 't2.name AS other_name'])
        .join('LEFT JOIN other_table t2 ON t1.other_id = t2.id')
        .where('t1.active = $1', true)
        .where('t2.category = $2', 'test')
        .orderBy('t1.created_at', 'DESC')
        .limit(20)
        .offset(40)
        .build();
      
      const expectedQuery = 'SELECT t1.*, t2.name AS other_name FROM test_table t1 ' +
        'LEFT JOIN other_table t2 ON t1.other_id = t2.id ' +
        'WHERE t1.active = $1 AND t2.category = $2 ' +
        'ORDER BY t1.created_at DESC LIMIT 20 OFFSET 40';
      
      expect(query.text).toBe(expectedQuery);
      expect(query.values).toEqual([true, 'test']);
    });
  });

  describe('Query Execution', () => {
    it('should execute a query and return results', async () => {
      const mockResults = {
        rows: [
          { id: 1, name: 'Test 1' },
          { id: 2, name: 'Test 2' }
        ],
        rowCount: 2
      };

      mockPool.query.mockResolvedValue(mockResults);

      const results = await queryBuilder
        .select(['*'])
        .execute();

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM test_table',
        []
      );
      expect(results).toEqual(mockResults.rows);
    });

    it('should execute a single result query', async () => {
      const mockResults = {
        rows: [{ id: 1, name: 'Test 1' }],
        rowCount: 1
      };

      mockPool.query.mockResolvedValue(mockResults);

      const result = await queryBuilder
        .select(['*'])
        .where('id = $1', 1)
        .executeSingle();

      expect(result).toEqual({ id: 1, name: 'Test 1' });
    });

    it('should return null for single result query with no results', async () => {
      const mockResults = {
        rows: [],
        rowCount: 0
      };

      mockPool.query.mockResolvedValue(mockResults);

      const result = await queryBuilder
        .select(['*'])
        .where('id = $1', 999)
        .executeSingle();

      expect(result).toBeNull();
    });

    it('should execute paginated query', async () => {
      const mockCountResult = {
        rows: [{ count: '50' }],
        rowCount: 1
      };

      const mockDataResult = {
        rows: [
          { id: 1, name: 'Test 1' },
          { id: 2, name: 'Test 2' }
        ],
        rowCount: 2
      };

      mockPool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const result = await queryBuilder
        .select(['*'])
        .executePaginated(2, 10);

      expect(result).toEqual({
        data: mockDataResult.rows,
        total: 50,
        page: 2,
        limit: 10,
        total_pages: 5
      });

      // Should execute count query first
      expect(mockPool.query).toHaveBeenNthCalledWith(1,
        'SELECT COUNT(*) as count FROM test_table',
        []
      );

      // Then execute data query with pagination
      expect(mockPool.query).toHaveBeenNthCalledWith(2,
        'SELECT * FROM test_table LIMIT 10 OFFSET 10',
        []
      );
    });
  });

  describe('Insert Operations', () => {
    it('should build and execute INSERT query', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'New Test', created_at: new Date() }],
        rowCount: 1
      };

      mockPool.query.mockResolvedValue(mockResult);

      const data = { name: 'New Test', active: true };
      const result = await queryBuilder.insert(data);

      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, active) VALUES ($1, $2) RETURNING *',
        ['New Test', true]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should handle INSERT with no data', async () => {
      await expect(queryBuilder.insert({})).rejects.toThrow('No data provided for insert');
    });
  });

  describe('Update Operations', () => {
    it('should build and execute UPDATE query', async () => {
      const mockResult = {
        rows: [{ id: 1, name: 'Updated Test', updated_at: new Date() }],
        rowCount: 1
      };

      mockPool.query.mockResolvedValue(mockResult);

      const data = { name: 'Updated Test' };
      const result = await queryBuilder.update(1, data);

      expect(mockPool.query).toHaveBeenCalledWith(
        'UPDATE test_table SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        ['Updated Test', 1]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when UPDATE affects no rows', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await queryBuilder.update(999, { name: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    it('should build and execute DELETE query', async () => {
      const mockResult = {
        rows: [],
        rowCount: 1
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await queryBuilder.delete(1);

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM test_table WHERE id = $1',
        [1]
      );
      expect(result).toBe(true);
    });

    it('should return false when DELETE affects no rows', async () => {
      const mockResult = {
        rows: [],
        rowCount: 0
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await queryBuilder.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('Genre Filtering', () => {
    it('should apply genre filter to queries', () => {
      queryBuilder.setGenreFilter('rock');
      
      const query = queryBuilder
        .select(['*'])
        .where('active = $1', true)
        .build();

      expect(query.text).toContain('genres @> $');
      expect(query.values).toContain('rock');
    });

    it('should not apply genre filter when not set', () => {
      const query = queryBuilder
        .select(['*'])
        .where('active = $1', true)
        .build();

      expect(query.text).not.toContain('genres @>');
      expect(query.values).toEqual([true]);
    });
  });

  describe('Query Parameters Application', () => {
    it('should apply query parameters correctly', () => {
      const params = {
        sort_by: 'name',
        sort_dir: 'DESC' as const,
        limit: 25,
        page: 2
      };

      queryBuilder.applyQueryParams(params);
      const query = queryBuilder.select(['*']).build();

      expect(query.text).toContain('ORDER BY name DESC');
      expect(query.text).toContain('LIMIT 25');
      expect(query.text).toContain('OFFSET 25'); // (page - 1) * limit
    });

    it('should handle default query parameters', () => {
      const params = {};

      queryBuilder.applyQueryParams(params);
      const query = queryBuilder.select(['*']).build();

      // Should not add any clauses for empty params
      expect(query.text).toBe('SELECT * FROM test_table');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const mockError = new Error('Connection failed');
      mockPool.query.mockRejectedValue(mockError);

      await expect(queryBuilder.select(['*']).execute()).rejects.toThrow('Connection failed');
    });

    it('should handle SQL syntax errors', async () => {
      const mockError = new Error('syntax error at or near "SELCT"');
      mockPool.query.mockRejectedValue(mockError);

      await expect(queryBuilder.select(['*']).execute()).rejects.toThrow('syntax error');
    });
  });

  describe('Raw Queries', () => {
    it('should execute raw SQL queries', async () => {
      const mockResult = {
        rows: [{ count: 5 }],
        rowCount: 1
      };

      mockPool.query.mockResolvedValue(mockResult);

      const result = await QueryBuilder.raw('SELECT COUNT(*) as count FROM custom_table WHERE active = $1', [true], mockPool);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM custom_table WHERE active = $1',
        [true]
      );
      expect(result).toEqual(mockResult);
    });
  });
});