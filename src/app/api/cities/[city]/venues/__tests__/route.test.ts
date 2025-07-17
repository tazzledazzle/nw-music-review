import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest } from 'next/server';

// Mock the repositories
vi.mock('@/lib/repositories/city-repository');
vi.mock('@/lib/repositories/venue-repository');

describe('/api/cities/[city]/venues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return venues for a valid city with pagination', async () => {
    const mockCities = [
      { id: 1, name: 'Seattle', state_province: 'WA', country: 'US', coordinates: { x: -122.3, y: 47.6 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueResult = {
      data: [
        { id: 1, name: 'The Crocodile', city_id: 1, address: '2200 2nd Ave', coordinates: { x: -122.3, y: 47.6 }, capacity: 500, website: 'https://thecrocodile.com', prosper_rank: 8, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'Neumos', city_id: 1, address: '925 E Pike St', coordinates: { x: -122.3, y: 47.6 }, capacity: 600, website: 'https://neumos.com', prosper_rank: 7, created_at: new Date(), updated_at: new Date() }
      ],
      total: 2,
      page: 1,
      limit: 20,
      total_pages: 1
    };

    const mockFindAll = vi.fn().mockResolvedValue(mockCities);
    const mockFindByCityId = vi.fn().mockResolvedValue(mockVenueResult);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByCityId: mockFindByCityId,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/Seattle/venues');
    const response = await GET(request, { params: { city: 'Seattle' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Seattle');
    expect(data.venues).toHaveLength(2);
    expect(data.venues[0]).toMatchObject({
      id: 1,
      name: 'The Crocodile',
      capacity: 500
    });
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      total_pages: 1
    });
    expect(mockFindByCityId).toHaveBeenCalledWith(1, {
      page: 1,
      limit: 20,
      sort_by: 'name',
      sort_dir: 'asc'
    });
  });

  it('should handle pagination parameters', async () => {
    const mockCities = [
      { id: 1, name: 'Portland', state_province: 'OR', country: 'US', coordinates: { x: -122.7, y: 45.5 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueResult = {
      data: [],
      total: 50,
      page: 2,
      limit: 10,
      total_pages: 5
    };

    const mockFindAll = vi.fn().mockResolvedValue(mockCities);
    const mockFindByCityId = vi.fn().mockResolvedValue(mockVenueResult);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByCityId: mockFindByCityId,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/Portland/venues?page=2&limit=10&sort_by=capacity&sort_dir=desc');
    const response = await GET(request, { params: { city: 'Portland' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 50,
      total_pages: 5
    });
    expect(mockFindByCityId).toHaveBeenCalledWith(1, {
      page: 2,
      limit: 10,
      sort_by: 'capacity',
      sort_dir: 'desc'
    });
  });

  it('should handle URL encoded city names', async () => {
    const mockCities = [
      { id: 1, name: 'Coeur d\'Alene', state_province: 'ID', country: 'US', coordinates: { x: -116.8, y: 47.7 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      total_pages: 0
    };

    const mockFindAll = vi.fn().mockResolvedValue(mockCities);
    const mockFindByCityId = vi.fn().mockResolvedValue(mockVenueResult);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByCityId: mockFindByCityId,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/Coeur%20d%27Alene/venues');
    const response = await GET(request, { params: { city: 'Coeur%20d%27Alene' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Coeur d\'Alene');
  });

  it('should return 404 for non-existent city', async () => {
    const mockCities = [
      { id: 1, name: 'Seattle', state_province: 'WA', country: 'US', coordinates: { x: -122.3, y: 47.6 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockFindAll = vi.fn().mockResolvedValue(mockCities);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/NonExistentCity/venues');
    const response = await GET(request, { params: { city: 'NonExistentCity' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No city found with name: NonExistentCity');
  });

  it('should return 400 for missing city parameter', async () => {
    const request = new NextRequest('http://localhost/api/cities//venues');
    const response = await GET(request, { params: { city: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('City parameter is required');
  });

  it('should handle database errors', async () => {
    const mockFindAll = vi.fn().mockRejectedValue(new Error('Database connection failed'));

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/Seattle/venues');
    const response = await GET(request, { params: { city: 'Seattle' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch venues',
      details: 'Database connection failed'
    });
  });

  it('should handle case-insensitive city matching', async () => {
    const mockCities = [
      { id: 1, name: 'Vancouver', state_province: 'BC', country: 'CA', coordinates: { x: -123.1, y: 49.3 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueResult = {
      data: [
        { id: 1, name: 'The Commodore Ballroom', city_id: 1, address: '868 Granville St', coordinates: { x: -123.1, y: 49.3 }, capacity: 990, website: null, prosper_rank: 9, created_at: new Date(), updated_at: new Date() }
      ],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1
    };

    const mockFindAll = vi.fn().mockResolvedValue(mockCities);
    const mockFindByCityId = vi.fn().mockResolvedValue(mockVenueResult);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findAll: mockFindAll,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByCityId: mockFindByCityId,
    }) as any);

    const request = new NextRequest('http://localhost/api/cities/vancouver/venues');
    const response = await GET(request, { params: { city: 'vancouver' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.city).toBe('Vancouver');
    expect(data.venues).toHaveLength(1);
  });
});