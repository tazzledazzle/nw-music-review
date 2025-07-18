import { NextResponse } from 'next/server';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { HealthMonitor, PerformanceMonitor } from '@/lib/utils/monitoring';
import { randomUUID } from 'crypto';

export async function GET() {
  const requestId = randomUUID();
  const startTime = Date.now();

  try {
    // Get comprehensive system health
    const systemHealth = await HealthMonitor.getSystemHealth();
    const responseTime = Date.now() - startTime;

    // Record performance metrics
    PerformanceMonitor.recordApiResponseTime('/api/health', 'GET', 200, responseTime);

    return NextResponse.json({
      status: systemHealth.status === 'healthy' ? 'ok' : systemHealth.status,
      timestamp: new Date().toISOString(),
      requestId,
      health: systemHealth,
      performance: {
        responseTime,
        averageResponseTime: PerformanceMonitor.getAverageResponseTime('/api/health')
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    PerformanceMonitor.recordApiResponseTime('/api/health', 'GET', 500, responseTime);
    
    return ErrorHandler.handleError(error, requestId);
  }
}