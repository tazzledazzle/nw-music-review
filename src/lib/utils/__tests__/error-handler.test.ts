import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler, AppError, ErrorType, GracefulDegradation } from '../error-handler';
import { NextResponse } from 'next/server';

// Mock the logger
vi.mock('../logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorType.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.context).toBeUndefined();
    });

    it('should create an AppError with custom values', () => {
      const context = { userId: 123 };
      const error = new AppError(
        'Validation failed',
        ErrorType.VALIDATION_ERROR,
        400,
        true,
        context
      );
      
      expect(error.message).toBe('Validation failed');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual(context);
    });
  });

  describe('handleError', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError('Test error', ErrorType.NOT_FOUND, 404);
      const response = ErrorHandler.handleError(appError, 'req-123');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);
    });

    it('should handle Zod validation errors', () => {
      const zodError = {
        issues: [
          { path: ['field'], message: 'Required' }
        ]
      };
      
      const response = ErrorHandler.handleError(zodError, 'req-123');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);
    });

    it('should handle database connection errors', () => {
      const dbError = new Error('ECONNREFUSED connection failed');
      const response = ErrorHandler.handleError(dbError, 'req-123');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(503);
    });

    it('should handle rate limiting errors', () => {
      const rateLimitError = new Error('Too many requests');
      const response = ErrorHandler.handleError(rateLimitError, 'req-123');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(429);
    });

    it('should handle unknown errors', () => {
      const unknownError = 'Some string error';
      const response = ErrorHandler.handleError(unknownError, 'req-123');
      
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(500);
    });
  });

  describe('Error factory methods', () => {
    it('should create not found error', () => {
      const error = ErrorHandler.notFound('User', 123);
      
      expect(error.message).toBe('User with ID 123 not found');
      expect(error.type).toBe(ErrorType.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.context).toEqual({ resource: 'User', id: 123 });
    });

    it('should create validation error', () => {
      const details = { field: 'email', issue: 'invalid format' };
      const error = ErrorHandler.validationError('Invalid email', details);
      
      expect(error.message).toBe('Invalid email');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual(details);
    });

    it('should create unauthorized error', () => {
      const error = ErrorHandler.unauthorized();
      
      expect(error.message).toBe('Authentication required');
      expect(error.type).toBe(ErrorType.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
    });

    it('should create forbidden error', () => {
      const error = ErrorHandler.forbidden('Access denied to resource');
      
      expect(error.message).toBe('Access denied to resource');
      expect(error.type).toBe(ErrorType.FORBIDDEN);
      expect(error.statusCode).toBe(403);
    });

    it('should create database error', () => {
      const context = { query: 'SELECT * FROM users' };
      const error = ErrorHandler.databaseError('Query failed', context);
      
      expect(error.message).toBe('Query failed');
      expect(error.type).toBe(ErrorType.DATABASE_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.context).toEqual(context);
    });

    it('should create external service error', () => {
      const error = ErrorHandler.externalServiceError('Elasticsearch', 'Connection timeout');
      
      expect(error.message).toBe('Elasticsearch service error: Connection timeout');
      expect(error.type).toBe(ErrorType.EXTERNAL_SERVICE_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.context).toEqual({ service: 'Elasticsearch' });
    });
  });
});

describe('GracefulDegradation', () => {
  describe('withFallback', () => {
    it('should return primary function result when successful', async () => {
      const primaryFn = vi.fn().mockResolvedValue('primary result');
      const fallbackFn = vi.fn().mockResolvedValue('fallback result');
      
      const result = await GracefulDegradation.withFallback(primaryFn, fallbackFn);
      
      expect(result).toBe('primary result');
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should return fallback result when primary fails', async () => {
      const primaryFn = vi.fn().mockRejectedValue(new Error('Primary failed'));
      const fallbackFn = vi.fn().mockResolvedValue('fallback result');
      
      const result = await GracefulDegradation.withFallback(primaryFn, fallbackFn);
      
      expect(result).toBe('fallback result');
      expect(primaryFn).toHaveBeenCalled();
      expect(fallbackFn).toHaveBeenCalled();
    });
  });

  describe('withTimeout', () => {
    it('should return result when function completes within timeout', async () => {
      const fastFn = vi.fn().mockResolvedValue('fast result');
      
      const result = await GracefulDegradation.withTimeout(fastFn, 1000);
      
      expect(result).toBe('fast result');
      expect(fastFn).toHaveBeenCalled();
    });

    it('should use fallback when function times out', async () => {
      const slowFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 200))
      );
      const fallbackFn = vi.fn().mockResolvedValue('fallback result');
      
      const result = await GracefulDegradation.withTimeout(slowFn, 100, fallbackFn);
      
      expect(result).toBe('fallback result');
      expect(slowFn).toHaveBeenCalled();
      expect(fallbackFn).toHaveBeenCalled();
    });

    it('should throw error when no fallback provided and timeout occurs', async () => {
      const slowFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow result'), 200))
      );
      
      await expect(
        GracefulDegradation.withTimeout(slowFn, 100)
      ).rejects.toThrow('Operation timed out after 100ms');
    });
  });

  describe('createCircuitBreaker', () => {
    it('should allow requests when circuit is closed', async () => {
      const circuitBreaker = GracefulDegradation.createCircuitBreaker('test-service', 3, 1000);
      const successFn = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker(successFn);
      
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalled();
    });

    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = GracefulDegradation.createCircuitBreaker('test-service', 2, 1000);
      const failFn = vi.fn().mockRejectedValue(new Error('Service failed'));
      
      // First failure
      await expect(circuitBreaker(failFn)).rejects.toThrow('Service failed');
      
      // Second failure - should open circuit
      await expect(circuitBreaker(failFn)).rejects.toThrow('Service failed');
      
      // Third call - should be rejected by circuit breaker
      await expect(circuitBreaker(failFn)).rejects.toThrow('Circuit breaker is OPEN for test-service');
      
      expect(failFn).toHaveBeenCalledTimes(2);
    });

    it('should reset circuit after timeout', async () => {
      const circuitBreaker = GracefulDegradation.createCircuitBreaker('test-service', 1, 100);
      const failFn = vi.fn().mockRejectedValue(new Error('Service failed'));
      const successFn = vi.fn().mockResolvedValue('success');
      
      // Trigger circuit open
      await expect(circuitBreaker(failFn)).rejects.toThrow('Service failed');
      
      // Should be open
      await expect(circuitBreaker(failFn)).rejects.toThrow('Circuit breaker is OPEN');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should allow request again (half-open state)
      const result = await circuitBreaker(successFn);
      expect(result).toBe('success');
    });
  });
});