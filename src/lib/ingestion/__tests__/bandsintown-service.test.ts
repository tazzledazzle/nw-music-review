/**
 * Tests for BandsintownService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BandsintownService } from '../bandsintown-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('BandsintownService', () => {
  let service: BandsintownService;

  beforeEach(() => {
    service = new BandsintownService('test-api-key');
    vi.clearAllMocks();
  });

  describe('searchEventsByLocation', () => {
    it('should search events by location successfully', async () => {
      const mockResponse = [
        {
          id: 'event-123',
          artist_id: 'artist-456',
          url: 'https://bandsintown.com/e/event-123',
          on_sale_datetime: '2024-05-01T10:00:00',
          datetime: '2024-06-15T20:00:00',
          description: 'Great show',
          venue: {
            name: 'Test Venue',
            latitude: '47.6062',
            longitude: '-122.3321',
            city: 'Seattle',
            region: 'WA',
            country: 'United States',
          },
          offers: [
            {
              type: 'Tickets',
              url: 'https://tickets.example.com',
              status: 'available',
            },
          ],
          lineup: ['Test Artist', 'Opening Act'],
        },
      ];

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
        id: 'event-123',
        title: 'Test Artist, Opening Act',
        description: 'Great show',
        source: 'bandsintown',
        venue: {
          name: 'Test Venue',
          city: 'Seattle',
          state: 'WA',
          country: 'United States',
          latitude: 47.6062,
          longitude: -122.3321,
        },
        artists: [
          { name: 'Test Artist' },
          { name: 'Opening Act' },
        ],
        ticketUrl: 'https://tickets.example.com',
      });
    });

    it('should search events by coordinates', async () => {
      const mockResponse = [];

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
        expect.stringContaining('location=47.6062%2C-122.3321'),
        expect.any(Object)
      );
    });

    it('should require location or coordinates', async () => {
      const result = await service.searchEventsByLocation({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Location or coordinates required');
    });

    it('should filter events to target regions only', async () => {
      const mockResponse = [
        {
          id: 'event-123',
          datetime: '2024-06-15T20:00:00',
          venue: {
            name: 'Seattle Venue',
            city: 'Seattle',
            region: 'WA',
            country: 'US',
            latitude: '47.6062',
            longitude: '-122.3321',
          },
          offers: [],
          lineup: ['Artist 1'],
        },
        {
          id: 'event-124',
          datetime: '2024-06-15T20:00:00',
          venue: {
            name: 'LA Venue',
            city: 'Los Angeles',
            region: 'CA',
            country: 'US',
            latitude: '34.0522',
            longitude: '-118.2437',
          },
          offers: [],
          lineup: ['Artist 2'],
        },
      ];

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
  });

  describe('searchEventsByArtist', () => {
    it('should search events by artist name', async () => {
      const mockResponse = [
        {
          id: 'event-123',
          datetime: '2024-06-15T20:00:00',
          venue: {
            name: 'Test Venue',
            city: 'Portland',
            region: 'OR',
            country: 'US',
            latitude: '45.5152',
            longitude: '-122.6784',
          },
          offers: [],
          lineup: ['Test Artist'],
        },
      ];

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
        expect.stringContaining('/artists/Test%20Artist/events'),
        expect.any(Object)
      );
    });

    it('should include date range in search', async () => {
      const mockResponse = [];

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
        expect.stringContaining('date=2024-06-01%2C2024-06-30'),
        expect.any(Object)
      );
    });
  });

  describe('getArtist', () => {
    it('should get artist information', async () => {
      const mockResponse = {
        id: 'artist-123',
        name: 'Test Artist',
        url: 'https://bandsintown.com/a/test-artist',
        image_url: 'https://images.example.com/artist.jpg',
        thumb_url: 'https://images.example.com/artist-thumb.jpg',
        facebook_page_url: 'https://facebook.com/testartist',
        mbid: 'musicbrainz-id',
        tracker_count: 1000,
        upcoming_event_count: 5,
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.getArtist('Test Artist');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 'artist-123',
        name: 'Test Artist',
        imageUrl: 'https://images.example.com/artist.jpg',
        website: 'https://bandsintown.com/a/test-artist',
        socialLinks: {
          facebook: 'https://facebook.com/testartist',
        },
      });
    });

    it('should handle artist not found', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Artist not found'),
      } as Response);

      const result = await service.getArtist('Unknown Artist');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });
  });
});