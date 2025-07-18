/**
 * Tests for DataTransformer
 */

import { describe, it, expect } from 'vitest';
import { DataTransformer } from '../data-transformer';
import { ExternalEvent, ExternalVenue, ExternalArtist } from '../types';

describe('DataTransformer', () => {
  describe('transformEvent', () => {
    it('should transform external event to internal format', () => {
      const externalEvent: ExternalEvent = {
        id: 'ext-123',
        title: 'Test Concert',
        description: 'A great show',
        datetime: new Date('2024-06-15T20:00:00Z'),
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
        artists: [
          { id: 'artist-123', name: 'Test Artist' }
        ],
        ticketUrl: 'https://tickets.example.com',
        source: 'songkick',
      };

      const result = DataTransformer.transformEvent(externalEvent, 1, 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        venue_id: 1,
        title: 'Test Concert',
        description: 'A great show',
        event_datetime: new Date('2024-06-15T20:00:00Z'),
        ticket_url: 'https://tickets.example.com',
        external_id: 'songkick_ext-123',
      });
    });

    it('should handle missing optional fields', () => {
      const externalEvent: ExternalEvent = {
        id: 'ext-123',
        title: 'Test Concert',
        datetime: new Date('2024-06-15T20:00:00Z'),
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          city: 'Seattle',
          country: 'US',
        },
        artists: [],
        source: 'bandsintown',
      };

      const result = DataTransformer.transformEvent(externalEvent, 1, 1);

      expect(result.success).toBe(true);
      expect(result.data?.description).toBeNull();
      expect(result.data?.ticket_url).toBeNull();
    });
  });

  describe('transformVenue', () => {
    it('should transform external venue to internal format', () => {
      const externalVenue: ExternalVenue = {
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

      const result = DataTransformer.transformVenue(externalVenue, 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        city_id: 1,
        name: 'Test Venue',
        address: '123 Main St',
        coordinates: {
          x: -122.3321,
          y: 47.6062,
        },
        capacity: 500,
        website: 'https://venue.example.com',
        prosper_rank: 0,
      });
    });

    it('should handle missing coordinates with warning', () => {
      const externalVenue: ExternalVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Seattle',
        country: 'US',
      };

      const result = DataTransformer.transformVenue(externalVenue, 1);

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Missing coordinates for venue');
      expect(result.data?.coordinates).toEqual({ x: 0, y: 0 });
    });
  });

  describe('transformArtist', () => {
    it('should transform external artist to internal format', () => {
      const externalArtist: ExternalArtist = {
        id: 'artist-123',
        name: 'Test Artist',
        genres: ['rock', 'indie'],
        bio: 'A great artist',
        imageUrl: 'https://images.example.com/artist.jpg',
        website: 'https://artist.example.com',
      };

      const result = DataTransformer.transformArtist(externalArtist);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'Test Artist',
        genres: ['rock', 'indie'],
        profile_bio: 'A great artist',
        photo_url: 'https://images.example.com/artist.jpg',
      });
    });

    it('should handle missing optional fields', () => {
      const externalArtist: ExternalArtist = {
        id: 'artist-123',
        name: 'Test Artist',
      };

      const result = DataTransformer.transformArtist(externalArtist);

      expect(result.success).toBe(true);
      expect(result.data?.genres).toEqual([]);
      expect(result.data?.profile_bio).toBeNull();
      expect(result.data?.photo_url).toBeNull();
    });
  });

  describe('extractCityFromVenue', () => {
    it('should extract city information from venue', () => {
      const externalVenue: ExternalVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Seattle',
        state: 'Washington',
        country: 'United States',
        latitude: 47.6062,
        longitude: -122.3321,
      };

      const result = DataTransformer.extractCityFromVenue(externalVenue);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'Seattle',
        state_province: 'WA',
        country: 'US',
        coordinates: {
          x: -122.3321,
          y: 47.6062,
        },
      });
    });

    it('should normalize Canadian provinces', () => {
      const externalVenue: ExternalVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Vancouver',
        state: 'British Columbia',
        country: 'Canada',
      };

      const result = DataTransformer.extractCityFromVenue(externalVenue);

      expect(result.success).toBe(true);
      expect(result.data?.state_province).toBe('BC');
      expect(result.data?.country).toBe('CA');
    });
  });

  describe('isInTargetRegion', () => {
    it('should return true for Washington venues', () => {
      const venue = { state_province: 'WA' };
      expect(DataTransformer.isInTargetRegion(venue)).toBe(true);
    });

    it('should return true for Oregon venues', () => {
      const venue = { state_province: 'OR' };
      expect(DataTransformer.isInTargetRegion(venue)).toBe(true);
    });

    it('should return true for Idaho venues', () => {
      const venue = { state_province: 'ID' };
      expect(DataTransformer.isInTargetRegion(venue)).toBe(true);
    });

    it('should return true for BC venues', () => {
      const venue = { state_province: 'BC' };
      expect(DataTransformer.isInTargetRegion(venue)).toBe(true);
    });

    it('should return false for other regions', () => {
      const venue = { state_province: 'CA' };
      expect(DataTransformer.isInTargetRegion(venue)).toBe(false);
    });

    it('should work with external venue format', () => {
      const externalVenue: ExternalVenue = {
        id: 'venue-123',
        name: 'Test Venue',
        city: 'Seattle',
        state: 'Washington',
        country: 'US',
      };
      expect(DataTransformer.isInTargetRegion(externalVenue)).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should clean text properly', () => {
      expect(DataTransformer.cleanText('  Test   text  ')).toBe('Test text');
      expect(DataTransformer.cleanText(null)).toBeNull();
      expect(DataTransformer.cleanText(undefined)).toBeNull();
    });

    it('should normalize URLs', () => {
      expect(DataTransformer.normalizeUrl('https://example.com')).toBe('https://example.com/');
      expect(DataTransformer.normalizeUrl('example.com')).toBe('https://example.com/');
      expect(DataTransformer.normalizeUrl('invalid-url')).toBe('https://invalid-url/');
      expect(DataTransformer.normalizeUrl(null)).toBeNull();
    });

    it('should generate external IDs', () => {
      expect(DataTransformer.generateExternalId('songkick', '123', 'event')).toBe('songkick_event_123');
      expect(DataTransformer.generateExternalId('bandsintown', 'abc', 'venue')).toBe('bandsintown_venue_abc');
    });
  });
});