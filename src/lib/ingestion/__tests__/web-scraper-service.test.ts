/**
 * Tests for WebScraperService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebScraperService } from '../web-scraper-service';

// Mock fetch globally
global.fetch = vi.fn();

describe('WebScraperService', () => {
  let scraperService: WebScraperService;

  beforeEach(() => {
    scraperService = new WebScraperService({
      respectRobotsTxt: false, // Disable for testing
      delayBetweenRequests: 0, // No delay for tests
    });
    vi.clearAllMocks();
  });

  describe('scrapeVenueEvents', () => {
    it('should scrape events from venue website successfully', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="event-title">Test Concert</div>
            <div class="event-description">A great show</div>
            <div class="event-date">2024-06-15</div>
            <div class="event-time">20:00</div>
            <div class="venue-name">Test Venue</div>
            <div class="artist-name">Test Artist</div>
            <a href="https://tickets.example.com" class="ticket-link">Buy Tickets</a>
          </body>
        </html>
      `;

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const selectors = {
        title: '.event-title',
        description: '.event-description',
        date: '.event-date',
        time: '.event-time',
        venue: '.venue-name',
        artists: '.artist-name',
        ticketUrl: '.ticket-link',
      };

      const result = await scraperService.scrapeVenueEvents('https://venue.example.com', selectors);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0]).toMatchObject({
        title: 'Test Concert',
        description: 'A great show',
        venue: {
          name: 'Test Venue',
        },
        artists: [
          { name: 'Test Artist' },
        ],
        source: 'scraper',
      });
    });

    it('should handle scraping errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await scraperService.scrapeVenueEvents('https://venue.example.com', {});

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Network error');
    });

    it('should respect robots.txt when enabled', async () => {
      const robotsService = new WebScraperService({
        respectRobotsTxt: true,
      });

      const mockFetch = vi.mocked(fetch);
      
      // Mock robots.txt response that disallows scraping
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('User-agent: *\nDisallow: /'),
      } as Response);

      const result = await robotsService.scrapeVenueEvents('https://venue.example.com/events', {});

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('robots.txt');
    });
  });

  describe('scrapeVenueInfo', () => {
    it('should scrape venue information successfully', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Test Venue</h1>
            <div class="address">123 Main St, Seattle, WA</div>
            <div class="capacity">Capacity: 500</div>
          </body>
        </html>
      `;

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const selectors = {
        venue: 'h1',
        address: '.address',
        capacity: '.capacity',
      };

      const result = await scraperService.scrapeVenueInfo('https://venue.example.com', selectors);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: 'Test Venue',
        address: '123 Main St, Seattle, WA',
        capacity: 500,
        website: 'https://venue.example.com',
      });
    });
  });

  describe('scrapeArtistInfo', () => {
    it('should scrape artist information successfully', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Test Artist</h1>
            <div class="bio">A great musician from Seattle</div>
            <img src="https://images.example.com/artist.jpg" class="artist-photo" />
          </body>
        </html>
      `;

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const selectors = {
        title: 'h1',
        description: '.bio',
        imageUrl: '.artist-photo',
      };

      const result = await scraperService.scrapeArtistInfo('https://artist.example.com', selectors);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: 'Test Artist',
        bio: 'A great musician from Seattle',
        imageUrl: 'https://images.example.com/artist.jpg',
        website: 'https://artist.example.com',
      });
    });
  });

  describe('retry logic', () => {
    it('should retry failed requests', async () => {
      const mockFetch = vi.mocked(fetch);
      
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><body><h1>Success</h1></body></html>'),
        } as Response);

      const result = await scraperService.scrapeVenueInfo('https://venue.example.com', {
        venue: 'h1',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      const result = await scraperService.scrapeVenueInfo('https://venue.example.com', {});

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('HTML parsing', () => {
    it('should handle missing elements gracefully', async () => {
      const mockHtml = '<html><body><p>No relevant content</p></body></html>';

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await scraperService.scrapeVenueEvents('https://venue.example.com', {
        title: '.non-existent',
        venue: '.also-missing',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0); // No events found
    });

    it('should parse multiple artists correctly', async () => {
      const mockHtml = `
        <html>
          <body>
            <div class="event-title">Multi-Artist Show</div>
            <div class="artists">Artist One, Artist Two, Artist Three</div>
            <div class="venue-name">Test Venue</div>
            <div class="event-date">2024-06-15</div>
          </body>
        </html>
      `;

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      } as Response);

      const result = await scraperService.scrapeVenueEvents('https://venue.example.com', {
        title: '.event-title',
        venue: '.venue-name',
        artists: '.artists',
        date: '.event-date',
      });

      expect(result.success).toBe(true);
      expect(result.data![0].artists).toHaveLength(3);
      expect(result.data![0].artists.map(a => a.name)).toEqual([
        'Artist One',
        'Artist Two', 
        'Artist Three'
      ]);
    });
  });

  describe('date parsing', () => {
    it('should parse various date formats', async () => {
      const testCases = [
        { input: '2024-06-15', expected: new Date('2024-06-15') },
        { input: '06/15/2024', expected: new Date('06/15/2024') },
        { input: '15-06-2024', expected: new Date('06/15/2024') },
      ];

      for (const testCase of testCases) {
        const mockHtml = `
          <html>
            <body>
              <div class="event-title">Test Event</div>
              <div class="event-date">${testCase.input}</div>
              <div class="venue-name">Test Venue</div>
            </body>
          </html>
        `;

        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        } as Response);

        const result = await scraperService.scrapeVenueEvents('https://venue.example.com', {
          title: '.event-title',
          venue: '.venue-name',
          date: '.event-date',
        });

        expect(result.success).toBe(true);
        expect(result.data![0].datetime.getFullYear()).toBe(2024);
        expect(result.data![0].datetime.getMonth()).toBe(5); // June (0-indexed)
        expect(result.data![0].datetime.getDate()).toBe(15);
      }
    });
  });
});