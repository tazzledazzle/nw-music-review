import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { elasticsearchService } from '@/lib/search/elasticsearch';

// Mock the Elasticsearch service
vi.mock('@/lib/search/elasticsearch', () => ({
  elasticsearchService: {
    healthCheck: vi.fn(),
    searchAll: vi.fn(),
    searchVenues: vi.fn(),
    searchArtists: vi.fn(),
    searchEvents: vi.fn()
  }
}));

const mockElasticsearchService = elasticsearchService as {
  healthCheck: Mock;
  searchAll: Mock;
  searchVenues: Mock;
  searchArtists: Mock;
  searchEvents: Mock;
};

describe('/api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElasticsearchService.healthCheck.mockResolvedValue(true);
  });

  const createRequest = (searchParams: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/search');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const mockSearchResults = {
    venues: {
      total: 2,
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
    },
    artists: {
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
    },
    events: {
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
    },
    total: 4
  };

  describe('Parameter validation', () => {
    it('should require query parameter', async () => {
      const request = createRequest({});
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate page parameter', async () => {
      const request = createRequest({ q: 'test', page: '0' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate limit parameter', async () => {
      const request = createRequest({ q: 'test', limit: '100' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should validate type parameter', async () => {
      const request = createRequest({ q: 'test', type: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('Search functionality', () => {

    it('should search all content types by default', async () => {
      mockElasticsearchService.searchAll.mockResolvedValue(mockSearchResults);

      const request = createRequest({ q: 'test' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockElasticsearchService.searchAll).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        sort_by: undefined,
        sort_dir: 'desc'
      });
      expect(data.query).toBe('test');
      expect(data.type).toBe('all');
      expect(data.results.venues.total).toBe(2);
      expect(data.results.artists.total).toBe(1);
      expect(data.results.events.total).toBe(1);
    });

    it('should search venues only when type=venue', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue(mockSearchResults.venues);

      const request = createRequest({ q: 'test', type: 'venue' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockElasticsearchService.searchVenues).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        capacity_min: undefined,
        capacity_max: undefined,
        prosper_rank_min: undefined,
        state_province: undefined,
        country: undefined,
        sort_by: undefined,
        sort_dir: 'desc'
      });
      expect(data.results.venues.total).toBe(2);
      expect(data.results.artists.total).toBe(0);
      expect(data.results.events.total).toBe(0);
    });

    it('should search artists only when type=artist', async () => {
      mockElasticsearchService.searchArtists.mockResolvedValue(mockSearchResults.artists);

      const request = createRequest({ q: 'test', type: 'artist' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockElasticsearchService.searchArtists).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        genres: undefined,
        has_bio: undefined,
        has_photo: undefined,
        sort_by: undefined,
        sort_dir: 'desc'
      });
      expect(data.results.venues.total).toBe(0);
      expect(data.results.artists.total).toBe(1);
      expect(data.results.events.total).toBe(0);
    });

    it('should search events only when type=event', async () => {
      mockElasticsearchService.searchEvents.mockResolvedValue(mockSearchResults.events);

      const request = createRequest({ q: 'test', type: 'event' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockElasticsearchService.searchEvents).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        start_date: undefined,
        end_date: undefined,
        genres: undefined,
        has_tickets: undefined,
        sort_by: undefined,
        sort_dir: 'desc'
      });
      expect(data.results.venues.total).toBe(0);
      expect(data.results.artists.total).toBe(0);
      expect(data.results.events.total).toBe(1);
    });

    it('should handle filtering parameters', async () => {
      mockElasticsearchService.searchVenues.mockResolvedValue(mockSearchResults.venues);

      const request = createRequest({
        q: 'test',
        type: 'venue',
        genres: 'rock,indie',
        state_province: 'WA,OR',
        capacity_min: '100',
        capacity_max: '1000',
        prosper_rank_min: '3'
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(mockElasticsearchService.searchVenues).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        capacity_min: 100,
        capacity_max: 1000,
        prosper_rank_min: 3,
        state_province: ['WA', 'OR'],
        country: undefined,
        sort_by: undefined,
        sort_dir: 'desc'
      });
    });

    it('should handle date filtering for events', async () => {
      mockElasticsearchService.searchEvents.mockResolvedValue(mockSearchResults.events);

      const request = createRequest({
        q: 'test',
        type: 'event',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        has_tickets: 'true'
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      expect(mockElasticsearchService.searchEvents).toHaveBeenCalledWith('test', {
        page: 1,
        limit: 10,
        start_date: new Date('2024-01-01T00:00:00Z'),
        end_date: new Date('2024-12-31T23:59:59Z'),
        genres: undefined,
        has_tickets: true,
        sort_by: undefined,
        sort_dir: 'desc'
      });
    });

    it('should handle pagination', async () => {
      mockElasticsearchService.searchAll.mockResolvedValue(mockSearchResults);

      const request = createRequest({ q: 'test', page: '2', limit: '5' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(5);
      expect(data.pagination.total_pages).toBe(1); // Math.ceil(4 / 5)
    });
  });

  describe('Error handling', () => {
    it('should return 503 when Elasticsearch is unhealthy', async () => {
      mockElasticsearchService.healthCheck.mockResolvedValue(false);

      const request = createRequest({ q: 'test' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Search service is currently unavailable');
    });

    it('should return 500 on internal server error', async () => {
      mockElasticsearchService.healthCheck.mockRejectedValue(new Error('Database error'));

      const request = createRequest({ q: 'test' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response format', () => {
    it('should return properly formatted response', async () => {
      mockElasticsearchService.searchAll.mockResolvedValue(mockSearchResults);

      const request = createRequest({ q: 'test', genres: 'rock' });
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('query', 'test');
      expect(data).toHaveProperty('type', 'all');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('filters');

      expect(data.results).toHaveProperty('venues');
      expect(data.results).toHaveProperty('artists');
      expect(data.results).toHaveProperty('events');

      expect(data.results.venues).toHaveProperty('total');
      expect(data.results.venues).toHaveProperty('items');

      expect(data.filters.genres).toEqual(['rock']);
    });

    it('should include score in search results', async () => {
      mockElasticsearchService.searchAll.mockResolvedValue(mockSearchResults);

      const request = createRequest({ q: 'test' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.results.venues.items[0]).toHaveProperty('score', 1.5);
      expect(data.results.artists.items[0]).toHaveProperty('score', 1.2);
      expect(data.results.events.items[0]).toHaveProperty('score', 1.3);
    });
  });
});