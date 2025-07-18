/**
 * Web scraper service for extracting event and venue data from websites
 */

import { ExternalEvent, ExternalVenue, ExternalArtist, TransformationResult } from './types';

interface ScrapingConfig {
  userAgent: string;
  timeout: number;
  maxRetries: number;
  delayBetweenRequests: number;
  respectRobotsTxt: boolean;
}

interface ScrapingTarget {
  url: string;
  type: 'venue' | 'event' | 'artist';
  selectors: {
    title?: string;
    description?: string;
    date?: string;
    time?: string;
    venue?: string;
    artists?: string;
    ticketUrl?: string;
    imageUrl?: string;
    address?: string;
    capacity?: string;
  };
  dateFormat?: string;
}

interface ScrapedData {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  venue?: string;
  artists?: string[];
  ticketUrl?: string;
  imageUrl?: string;
  address?: string;
  capacity?: number;
  source: string;
}

export class WebScraperService {
  private config: ScrapingConfig;
  private robotsCache: Map<string, boolean> = new Map();

  constructor(config: Partial<ScrapingConfig> = {}) {
    this.config = {
      userAgent: 'VenueExplorer/1.0 (+https://venue-explorer.com/bot)',
      timeout: 10000,
      maxRetries: 3,
      delayBetweenRequests: 1000,
      respectRobotsTxt: true,
      ...config,
    };
  }

  /**
   * Scrape event data from a venue website
   */
  async scrapeVenueEvents(venueUrl: string, selectors: ScrapingTarget['selectors']): Promise<TransformationResult<ExternalEvent[]>> {
    try {
      // Check robots.txt if configured
      if (this.config.respectRobotsTxt && !(await this.isAllowedByRobots(venueUrl))) {
        return {
          success: false,
          errors: [`Scraping not allowed by robots.txt for ${venueUrl}`],
          warnings: [],
        };
      }

      const html = await this.fetchPage(venueUrl);
      const events = await this.extractEvents(html, venueUrl, selectors);

      return {
        success: true,
        data: events,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to scrape venue events from ${venueUrl}: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Scrape venue information from a website
   */
  async scrapeVenueInfo(venueUrl: string, selectors: ScrapingTarget['selectors']): Promise<TransformationResult<ExternalVenue>> {
    try {
      if (this.config.respectRobotsTxt && !(await this.isAllowedByRobots(venueUrl))) {
        return {
          success: false,
          errors: [`Scraping not allowed by robots.txt for ${venueUrl}`],
          warnings: [],
        };
      }

      const html = await this.fetchPage(venueUrl);
      const venue = await this.extractVenueInfo(html, venueUrl, selectors);

      return {
        success: true,
        data: venue,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to scrape venue info from ${venueUrl}: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Scrape artist information from a website
   */
  async scrapeArtistInfo(artistUrl: string, selectors: ScrapingTarget['selectors']): Promise<TransformationResult<ExternalArtist>> {
    try {
      if (this.config.respectRobotsTxt && !(await this.isAllowedByRobots(artistUrl))) {
        return {
          success: false,
          errors: [`Scraping not allowed by robots.txt for ${artistUrl}`],
          warnings: [],
        };
      }

      const html = await this.fetchPage(artistUrl);
      const artist = await this.extractArtistInfo(html, artistUrl, selectors);

      return {
        success: true,
        data: artist,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to scrape artist info from ${artistUrl}: ${error}`],
        warnings: [],
      };
    }
  }

  /**
   * Fetch HTML content from a URL with retry logic
   */
  private async fetchPage(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        // Add delay between requests
        if (attempt > 0) {
          await this.sleep(this.config.delayBetweenRequests * attempt);
        }

        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt + 1} failed for ${url}: ${error}`);
      }
    }

    throw lastError || new Error('Failed to fetch page after retries');
  }

  /**
   * Extract event data from HTML content
   */
  private async extractEvents(html: string, sourceUrl: string, selectors: ScrapingTarget['selectors']): Promise<ExternalEvent[]> {
    // This is a simplified implementation. In a real-world scenario,
    // you would use a proper HTML parser like Cheerio or Playwright
    const events: ExternalEvent[] = [];

    try {
      // Parse HTML and extract event data using selectors
      const scrapedData = this.parseHtmlWithSelectors(html, selectors);
      
      // Convert scraped data to ExternalEvent format
      if (scrapedData.title) {
        const event: ExternalEvent = {
          id: this.generateScrapedId(sourceUrl, scrapedData.title),
          title: scrapedData.title,
          description: scrapedData.description,
          datetime: this.parseDateTime(scrapedData.date, scrapedData.time),
          venue: {
            id: this.generateScrapedId(sourceUrl, 'venue'),
            name: scrapedData.venue || 'Unknown Venue',
            city: 'Unknown', // Would need to be extracted or inferred
            country: 'US', // Default, would need to be determined
          },
          artists: (scrapedData.artists || []).map(name => ({
            id: this.generateScrapedId(sourceUrl, name),
            name,
          })),
          ticketUrl: scrapedData.ticketUrl,
          source: 'scraper',
        };

        events.push(event);
      }
    } catch (error) {
      console.warn(`Failed to extract events from ${sourceUrl}: ${error}`);
    }

    return events;
  }

  /**
   * Extract venue information from HTML content
   */
  private async extractVenueInfo(html: string, sourceUrl: string, selectors: ScrapingTarget['selectors']): Promise<ExternalVenue> {
    const scrapedData = this.parseHtmlWithSelectors(html, selectors);
    
    return {
      id: this.generateScrapedId(sourceUrl, 'venue'),
      name: scrapedData.venue || 'Unknown Venue',
      address: scrapedData.address,
      city: 'Unknown', // Would need to be extracted
      country: 'US', // Default
      capacity: scrapedData.capacity,
      website: sourceUrl,
    };
  }

  /**
   * Extract artist information from HTML content
   */
  private async extractArtistInfo(html: string, sourceUrl: string, selectors: ScrapingTarget['selectors']): Promise<ExternalArtist> {
    const scrapedData = this.parseHtmlWithSelectors(html, selectors);
    
    return {
      id: this.generateScrapedId(sourceUrl, scrapedData.title || 'artist'),
      name: scrapedData.title || 'Unknown Artist',
      bio: scrapedData.description,
      imageUrl: scrapedData.imageUrl,
      website: sourceUrl,
    };
  }

  /**
   * Parse HTML content using CSS selectors (simplified implementation)
   */
  private parseHtmlWithSelectors(html: string, selectors: ScrapingTarget['selectors']): ScrapedData {
    // This is a very basic implementation. In production, you would use
    // a proper HTML parser like Cheerio, Playwright, or Puppeteer
    const data: ScrapedData = { source: 'scraper' };

    try {
      // Extract title
      if (selectors.title) {
        const titleMatch = this.extractTextBySelector(html, selectors.title);
        if (titleMatch) data.title = titleMatch;
      }

      // Extract description
      if (selectors.description) {
        const descMatch = this.extractTextBySelector(html, selectors.description);
        if (descMatch) data.description = descMatch;
      }

      // Extract date
      if (selectors.date) {
        const dateMatch = this.extractTextBySelector(html, selectors.date);
        if (dateMatch) data.date = dateMatch;
      }

      // Extract time
      if (selectors.time) {
        const timeMatch = this.extractTextBySelector(html, selectors.time);
        if (timeMatch) data.time = timeMatch;
      }

      // Extract venue
      if (selectors.venue) {
        const venueMatch = this.extractTextBySelector(html, selectors.venue);
        if (venueMatch) data.venue = venueMatch;
      }

      // Extract artists
      if (selectors.artists) {
        const artistsMatch = this.extractTextBySelector(html, selectors.artists);
        if (artistsMatch) {
          data.artists = artistsMatch.split(',').map(a => a.trim());
        }
      }

      // Extract ticket URL
      if (selectors.ticketUrl) {
        const ticketMatch = this.extractAttributeBySelector(html, selectors.ticketUrl, 'href');
        if (ticketMatch) data.ticketUrl = ticketMatch;
      }

      // Extract image URL
      if (selectors.imageUrl) {
        const imageMatch = this.extractAttributeBySelector(html, selectors.imageUrl, 'src');
        if (imageMatch) data.imageUrl = imageMatch;
      }

      // Extract address
      if (selectors.address) {
        const addressMatch = this.extractTextBySelector(html, selectors.address);
        if (addressMatch) data.address = addressMatch;
      }

      // Extract capacity
      if (selectors.capacity) {
        const capacityMatch = this.extractTextBySelector(html, selectors.capacity);
        if (capacityMatch) {
          const capacity = parseInt(capacityMatch.replace(/\D/g, ''));
          if (!isNaN(capacity)) data.capacity = capacity;
        }
      }
    } catch (error) {
      console.warn('Error parsing HTML with selectors:', error);
    }

    return data;
  }

  /**
   * Extract text content using a CSS selector (basic implementation)
   */
  private extractTextBySelector(html: string, selector: string): string | null {
    // This is a very basic regex-based approach
    // In production, use a proper HTML parser
    try {
      // Convert CSS selector to a basic regex pattern
      const tagMatch = selector.match(/^([a-zA-Z]+)/);
      const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
      const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);

      let pattern = '';
      
      if (idMatch) {
        pattern = `<[^>]*id=["']${idMatch[1]}["'][^>]*>([^<]*)</`;
      } else if (classMatch) {
        pattern = `<[^>]*class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*>([^<]*)</`;
      } else if (tagMatch) {
        pattern = `<${tagMatch[1]}[^>]*>([^<]*)</${tagMatch[1]}>`;
      }

      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        const match = html.match(regex);
        return match ? match[1].trim() : null;
      }
    } catch (error) {
      console.warn('Error extracting text by selector:', error);
    }

    return null;
  }

  /**
   * Extract attribute value using a CSS selector (basic implementation)
   */
  private extractAttributeBySelector(html: string, selector: string, attribute: string): string | null {
    try {
      const tagMatch = selector.match(/^([a-zA-Z]+)/);
      const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
      const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);

      let pattern = '';
      
      if (idMatch) {
        pattern = `<[^>]*id=["']${idMatch[1]}["'][^>]*${attribute}=["']([^"']*)["']`;
      } else if (classMatch) {
        pattern = `<[^>]*class=["'][^"']*${classMatch[1]}[^"']*["'][^>]*${attribute}=["']([^"']*)["']`;
      } else if (tagMatch) {
        pattern = `<${tagMatch[1]}[^>]*${attribute}=["']([^"']*)["']`;
      }

      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
      }
    } catch (error) {
      console.warn('Error extracting attribute by selector:', error);
    }

    return null;
  }

  /**
   * Parse date and time strings into a Date object
   */
  private parseDateTime(dateStr?: string, timeStr?: string): Date {
    if (!dateStr) {
      return new Date(); // Default to current date
    }

    try {
      let dateTimeStr = dateStr;
      if (timeStr) {
        dateTimeStr += ` ${timeStr}`;
      }

      const parsed = new Date(dateTimeStr);
      if (isNaN(parsed.getTime())) {
        // Try common date formats
        const formats = [
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
          /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
          /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
        ];

        for (const format of formats) {
          const match = dateStr.match(format);
          if (match) {
            const [, p1, p2, p3] = match;
            // Assume first format is MM/DD/YYYY
            const date = new Date(`${p1}/${p2}/${p3} ${timeStr || '00:00'}`);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }

        return new Date(); // Fallback to current date
      }

      return parsed;
    } catch (error) {
      console.warn('Error parsing date/time:', error);
      return new Date();
    }
  }

  /**
   * Generate a unique ID for scraped content
   */
  private generateScrapedId(sourceUrl: string, identifier: string): string {
    const urlHash = this.simpleHash(sourceUrl);
    const idHash = this.simpleHash(identifier);
    return `scraped_${urlHash}_${idHash}`;
  }

  /**
   * Simple hash function for generating IDs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if scraping is allowed by robots.txt
   */
  private async isAllowedByRobots(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      
      // Check cache first
      if (this.robotsCache.has(robotsUrl)) {
        return this.robotsCache.get(robotsUrl)!;
      }

      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.config.userAgent },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        // If robots.txt doesn't exist, assume allowed
        this.robotsCache.set(robotsUrl, true);
        return true;
      }

      const robotsText = await response.text();
      const isAllowed = this.parseRobotsTxt(robotsText, url);
      
      this.robotsCache.set(robotsUrl, isAllowed);
      return isAllowed;
    } catch (error) {
      // If we can't check robots.txt, assume allowed
      return true;
    }
  }

  /**
   * Parse robots.txt content to check if URL is allowed
   */
  private parseRobotsTxt(robotsText: string, url: string): boolean {
    const lines = robotsText.split('\n');
    let currentUserAgent = '';
    let isRelevantSection = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring(11).trim();
        isRelevantSection = currentUserAgent === '*' || 
                          currentUserAgent.includes('venueexplorer') ||
                          currentUserAgent.includes('bot');
      } else if (isRelevantSection && trimmed.startsWith('disallow:')) {
        const disallowPath = trimmed.substring(9).trim();
        if (disallowPath && url.includes(disallowPath)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}