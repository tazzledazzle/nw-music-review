import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../route';
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';

// Mock the repositories
vi.mock('@/lib/repositories/city-repository');
vi.mock('@/lib/repositories/venue-repository');

describe('City Venues API with Genre Filtering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should apply genre filter from request headers', async () => {
    // Mock city data
    const mockCity = { id: 1, name: 'Seattle', state_province: 'WA', country: 'US' };
    
    // Mock repository methods
    CityRepository.prototype.findAll = vi.fn().mockResolvedValue([mockCity]);
    
    const mockSetGenreFilter = vi.fn().mockReturnThis();
    const mockFindByCityId = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Venue 1' }],
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1
    });
    
    VenueRepository.prototype.setGenreFilter = mockSetGenreFilter;
    VenueRepository.prototype.findByCityId = mockFindByCityId;

    // Create mock request with genre header
    const mockRequest = {
      url: 'http://example.com/api/cities/Seattle/venues',
      headers: {
        get: vi.fn().mockImplementation((name) => {
          if (name === 'x-genre-filter') return 'rock';
          return null;
        })
      },
      nextUrl: {
        searchParams: new URLSearchParams()
      }
    } as unknown as NextRequest;

    // Call the API handler
    const response = await GET(mockRequest, { params: { city: 'Seattle' } });
    const responseData = await response.json();

    // Verify genre filter was applied
    expect(mockSetGenreFilter).toHaveBeenCalledWith('rock');
    expect(responseData.genre).toBe('rock');
  });

  it('should not apply genre filter when header is not present', async () => {
    // Mock city data
    const mockCity = { id: 1, name: 'Seattle', state_province: 'WA', country: 'US' };
    
    // Mock repository methods
    CityRepository.prototype.findAll = vi.fn().mockResolvedValue([mockCity]);
    
    const mockSetGenreFilter = vi.fn().mockReturnThis();
    const mockFindByCityId = vi.fn().mockResolvedValue({
      data: [{ id: 1, name: 'Venue 1' }],
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1
    });
    
    VenueRepository.prototype.setGenreFilter = mockSetGenreFilter;
    VenueRepository.prototype.findByCityId = mockFindByCityId;

    // Create mock request without genre header
    const mockRequest = {
      url: 'http://example.com/api/cities/Seattle/venues',
      headers: {
        get: vi.fn().mockReturnValue(null)
      },
      nextUrl: {
        searchParams: new URLSearchParams()
      }
    } as unknown as NextRequest;

    // Call the API handler
    const response = await GET(mockRequest, { params: { city: 'Seattle' } });
    const responseData = await response.json();

    // Verify genre filter was not applied
    expect(mockSetGenreFilter).not.toHaveBeenCalledWith('rock');
    expect(responseData.genre).toBeNull();
  });
});