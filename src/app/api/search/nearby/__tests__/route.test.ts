import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { elasticsearchService } from '@/lib/search/elasticsearch';

// Mock the Elasticsearch service
vi.mock('@/lib/search/elasticsearch', () => ({
  elasticsearchService: {
    healthCheck: vi.fn(),
    searchVenues: vi.fn(),
    searchArtists: vi.fn(),
    searchEvents: vi.fn()
  }
}));

const mockElasticsearchService = elasticsearchService as {
  healthCheck: Mock;
  searchVenues: Mock;
  searchArtists: Mock;
  searchEvents: Mock;
};

describe('/api/search/nearby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElasticsearchService.healthCheck.mockResolvedValue(true);
  });

  const createRequest = (searchParams: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/search/nearby');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  describe('Parameter validation', () => {
    it('should require lat and lon parameters', async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate latitude range', async () => {
      const request = createRequest({ lat: '100', lon: '-122' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate longitude range', async () => {
      const request = createRequest({ lat: '47', lon: '200' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate radius range', async () => {
      const request = createRequest({ lat: '47', lon: '-122', radius: '1000' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should reject coordinates outside Pacific Northwest region', async () => {
      // New York coordinates
      const request = createRequest({ lat: '40.7128', lon: '-74.0060' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Location is outside supported regions');
      expect(data.message).toBe('This service only covers Washington, Oregon, Idaho, and British Columbia');
    });

    it('should accept coordinates within Pacific Northwest region', async () => {
      // Seattle coordinates
      mockElasticsearchService.searchVenues.mockResolvedValue({ total: 0, hits: [] });
      mockElasticsearchService.searchEvents.mockResolvedValue({ total: 0, hits: [] });
      mockElasticsearchService.searchArtists.mockResolvedValue({ total: 0, hits: [] });

      const request = createRequest({ lat: '47.6062', lon: '-122.3321' });
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Geographic search functionality', () => {
    const mockVenueResults = {
      total: 1,
      hits: [
        {
          _source: {
            id: 1,
            name: 'Test Venue',
            address: '123 Test St',
            location: { lat: 47.6062, lon: -122.3321 },
            capacity: 500,
            prosper_rank: 5,
            city: { id: 1, name: 'Seattle', state_province: 'WA', country: 'US' }
          },
          _score: 1.5
        }
      ]
    };

    const mockEventResults = {
      total: 1,
      hits: [
        {
          _source: {
            id: 1,
            title: 'Test Event',
            description: 'Test description',
            event_datetime: '2024-12-01T20:00:00Z',
            ticket_url: 'https://example.com/tickets',
            venue: {
              id: 1,
              name: 'Test Venue',
              location: { lat: 47.6062, lon: -122.3321 },
              city: { name: 'Seattle', state_province: 'WA', country: 'US' }
            },
            artists: [{ id: 1, name: 'Test Artist', genres: ['rock'] }]
          },
          _score: 1.3
        }
      ]
    };

    const mockArtistResults = {
      total: 1,
      hits: [
        {
          _source: {
            id: 1,
            name: 'Test Artist',
            genres: ['rock', 'indie'],
            photo_url: 'https://example.com/photo.jpg',
            profile_bio: 'Test bio'
          },
          _score: 1.2
        }
      ]
    };

    it('should search all content types by default', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue(mockVenueResults);
      mockElasticsearchService.searchEvents.mockResolvedValue(mockEventResults);
      mockElasticsearchService.searchArtists.mockResolvedValue(mockArtistResults);

      const request = createRequest({ lat: '47.6062', lon: '-122.3321' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.location).toEqual({ lat: 47.6062, lon: -122.3321 });
      expect(data.radius).toBe(25); // Default radius
      expect(data.results.venues.total).toBe(1);
      expect(data.results.events.total).toBe(1);
    });

    it('should search venues with geographic filtering', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue(mockVenueResults);

      const request = createRequest({
        lat: '47.6062',
        lon: '-122.3321',
        radius: '10',
        type: 'venue',
        q: 'test'
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(mockElasticsearchService.searchVenues).toHaveBeenCalledWith('test', {
        lat: 47.6062,
        lon: -122.3321,
        radius: 10,
        page: 1,
        limit: 10,
        capacity_min: undefined,
        capacity_max: undefined,
        prosper_rank_min: undefined
      });
    });

    it('should search events with geographic filtering', async () => {
      mockElasticsearchService.searchEvents.mockResolvedValue(mockEventResults);

      const request = createRequest({
        lat: '47.6062',
        lon: '-122.3321',
        radius: '15',
        type: 'event',
        upcoming_only: 'true'
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const callArgs = mockElasticsearchService.searchEvents.mock.calls[0][1];
      expect(callArgs.lat).toBe(47.6062);
      expect(callArgs.lon).toBe(-122.3321);
      expect(callArgs.radius).toBe(15);
      expect(callArgs.start_date).toBeInstanceOf(Date);
      expect(callArgs.start_date.getTime()).toBeGreaterThan(Date.now() - 1000); // Within last second
    });

    it('should calculate distances for venues', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue(mockVenueResults);

      const request = createRequest({
        lat: '47.6000', // Slightly different from venue location
        lon: '-122.3000',
        type: 'venue'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.venues.items[0]).toHaveProperty('distance');
      expect(typeof data.results.venues.items[0].distance).toBe('number');
      expect(data.results.venues.items[0].distance).toBeGreaterThan(0);
    });

    it('should calculate distances for events', async () => {
      mockElasticsearchService.searchEvents.mockResolvedValue(mockEventResults);

      const request = createRequest({
        lat: '47.6000',
        lon: '-122.3000',
        type: 'event'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.events.items[0]).toHaveProperty('distance');
      expect(data.results.events.items[0].venue).toHaveProperty('distance');
      expect(typeof data.results.events.items[0].distance).toBe('number');
    });

    it('should sort by distance when sort_by_distance is true', async () => {
      const multipleVenueResults = {
        total: 2,
        hits: [
          {
            _source: {
              id: 1,
              name: 'Far Venue',
              address: '123 Far St',
              location: { lat: 47.7000, lon: -122.4000 }, // Further away
              capacity: 500,
              prosper_rank: 5,
              city: { id: 1, name: 'Seattle', state_province: 'WA', country: 'US' }
            },
            _score: 2.0
          },
          {
            _source: {
              id: 2,
              name: 'Near Venue',
              address: '456 Near St',
              location: { lat: 47.6100, lon: -122.3300 }, // Closer
              capacity: 300,
              prosper_rank: 3,
              city: { id: 1, name: 'Seattle', state_province: 'WA', country: 'US' }
            },
            _score: 1.0
          }
        ]
      };

      mockElasticsearchService.searchVenues.mockResolvedValue(multipleVenueResults);

      const request = createRequest({
        lat: '47.6062',
        lon: '-122.3321',
        type: 'venue',
        sort_by_distance: 'true'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should be sorted by distance (closer first)
      expect(data.results.venues.items[0].name).toBe('Near Venue');
      expect(data.results.venues.items[1].name).toBe('Far Venue');
    });

    it('should handle artist search through events', async () => {
      const eventWithArtists = {
        total: 2,
        hits: [
          {
            _source: {
              id: 1,
              title: 'Event 1',
              event_datetime: '2024-12-01T20:00:00Z',
              venue: { location: { lat: 47.6062, lon: -122.3321 } },
              artists: [
                { id: 1, name: 'Artist One', genres: ['rock'] },
                { id: 2, name: 'Artist Two', genres: ['indie'] }
              ]
            },
            _score: 1.0
          },
          {
            _source: {
              id: 2,
              title: 'Event 2',
              event_datetime: '2024-12-02T20:00:00Z',
              venue: { location: { lat: 47.6062, lon: -122.3321 } },
              artists: [
                { id: 1, name: 'Artist One', genres: ['rock'] }, // Duplicate
                { id: 3, name: 'Artist Three', genres: ['jazz'] }
              ]
            },
            _score: 1.0
          }
        ]
      };

      mockElasticsearchService.searchEvents.mockResolvedValue(eventWithArtists);

      const request = createRequest({
        lat: '47.6062',
        lon: '-122.3321',
        type: 'artist'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.artists.total).toBe(3); // Unique artists
      expect(data.results.artists.items).toHaveLength(3);
      
      const artistNames = data.results.artists.items.map((item: any) => item.name);
      expect(artistNames).toContain('Artist One');
      expect(artistNames).toContain('Artist Two');
      expect(artistNames).toContain('Artist Three');
    });
  });

  describe('Error handling', () => {
    it('should return 503 when Elasticsearch is unhealthy', async () => {
      mockElasticsearchService.healthCheck.mockResolvedValue(false);

      const request = createRequest({ lat: '47.6062', lon: '-122.3321' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Search service is currently unavailable');
    });

    it('should return 500 on internal server error', async () => {
      mockElasticsearchService.healthCheck.mockRejectedValue(new Error('Database error'));

      const request = createRequest({ lat: '47.6062', lon: '-122.3321' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response format', () => {
    it('should return properly formatted response', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue({ total: 0, hits: [] });
      mockElasticsearchService.searchEvents.mockResolvedValue({ total: 0, hits: [] });
      mockElasticsearchService.searchArtists.mockResolvedValue({ total: 0, hits: [] });

      const request = createRequest({
        lat: '47.6062',
        lon: '-122.3321',
        radius: '20',
        q: 'test'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('query', 'test');
      expect(data).toHaveProperty('location', { lat: 47.6062, lon: -122.3321 });
      expect(data).toHaveProperty('radius', 20);
      expect(data).toHaveProperty('type', 'all');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('filters');

      expect(data.results).toHaveProperty('venues');
      expect(data.results).toHaveProperty('artists');
      expect(data.results).toHaveProperty('events');
    });

    it('should include distance calculations in results', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue({
        total: 1,
        hits: [{
          _source: {
            id: 1,
            name: 'Test Venue',
            location: { lat: 47.6062, lon: -122.3321 }
          },
          _score: 1.0
        }]
      });
      mockElasticsearchService.searchEvents.mockResolvedValue({ total: 0, hits: [] });
      mockElasticsearchService.searchArtists.mockResolvedValue({ total: 0, hits: [] });

      const request = createRequest({
        lat: '47.6000',
        lon: '-122.3000',
        type: 'venue'
      });

      const response = await GET(request);
      const data = await response.json();

      expect(data.results.venues.items[0]).toHaveProperty('distance');
      expect(typeof data.results.venues.items[0].distance).toBe('number');
    });
  });
});