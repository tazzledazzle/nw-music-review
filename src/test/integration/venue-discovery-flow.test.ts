import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

// Import API route handlers
import { GET as getRegions } from '@/app/api/regions/route';
import { GET as getCities } from '@/app/api/regions/[region]/cities/route';
import { GET as getVenues } from '@/app/api/cities/[city]/venues/route';
import { GET as getVenue } from '@/app/api/venues/[venue]/route';
import { GET as getVenueEvents } from '@/app/api/venues/[venue]/events/route';

// Import repositories for mocking and direct access
import { CityRepository } from '@/lib/repositories/city-repository';
import { VenueRepository } from '@/lib/repositories/venue-repository';
import { EventRepository } from '@/lib/repositories/event-repository';

describe('Venue Discovery Flow Integration Tests', () => {

  // Mock all repository dependencies
  vi.mock('@/lib/repositories/city-repository');
  vi.mock('@/lib/repositories/venue-repository');
  vi.mock('@/lib/repositories/event-repository');

  // Repositories are now imported at the top of the file
  beforeAll(() => {
  // Setup mock data for the complete flow

    // Mock regions data
    CityRepository.prototype.findRegions = vi.fn().mockResolvedValue([
      { region: 'WA', city_count: 5 },
      { region: 'OR', city_count: 3 },
      { region: 'ID', city_count: 2 },
      { region: 'BC', city_count: 4 }
    ]);

    // Mock cities data
    CityRepository.prototype.findByRegion = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Seattle',
          state_province: 'WA',
          country: 'US',
          coordinates: { x: -122.3321, y: 47.6062 },
          venue_count: 25
        },
        {
          id: 2,
          name: 'Tacoma',
          state_province: 'WA',
          country: 'US',
          coordinates: { x: -122.4443, y: 47.2529 },
          venue_count: 8
        }
      ],
      total: 2,
      page: 1,
      limit: 20,
      total_pages: 1
    });

    // Mock venues data
    VenueRepository.prototype.findByCityId = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'The Crocodile',
          address: '2200 2nd Ave, Seattle, WA 98121',
          coordinates: { x: -122.3421, y: 47.6131 },
          capacity: 400,
          website: 'https://thecrocodile.com',
          prosper_rank: 8,
          city_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 2,
          name: 'Neumos',
          address: '925 E Pike St, Seattle, WA 98122',
          coordinates: { x: -122.3201, y: 47.6142 },
          capacity: 600,
          website: 'https://neumos.com',
          prosper_rank: 7,
          city_id: 1,
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      total: 2,
      page: 1,
      limit: 20,
      total_pages: 1
    });

    // Mock single venue data
    VenueRepository.prototype.findByIdWithCity = vi.fn().mockResolvedValue({
      id: 1,
      name: 'The Crocodile',
      address: '2200 2nd Ave, Seattle, WA 98121',
      coordinates: { x: -122.3421, y: 47.6131 },
      capacity: 400,
      website: 'https://thecrocodile.com',
      prosper_rank: 8,
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
    });

    // Mock events data
    EventRepository.prototype.findByVenueId = vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          venue_id: 1,
          title: 'Indie Rock Night',
          description: 'Local indie bands showcase',
          event_datetime: new Date('2024-12-15T20:00:00Z'),
          ticket_url: 'https://tickets.example.com/indie-rock-night',
          external_id: 'ext123',
          created_at: new Date(),
          updated_at: new Date(),
          artists: [
            {
              id: 1,
              name: 'The Local Band',
              genres: ['indie', 'rock'],
              photo_url: 'https://example.com/band.jpg',
              profile_bio: 'Seattle-based indie rock band'
            }
          ]
        }
      ],
      total: 1,
      page: 1,
      limit: 100,
      total_pages: 1
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should complete the full venue discovery flow: regions → cities → venues → venue details → events', async () => {
    // Step 1: Get regions
    const regionsRequest = new NextRequest('http://localhost/api/regions');
    const regionsResponse = await getRegions(regionsRequest);
    const regionsData = await regionsResponse.json();

    expect(regionsResponse.status).toBe(200);
    expect(regionsData.regions).toHaveLength(4);
    expect(regionsData.regions[0]).toEqual({
      region: 'WA',
      city_count: 5
    });

    // Step 2: Get cities in Washington
    const citiesRequest = new NextRequest('http://localhost/api/regions/WA/cities');
    const citiesResponse = await getCities(citiesRequest, { params: { region: 'WA' } });
    const citiesData = await citiesResponse.json();

    expect(citiesResponse.status).toBe(200);
    expect(citiesData.cities.data).toHaveLength(2);
    expect(citiesData.cities.data[0]).toEqual(expect.objectContaining({
      name: 'Seattle',
      state_province: 'WA',
      venue_count: 25
    }));

    // Step 3: Get venues in Seattle
    const venuesRequest = new NextRequest('http://localhost/api/cities/1/venues');
    const venuesResponse = await getVenues(venuesRequest, { params: { city: '1' } });
    const venuesData = await venuesResponse.json();

    expect(venuesResponse.status).toBe(200);
    expect(venuesData.venues.data).toHaveLength(2);
    expect(venuesData.venues.data[0]).toEqual(expect.objectContaining({
      name: 'The Crocodile',
      capacity: 400,
      prosper_rank: 8
    }));

    // Step 4: Get specific venue details
    const venueRequest = new NextRequest('http://localhost/api/venues/1');
    const venueResponse = await getVenue(venueRequest, { params: { venue: '1' } });
    const venueData = await venueResponse.json();

    expect(venueResponse.status).toBe(200);
    expect(venueData.venue).toEqual(expect.objectContaining({
      name: 'The Crocodile',
      address: '2200 2nd Ave, Seattle, WA 98121',
      city: expect.objectContaining({
        name: 'Seattle',
        state_province: 'WA'
      })
    }));

    // Step 5: Get venue events
    const eventsRequest = new NextRequest('http://localhost/api/venues/1/events');
    const eventsResponse = await getVenueEvents(eventsRequest, { params: { venue: '1' } });
    const eventsData = await eventsResponse.json();

    expect(eventsResponse.status).toBe(200);
    expect(eventsData.events.data).toHaveLength(1);
    expect(eventsData.events.data[0]).toEqual(expect.objectContaining({
      title: 'Indie Rock Night',
      venue_id: 1,
      artists: expect.arrayContaining([
        expect.objectContaining({
          name: 'The Local Band',
          genres: ['indie', 'rock']
        })
      ])
    }));
  });

  it('should handle the flow with pagination', async () => {
    // Test pagination in the cities step
    const citiesRequest = new NextRequest('http://localhost/api/regions/WA/cities?page=1&limit=1');
    const citiesResponse = await getCities(citiesRequest, { params: { region: 'WA' } });
    const citiesData = await citiesResponse.json();

    expect(citiesResponse.status).toBe(200);
    expect(citiesData.cities.pagination).toEqual(expect.objectContaining({
      page: 1,
      limit: 1,
      total: 2,
      total_pages: 2
    }));

    // Test pagination in the venues step
    const venuesRequest = new NextRequest('http://localhost/api/cities/1/venues?page=1&limit=1');
    const venuesResponse = await getVenues(venuesRequest, { params: { city: '1' } });
    const venuesData = await venuesResponse.json();

    expect(venuesResponse.status).toBe(200);
    expect(venuesData.venues.pagination).toEqual(expect.objectContaining({
      page: 1,
      limit: 1,
      total: 2,
      total_pages: 2
    }));
    // Mock a database error
    CityRepository.prototype.findRegions.mockRejectedValueOnce(new Error('Database connection failed'));
    // Mock a database error
    (CityRepository.prototype.findRegions as any).mockRejectedValueOnce(new Error('Database connection failed'));

    const regionsRequest = new NextRequest('http://localhost/api/regions');
    const regionsResponse = await getRegions(regionsRequest);
    const regionsData = await regionsResponse.json();

    expect(regionsResponse.status).toBe(500);
    expect(regionsData.error).toBe('Failed to fetch regions');
  });

  it('should handle venue not found error', async () => {
    // Mock venue not found
    (VenueRepository.prototype.findByIdWithCity as any).mockResolvedValueOnce(null);

    const venueRequest = new NextRequest('http://localhost/api/venues/999');
    const venueResponse = await getVenue(venueRequest, { params: { venue: '999' } });
    const venueData = await venueResponse.json();

    expect(venueResponse.status).toBe(404);
    expect(venueData.error).toBe('No venue found with ID: 999');
  });

  it('should validate input parameters throughout the flow', async () => {
    // Test invalid venue ID
    const venueRequest = new NextRequest('http://localhost/api/venues/invalid');
    const venueResponse = await getVenue(venueRequest, { params: { venue: 'invalid' } });
    const venueData = await venueResponse.json();

    expect(venueResponse.status).toBe(400);
    expect(venueData.error).toBe('Venue ID must be a valid number');

    // Test invalid city ID
    const venuesRequest = new NextRequest('http://localhost/api/cities/invalid/venues');
    const venuesResponse = await getVenues(venuesRequest, { params: { city: 'invalid' } });
    const venuesData = await venuesResponse.json();

    expect(venuesResponse.status).toBe(400);
    expect(venuesData.error).toBe('City ID must be a valid number');
  });
});