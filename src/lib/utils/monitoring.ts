/**
 * Application monitoring and metrics collection
 */

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  services: HealthCheckResult[];
  metrics: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: number;
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics: MetricData[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory

  /**
   * Record a performance metric
   */
  static recordMetric(name: string, value: number, tags?: Record<string, string>, unit?: string): void {
    const metric: MetricData = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit
    };

    this.metrics.push(metric);

    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // In production, send to monitoring service (e.g., DataDog, New Relic, CloudWatch)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(metric);
    }
  }

  /**
   * Record API response time
   */
  static recordApiResponseTime(endpoint: string, method: string, statusCode: number, responseTime: number): void {
    this.recordMetric('api.response_time', responseTime, {
      endpoint,
      method,
      status_code: statusCode.toString()
    }, 'ms');
  }

  /**
   * Record database query performance
   */
  static recordDatabaseQuery(operation: string, table: string, duration: number, success: boolean): void {
    this.recordMetric('database.query_time', duration, {
      operation,
      table,
      success: success.toString()
    }, 'ms');
  }

  /**
   * Record external service call performance
   */
  static recordExternalServiceCall(service: string, operation: string, duration: number, success: boolean): void {
    this.recordMetric('external_service.response_time', duration, {
      service,
      operation,
      success: success.toString()
    }, 'ms');
  }

  /**
   * Get recent metrics for analysis
   */
  static getMetrics(name?: string, since?: Date): MetricData[] {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === name);
    }

    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }

    return filteredMetrics;
  }

  /**
   * Calculate average response time for an endpoint
   */
  static getAverageResponseTime(endpoint?: string, since?: Date): number {
    const metrics = this.getMetrics('api.response_time', since);
    const filteredMetrics = endpoint 
      ? metrics.filter(m => m.tags?.endpoint === endpoint)
      : metrics;

    if (filteredMetrics.length === 0) return 0;

    const sum = filteredMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / filteredMetrics.length;
  }

  /**
   * Send metric to external monitoring service
   */
  private static sendToMonitoringService(metric: MetricData): void {
    // Implementation would depend on the monitoring service
    // Examples: DataDog, New Relic, CloudWatch, Prometheus
    console.log('[METRIC]', JSON.stringify(metric));
  }
}

/**
 * Health monitoring for various system components
 */
export class HealthMonitor {
  private static healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  /**
   * Register a health check for a service
   */
  static registerHealthCheck(serviceName: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(serviceName, checkFn);
  }

  /**
   * Run all health checks and return system health status
   */
  static async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    const services: HealthCheckResult[] = [];

    // Run all registered health checks
    for (const [serviceName, checkFn] of this.healthChecks) {
      try {
        const result = await Promise.race([
          checkFn(),
          new Promise<HealthCheckResult>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);
        services.push(result);
      } catch (error) {
        services.push({
          service: serviceName,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Determine overall system status
    const hasUnhealthy = services.some(s => s.status === 'unhealthy');
    const hasDegraded = services.some(s => s.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    const healthCheckDuration = Date.now() - startTime;
    PerformanceMonitor.recordMetric('health_check.duration', healthCheckDuration, {}, 'ms');

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      metrics: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Database health check
   */
  static async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { testConnection } = await import('../db');
      const result = await testConnection();
      const responseTime = Date.now() - startTime;

      return {
        service: 'database',
        status: result.success ? 'healthy' : 'unhealthy',
        responseTime,
        details: result
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Elasticsearch health check
   */
  static async checkElasticsearchHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { elasticsearchService } = await import('../search/elasticsearch');
      const isHealthy = await elasticsearchService.healthCheck();
      const responseTime = Date.now() - startTime;

      return {
        service: 'elasticsearch',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime
      };
    } catch (error) {
      return {
        service: 'elasticsearch',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * External API health check (generic)
   */
  static createExternalApiHealthCheck(serviceName: string, url: string, timeout: number = 5000) {
    return async (): Promise<HealthCheckResult> => {
      const startTime = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
          service: serviceName,
          status: response.ok ? 'healthy' : 'degraded',
          responseTime,
          details: {
            statusCode: response.status,
            url
          }
        };
      } catch (error) {
        return {
          service: serviceName,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          details: { url }
        };
      }
    };
  }
}

/**
 * Request tracking middleware utilities
 */
export class RequestTracker {
  private static activeRequests: Map<string, { startTime: number; endpoint: string; method: string }> = new Map();

  /**
   * Start tracking a request
   */
  static startRequest(requestId: string, endpoint: string, method: string): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      endpoint,
      method
    });
  }

  /**
   * End tracking a request and record metrics
   */
  static endRequest(requestId: string, statusCode: number): void {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    const duration = Date.now() - request.startTime;
    
    PerformanceMonitor.recordApiResponseTime(
      request.endpoint,
      request.method,
      statusCode,
      duration
    );

    this.activeRequests.delete(requestId);

    // Log slow requests
    if (duration > 1000) { // Log requests slower than 1 second
      console.warn(`Slow request detected: ${request.method} ${request.endpoint} took ${duration}ms`);
    }
  }

  /**
   * Get currently active requests count
   */
  static getActiveRequestsCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Clean up stale request tracking (requests older than 5 minutes)
   */
  static cleanupStaleRequests(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [requestId, request] of this.activeRequests) {
      if (request.startTime < fiveMinutesAgo) {
        console.warn(`Cleaning up stale request: ${requestId}`);
        this.activeRequests.delete(requestId);
      }
    }
  }
}

// Initialize health checks
HealthMonitor.registerHealthCheck('database', HealthMonitor.checkDatabaseHealth);
HealthMonitor.registerHealthCheck('elasticsearch', HealthMonitor.checkElasticsearchHealth);

// Clean up stale requests every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    RequestTracker.cleanupStaleRequests();
  }, 5 * 60 * 1000);
}