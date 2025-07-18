import { NextResponse } from 'next/server';

/**
 * Standard error types for the application
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Application error class with structured error information
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Ensure the stack trace points to where the error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * Error response format for API endpoints
 */
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Create standardized error responses for API endpoints
 */
export class ErrorHandler {
  /**
   * Handle and format errors for API responses
   */
  static handleError(error: unknown, requestId?: string): NextResponse<ErrorResponse> {
    // Log the error for monitoring
    this.logError(error, requestId);

    if (error instanceof AppError) {
      return this.createErrorResponse(
        error.type,
        error.message,
        error.statusCode,
        error.context,
        requestId
      );
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return this.createErrorResponse(
        ErrorType.VALIDATION_ERROR,
        'Invalid request parameters',
        400,
        { issues: (error as any).issues },
        requestId
      );
    }

    // Handle database connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
        return this.createErrorResponse(
          ErrorType.DATABASE_ERROR,
          'Database connection failed',
          503,
          undefined,
          requestId
        );
      }

      // Handle rate limiting errors
      if (error.message.toLowerCase().includes('rate limit') || 
          error.message.toLowerCase().includes('too many requests')) {
        return this.createErrorResponse(
          ErrorType.RATE_LIMITED,
          'Too many requests',
          429,
          undefined,
          requestId
        );
      }
    }

    // Default to internal server error
    return this.createErrorResponse(
      ErrorType.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      undefined,
      requestId
    );
  }

  /**
   * Create a standardized error response
   */
  private static createErrorResponse(
    type: ErrorType,
    message: string,
    statusCode: number,
    details?: any,
    requestId?: string
  ): NextResponse<ErrorResponse> {
    const errorResponse: ErrorResponse = {
      error: {
        type,
        message,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
        ...(requestId && { requestId })
      }
    };

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  /**
   * Log errors for monitoring and debugging
   */
  private static logError(error: unknown, requestId?: string): void {
    try {
      const { logger } = require('./logger');
      
      if (error instanceof AppError) {
        logger.error(
          error.message,
          error,
          {
            type: error.type,
            statusCode: error.statusCode,
            isOperational: error.isOperational,
            ...error.context
          },
          requestId
        );
      } else if (error instanceof Error) {
        logger.error(error.message, error, undefined, requestId);
      } else {
        logger.error('Unknown error occurred', undefined, { error: String(error) }, requestId);
      }
    } catch (loggerError) {
      // Fallback to console logging if logger is not available
      console.error('[ERROR]', {
        timestamp: new Date().toISOString(),
        requestId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof AppError ? error.type : 'UNKNOWN',
        context: error instanceof AppError ? error.context : undefined
      });
    }
  }

  /**
   * Create specific error types for common scenarios
   */
  static notFound(resource: string, id?: string | number): AppError {
    return new AppError(
      `${resource}${id ? ` with ID ${id}` : ''} not found`,
      ErrorType.NOT_FOUND,
      404,
      true,
      { resource, id }
    );
  }

  static validationError(message: string, details?: any): AppError {
    return new AppError(
      message,
      ErrorType.VALIDATION_ERROR,
      400,
      true,
      details
    );
  }

  static unauthorized(message: string = 'Authentication required'): AppError {
    return new AppError(
      message,
      ErrorType.UNAUTHORIZED,
      401,
      true
    );
  }

  static forbidden(message: string = 'Access denied'): AppError {
    return new AppError(
      message,
      ErrorType.FORBIDDEN,
      403,
      true
    );
  }

  static databaseError(message: string, context?: Record<string, any>): AppError {
    return new AppError(
      message,
      ErrorType.DATABASE_ERROR,
      503,
      true,
      context
    );
  }

  static externalServiceError(service: string, message: string): AppError {
    return new AppError(
      `${service} service error: ${message}`,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      503,
      true,
      { service }
    );
  }
}

/**
 * Graceful degradation utilities for external service failures
 */
export class GracefulDegradation {
  /**
   * Execute a function with fallback behavior
   */
  static async withFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T> | T,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (error) {
      console.warn(`Primary function failed, using fallback: ${errorMessage || 'Unknown error'}`);
      return await fallbackFn();
    }
  }

  /**
   * Execute with timeout and fallback
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    fallbackFn?: () => Promise<T> | T,
    timeoutMessage?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      if (fallbackFn) {
        console.warn(`Operation timed out, using fallback: ${timeoutMessage}`);
        return await fallbackFn();
      }
      throw error;
    }
  }

  /**
   * Circuit breaker pattern for external services
   */
  static createCircuitBreaker<T>(
    serviceName: string,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (fn: () => Promise<T>): Promise<T> => {
      const now = Date.now();

      // Reset circuit breaker after timeout
      if (state === 'OPEN' && now - lastFailureTime > resetTimeoutMs) {
        state = 'HALF_OPEN';
        failures = 0;
      }

      // Reject immediately if circuit is open
      if (state === 'OPEN') {
        throw new AppError(
          `Circuit breaker is OPEN for ${serviceName}`,
          ErrorType.EXTERNAL_SERVICE_ERROR,
          503,
          true,
          { serviceName, state, failures }
        );
      }

      try {
        const result = await fn();
        
        // Reset on success
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit if threshold reached
        if (failures >= failureThreshold) {
          state = 'OPEN';
          console.error(`Circuit breaker OPENED for ${serviceName} after ${failures} failures`);
        }

        throw error;
      }
    };
  }
}