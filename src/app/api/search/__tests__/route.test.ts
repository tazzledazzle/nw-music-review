import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { elasticsearchService } from '@/lib/search/elasticsearch';
import { NextRequest } from 'next/server';

// Mock the elasticsearch service
vi.mock('@/lib/search/elasticsearch', () => ({
  elasticsearchService: {
    healthCheck: vi.fn(),
    searchAll: vi.fn(),
    searchVenues: vi.fn(),
    searchArtists: vi.fn(),
    searchEvents: vi.fn()
  }
}));

describe('/api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return search results for all content types', async () => {
    const mockResults = {
      venues: { total: 1, hits: [{ _source: { id: 1, name: 'Test Venue' }, _score: 1.0 }] },
      artists: { total: 1, hits: [{ _source: { id: 1, name: 'Test Artist' }, _score: 1.0 }] },
      events: { total: 1, hits: [{ _source: { id: 1, title: 'Test Event' }, _score: 1.0 }] },
      total: 3
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchAll as any).mockResolvedValue(mockResults);

    const request = new NextRequest('http://localhost/api/search?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.query).toBe('test');
    expect(data.type).toBe('all');
    expect(data.results.venues.total).toBe(1);
    expect(data.results.artists.total).toBe(1);
    expect(data.results.events.total).toBe(1);
    expect(data.pagination.total).toBe(3);
  });

  it('should return 400 when query parameter is missing', async () => {
    const request = new NextRequest('http://localhost/api/search');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid query parameters');
    expect(data.details).toBeDefined();
  });

  it('should return 503 when elasticsearch is unhealthy', async () => {
    (elasticsearchService.healthCheck as any).mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/search?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Search service is currently unavailable');
  });

  it('should search venues only when type=venue', async () => {
    const mockVenueResults = {
      total: 1,
      hits: [{ _source: { id: 1, name: 'Test Venue' }, _score: 1.0 }]
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchVenues as any).mockResolvedValue(mockVenueResults);

    const request = new NextRequest('http://localhost/api/search?q=test&type=venue');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('venue');
    expect(data.results.venues.total).toBe(1);
    expect(data.results.artists.total).toBe(0);
    expect(data.results.events.total).toBe(0);
    expect(elasticsearchService.searchVenues).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('should search artists only when type=artist', async () => {
    const mockArtistResults = {
      total: 1,
      hits: [{ _source: { id: 1, name: 'Test Artist' }, _score: 1.0 }]
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchArtists as any).mockResolvedValue(mockArtistResults);

    const request = new NextRequest('http://localhost/api/search?q=test&type=artist');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('artist');
    expect(data.results.venues.total).toBe(0);
    expect(data.results.artists.total).toBe(1);
    expect(data.results.events.total).toBe(0);
    expect(elasticsearchService.searchArtists).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('should search events only when type=event', async () => {
    const mockEventResults = {
      total: 1,
      hits: [{ _source: { id: 1, title: 'Test Event' }, _score: 1.0 }]
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchEvents as any).mockResolvedValue(mockEventResults);

    const request = new NextRequest('http://localhost/api/search?q=test&type=event');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.type).toBe('event');
    expect(data.results.venues.total).toBe(0);
    expect(data.results.artists.total).toBe(0);
    expect(data.results.events.total).toBe(1);
    expect(elasticsearchService.searchEvents).toHaveBeenCalledWith('test', expect.any(Object));
  });

  it('should handle pagination parameters correctly', async () => {
    const mockResults = {
      venues: { total: 0, hits: [] },
      artists: { total: 0, hits: [] },
      events: { total: 0, hits: [] },
      total: 0
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchAll as any).mockResolvedValue(mockResults);

    const request = new NextRequest('http://localhost/api/search?q=test&page=2&limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(elasticsearchService.searchAll).toHaveBeenCalledWith('test', {
      page: 2,
      limit: 5,
      sort_by: undefined,
      sort_dir: 'desc'
    });
  });

  it('should handle genre filtering from headers', async () => {
    const mockResults = {
      venues: { total: 0, hits: [] },
      artists: { total: 0, hits: [] },
      events: { total: 0, hits: [] },
      total: 0
    };

    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchVenues as any).mockResolvedValue({ total: 0, hits: [] });
    (elasticsearchService.searchArtists as any).mockResolvedValue({ total: 0, hits: [] });
    (elasticsearchService.searchEvents as any).mockResolvedValue({ total: 0, hits: [] });

    const request = new NextRequest('http://localhost/api/search?q=test');
    request.headers.set('x-genre-filter', 'rock');
    
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(elasticsearchService.searchArtists).toHaveBeenCalledWith('test', 
      expect.objectContaining({ genres: ['rock'] })
    );
    expect(elasticsearchService.searchEvents).toHaveBeenCalledWith('test', 
      expect.objectContaining({ genres: ['rock'] })
    );
  });

  it('should validate query parameters and return 400 for invalid values', async () => {
    const request = new NextRequest('http://localhost/api/search?q=test&limit=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid query parameters');
    expect(data.details).toBeDefined();
  });

  it('should handle elasticsearch service errors gracefully', async () => {
    (elasticsearchService.healthCheck as any).mockResolvedValue(true);
    (elasticsearchService.searchAll as any).mockRejectedValue(new Error('Elasticsearch error'));

    const request = new NextRequest('http://localhost/api/search?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});