import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { ElasticsearchService, INDICES } from '../elasticsearch';
import { IndexingService } from '../indexing-service';

// Mock the Elasticsearch client
vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({
    indices: {
      exists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue({}),
      refresh: vi.fn().mockResolvedValue({})
    },
    index: vi.fn().mockResolvedValue({}),
    search: vi.fn().mockResolvedValue({
      body: {
        hits: {
          total: { value: 0 },
          hits: []
        },
        suggest: {
          suggestions: [{
            options: []
          }]
        }
      }
    }),
    delete: vi.fn().mockResolvedValue({}),
    bulk: vi.fn().mockResolvedValue({}),
    ping: vi.fn().mockResolvedValue({ statusCode: 200 })
  }))
}));

describe('ElasticsearchService', () => {
  let elasticsearchService: ElasticsearchService;

  beforeAll(() => {
    elasticsearchService = new ElasticsearchService();
  });

  describe('Index Management', () => {
    it('should initialize all indices', async () => {
      await expect(elasticsearchService.initializeIndices()).resolves.not.toThrow();
    });

    it('should have correct index names', () => {
      expect(INDICES.VENUES).toBe('venues');
      expect(INDICES.ARTISTS).toBe('artists');
      expect(INDICES.EVENTS).toBe('events');
    });
  });

  describe('Document Indexing', () => {
    it('should index a venue document', async () => {
      const mockVenue = {
        id: 1,
        name: 'Test Venue',
        address: '123 Test St',
        coordinates: { x: -122.4194, y: 37.7749 },
        capacity: 500,
        website: 'https://testvenue.com',
        prosper_rank: 5,
        created_at: new Date(),
        updated_at: new Date(),
        city_id: 1,
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

      await expect(elasticsearchService.indexVenue(mockVenue)).resolves.not.toThrow();
    });

    it('should index an artist document', async () => {
      const mockArtist = {
        id: 1,
        name: 'Test Artist',
        genres: ['rock', 'indie'],
        photo_url: 'https://example.com/photo.jpg',
        profile_bio: 'A test artist bio',
        created_at: new Date(),
        updated_at: new Date()
      };

      await expect(elasticsearchService.indexArtist(mockArtist)).resolves.not.toThrow();
    });

    it('should index an event document', async () => {
      const mockEvent = {
        id: 1,
        title: 'Test Concert',
        description: 'A test concert',
        event_datetime: new Date(),
        ticket_url: 'https://tickets.com/test',
        external_id: 'ext123',
        venue_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
        venue: {
          id: 1,
          name: 'Test Venue',
          address: '123 Test St',
          coordinates: { x: -122.4194, y: 37.7749 },
          capacity: 500,
          website: 'https://testvenue.com',
          prosper_rank: 5,
          created_at: new Date(),
          updated_at: new Date(),
          city_id: 1,
          city: {
            id: 1,
            name: 'Seattle',
            state_province: 'WA',
            country: 'US',
            coordinates: { x: -122.3321, y: 47.6062 },
            created_at: new Date(),
            updated_at: new Date()
          }
        },
        artists: [{
          id: 1,
          name: 'Test Artist',
          genres: ['rock', 'indie'],
          photo_url: 'https://example.com/photo.jpg',
          profile_bio: 'A test artist bio',
          created_at: new Date(),
          updated_at: new Date()
        }]
      };

      await expect(elasticsearchService.indexEvent(mockEvent)).resolves.not.toThrow();
    });
  });

  describe('Search Operations', () => {
    it('should perform search across all content types', async () => {
      const result = await elasticsearchService.searchAll('test query');
      
      expect(result).toHaveProperty('venues');
      expect(result).toHaveProperty('artists');
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('total');
      expect(typeof result.total).toBe('number');
    });

    it('should search venues with geographic filtering', async () => {
      const result = await elasticsearchService.searchVenues('test venue', {
        lat: 47.6062,
        lon: -122.3321,
        radius: 10,
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hits');
      expect(Array.isArray(result.hits)).toBe(true);
    });

    it('should search artists with genre filtering', async () => {
      const result = await elasticsearchService.searchArtists('test artist', {
        genres: ['rock', 'indie'],
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hits');
      expect(Array.isArray(result.hits)).toBe(true);
    });

    it('should search events with date and location filtering', async () => {
      const result = await elasticsearchService.searchEvents('test event', {
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        lat: 47.6062,
        lon: -122.3321,
        radius: 10,
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hits');
      expect(Array.isArray(result.hits)).toBe(true);
    });

    it('should get search suggestions', async () => {
      const suggestions = await elasticsearchService.getSuggestions('test');
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    it('should get upcoming events', async () => {
      const result = await elasticsearchService.getUpcomingEvents({
        venue_id: 1,
        days_ahead: 30,
        page: 1,
        limit: 10
      });

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hits');
      expect(Array.isArray(result.hits)).toBe(true);
    });
  });

  describe('Utility Operations', () => {
    it('should delete a document', async () => {
      await expect(elasticsearchService.deleteDocument('venues', '1')).resolves.not.toThrow();
    });

    it('should bulk index documents', async () => {
      const operations = [
        {
          index: 'venues',
          id: '1',
          document: { name: 'Test Venue 1' }
        },
        {
          index: 'venues',
          id: '2',
          document: { name: 'Test Venue 2' }
        }
      ];

      await expect(elasticsearchService.bulkIndex(operations)).resolves.not.toThrow();
    });

    it('should refresh indices', async () => {
      await expect(elasticsearchService.refreshIndices()).resolves.not.toThrow();
    });

    it('should perform health check', async () => {
      const isHealthy = await elasticsearchService.healthCheck();
      expect(typeof isHealthy).toBe('boolean');
    });
  });
});

describe('IndexingService', () => {
  let indexingService: IndexingService;

  beforeAll(() => {
    // Mock the repository dependencies
    vi.mock('../../repositories/venue-repository', () => ({
      VenueRepository: vi.fn().mockImplementation(() => ({
        findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
        findById: vi.fn().mockResolvedValue(null)
      }))
    }));

    vi.mock('../../repositories/artist-repository', () => ({
      ArtistRepository: vi.fn().mockImplementation(() => ({
        findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
        findById: vi.fn().mockResolvedValue(null)
      }))
    }));

    vi.mock('../../repositories/event-repository', () => ({
      EventRepository: vi.fn().mockImplementation(() => ({
        findAll: vi.fn().mockResolvedValue({ data: [], total: 0 }),
        findById: vi.fn().mockResolvedValue(null)
      }))
    }));

    indexingService = new IndexingService();
  });

  it('should initialize successfully', async () => {
    await expect(indexingService.initialize()).resolves.not.toThrow();
  });

  it('should perform health check', async () => {
    const health = await indexingService.healthCheck();
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('message');
    expect(typeof health.healthy).toBe('boolean');
    expect(typeof health.message).toBe('string');
  });
});