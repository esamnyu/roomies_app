// src/lib/errors.ts
// Comprehensive error handling utilities for the Roomies application

/**
 * Application-specific error types that extend the base Error class
 * These help categorize errors and provide better user feedback
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string,
    isOperational = true,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isOperational = isOperational;
    this.statusCode = statusCode;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_ERROR', statusCode = 401) {
    super(message, code, true, statusCode);
    this.name = 'AuthError';
  }
}

/**
 * Network/API-related errors
 */
export class NetworkError extends AppError {
  constructor(message: string, code = 'NETWORK_ERROR', statusCode = 500) {
    super(message, code, true, statusCode);
    this.name = 'NetworkError';
  }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR', statusCode = 400) {
    super(message, code, true, statusCode);
    this.name = 'ValidationError';
  }
}

/**
 * Permission/authorization errors
 */
export class PermissionError extends AppError {
  constructor(message: string, code = 'PERMISSION_ERROR', statusCode = 403) {
    super(message, code, true, statusCode);
  }
}

/**
 * Legacy aliases for backward compatibility
 */
export class AuthorizationError extends PermissionError {
  constructor(message: string, code = 'AUTHORIZATION_ERROR') {
    super(message, code, 403);
  }
}

export class AuthenticationError extends AuthError {
  constructor(message: string, code = 'AUTHENTICATION_ERROR') {
    super(message, code, 401);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND', statusCode = 404) {
    super(message, code, true, statusCode);
  }
}

/**
 * Determines if an error is operational (expected) vs programming errors (bugs)
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  
  // Common operational error patterns
  const operationalPatterns = [
    /network/i,
    /timeout/i,
    /connection/i,
    /unauthorized/i,
    /forbidden/i,
    /not found/i,
    /validation/i,
  ];
  
  return operationalPatterns.some(pattern => 
    (error.message && pattern.test(error.message)) || (error.name && pattern.test(error.name))
  );
}

/**
 * Gets user-friendly error message for display
 */
export function getErrorMessage(error: Error): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  // Map common error types to user-friendly messages
  const errorMessageMap: Record<string, string> = {
    'Failed to fetch': 'Unable to connect to the server. Please check your internet connection.',
    'NetworkError': 'A network error occurred. Please try again.',
    'TypeError': 'Something went wrong with the application. Please refresh and try again.',
    'ChunkLoadError': 'Failed to load part of the application. Please refresh the page.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  
  // Check for exact matches first
  if (error.message && errorMessageMap[error.message]) {
    return errorMessageMap[error.message];
  }
  
  // Check for error name matches
  if (errorMessageMap[error.name]) {
    return errorMessageMap[error.name];
  }
  
  // Check for partial matches in message
  for (const [key, message] of Object.entries(errorMessageMap)) {
    if (error.message && error.message.includes(key)) {
      return message;
    }
  }
  
  // Fallback for development vs production
  if (process.env.NODE_ENV === 'development') {
    return error.message || 'An unexpected error occurred';
  }
  
  return 'Something went wrong. Please try again or contact support if the problem persists.';
}

/**
 * Wraps async functions to convert thrown errors into standardized AppErrors
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Convert unknown errors to AppErrors
      const message = context 
        ? `Error in ${context}: ${getErrorMessage(error as Error)}`
        : getErrorMessage(error as Error);
        
      throw new AppError(message, 'UNKNOWN_ERROR', true);
    }
  };
}

/**
 * Error logging utility - will integrate with external services in production
 */
export function logError(
  error: Error, 
  context?: string, 
  metadata?: Record<string, unknown>
) {
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context,
    metadata,
    timestamp: new Date().toISOString(),
    isOperational: isOperationalError(error),
  };
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', errorInfo);
    return;
  }
  
  // In production, send to external service
  // TODO: Integrate with Sentry, LogRocket, or similar service
  // Example:
  // Sentry.captureException(error, {
  //   contexts: { errorInfo },
  //   tags: { context },
  // });
}

/**
 * Retry wrapper for functions that might fail temporarily
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = (error) => isOperationalError(error),
  } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt or if error shouldn't be retried
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Legacy function for backward compatibility
 */
interface SupabaseError {
  code?: string;
  message?: string;
}

export function handleSupabaseError(error: SupabaseError): never {
  if (error?.code === 'PGRST301') {
    throw new NotFoundError('Resource not found');
  }
  if (error?.code === '23505') {
    throw new ValidationError('Duplicate entry');
  }
  if (error?.message) {
    throw new AppError(error.message, error.code || 'SUPABASE_ERROR');
  }
  throw new AppError('Database operation failed', 'SUPABASE_ERROR');
}