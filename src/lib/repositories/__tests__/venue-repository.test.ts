import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VenueRepository } from '../venue-repository';
import { QueryBuilder } from '../../db/query-builder';

// Mock the QueryBuilder
vi.mock('../../db/query-builder', () => ({
  QueryBuilder: vi.fn().mockImplementation(() => ({
    where: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    applyQueryParams: vi.fn().mockReturnThis(),
    execute: vi.fn(),
    executeSingle: vi.fn(),
    executePaginated: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  })),
  raw: vi.fn()
}));

// Mock the database pool
vi.mock('../../db', () => ({
  default: {
    connect: vi.fn(),
    query: vi.fn()
  }
}));

describe('VenueRepository', () => {
  let venueRepository: VenueRepository;
  let mockQueryBuilder: any;

  beforeEach(() => {
    vi.clearAllMocks();
    venueRepository = new VenueRepository();
    mockQueryBuilder = new (QueryBuilder as any)();
    
    // Mock createQueryBuilder to return our mock
    vi.spyOn(venueRepository as any, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);
  });

  describe('findByCityId', () => {
    it('should find venues by city ID with pagination', async () => {
      const mockVenues = {
        data: [
          { id: 1, name: 'Venue 1', city_id: 1 },
          { id: 2, name: 'Venue 2', city_id: 1 }
        ],
        total: 2,
        page: 1,
        limit: 20,
        total_pages: 1
      };

      mockQueryBuilder.executePaginated.mockResolvedValue(mockVenues);

      const result = await venueRepository.findByCityId(1, { page: 1, limit: 20 });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('city_id = $1', 1);
      expect(mockQueryBuilder.applyQueryParams).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(mockQueryBuilder.executePaginated).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockVenues);
    });

    it('should use default pagination when no params provided', async () => {
      const mockVenues = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0
      };

      mockQueryBuilder.executePaginated.mockResolvedValue(mockVenues);

      await venueRepository.findByCityId(1);

      expect(mockQueryBuilder.executePaginated).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('findNearby', () => {
    it('should find venues near a geographic point', async () => {
      const mockVenues = [
        { id: 1, name: 'Nearby Venue', distance_km: 2.5 }
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockVenues);

      const point = { x: -122.4194, y: 37.7749 };
      const result = await venueRepository.findNearby(point, 10, 20);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'venues.*',
        'ST_Distance(venues.coordinates, ST_MakePoint($1, $2)::geometry) / 1000 AS distance_km'
      ]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ST_DWithin(venues.coordinates, ST_MakePoint($1, $2)::geometry, $3 * 1000)',
        -122.4194, 37.7749, 10
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('distance_km', 'ASC');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual(mockVenues);
    });

    it('should use default limit when not provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue([]);

      const point = { x: -122.4194, y: 37.7749 };
      await venueRepository.findNearby(point, 10);

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('findWithCity', () => {
    it('should find venues with city information', async () => {
      const mockVenues = [
        {
          id: 1,
          name: 'Test Venue',
          city_id: 1,
          city_name: 'Seattle',
          state_province: 'WA',
          country: 'US'
        }
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockVenues);

      const result = await venueRepository.findWithCity();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'venues.*',
        'cities.name AS city_name',
        'cities.state_province',
        'cities.country'
      ]);
      expect(mockQueryBuilder.join).toHaveBeenCalledWith('LEFT JOIN cities ON venues.city_id = cities.id');
      
      // Check that the result includes the transformed city object
      expect(result[0]).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test Venue',
        city: expect.objectContaining({
          id: 1,
          name: 'Seattle',
          state_province: 'WA',
          country: 'US'
        })
      }));
    });
  });

  describe('findByIdWithCity', () => {
    it('should find a venue by ID with city information', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          name: 'Test Venue',
          city_id: 1,
          city_name: 'Seattle',
          state_province: 'WA',
          country: 'US',
          city_coordinates: { x: -122.3321, y: 47.6062 }
        }]
      };

      (QueryBuilder.raw as any).mockResolvedValue(mockResult);

      const result = await venueRepository.findByIdWithCity(1);

      expect(QueryBuilder.raw).toHaveBeenCalledWith(expect.any(String), [1]);
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test Venue',
        city: expect.objectContaining({
          id: 1,
          name: 'Seattle',
          state_province: 'WA',
          country: 'US',
          coordinates: { x: -122.3321, y: 47.6062 }
        })
      }));
    });

    it('should return null when venue not found', async () => {
      const mockResult = { rows: [] };
      (QueryBuilder.raw as any).mockResolvedValue(mockResult);

      const result = await venueRepository.findByIdWithCity(999);

      expect(result).toBeNull();
    });
  });

  describe('searchByName', () => {
    it('should search venues by name with ILIKE', async () => {
      const mockVenues = [
        { id: 1, name: 'Test Venue' }
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockVenues);

      const result = await venueRepository.searchByName('test', 10);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('name ILIKE $1', '%test%');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockVenues);
    });

    it('should use default limit when not provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue([]);

      await venueRepository.searchByName('test');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getVenueCountsByCity', () => {
    it('should return venue counts grouped by city', async () => {
      const mockResult = {
        rows: [
          { city_id: 1, city_name: 'Seattle', venue_count: 5 },
          { city_id: 2, city_name: 'Portland', venue_count: 3 }
        ]
      };

      (QueryBuilder.raw as any).mockResolvedValue(mockResult);

      const result = await venueRepository.getVenueCountsByCity();

      expect(QueryBuilder.raw).toHaveBeenCalledWith(expect.stringContaining('GROUP BY'));
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('findWithGeographicFiltering', () => {
    it('should find venues with geographic and capacity filtering', async () => {
      const mockResult = {
        data: [
          { id: 1, name: 'Test Venue', distance_km: 2.5 }
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1
      };

      mockQueryBuilder.executePaginated.mockResolvedValue(mockResult);

      const params = {
        lat: 47.6062,
        lon: -122.3321,
        radius: 10,
        min_capacity: 100,
        max_capacity: 1000,
        state_province: 'WA',
        country: 'US',
        page: 1,
        limit: 20
      };

      const result = await venueRepository.findWithGeographicFiltering(params);

      expect(mockQueryBuilder.join).toHaveBeenCalledWith('LEFT JOIN cities ON venues.city_id = cities.id');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.arrayContaining([
        expect.stringContaining('distance_km')
      ]));
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ST_DWithin(venues.coordinates, ST_MakePoint($1, $2)::geometry, $3 * 1000)',
        47.6062, -122.3321, 10
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle filtering without geographic coordinates', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0
      };

      mockQueryBuilder.executePaginated.mockResolvedValue(mockResult);

      const params = {
        min_capacity: 100,
        state_province: 'WA'
      };

      await venueRepository.findWithGeographicFiltering(params);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(expect.not.arrayContaining([
        expect.stringContaining('distance_km')
      ]));
    });
  });

  describe('searchVenues', () => {
    it('should search venues with multiple criteria', async () => {
      const mockVenues = [
        { id: 1, name: 'Test Venue', city_name: 'Seattle' }
      ];

      mockQueryBuilder.execute.mockResolvedValue(mockVenues);

      const result = await venueRepository.searchVenues('test', {
        state_province: 'WA',
        country: 'US'
      });

      expect(mockQueryBuilder.join).toHaveBeenCalledWith('LEFT JOIN cities ON venues.city_id = cities.id');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('venues.name ILIKE $1', '%test%');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cities.state_province = $1', 'WA');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('cities.country = $1', 'US');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('venues.prosper_rank', 'DESC');
      expect(result).toEqual(mockVenues);
    });
  });
});