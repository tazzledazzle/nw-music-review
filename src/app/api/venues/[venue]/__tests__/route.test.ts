import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest } from 'next/server';

// Mock the repository
vi.mock('@/lib/repositories/venue-repository');

describe('/api/venues/[venue]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return venue details for a valid venue ID', async () => {
    const mockVenue = {
      id: 1,
      name: 'The Crocodile',
      city_id: 1,
      address: '2200 2nd Ave, Seattle, WA 98121',
      coordinates: { x: -122.3428, y: 47.6131 },
      capacity: 500,
      website: 'https://thecrocodile.com',
      prosper_rank: 8,
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      city: {
        id: 1,
        name: 'Seattle',
        state_province: 'WA',
        country: 'US',
        coordinates: { x: -122.3321, y: 47.6062 },
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      }
    };

    const mockFindByIdWithCity = vi.fn().mockResolvedValue(mockVenue);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByIdWithCity: mockFindByIdWithCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/venues/1');
    const response = await GET(request, { params: { venue: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.venue).toMatchObject({
      id: 1,
      name: 'The Crocodile',
      capacity: 500,
      city: {
        name: 'Seattle',
        state_province: 'WA'
      }
    });
    expect(mockFindByIdWithCity).toHaveBeenCalledWith(1);
  });

  it('should return 404 for non-existent venue ID', async () => {
    const mockFindByIdWithCity = vi.fn().mockResolvedValue(null);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByIdWithCity: mockFindByIdWithCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/venues/999');
    const response = await GET(request, { params: { venue: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No venue found with ID: 999');
    expect(mockFindByIdWithCity).toHaveBeenCalledWith(999);
  });

  it('should return 400 for invalid venue ID format', async () => {
    const request = new NextRequest('http://localhost/api/venues/invalid');
    const response = await GET(request, { params: { venue: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Venue ID must be a valid number');
  });

  it('should return 400 for missing venue parameter', async () => {
    const request = new NextRequest('http://localhost/api/venues/');
    const response = await GET(request, { params: { venue: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Venue parameter is required');
  });

  it('should handle database errors', async () => {
    const mockFindByIdWithCity = vi.fn().mockRejectedValue(new Error('Database connection failed'));

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByIdWithCity: mockFindByIdWithCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/venues/1');
    const response = await GET(request, { params: { venue: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch venue',
      details: 'Database connection failed'
    });
  });

  it('should handle venue with null capacity and website', async () => {
    const mockVenue = {
      id: 2,
      name: 'Small Local Venue',
      city_id: 2,
      address: '123 Main St',
      coordinates: { x: -122.0, y: 47.0 },
      capacity: null,
      website: null,
      prosper_rank: 3,
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      city: {
        id: 2,
        name: 'Spokane',
        state_province: 'WA',
        country: 'US',
        coordinates: { x: -117.4260, y: 47.6587 },
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      }
    };

    const mockFindByIdWithCity = vi.fn().mockResolvedValue(mockVenue);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByIdWithCity: mockFindByIdWithCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/venues/2');
    const response = await GET(request, { params: { venue: '2' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.venue).toMatchObject({
      id: 2,
      name: 'Small Local Venue',
      capacity: null,
      website: null,
      prosper_rank: 3
    });
  });

  it('should handle large venue ID numbers', async () => {
    const mockVenue = {
      id: 2147483647, // Max 32-bit integer
      name: 'Large ID Venue',
      city_id: 1,
      address: '456 Test Ave',
      coordinates: { x: -122.0, y: 47.0 },
      capacity: 1000,
      website: 'https://example.com',
      prosper_rank: 5,
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      city: {
        id: 1,
        name: 'Seattle',
        state_province: 'WA',
        country: 'US',
        coordinates: { x: -122.3321, y: 47.6062 },
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01')
      }
    };

    const mockFindByIdWithCity = vi.fn().mockResolvedValue(mockVenue);

    vi.mocked(VenueRepository).mockImplementation(() => ({
      findByIdWithCity: mockFindByIdWithCity,
    }) as any);

    const request = new NextRequest('http://localhost/api/venues/2147483647');
    const response = await GET(request, { params: { venue: '2147483647' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.venue.id).toBe(2147483647);
    expect(mockFindByIdWithCity).toHaveBeenCalledWith(2147483647);
  });
});