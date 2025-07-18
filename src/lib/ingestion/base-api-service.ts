/**
 * Base class for external API services with common functionality
 */

import { ApiServiceConfig, ExternalApiResponse, RetryConfig } from './types';

export abstract class BaseApiService {
  protected config: ApiServiceConfig;
  protected retryConfig: RetryConfig;
  private requestCount: number = 0;
  private lastResetTime: Date = new Date();

  constructor(config: ApiServiceConfig) {
    this.config = config;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    };
  }

  /**
   * Make an HTTP request with retry logic and rate limiting
   */
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ExternalApiResponse<T>> {
    await this.checkRateLimit();

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const url = `${this.config.baseUrl}${endpoint}`;
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          signal: AbortSignal.timeout(this.config.timeout),
        });

        this.incrementRequestCount();

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data,
            rateLimitRemaining: this.getRateLimitRemaining(response),
            rateLimitReset: this.getRateLimitReset(response),
          };
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.calculateDelay(attempt);
          await this.sleep(delay);
          continue;
        }

        // Handle other HTTP errors
        if (response.status >= 400) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error as Error)) {
          break;
        }

        // Wait before retrying
        if (attempt < this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error occurred',
    };
  }

  /**
   * Get authentication headers for the API
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Check if we're within rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = new Date();
    const timeSinceReset = now.getTime() - this.lastResetTime.getTime();
    
    // Reset counter every minute
    if (timeSinceReset >= 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
      return;
    }

    // Wait if we've hit the rate limit
    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = 60000 - timeSinceReset;
      await this.sleep(waitTime);
      this.requestCount = 0;
      this.lastResetTime = new Date();
    }
  }

  /**
   * Increment request counter
   */
  private incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /401/i, // Unauthorized
      /403/i, // Forbidden
      /404/i, // Not Found
      /400/i, // Bad Request
    ];

    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Extract rate limit remaining from response headers
   */
  private getRateLimitRemaining(response: Response): number | undefined {
    const remaining = response.headers.get('X-RateLimit-Remaining') || 
                     response.headers.get('X-Rate-Limit-Remaining');
    return remaining ? parseInt(remaining) : undefined;
  }

  /**
   * Extract rate limit reset time from response headers
   */
  private getRateLimitReset(response: Response): Date | undefined {
    const reset = response.headers.get('X-RateLimit-Reset') || 
                  response.headers.get('X-Rate-Limit-Reset');
    return reset ? new Date(parseInt(reset) * 1000) : undefined;
  }
}