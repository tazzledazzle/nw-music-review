import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest } from 'next/server';

// Mock the repositories
vi.mock('@/lib/repositories/city-repository');
vi.mock('@/lib/repositories/venue-repository');

describe('/api/regions/[region]/cities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cities with venue counts for a valid region', async () => {
    const mockCities = [
      { id: 1, name: 'Seattle', state_province: 'WA', country: 'US', coordinates: { x: -122.3, y: 47.6 }, created_at: new Date(), updated_at: new Date() },
      { id: 2, name: 'Spokane', state_province: 'WA', country: 'US', coordinates: { x: -117.4, y: 47.7 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueCounts = [
      { city_id: 1, city_name: 'Seattle', venue_count: 15 },
      { city_id: 2, city_name: 'Spokane', venue_count: 5 }
    ];

    const mockFindByStateProvince = vi.fn().mockResolvedValue(mockCities);
    const mockGetVenueCountsByCity = vi.fn().mockResolvedValue(mockVenueCounts);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findByStateProvince: mockFindByStateProvince,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      getVenueCountsByCity: mockGetVenueCountsByCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/regions/WA/cities');
    const response = await GET(request, { params: { region: 'WA' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.region).toBe('WA');
    expect(data.cities).toHaveLength(2);
    expect(data.cities[0]).toMatchObject({
      id: 1,
      name: 'Seattle',
      venue_count: 15
    });
    expect(data.cities[1]).toMatchObject({
      id: 2,
      name: 'Spokane',
      venue_count: 5
    });
    expect(mockFindByStateProvince).toHaveBeenCalledWith('WA');
    expect(mockGetVenueCountsByCity).toHaveBeenCalledOnce();
  });

  it('should return 404 for region with no cities', async () => {
    const mockFindByStateProvince = vi.fn().mockResolvedValue([]);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findByStateProvince: mockFindByStateProvince,
    }) as any);

    const request = new NextRequest('http://localhost/api/regions/XX/cities');
    const response = await GET(request, { params: { region: 'XX' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No cities found in region: XX');
  });

  it('should handle cities with zero venue counts', async () => {
    const mockCities = [
      { id: 3, name: 'Small Town', state_province: 'ID', country: 'US', coordinates: { x: -116.2, y: 43.6 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueCounts = []; // No venues for this city

    const mockFindByStateProvince = vi.fn().mockResolvedValue(mockCities);
    const mockGetVenueCountsByCity = vi.fn().mockResolvedValue(mockVenueCounts);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findByStateProvince: mockFindByStateProvince,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      getVenueCountsByCity: mockGetVenueCountsByCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/regions/ID/cities');
    const response = await GET(request, { params: { region: 'ID' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cities[0]).toMatchObject({
      id: 3,
      name: 'Small Town',
      venue_count: 0
    });
  });

  it('should sort cities alphabetically by name', async () => {
    const mockCities = [
      { id: 2, name: 'Spokane', state_province: 'WA', country: 'US', coordinates: { x: -117.4, y: 47.7 }, created_at: new Date(), updated_at: new Date() },
      { id: 1, name: 'Seattle', state_province: 'WA', country: 'US', coordinates: { x: -122.3, y: 47.6 }, created_at: new Date(), updated_at: new Date() },
      { id: 3, name: 'Bellingham', state_province: 'WA', country: 'US', coordinates: { x: -122.5, y: 48.8 }, created_at: new Date(), updated_at: new Date() }
    ];

    const mockVenueCounts = [
      { city_id: 1, city_name: 'Seattle', venue_count: 15 },
      { city_id: 2, city_name: 'Spokane', venue_count: 5 },
      { city_id: 3, city_name: 'Bellingham', venue_count: 3 }
    ];

    const mockFindByStateProvince = vi.fn().mockResolvedValue(mockCities);
    const mockGetVenueCountsByCity = vi.fn().mockResolvedValue(mockVenueCounts);

    vi.mocked(CityRepository).mockImplementation(() => ({
      findByStateProvince: mockFindByStateProvince,
    }) as any);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      getVenueCountsByCity: mockGetVenueCountsByCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/regions/WA/cities');
    const response = await GET(request, { params: { region: 'WA' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cities.map((city: any) => city.name)).toEqual(['Bellingham', 'Seattle', 'Spokane']);
  });

  it('should handle database errors', async () => {
    const mockFindByStateProvince = vi.fn().mockRejectedValue(new Error('Database connection failed'));

    vi.mocked(CityRepository).mockImplementation(() => ({
      findByStateProvince: mockFindByStateProvince,
    }) as any);

    const request = new NextRequest('http://localhost/api/regions/WA/cities');
    const response = await GET(request, { params: { region: 'WA' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch cities',
      details: 'Database connection failed'
    });
  });
});