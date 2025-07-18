import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor, HealthMonitor, RequestTracker } from '../monitoring';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear metrics before each test
    (PerformanceMonitor as any).metrics = [];
  });

  describe('recordMetric', () => {
    it('should record a metric with all properties', () => {
      const tags = { endpoint: '/api/test', method: 'GET' };
      PerformanceMonitor.recordMetric('test.metric', 100, tags, 'ms');
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'test.metric',
        value: 100,
        tags,
        unit: 'ms',
        timestamp: expect.any(Date)
      }));
    });

    it('should record a metric with minimal properties', () => {
      PerformanceMonitor.recordMetric('simple.metric', 50);
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'simple.metric',
        value: 50,
        timestamp: expect.any(Date)
      }));
    });

    it('should limit metrics to MAX_METRICS', () => {
      const maxMetrics = (PerformanceMonitor as any).MAX_METRICS;
      
      // Record more than MAX_METRICS
      for (let i = 0; i < maxMetrics + 10; i++) {
        PerformanceMonitor.recordMetric('test.metric', i);
      }
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(maxMetrics);
      
      // Should keep the most recent metrics
      expect(metrics[0].value).toBe(10); // First kept metric
      expect(metrics[metrics.length - 1].value).toBe(maxMetrics + 9); // Last metric
    });
  });

  describe('recordApiResponseTime', () => {
    it('should record API response time with correct tags', () => {
      PerformanceMonitor.recordApiResponseTime('/api/users', 'GET', 200, 150);
      
      const metrics = PerformanceMonitor.getMetrics('api.response_time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'api.response_time',
        value: 150,
        unit: 'ms',
        tags: {
          endpoint: '/api/users',
          method: 'GET',
          status_code: '200'
        }
      }));
    });
  });

  describe('recordDatabaseQuery', () => {
    it('should record database query performance', () => {
      PerformanceMonitor.recordDatabaseQuery('SELECT', 'users', 25, true);
      
      const metrics = PerformanceMonitor.getMetrics('database.query_time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'database.query_time',
        value: 25,
        unit: 'ms',
        tags: {
          operation: 'SELECT',
          table: 'users',
          success: 'true'
        }
      }));
    });
  });

  describe('recordExternalServiceCall', () => {
    it('should record external service call performance', () => {
      PerformanceMonitor.recordExternalServiceCall('elasticsearch', 'search', 75, false);
      
      const metrics = PerformanceMonitor.getMetrics('external_service.response_time');
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toEqual(expect.objectContaining({
        name: 'external_service.response_time',
        value: 75,
        unit: 'ms',
        tags: {
          service: 'elasticsearch',
          operation: 'search',
          success: 'false'
        }
      }));
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      PerformanceMonitor.recordMetric('metric.a', 10);
      PerformanceMonitor.recordMetric('metric.b', 20);
      PerformanceMonitor.recordMetric('metric.a', 30);
    });

    it('should return all metrics when no filter provided', () => {
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(3);
    });

    it('should filter metrics by name', () => {
      const metrics = PerformanceMonitor.getMetrics('metric.a');
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.name === 'metric.a')).toBe(true);
    });

    it('should filter metrics by time', () => {
      const since = new Date(Date.now() - 1000); // 1 second ago
      const metrics = PerformanceMonitor.getMetrics(undefined, since);
      expect(metrics).toHaveLength(3); // All should be recent
    });

    it('should filter by both name and time', () => {
      const since = new Date(Date.now() - 1000);
      const metrics = PerformanceMonitor.getMetrics('metric.a', since);
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.name === 'metric.a')).toBe(true);
    });
  });

  describe('getAverageResponseTime', () => {
    beforeEach(() => {
      PerformanceMonitor.recordApiResponseTime('/api/test', 'GET', 200, 100);
      PerformanceMonitor.recordApiResponseTime('/api/test', 'GET', 200, 200);
      PerformanceMonitor.recordApiResponseTime('/api/other', 'GET', 200, 300);
    });

    it('should calculate average for all endpoints', () => {
      const average = PerformanceMonitor.getAverageResponseTime();
      expect(average).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should calculate average for specific endpoint', () => {
      const average = PerformanceMonitor.getAverageResponseTime('/api/test');
      expect(average).toBe(150); // (100 + 200) / 2
    });

    it('should return 0 when no metrics found', () => {
      const average = PerformanceMonitor.getAverageResponseTime('/api/nonexistent');
      expect(average).toBe(0);
    });
  });
});

describe('HealthMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear registered health checks
    (HealthMonitor as any).healthChecks.clear();
  });

  describe('registerHealthCheck', () => {
    it('should register a health check', () => {
      const healthCheckFn = vi.fn().mockResolvedValue({
        service: 'test-service',
        status: 'healthy' as const
      });
      
      HealthMonitor.registerHealthCheck('test-service', healthCheckFn);
      
      const healthChecks = (HealthMonitor as any).healthChecks;
      expect(healthChecks.has('test-service')).toBe(true);
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      const healthyCheck = vi.fn().mockResolvedValue({
        service: 'test-service',
        status: 'healthy' as const,
        responseTime: 50
      });
      
      HealthMonitor.registerHealthCheck('test-service', healthyCheck);
      
      const health = await HealthMonitor.getSystemHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.services).toHaveLength(1);
      expect(health.services[0]).toEqual({
        service: 'test-service',
        status: 'healthy',
        responseTime: 50
      });
      expect(health.metrics.uptime).toBeGreaterThan(0);
      expect(health.metrics.memoryUsage).toBeDefined();
    });

    it('should return degraded status when some services are degraded', async () => {
      const healthyCheck = vi.fn().mockResolvedValue({
        service: 'healthy-service',
        status: 'healthy' as const
      });
      
      const degradedCheck = vi.fn().mockResolvedValue({
        service: 'degraded-service',
        status: 'degraded' as const
      });
      
      HealthMonitor.registerHealthCheck('healthy-service', healthyCheck);
      HealthMonitor.registerHealthCheck('degraded-service', degradedCheck);
      
      const health = await HealthMonitor.getSystemHealth();
      
      expect(health.status).toBe('degraded');
      expect(health.services).toHaveLength(2);
    });

    it('should return unhealthy status when any service is unhealthy', async () => {
      const healthyCheck = vi.fn().mockResolvedValue({
        service: 'healthy-service',
        status: 'healthy' as const
      });
      
      const unhealthyCheck = vi.fn().mockResolvedValue({
        service: 'unhealthy-service',
        status: 'unhealthy' as const,
        error: 'Service down'
      });
      
      HealthMonitor.registerHealthCheck('healthy-service', healthyCheck);
      HealthMonitor.registerHealthCheck('unhealthy-service', unhealthyCheck);
      
      const health = await HealthMonitor.getSystemHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services).toHaveLength(2);
      expect(health.services[1].error).toBe('Service down');
    });

    it('should handle health check timeouts', async () => {
      const slowCheck = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          service: 'slow-service',
          status: 'healthy' as const
        }), 6000)) // Longer than 5s timeout
      );
      
      HealthMonitor.registerHealthCheck('slow-service', slowCheck);
      
      const health = await HealthMonitor.getSystemHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services).toHaveLength(1);
      expect(health.services[0].status).toBe('unhealthy');
      expect(health.services[0].error).toBe('Health check timeout');
    });

    it('should handle health check errors', async () => {
      const errorCheck = vi.fn().mockRejectedValue(new Error('Check failed'));
      
      HealthMonitor.registerHealthCheck('error-service', errorCheck);
      
      const health = await HealthMonitor.getSystemHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.services).toHaveLength(1);
      expect(health.services[0].status).toBe('unhealthy');
      expect(health.services[0].error).toBe('Check failed');
    });
  });

  describe('createExternalApiHealthCheck', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return healthy when API responds successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200
      });
      
      const healthCheck = HealthMonitor.createExternalApiHealthCheck('test-api', 'https://api.test.com/health');
      const result = await healthCheck();
      
      expect(result).toEqual({
        service: 'test-api',
        status: 'healthy',
        responseTime: expect.any(Number),
        details: {
          statusCode: 200,
          url: 'https://api.test.com/health'
        }
      });
    });

    it('should return degraded when API responds with error status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500
      });
      
      const healthCheck = HealthMonitor.createExternalApiHealthCheck('test-api', 'https://api.test.com/health');
      const result = await healthCheck();
      
      expect(result).toEqual({
        service: 'test-api',
        status: 'degraded',
        responseTime: expect.any(Number),
        details: {
          statusCode: 500,
          url: 'https://api.test.com/health'
        }
      });
    });

    it('should return unhealthy when API request fails', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      const healthCheck = HealthMonitor.createExternalApiHealthCheck('test-api', 'https://api.test.com/health');
      const result = await healthCheck();
      
      expect(result).toEqual({
        service: 'test-api',
        status: 'unhealthy',
        responseTime: expect.any(Number),
        error: 'Network error',
        details: {
          url: 'https://api.test.com/health'
        }
      });
    });
  });
});

describe('RequestTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear active requests
    (RequestTracker as any).activeRequests.clear();
  });

  describe('startRequest and endRequest', () => {
    it('should track request duration', () => {
      const requestId = 'test-request-123';
      
      RequestTracker.startRequest(requestId, '/api/test', 'GET');
      expect(RequestTracker.getActiveRequestsCount()).toBe(1);
      
      RequestTracker.endRequest(requestId, 200);
      expect(RequestTracker.getActiveRequestsCount()).toBe(0);
    });

    it('should handle ending non-existent request', () => {
      RequestTracker.endRequest('non-existent', 404);
      // Should not throw error
      expect(RequestTracker.getActiveRequestsCount()).toBe(0);
    });
  });

  describe('getActiveRequestsCount', () => {
    it('should return correct count of active requests', () => {
      expect(RequestTracker.getActiveRequestsCount()).toBe(0);
      
      RequestTracker.startRequest('req1', '/api/test1', 'GET');
      expect(RequestTracker.getActiveRequestsCount()).toBe(1);
      
      RequestTracker.startRequest('req2', '/api/test2', 'POST');
      expect(RequestTracker.getActiveRequestsCount()).toBe(2);
      
      RequestTracker.endRequest('req1', 200);
      expect(RequestTracker.getActiveRequestsCount()).toBe(1);
    });
  });

  describe('cleanupStaleRequests', () => {
    it('should remove stale requests', () => {
      const activeRequests = (RequestTracker as any).activeRequests;
      
      // Add a stale request (older than 5 minutes)
      const staleTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      activeRequests.set('stale-request', {
        startTime: staleTime,
        endpoint: '/api/stale',
        method: 'GET'
      });
      
      // Add a fresh request
      RequestTracker.startRequest('fresh-request', '/api/fresh', 'GET');
      
      expect(RequestTracker.getActiveRequestsCount()).toBe(2);
      
      RequestTracker.cleanupStaleRequests();
      
      expect(RequestTracker.getActiveRequestsCount()).toBe(1);
      expect(activeRequests.has('stale-request')).toBe(false);
      expect(activeRequests.has('fresh-request')).toBe(true);
    });
  });
});