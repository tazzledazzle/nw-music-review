import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

// Import API route handlers for performance testing
import { GET as getHealth } from '@/app/api/health/route';
import { GET as getRegions } from '@/app/api/regions/route';
import { GET as getVenues } from '@/app/api/cities/[city]/venues/route';
import { GET as searchAPI } from '@/app/api/search/route';

// Mock dependencies for consistent performance testing
vi.mock('@/lib/db', () => ({
  testConnection: vi.fn().mockResolvedValue({ success: true, timestamp: new Date() }),
  default: {
    connect: vi.fn(),
    query: vi.fn()
  }
}));

vi.mock('@/lib/repositories/city-repository');
vi.mock('@/lib/repositories/venue-repository');
vi.mock('@/lib/search/elasticsearch');

describe('API Performance Tests', () => {
  beforeAll(() => {
    // Setup fast mock responses for performance testing
    const { CityRepository } = require('@/lib/repositories/city-repository');
    const { VenueRepository } = require('@/lib/repositories/venue-repository');
    const { elasticsearchService } = require('@/lib/search/elasticsearch');

    // Mock fast responses
    CityRepository.prototype.findRegions = vi.fn().mockResolvedValue([
      { region: 'WA', city_count: 5 },
      { region: 'OR', city_count: 3 }
    ]);

    VenueRepository.prototype.findByCityId = vi.fn().mockResolvedValue({
      data: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Venue ${i + 1}`,
        capacity: 100 + i * 50,
        prosper_rank: Math.floor(Math.random() * 10)
      })),
      total: 20,
      page: 1,
      limit: 20,
      total_pages: 1
    });

    elasticsearchService.healthCheck = vi.fn().mockResolvedValue(true);
    elasticsearchService.searchAll = vi.fn().mockResolvedValue({
      venues: { total: 10, hits: [] },
      artists: { total: 5, hits: [] },
      events: { total: 8, hits: [] },
      total: 23
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should respond to health check within 100ms', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/health');
    const response = await getHealth();
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(100); // Should be very fast for health check
  });

  it('should respond to regions API within 200ms', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/regions');
    const response = await getRegions(request);
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(200);
  });

  it('should respond to venues listing within 500ms', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/cities/1/venues');
    const response = await getVenues(request, { params: { city: '1' } });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500); // Requirement 7.1: 500ms target
  });

  it('should respond to search API within 500ms', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/search?q=test');
    const response = await searchAPI(request);
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500); // Requirement 7.1: 500ms target
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const startTime = performance.now();
    
    const promises = Array.from({ length: concurrentRequests }, () => {
      const request = new NextRequest('http://localhost/api/health');
      return getHealth();
    });
    
    const responses = await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / concurrentRequests;

    // All requests should succeed
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });

    // Average response time should still be reasonable under load
    expect(averageTime).toBeLessThan(200);
  });

  it('should maintain performance with pagination', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/cities/1/venues?page=1&limit=50');
    const response = await getVenues(request, { params: { city: '1' } });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });

  it('should handle search with filters efficiently', async () => {
    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/search?q=test&type=venue&capacity_min=100&capacity_max=1000');
    const response = await searchAPI(request);
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500);
  });

  it('should measure memory usage during API calls', async () => {
    // Get initial memory usage
    const initialMemory = process.memoryUsage();
    
    // Make multiple API calls
    const requests = Array.from({ length: 20 }, async () => {
      const request = new NextRequest('http://localhost/api/cities/1/venues');
      return await getVenues(request, { params: { city: '1' } });
    });
    
    await Promise.all(requests);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    // Memory increase should be reasonable (less than 50MB for 20 requests)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('should benchmark database query performance', async () => {
    const { VenueRepository } = require('@/lib/repositories/venue-repository');
    
    // Mock a more realistic database response time
    VenueRepository.prototype.findByCityId = vi.fn().mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          total_pages: 0
        }), 50); // Simulate 50ms database query
      })
    );

    const startTime = performance.now();
    
    const request = new NextRequest('http://localhost/api/cities/1/venues');
    const response = await getVenues(request, { params: { city: '1' } });
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;

    expect(response.status).toBe(200);
    // Should still be under 500ms even with database latency
    expect(responseTime).toBeLessThan(500);
    // Should be at least 50ms due to our mock delay
    expect(responseTime).toBeGreaterThan(50);
  });
});