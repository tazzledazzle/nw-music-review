/**
 * Tests for TicketmasterService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketmasterService } from '../ticketmaster-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('TicketmasterService', () => {
  let service: TicketmasterService;

  beforeEach(() => {
    service = new TicketmasterService('test-api-key');
    vi.clearAllMocks();
  });

  describe('searchEventsByLocation', () => {
    it('should search events by location successfully', async () => {
      const mockResponse = {
        _embedded: {
          events: [
            {
              id: 'event-123',
              name: 'Test Concert',
              type: 'event',
              url: 'https://ticketmaster.com/event/123',
              locale: 'en-us',
              images: [
                {
                  ratio: '16_9',
                  url: 'https://images.example.com/event.jpg',
                  width: 1920,
                  height: 1080,
                  fallback: false,
                },
              ],
              sales: {
                public: {
                  startDateTime: '2024-05-01T10:00:00Z',
                  startTBD: false,
                  endDateTime: '2024-06-15T18:00:00Z',
                },
              },
              dates: {
                start: {
                  localDate: '2024-06-15',
                  localTime: '20:00:00',
                  dateTime: '2024-06-16T03:00:00Z',
                  dateTBD: false,
                  dateTBA: false,
                  timeTBA: false,
                  noSpecificTime: false,
                },
                timezone: 'America/Los_Angeles',
                status: {
                  code: 'onsale',
                },
              },
              classifications: [
                {
                  primary: true,
                  segment: {
                    id: 'KZFzniwnSyZfZ7v7nJ',
                    name: 'Music',
                  },
                  genre: {
                    id: 'KnvZfZ7vAeA',
                    name: 'Rock',
                  },
                  subGenre: {
                    id: 'KZazBEonSMnZfZ7v6F1',
                    name: 'Pop',
                  },
                },
              ],
              _embedded: {
                venues: [
                  {
                    id: 'venue-123',
                    name: 'Test Venue',
                    type: 'venue',
                    url: 'https://ticketmaster.com/venue/123',
                    locale: 'en-us',
                    images: [],
                    postalCode: '98101',
                    timezone: 'America/Los_Angeles',
                    city: {
                      name: 'Seattle',
                    },
                    state: {
                      name: 'Washington',
                      stateCode: 'WA',
                    },
                    country: {
                      name: 'United States Of America',
                      countryCode: 'US',
                    },
                    address: {
                      line1: '123 Main St',
                    },
                    location: {
                      longitude: '-122.3321',
                      latitude: '47.6062',
                    },
                    markets: [
                      {
                        name: 'Seattle/Tacoma',
                        id: '26',
                      },
                    ],
                    dmas: [
                      {
                        id: 819,
                      },
                    ],
                  },
                ],
                attractions: [
                  {
                    id: 'artist-123',
                    name: 'Test Artist',
                    type: 'attraction',
                    url: 'https://ticketmaster.com/artist/123',
                    locale: 'en-us',
                    images: [
                      {
                        ratio: '16_9',
                        url: 'https://images.example.com/artist.jpg',
                        width: 1920,
                        height: 1080,
                        fallback: false,
                      },
                    ],
                    classifications: [
                      {
                        primary: true,
                        segment: {
                          id: 'KZFzniwnSyZfZ7v7nJ',
                          name: 'Music',
                        },
                        genre: {
                          id: 'KnvZfZ7vAeA',
                          name: 'Rock',
                        },
                        subGenre: {
                          id: 'KZazBEonSMnZfZ7v6F1',
                          name: 'Pop',
                        },
                      },
                    ],
                    externalLinks: {
                      youtube: [
                        {
                          url: 'https://youtube.com/testartist',
                        },
                      ],
                      twitter: [
                        {
                          url: 'https://twitter.com/testartist',
                        },
                      ],
                      facebook: [
                        {
                          url: 'https://facebook.com/testartist',
                        },
                      ],
                      homepage: [
                        {
                          url: 'https://testartist.com',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
        _links: {
          self: {
            href: '/discovery/v2/events.json?apikey=test&size=200',
          },
        },
        page: {
          size: 200,
          totalElements: 1,
          totalPages: 1,
          number: 0,
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
        id: 'event-123',
        title: 'Test Concert',
        source: 'ticketmaster',
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          address: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          country: 'US',
          latitude: 47.6062,
          longitude: -122.3321,
        },
        artists: [
          {
            id: 'artist-123',
            name: 'Test Artist',
            genres: ['Rock'],
            website: 'https://testartist.com',
            socialLinks: {
              facebook: 'https://facebook.com/testartist',
              twitter: 'https://twitter.com/testartist',
            },
          },
        ],
        ticketUrl: 'https://ticketmaster.com/event/123',
      });
    });

    it('should search events by coordinates with radius', async () => {
      const mockResponse = {
        _embedded: { events: [] },
        _links: { self: { href: '/discovery/v2/events.json' } },
        page: { size: 200, totalElements: 0, totalPages: 0, number: 0 },
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
        radius: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('latlong=47.6062%2C-122.3321'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('radius=50'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('unit=km'),
        expect.any(Object)
      );
    });

    it('should filter to target regions', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          _embedded: { events: [] },
          _links: { self: { href: '/discovery/v2/events.json' } },
          page: { size: 200, totalElements: 0, totalPages: 0, number: 0 },
        }),
        headers: new Headers(),
      } as Response);

      await service.searchEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('stateCode=WA%2COR%2CID'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('countryCode=US%2CCA'),
        expect.any(Object)
      );
    });

    it('should handle events without venues', async () => {
      const mockResponse = {
        _embedded: {
          events: [
            {
              id: 'event-123',
              name: 'Test Concert',
              dates: {
                start: {
                  localDate: '2024-06-15',
                  localTime: '20:00:00',
                },
                timezone: 'America/Los_Angeles',
                status: { code: 'onsale' },
              },
              classifications: [],
              // No _embedded.venues
            },
          ],
        },
        _links: { self: { href: '/discovery/v2/events.json' } },
        page: { size: 200, totalElements: 1, totalPages: 1, number: 0 },
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
      expect(result.data).toHaveLength(0); // Event filtered out due to missing venue
    });
  });

  describe('searchEventsByArtist', () => {
    it('should search events by artist name', async () => {
      const mockResponse = {
        _embedded: {
          events: [
            {
              id: 'event-123',
              name: 'Test Artist Live',
              dates: {
                start: {
                  localDate: '2024-06-15',
                  localTime: '20:00:00',
                },
                timezone: 'America/Los_Angeles',
                status: { code: 'onsale' },
              },
              classifications: [],
              _embedded: {
                venues: [
                  {
                    id: 'venue-123',
                    name: 'Test Venue',
                    city: { name: 'Portland' },
                    state: { name: 'Oregon', stateCode: 'OR' },
                    country: { name: 'United States Of America', countryCode: 'US' },
                    address: { line1: '456 Oak St' },
                    location: { longitude: '-122.6784', latitude: '45.5152' },
                  },
                ],
                attractions: [
                  {
                    id: 'artist-123',
                    name: 'Test Artist',
                    classifications: [],
                  },
                ],
              },
            },
          ],
        },
        _links: { self: { href: '/discovery/v2/events.json' } },
        page: { size: 200, totalElements: 1, totalPages: 1, number: 0 },
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
        expect.stringContaining('keyword=Test+Artist'),
        expect.any(Object)
      );
    });

    it('should include date range in search', async () => {
      const mockResponse = {
        _embedded: { events: [] },
        _links: { self: { href: '/discovery/v2/events.json' } },
        page: { size: 200, totalElements: 0, totalPages: 0, number: 0 },
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
        expect.stringContaining('startDateTime=2024-06-01T00%3A00%3A00Z'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endDateTime=2024-06-30T23%3A59%3A59Z'),
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      const result = await service.searchEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.searchEventsByLocation({
        location: 'Seattle, WA',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});