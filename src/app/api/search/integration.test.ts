import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as searchGET } from './route';
import { GET as nearbyGET } from './nearby/route';

/**
 * Integration tests for search API endpoints
 * These tests verify the API endpoints work correctly with the actual system
 */
describe('Search API Integration Tests', () => {
  const createSearchRequest = (searchParams: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/search');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const createNearbyRequest = (searchParams: Record<string, string>) => {
    const url = new URL('http://localhost:3000/api/search/nearby');
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  describe('Search endpoint structure', () => {
    it('should handle basic search request structure', async () => {
      const request = createSearchRequest({ q: 'test' });
      const response = await searchGET(request);
      const data = await response.json();

      // Verify response structure regardless of Elasticsearch availability
      if (response.status === 503) {
        expect(data.error).toBe('Search service is currently unavailable');
      } else {
        expect(data).toHaveProperty('query');
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('results');
        expect(data).toHaveProperty('pagination');
        expect(data).toHaveProperty('filters');
        
        expect(data.results).toHaveProperty('venues');
        expect(data.results).toHaveProperty('artists');
        expect(data.results).toHaveProperty('events');
      }
    });

    it('should handle search with filters', async () => {
      const request = createSearchRequest({
        q: 'test',
        type: 'venue',
        genres: 'rock,indie',
        state_province: 'WA',
        capacity_min: '100'
      });
      
      const response = await searchGET(request);
      const data = await response.json();

      if (response.status !== 503) {
        expect(data.type).toBe('venue');
        expect(data.filters.genres).toEqual(['rock', 'indie']);
        expect(data.filters.state_province).toEqual(['WA']);
        expect(data.filters.capacity_min).toBe(100);
      }
    });
  });

  describe('Nearby search endpoint structure', () => {
    it('should handle basic nearby search request structure', async () => {
      // Seattle coordinates
      const request = createNearbyRequest({
        lat: '47.6062',
        lon: '-122.3321'
      });
      
      const response = await nearbyGET(request);
      const data = await response.json();

      // Verify response structure regardless of Elasticsearch availability
      if (response.status === 503) {
        expect(data.error).toBe('Search service is currently unavailable');
      } else {
        expect(data).toHaveProperty('location');
        expect(data).toHaveProperty('radius');
        expect(data).toHaveProperty('results');
        expect(data).toHaveProperty('pagination');
        expect(data).toHaveProperty('filters');
        
        expect(data.location).toEqual({ lat: 47.6062, lon: -122.3321 });
        expect(data.radius).toBe(25); // Default radius
      }
    });

    it('should reject coordinates outside Pacific Northwest', async () => {
      // New York coordinates
      const request = createNearbyRequest({
        lat: '40.7128',
        lon: '-74.0060'
      });
      
      const response = await nearbyGET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Location is outside supported regions');
    });

    it('should handle nearby search with filters', async () => {
      // Portland coordinates
      const request = createNearbyRequest({
        lat: '45.5152',
        lon: '-122.6784',
        radius: '50',
        type: 'event',
        upcoming_only: 'true',
        has_tickets: 'true'
      });
      
      const response = await nearbyGET(request);
      const data = await response.json();

      if (response.status !== 503) {
        expect(data.radius).toBe(50);
        expect(data.type).toBe('event');
        expect(data.filters.upcoming_only).toBe(true);
        expect(data.filters.has_tickets).toBe(true);
      }
    });
  });

  describe('Parameter validation', () => {
    it('should validate search query parameter', async () => {
      const request = createSearchRequest({});
      const response = await searchGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should validate nearby coordinates', async () => {
      const request = createNearbyRequest({});
      const response = await nearbyGET(request);
      
      expect(response.status).toBe(400);
    });

    it('should validate coordinate ranges', async () => {
      const request = createNearbyRequest({
        lat: '100', // Invalid latitude
        lon: '-122'
      });
      
      const response = await nearbyGET(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed parameters gracefully', async () => {
      const request = createSearchRequest({
        q: 'test',
        page: 'invalid',
        limit: 'invalid'
      });
      
      const response = await searchGET(request);
      expect(response.status).toBe(400);
    });

    it('should handle malformed nearby parameters gracefully', async () => {
      const request = createNearbyRequest({
        lat: 'invalid',
        lon: 'invalid'
      });
      
      const response = await nearbyGET(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent search response format', async () => {
      const request = createSearchRequest({ q: 'test', type: 'all' });
      const response = await searchGET(request);
      const data = await response.json();

      if (response.status === 200) {
        // Verify all required fields are present
        expect(data).toHaveProperty('query');
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('results');
        expect(data).toHaveProperty('pagination');
        expect(data).toHaveProperty('filters');

        // Verify results structure
        expect(data.results.venues).toHaveProperty('total');
        expect(data.results.venues).toHaveProperty('items');
        expect(data.results.artists).toHaveProperty('total');
        expect(data.results.artists).toHaveProperty('items');
        expect(data.results.events).toHaveProperty('total');
        expect(data.results.events).toHaveProperty('items');

        // Verify pagination structure
        expect(data.pagination).toHaveProperty('page');
        expect(data.pagination).toHaveProperty('limit');
        expect(data.pagination).toHaveProperty('total');
        expect(data.pagination).toHaveProperty('total_pages');
      }
    });

    it('should return consistent nearby response format', async () => {
      const request = createNearbyRequest({
        lat: '47.6062',
        lon: '-122.3321'
      });
      
      const response = await nearbyGET(request);
      const data = await response.json();

      if (response.status === 200) {
        // Verify all required fields are present
        expect(data).toHaveProperty('query');
        expect(data).toHaveProperty('location');
        expect(data).toHaveProperty('radius');
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('results');
        expect(data).toHaveProperty('pagination');
        expect(data).toHaveProperty('filters');

        // Verify location structure
        expect(data.location).toHaveProperty('lat');
        expect(data.location).toHaveProperty('lon');
      }
    });
  });
});