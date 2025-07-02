// src/components/ErrorBoundary.tsx
// Enhanced main error boundary with better error categorization and recovery options
"use client"; 
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { getErrorMessage, isOperationalError, logError } from '@/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showReportButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  reportSent: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
    reportSent: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error, 
      errorId: Date.now().toString(),
      reportSent: false 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced logging with more context
    logError(error, 'ErrorBoundary', {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private reset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null,
      reportSent: false 
    });
  };

  private reportError = async () => {
    if (this.state.reportSent || !this.state.error) return;
    
    try {
      // TODO: Send detailed error report to support system
      // await sendErrorReport({
      //   errorId: this.state.errorId,
      //   error: this.state.error,
      //   userFeedback: 'User-reported error',
      // });
      
      this.setState({ reportSent: true });
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Enhanced default error UI
      const isOperational = isOperationalError(this.state.error);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-lg text-center">
            <div className="flex justify-center mb-4">
              {isOperational ? (
                <AlertCircle className="h-16 w-16 text-orange-500" />
              ) : (
                <Bug className="h-16 w-16 text-red-500" />
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isOperational ? 'Temporary Issue' : 'Unexpected Error'}
            </h1>
            
            <p className="text-secondary-foreground mb-6">
              {getErrorMessage(this.state.error)}
            </p>
            
            {this.state.errorId && (
              <div className="bg-secondary p-3 rounded-lg mb-6">
                <p className="text-xs text-secondary-foreground">
                  Error ID: <code className="font-mono">{this.state.errorId}</code>
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button onClick={this.reset} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                
                {this.props.showReportButton && !isOperational && (
                  <Button
                    variant="outline"
                    onClick={this.reportError}
                    disabled={this.state.reportSent}
                    className="flex-1"
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    {this.state.reportSent ? 'Reported' : 'Report Bug'}
                  </Button>
                )}
              </div>
              
              {isOperational && (
                <p className="text-xs text-secondary-foreground mt-4">
                  This usually resolves itself. If it persists, try refreshing your browser.
                </p>
              )}
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-secondary-foreground">
                  Error Details (Development)
                </summary>
                <div className="mt-2 text-xs space-y-2">
                  <div className="bg-gray-100 p-2 rounded">
                    <strong>Message:</strong> {this.state.error.message}
                  </div>
                  <div className="bg-gray-100 p-2 rounded">
                    <strong>Type:</strong> {this.state.error.name}
                  </div>
                  <pre className="bg-gray-100 p-2 rounded overflow-auto text-xs">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Enhanced hook for error handling in functional components
export function useErrorHandler() {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error, context?: string) => {
    // Log error with context
    logError(error, context || 'useErrorHandler');
    
    // Trigger error boundary by setting state with error
    setError(() => {
      throw error;
    });
  }, []);
}

// Higher-order component wrapper for easy error boundary integration
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}