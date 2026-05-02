/**
 * Logging utility for the application
 * Provides structured logging with different levels and context
 */

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Current log level - defaults to 'debug' in development
const getCurrentLogLevel = (): LogLevel => {
  const env = import.meta.env.MODE || 'development';
  if (env === 'production') {
    return LogLevel.WARN;
  }
  return LogLevel.DEBUG;
};

const currentLogLevel = getCurrentLogLevel();

// Log level priority (lower number = higher priority)
const logLevelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Check if a log level should be output based on current configuration
 */
const shouldLog = (level: LogLevel): boolean => {
  return logLevelPriority[level] >= logLevelPriority[currentLogLevel];
};

/**
 * Format the log message with timestamp and context
 */
const formatMessage = (
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
};

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(
        formatMessage(LogLevel.DEBUG, message, data),
        this.getContextPrefix()
      );
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.INFO)) {
      console.info(
        formatMessage(LogLevel.INFO, message, data),
        this.getContextPrefix()
      );
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(
        formatMessage(LogLevel.WARN, message, data),
        this.getContextPrefix()
      );
    }
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): void {
    if (shouldLog(LogLevel.ERROR)) {
      const errorData = error
        ? {
            ...data,
            errorMessage:
              error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }
        : data;
      console.error(
        formatMessage(LogLevel.ERROR, message, errorData),
        this.getContextPrefix()
      );
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  private getContextPrefix(): string {
    return `[${this.context}]`;
  }
}

/**
 * Create a logger instance with the specified context
 */
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Export a default logger for convenience
export default createLogger('App');
