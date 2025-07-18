/**
 * Centralized logging service with structured logging and external service integration
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    endpoint?: string;
    method?: string;
  };
}

/**
 * Structured logger with multiple output targets
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private outputs: LogOutput[] = [];

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.initializeOutputs();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      case 'fatal': return LogLevel.FATAL;
      default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private initializeOutputs(): void {
    // Always add console output
    this.outputs.push(new ConsoleOutput());

    // Add file output in production
    if (process.env.NODE_ENV === 'production') {
      this.outputs.push(new FileOutput());
    }

    // Add external service outputs based on environment variables
    if (process.env.DATADOG_API_KEY) {
      this.outputs.push(new DatadogOutput(process.env.DATADOG_API_KEY));
    }

    if (process.env.SENTRY_DSN) {
      this.outputs.push(new SentryOutput(process.env.SENTRY_DSN));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private async log(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // Send to all configured outputs
    const promises = this.outputs.map(output => 
      output.write(entry).catch(error => 
        console.error('Failed to write log to output:', error)
      )
    );

    await Promise.allSettled(promises);
  }

  debug(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context,
      requestId
    });
  }

  info(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context,
      requestId
    });
  }

  warn(message: string, context?: Record<string, any>, requestId?: string): void {
    this.log({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context,
      requestId
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      context,
      requestId,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>, requestId?: string): void {
    this.log({
      level: LogLevel.FATAL,
      message,
      timestamp: new Date(),
      context,
      requestId,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  performance(message: string, duration: number, endpoint?: string, method?: string, requestId?: string): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      requestId,
      performance: {
        duration,
        endpoint,
        method
      }
    });
  }
}

/**
 * Abstract base class for log outputs
 */
abstract class LogOutput {
  abstract write(entry: LogEntry): Promise<void>;
}

/**
 * Console output for development and debugging
 */
class ConsoleOutput extends LogOutput {
  async write(entry: LogEntry): Promise<void> {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const requestId = entry.requestId ? `[${entry.requestId.slice(0, 8)}]` : '';
    
    let logMessage = `${timestamp} ${level} ${requestId} ${entry.message}`;
    
    if (entry.context) {
      logMessage += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.performance) {
      logMessage += ` | Performance: ${entry.performance.duration}ms`;
      if (entry.performance.endpoint) {
        logMessage += ` ${entry.performance.method} ${entry.performance.endpoint}`;
      }
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage);
        if (entry.error?.stack) {
          console.error(entry.error.stack);
        }
        break;
    }
  }
}

/**
 * File output for persistent logging
 */
class FileOutput extends LogOutput {
  async write(entry: LogEntry): Promise<void> {
    // In a real implementation, this would write to a log file
    // For now, we'll just use console in a structured format
    const logData = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      requestId: entry.requestId,
      context: entry.context,
      error: entry.error,
      performance: entry.performance
    };
    
    console.log(JSON.stringify(logData));
  }
}

/**
 * Datadog integration for production monitoring
 */
class DatadogOutput extends LogOutput {
  constructor(private apiKey: string) {
    super();
  }

  async write(entry: LogEntry): Promise<void> {
    // In a real implementation, this would send logs to Datadog
    // For now, we'll simulate the structure
    const datadogLog = {
      timestamp: entry.timestamp.getTime(),
      level: entry.level,
      message: entry.message,
      service: 'venue-explorer',
      source: 'nodejs',
      tags: [
        `env:${process.env.NODE_ENV || 'development'}`,
        ...(entry.requestId ? [`request_id:${entry.requestId}`] : []),
        ...(entry.performance?.endpoint ? [`endpoint:${entry.performance.endpoint}`] : [])
      ],
      attributes: {
        ...entry.context,
        ...(entry.error && { error: entry.error }),
        ...(entry.performance && { performance: entry.performance })
      }
    };

    // In production, send to Datadog API
    if (process.env.NODE_ENV === 'production') {
      try {
        // This would be the actual Datadog API call
        // await fetch('https://http-intake.logs.datadoghq.com/v1/input/' + this.apiKey, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(datadogLog)
        // });
        console.log('[DATADOG]', JSON.stringify(datadogLog));
      } catch (error) {
        console.error('Failed to send log to Datadog:', error);
      }
    }
  }
}

/**
 * Sentry integration for error tracking
 */
class SentryOutput extends LogOutput {
  constructor(private dsn: string) {
    super();
  }

  async write(entry: LogEntry): Promise<void> {
    // Only send errors and fatal logs to Sentry
    if (entry.level !== LogLevel.ERROR && entry.level !== LogLevel.FATAL) {
      return;
    }

    // In a real implementation, this would use the Sentry SDK
    const sentryEvent = {
      message: entry.message,
      level: entry.level === LogLevel.FATAL ? 'fatal' : 'error',
      timestamp: entry.timestamp.getTime() / 1000,
      tags: {
        requestId: entry.requestId,
        ...(entry.performance?.endpoint && { endpoint: entry.performance.endpoint })
      },
      extra: {
        context: entry.context,
        performance: entry.performance
      },
      ...(entry.error && {
        exception: {
          values: [{
            type: entry.error.name,
            value: entry.error.message,
            stacktrace: entry.error.stack ? {
              frames: this.parseStackTrace(entry.error.stack)
            } : undefined
          }]
        }
      })
    };

    // In production, send to Sentry
    if (process.env.NODE_ENV === 'production') {
      try {
        // This would be the actual Sentry API call
        console.log('[SENTRY]', JSON.stringify(sentryEvent));
      } catch (error) {
        console.error('Failed to send event to Sentry:', error);
      }
    }
  }

  private parseStackTrace(stack: string): any[] {
    // Simple stack trace parsing - in production, use Sentry SDK
    return stack.split('\n').slice(1).map(line => ({
      filename: line.match(/\((.+):\d+:\d+\)/)?.[1] || 'unknown',
      function: line.match(/at\s+(.+?)\s+\(/)?.[1] || 'anonymous',
      lineno: parseInt(line.match(/:(\d+):\d+\)/)?.[1] || '0'),
      colno: parseInt(line.match(/:(\d+)\)/)?.[1] || '0')
    }));
  }
}

// Export singleton instance
export const logger = Logger.getInstance();