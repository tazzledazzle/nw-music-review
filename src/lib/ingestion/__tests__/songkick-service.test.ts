/**
 * Tests for SongkickService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SongkickService } from '../songkick-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('SongkickService', () => {
  let service: SongkickService;

  beforeEach(() => {
    service = new SongkickService('test-api-key');
    vi.clearAllMocks();
  });

  describe('searchEventsByLocation', () => {
    it('should search events by location successfully', async () => {
      const mockResponse = {
        resultsPage: {
          status: 'ok',
          results: {
            event: [
              {
                id: 123,
                displayName: 'Test Concert',
                type: 'Concert',
                uri: 'https://songkick.com/concerts/123',
                status: 'ok',
                popularity: 0.5,
                start: {
                  date: '2024-06-15',
                  time: '20:00:00',
                  datetime: '2024-06-15T20:00:00-0700',
                },
                performance: [
                  {
                    id: 456,
                    displayName: 'Test Artist',
                    billing: 'headline',
                    artist: {
                      id: 789,
                      displayName: 'Test Artist',
                      uri: 'https://songkick.com/artists/789',
                    },
                  },
                ],
                venue: {
                  id: 101,
                  displayName: 'Test Venue',
                  uri: 'https://songkick.com/venues/101',
                  lat: 47.6062,
                  lng: -122.3321,
                  metroArea: {
                    displayName: 'Seattle',
                    country: {
                      displayName: 'US',
                    },
                    state: {
                      displayName: 'WA',
                    },
                  },
                },
              },
            ],
          },
          totalEntries: 1,
          perPage: 50,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.searchEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        id: '123',
        title: 'Test Concert',
        source: 'songkick',
        venue: {
          id: '101',
          name: 'Test Venue',
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
        artists: [
          {
            id: '789',
            name: 'Test Artist',
          },
        ],
      });
    });

    it('should search events by coordinates', async () => {
      const mockResponse = {
        resultsPage: {
          status: 'ok',
          results: { event: [] },
          totalEntries: 0,
          perPage: 50,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.searchEventsByLocation({
        latitude: 47.6062,
        longitude: -122.3321,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('location=geo%3A47.6062%2C-122.3321'),
        expect.any(Object)
      );
    });

    it('should filter events to target regions only', async () => {
      const mockResponse = {
        resultsPage: {
          status: 'ok',
          results: {
            event: [
              {
                id: 123,
                displayName: 'Seattle Concert',
                start: { date: '2024-06-15' },
                performance: [{ artist: { id: 1, displayName: 'Artist 1' } }],
                venue: {
                  id: 101,
                  displayName: 'Seattle Venue',
                  metroArea: {
                    displayName: 'Seattle',
                    country: { displayName: 'US' },
                    state: { displayName: 'WA' },
                  },
                },
              },
              {
                id: 124,
                displayName: 'LA Concert',
                start: { date: '2024-06-15' },
                performance: [{ artist: { id: 2, displayName: 'Artist 2' } }],
                venue: {
                  id: 102,
                  displayName: 'LA Venue',
                  metroArea: {
                    displayName: 'Los Angeles',
                    country: { displayName: 'US' },
                    state: { displayName: 'CA' },
                  },
                },
              },
            ],
          },
          totalEntries: 2,
          perPage: 50,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.searchEventsByLocation({
        location: 'US',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].venue.state).toBe('WA');
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      const result = await service.searchEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
    });
  });

  describe('searchEventsByArtist', () => {
    it('should search events by artist name', async () => {
      const mockResponse = {
        resultsPage: {
          status: 'ok',
          results: {
            event: [
              {
                id: 123,
                displayName: 'Test Artist at Test Venue',
                start: { date: '2024-06-15', time: '20:00:00' },
                performance: [
                  {
                    artist: {
                      id: 789,
                      displayName: 'Test Artist',
                    },
                  },
                ],
                venue: {
                  id: 101,
                  displayName: 'Test Venue',
                  metroArea: {
                    displayName: 'Portland',
                    country: { displayName: 'US' },
                    state: { displayName: 'OR' },
                  },
                },
              },
            ],
          },
          totalEntries: 1,
          perPage: 50,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.searchEventsByArtist('Test Artist');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('artist_name=Test+Artist'),
        expect.any(Object)
      );
    });

    it('should include date range in search', async () => {
      const mockResponse = {
        resultsPage: {
          status: 'ok',
          results: { event: [] },
          totalEntries: 0,
          perPage: 50,
          page: 1,
        },
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');

      await service.searchEventsByArtist('Test Artist', {
        startDate,
        endDate,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('min_date=2024-06-01'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('max_date=2024-06-30'),
        expect.any(Object)
      );
    });
  });
});