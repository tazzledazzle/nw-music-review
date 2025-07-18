import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { NextRequest } from 'next/server';

// Mock the VenueRepository
vi.mock('@/lib/repositories/venue-repository', () => ({
  VenueRepository: vi.fn().mockImplementation(() => ({
    findByIdWithCity: vi.fn()
  }))
}));

describe('/api/venues/[venue]', () => {
  let mockVenueRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVenueRepository = new (VenueRepository as any)();
  });

  it('should return venue data when venue exists', async () => {
    const mockVenue = {
      id: 1,
      name: 'Test Venue',
      address: '123 Test St',
      coordinates: { x: -122.4194, y: 37.7749 },
      capacity: 500,
      website: 'https://testvenue.com',
      prosper_rank: 5,
      city_id: 1,
      created_at: new Date(),
      updated_at: new Date(),
      city: {
        id: 1,
        name: 'Seattle',
        state_province: 'WA',
        country: 'US',
        coordinates: { x: -122.3321, y: 47.6062 },
        created_at: new Date(),
        updated_at: new Date()
      }
    };

    mockVenueRepository.findByIdWithCity.mockResolvedValue(mockVenue);

    const request = new NextRequest('http://localhost/api/venues/1');
    const response = await GET(request, { params: { venue: '1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      venue: mockVenue
    });
    expect(mockVenueRepository.findByIdWithCity).toHaveBeenCalledWith(1);
  });

  it('should return 404 when venue does not exist', async () => {
    mockVenueRepository.findByIdWithCity.mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/venues/999');
    const response = await GET(request, { params: { venue: '999' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      error: 'No venue found with ID: 999'
    });
  });

  it('should return 400 when venue parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/venues/');
    const response = await GET(request, { params: { venue: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Venue parameter is required'
    });
  });

  it('should return 400 when venue ID is not a valid number', async () => {
    const request = new NextRequest('http://localhost/api/venues/invalid');
    const response = await GET(request, { params: { venue: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: 'Venue ID must be a valid number'
    });
  });

  it('should handle database errors gracefully', async () => {
    const mockError = new Error('Database connection failed');
    mockVenueRepository.findByIdWithCity.mockRejectedValue(mockError);

    const request = new NextRequest('http://localhost/api/venues/1');
    const response = await GET(request, { params: { venue: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch venue',
      details: 'Database connection failed'
    });
  });

  it('should handle unknown errors gracefully', async () => {
    mockVenueRepository.findByIdWithCity.mockRejectedValue('Unknown error');

    const request = new NextRequest('http://localhost/api/venues/1');
    const response = await GET(request, { params: { venue: '1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Failed to fetch venue',
      details: 'Unknown error'
    });
  });
});