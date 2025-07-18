/**
 * Tests for BaseApiService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseApiService } from '../base-api-service';
import { ApiServiceConfig } from '../types';

// Mock implementation for testing
class TestApiService extends BaseApiService {
  constructor(config: ApiServiceConfig) {
    super(config);
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  async testRequest<T>(endpoint: string, options?: RequestInit) {
    return this.makeRequest<T>(endpoint, options);
  }
}

// Mock fetch globally
global.fetch = vi.fn();

describe('BaseApiService', () => {
  let service: TestApiService;
  const mockConfig: ApiServiceConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
    rateLimitPerMinute: 60,
    timeout: 5000,
  };

  beforeEach(() => {
    service = new TestApiService(mockConfig);
    vi.clearAllMocks();
  });

  describe('makeRequest', () => {
    it('should make successful API request', async () => {
      const mockResponse = { data: 'test' };
      const mockFetch = vi.mocked(fetch);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers(),
      } as Response);

      const result = await service.testRequest('/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should handle HTTP errors', async () => {
      const mockFetch = vi.mocked(fetch);
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      } as Response);

      const result = await service.testRequest('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle rate limiting with retry', async () => {
      const mockFetch = vi.mocked(fetch);
      
      // First call returns 429, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
          headers: new Headers(),
        } as Response);

      const result = await service.testRequest('/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors with retry', async () => {
      const mockFetch = vi.mocked(fetch);
      
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
          headers: new Headers(),
        } as Response);

      const result = await service.testRequest('/test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ data: 'success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFetch = vi.mocked(fetch);
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      const result = await service.testRequest('/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect timeout', async () => {
      const mockFetch = vi.mocked(fetch);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers(),
      } as Response);

      const result = await service.testRequest('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });
});