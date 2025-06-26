// src/lib/errors/index.ts
import { PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

// Base error class for all application errors
export class AppError extends Error {
  public readonly isOperational: boolean;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, public errors?: any[]) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      503,
      false // Not operational - indicates system issue
    );
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Error handler for Supabase errors
export function handleSupabaseError(error: PostgrestError): never {
  // Map common Supabase errors to our error types
  switch (error.code) {
    case 'PGRST301': // JWT expired
    case '42501': // Insufficient privilege
      throw new AuthenticationError('Session expired');
    
    case '23505': // Unique violation
      throw new ConflictError(error.message);
    
    case '23503': // Foreign key violation
      throw new ValidationError('Invalid reference');
    
    case '22P02': // Invalid text representation
      throw new ValidationError('Invalid data format');
    
    case 'PGRST116': // Not found
      throw new NotFoundError('Resource');
    
    default:
      throw new AppError(error.message, error.code, 500, false);
  }
}

// Global error handler wrapper
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // Log error with context
    console.error(`[${context}] Error:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      code: error instanceof AppError ? error.code : undefined,
      timestamp: new Date().toISOString(),
      context
    });
    
    // Handle different error types
    if (error instanceof AppError) {
      throw error; // Re-throw operational errors
    }
    
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as PostgrestError;
      handleSupabaseError(pgError);
    }
    
    // Unknown errors - don't expose internals
    throw new AppError(
      'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      false
    );
  }
}

// React error boundary error handler
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

// Error serializer for API responses
export function serializeError(error: unknown) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    };
  }
  
  return {
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}

// Utility to check if error is operational
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}