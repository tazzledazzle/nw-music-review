/**
 * Tests for ValidationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationService } from '../validation-service';
import { ExternalEvent, ExternalVenue, ExternalArtist } from '../types';

describe('ValidationService', () => {
  let validationService: ValidationService;

  beforeEach(() => {
    validationService = new ValidationService();
  });

  describe('validateEvent', () => {
    it('should validate a complete event successfully', () => {
      const event: ExternalEvent = {
        id: 'event-123',
        title: 'Test Concert',
        description: 'A great show',
        datetime: new Date('2024-06-15T20:00:00Z'),
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          city: 'Seattle',
          country: 'US',
        },
        artists: [
          { id: 'artist-123', name: 'Test Artist' }
        ],
        ticketUrl: 'https://tickets.example.com',
        source: 'songkick',
      };

      const result = validationService.validateEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should fail validation for missing required fields', () => {
      const event = {
        id: 'event-123',
        // Missing title, datetime, venue, artists, source
      } as ExternalEvent;

      const result = validationService.validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field 'title' is missing");
      expect(result.errors).toContain("Required field 'datetime' is missing");
      expect(result.errors).toContain("Required field 'venue' is missing");
      expect(result.errors).toContain("Required field 'artists' is missing");
      expect(result.errors).toContain("Required field 'source' is missing");
    });

    it('should fail validation for invalid source', () => {
      const event: ExternalEvent = {
        id: 'event-123',
        title: 'Test Concert',
        datetime: new Date('2024-06-15T20:00:00Z'),
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          city: 'Seattle',
          country: 'US',
        },
        artists: [{ id: 'artist-123', name: 'Test Artist' }],
        source: 'invalid-source' as any,
      };

      const result = validationService.validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Field 'source' failed custom validation");
    });

    it('should fail validation for invalid date', () => {
      const event: ExternalEvent = {
        id: 'event-123',
        title: 'Test Concert',
        datetime: new Date('invalid-date'),
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          city: 'Seattle',
          country: 'US',
        },
        artists: [{ id: 'artist-123', name: 'Test Artist' }],
        source: 'songkick',
      };

      const result = validationService.validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Field 'datetime' failed custom validation");
    });
  });

  describe('validateVenue', () => {
    it('should validate a complete venue successfully', () => {
      const venue: ExternalVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        address: '123 Main St',
        city: 'Seattle',
        state: 'WA',
        country: 'US',
        latitude: 47.6062,
        longitude: -122.3321,
        capacity: 500,
        website: 'https://venue.example.com',
      };

      const result = validationService.validateVenue(venue);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should fail validation for missing required fields', () => {
      const venue = {
        id: 'venue-123',
        // Missing name, city, country
      } as ExternalVenue;

      const result = validationService.validateVenue(venue);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field 'name' is missing");
      expect(result.errors).toContain("Required field 'city' is missing");
      expect(result.errors).toContain("Required field 'country' is missing");
    });
  });

  describe('validateArtist', () => {
    it('should validate a complete artist successfully', () => {
      const artist: ExternalArtist = {
        id: 'artist-123',
        name: 'Test Artist',
        genres: ['rock', 'indie'],
        bio: 'A great musician',
        imageUrl: 'https://images.example.com/artist.jpg',
        website: 'https://artist.example.com',
      };

      const result = validationService.validateArtist(artist);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should fail validation for missing required fields', () => {
      const artist = {
        id: 'artist-123',
        // Missing name
      } as ExternalArtist;

      const result = validationService.validateArtist(artist);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field 'name' is missing");
    });
  });

  describe('checkEventDuplicate', () => {
    const baseEvent: ExternalEvent = {
      id: 'event-123',
      title: 'Test Concert',
      datetime: new Date('2024-06-15T20:00:00Z'),
      venue: {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Seattle',
        country: 'US',
      },
      artists: [{ id: 'artist-123', name: 'Test Artist' }],
      source: 'songkick',
    };

    it('should detect exact duplicate events', () => {
      const duplicate = { ...baseEvent, id: 'event-456' };
      const existingEvents = [baseEvent];

      const result = validationService.checkEventDuplicate(duplicate, existingEvents);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateId).toBe('event-123');
      expect(result.similarity).toBeGreaterThan(0.8);
    });

    it('should detect similar events with different titles', () => {
      const similar = {
        ...baseEvent,
        id: 'event-456',
        title: 'Test Concert - Live',
      };
      const existingEvents = [baseEvent];

      const result = validationService.checkEventDuplicate(similar, existingEvents);

      expect(result.isDuplicate).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.7);
    });

    it('should not detect different events as duplicates', () => {
      const different = {
        ...baseEvent,
        id: 'event-456',
        title: 'Completely Different Show',
        venue: {
          ...baseEvent.venue,
          name: 'Different Venue',
        },
        artists: [{ id: 'artist-456', name: 'Different Artist' }],
      };
      const existingEvents = [baseEvent];

      const result = validationService.checkEventDuplicate(different, existingEvents);

      expect(result.isDuplicate).toBe(false);
      expect(result.similarity).toBeLessThan(0.5);
    });

    it('should handle events with different dates', () => {
      const differentDate = {
        ...baseEvent,
        id: 'event-456',
        datetime: new Date('2024-06-16T20:00:00Z'), // Next day
      };
      const existingEvents = [baseEvent];

      const result = validationService.checkEventDuplicate(differentDate, existingEvents);

      // Should still be considered duplicate due to same title, venue, and artists
      expect(result.isDuplicate).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.6);
    });
  });

  describe('checkVenueDuplicate', () => {
    const baseVenue: ExternalVenue = {
      id: 'venue-123',
      name: 'Test Venue',
      address: '123 Main St',
      city: 'Seattle',
      country: 'US',
    };

    it('should detect exact duplicate venues', () => {
      const duplicate = { ...baseVenue, id: 'venue-456' };
      const existingVenues = [baseVenue];

      const result = validationService.checkVenueDuplicate(duplicate, existingVenues);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateId).toBe('venue-123');
      expect(result.similarity).toBeGreaterThan(0.9);
    });

    it('should detect similar venues with slight name differences', () => {
      const similar = {
        ...baseVenue,
        id: 'venue-456',
        name: 'Test Venue & Bar',
      };
      const existingVenues = [baseVenue];

      const result = validationService.checkVenueDuplicate(similar, existingVenues);

      expect(result.isDuplicate).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.8);
    });

    it('should not detect different venues as duplicates', () => {
      const different = {
        ...baseVenue,
        id: 'venue-456',
        name: 'Completely Different Venue',
        city: 'Portland',
      };
      const existingVenues = [baseVenue];

      const result = validationService.checkVenueDuplicate(different, existingVenues);

      expect(result.isDuplicate).toBe(false);
      expect(result.similarity).toBeLessThan(0.5);
    });
  });

  describe('checkArtistDuplicate', () => {
    const baseArtist: ExternalArtist = {
      id: 'artist-123',
      name: 'Test Artist',
    };

    it('should detect exact duplicate artists', () => {
      const duplicate = { ...baseArtist, id: 'artist-456' };
      const existingArtists = [baseArtist];

      const result = validationService.checkArtistDuplicate(duplicate, existingArtists);

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateId).toBe('artist-123');
      expect(result.similarity).toBe(1);
    });

    it('should detect similar artist names', () => {
      const similar = {
        ...baseArtist,
        id: 'artist-456',
        name: 'Test Artist Band',
      };
      const existingArtists = [baseArtist];

      const result = validationService.checkArtistDuplicate(similar, existingArtists);

      expect(result.isDuplicate).toBe(true);
      expect(result.similarity).toBeGreaterThan(0.7);
    });

    it('should not detect different artists as duplicates', () => {
      const different = {
        ...baseArtist,
        id: 'artist-456',
        name: 'Completely Different Artist',
      };
      const existingArtists = [baseArtist];

      const result = validationService.checkArtistDuplicate(different, existingArtists);

      expect(result.isDuplicate).toBe(false);
      expect(result.similarity).toBeLessThan(0.3);
    });
  });

  describe('validateAndDeduplicateEvents', () => {
    it('should validate and deduplicate a batch of events', () => {
      const events: ExternalEvent[] = [
        {
          id: 'event-1',
          title: 'Test Concert',
          datetime: new Date('2024-06-15T20:00:00Z'),
          venue: { id: 'venue-1', name: 'Test Venue', city: 'Seattle', country: 'US' },
          artists: [{ id: 'artist-1', name: 'Test Artist' }],
          source: 'songkick',
        },
        {
          id: 'event-2',
          title: 'Test Concert', // Duplicate
          datetime: new Date('2024-06-15T20:00:00Z'),
          venue: { id: 'venue-1', name: 'Test Venue', city: 'Seattle', country: 'US' },
          artists: [{ id: 'artist-1', name: 'Test Artist' }],
          source: 'bandsintown',
        },
        {
          id: 'event-3',
          title: 'Different Concert',
          datetime: new Date('2024-06-16T20:00:00Z'),
          venue: { id: 'venue-2', name: 'Different Venue', city: 'Portland', country: 'US' },
          artists: [{ id: 'artist-2', name: 'Different Artist' }],
          source: 'ticketmaster',
        },
        {
          // Invalid event - missing required fields
          id: 'event-4',
          title: '',
        } as ExternalEvent,
      ];

      const result = validationService.validateAndDeduplicateEvents(events);

      expect(result.success).toBe(false); // Has validation errors
      expect(result.data).toHaveLength(2); // Only 2 valid, unique events
      expect(result.errors).toHaveLength(1); // 1 validation error
      expect(result.warnings).toHaveLength(1); // 1 duplicate warning
    });

    it('should handle empty event list', () => {
      const result = validationService.validateAndDeduplicateEvents([]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('string similarity', () => {
    it('should calculate string similarity correctly', () => {
      const service = validationService as any;
      
      // Exact match
      expect(service.calculateStringSimilarity('test', 'test')).toBe(1);
      
      // No match
      expect(service.calculateStringSimilarity('test', 'completely different')).toBeLessThan(0.3);
      
      // Partial match
      expect(service.calculateStringSimilarity('test concert', 'test show')).toBeGreaterThan(0.3);
      expect(service.calculateStringSimilarity('test concert', 'test show')).toBeLessThan(0.8);
      
      // Case insensitive
      expect(service.calculateStringSimilarity('Test', 'TEST')).toBe(1);
    });
  });
});