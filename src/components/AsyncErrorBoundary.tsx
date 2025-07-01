// src/components/AsyncErrorBoundary.tsx
// Specialized error boundary for handling async operations and API failures
"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Wifi, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { getErrorMessage, isOperationalError, NetworkError, AuthError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only shows error for this boundary, doesn't crash parent
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AsyncErrorBoundary caught error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Only log non-operational errors to external service
    if (!isOperationalError(error)) {
      // TODO: Send to error reporting service
      console.error('Non-operational error in AsyncErrorBoundary:', error);
    }
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private retry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  private autoRetry = (delayMs = 2000) => {
    this.retryTimeoutId = setTimeout(() => {
      this.retry();
    }, delayMs);
  };

  private getErrorType = (error: Error) => {
    if (error instanceof NetworkError || error.name === 'NetworkError') {
      return 'network';
    }
    if (error instanceof AuthError || error.name === 'AuthError') {
      return 'auth';
    }
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      return 'network';
    }
    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      return 'auth';
    }
    return 'generic';
  };

  private renderErrorUI = (error: Error) => {
    const errorType = this.getErrorType(error);
    
    // Different UI based on error type
    switch (errorType) {
      case 'network':
        return (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Wifi className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">
                  Connection Problem
                </h3>
                <p className="text-orange-700">
                  Unable to connect to our servers
                </p>
              </div>
            </div>
            <p className="text-sm text-orange-600 mb-4">
              Please check your internet connection and try again.
            </p>
            <div className="flex space-x-3">
              <Button onClick={this.retry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => this.autoRetry(5000)} 
                variant="ghost" 
                size="sm"
              >
                Auto-retry in 5s
              </Button>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Authentication Required
                </h3>
                <p className="text-red-700">
                  Your session has expired
                </p>
              </div>
            </div>
            <p className="text-sm text-red-600 mb-4">
              Please sign in again to continue.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline" 
              size="sm"
            >
              Sign In
            </Button>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-gray-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Something went wrong
                </h3>
                <p className="text-gray-700">
                  {getErrorMessage(error)}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={this.retry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Error Details (Dev)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        );
    }
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // For isolated boundaries, show inline error
      if (this.props.isolate) {
        return this.renderErrorUI(this.state.error);
      }

      // For non-isolated boundaries, show full-screen error
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full">
            {this.renderErrorUI(this.state.error)}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useAsyncError() {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error; // This will be caught by the nearest error boundary
    });
  }, []);
}

/**
 * Higher-order component to wrap components with AsyncErrorBoundary
 */
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </AsyncErrorBoundary>
  );

  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}