/**
 * Advanced logger utility with different log levels and additional features
 * 
 * This module provides a comprehensive logging system with:
 * - Multiple log levels (debug, info, warn, error)
 * - Environment-based configuration
 * - File and console output
 * - Request ID tracking for tracing requests through the system
 * - Advanced error formatting
 * - JSON formatting for complex objects
 */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configure environment-based logging
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const ENABLE_FILE_LOGGING = process.env.ENABLE_FILE_LOGGING === 'true';
const LOG_DIRECTORY = process.env.LOG_DIRECTORY || 'logs';

// Define log level priorities - lower number means more verbose
const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,  // Most verbose
  info: 1,   // General information
  warn: 2,   // Warning conditions
  error: 3   // Error conditions
};

/**
 * Determines if a message at the specified level should be logged
 * based on the configured LOG_LEVEL environment variable
 * 
 * @param level - The log level to check
 * @returns boolean indicating if the message should be logged
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVEL_PRIORITIES[level] >= LOG_LEVEL_PRIORITIES[LOG_LEVEL];
};

/**
 * Generates a formatted ISO timestamp for log entries
 * 
 * @returns ISO timestamp string
 */
const timestamp = (): string => {
  return new Date().toISOString();
};

// Create logs directory if it doesn't exist and file logging is enabled
if (ENABLE_FILE_LOGGING) {
  const logDir = path.resolve(process.cwd(), LOG_DIRECTORY);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Generates a log filename based on the current date (YYYY-MM-DD.log)
 * This creates daily rotating log files
 * 
 * @returns The log filename for today
 */
const getLogFileName = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.log`;
};

/**
 * Writes a log message to the daily log file if file logging is enabled
 * 
 * @param message - The formatted log message to write
 */
const writeToFile = (message: string): void => {
  if (ENABLE_FILE_LOGGING) {
    const logFileName = getLogFileName();
    const logFilePath = path.resolve(process.cwd(), LOG_DIRECTORY, logFileName);
    fs.appendFileSync(logFilePath, message + '\n');
  }
};

/**
 * Formats error objects for better readability in logs
 * Handles different types of errors and converts objects to readable format
 * 
 * @param error - The error object to format
 * @returns A formatted string representation of the error
 */
const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\nStack: ${error.stack || 'No stack trace'}`;
  } else if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return String(error);
    }
  }
  return String(error);
};

/**
 * Creates a standardized log message format with timestamp, level, and metadata
 * 
 * @param level - The log level
 * @param message - The main log message
 * @param meta - Optional metadata or additional context
 * @param requestId - Optional request ID for tracking through system
 * @returns Formatted log message string
 */
const formatLogMessage = (level: LogLevel, message: string, meta?: unknown, requestId?: string): string => {
  let formattedMeta = '';
  
  if (meta) {
    if (meta instanceof Error) {
      formattedMeta = `\n${formatError(meta)}`;
    } else {
      try {
        formattedMeta = typeof meta === 'object' ? `\n${JSON.stringify(meta, null, 2)}` : ` ${meta}`;
      } catch (e) {
        formattedMeta = ` ${String(meta)}`;
      }
    }
  }
  
  const requestIdStr = requestId ? ` [${requestId}]` : '';
  return `[${timestamp()}] [${level.toUpperCase()}]${requestIdStr} ${message}${formattedMeta}`;
};

// Logger implementation with request ID tracking capabilities
export const logger = {
  // Request ID management for tracking requests across the system
  requestId: {
    create: (): string => uuidv4(),
    current: new Map<number, string>()
  },

  /**
   * Log a debug message
   * 
   * @param message - The main log message
   * @param meta - Optional metadata or context
   * @param requestId - Optional request ID for tracking
   */
  debug(message: string, meta?: unknown, requestId?: string): void {
    if (shouldLog('debug')) {
      const formattedMessage = formatLogMessage('debug', message, meta, requestId);
      console.debug(formattedMessage);
      writeToFile(formattedMessage);
    }
  },

  /**
   * Log an info message
   * 
   * @param message - The main log message
   * @param meta - Optional metadata or context
   * @param requestId - Optional request ID for tracking
   */
  info(message: string, meta?: unknown, requestId?: string): void {
    if (shouldLog('info')) {
      const formattedMessage = formatLogMessage('info', message, meta, requestId);
      console.info(formattedMessage);
      writeToFile(formattedMessage);
    }
  },

  /**
   * Log a warning message
   * 
   * @param message - The main log message
   * @param meta - Optional metadata or context
   * @param requestId - Optional request ID for tracking
   */
  warn(message: string, meta?: unknown, requestId?: string): void {
    if (shouldLog('warn')) {
      const formattedMessage = formatLogMessage('warn', message, meta, requestId);
      console.warn(formattedMessage);
      writeToFile(formattedMessage);
    }
  },

  /**
   * Log an error message
   * 
   * @param message - The main log message
   * @param error - Optional error object
   * @param requestId - Optional request ID for tracking
   */
  error(message: string, error?: unknown, requestId?: string): void {
    if (shouldLog('error')) {
      const formattedMessage = formatLogMessage('error', message, error, requestId);
      console.error(formattedMessage);
      writeToFile(formattedMessage);
    }
  }
}; 