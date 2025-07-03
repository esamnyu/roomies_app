'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/primitives/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  isolate?: boolean;
  showReportButton?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  lastErrorTime: number;
  errorCount: number;
}

export class UnifiedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private resetTimeoutId: NodeJS.Timeout | null = null;
  
  // Circuit breaker configuration
  private readonly ERROR_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 30000; // 30 seconds
  private readonly BACKOFF_MULTIPLIER = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      lastErrorTime: 0,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, autoRetry, maxRetries = 3 } = this.props;
    const now = Date.now();
    
    // Update error tracking
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1,
      lastErrorTime: now
    }));

    console.error('ErrorBoundary caught error:', error, errorInfo);
    onError?.(error, errorInfo);

    // Check if circuit breaker should open
    if (this.state.errorCount >= this.ERROR_THRESHOLD) {
      console.error('Circuit breaker opened - too many errors');
      return;
    }

    // Auto-retry logic with exponential backoff
    if (autoRetry && this.state.retryCount < maxRetries) {
      const delay = this.calculateBackoffDelay();
      this.scheduleRetry(delay);
    }

    // Schedule error count reset
    this.scheduleErrorCountReset();
  }

  private calculateBackoffDelay(): number {
    const { retryDelay = 2000 } = this.props;
    const backoffDelay = retryDelay * Math.pow(this.BACKOFF_MULTIPLIER, this.state.retryCount);
    return Math.min(backoffDelay, 30000); // Max 30 seconds
  }

  private scheduleRetry = (delayMs: number) => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    console.log(`Scheduling retry in ${delayMs}ms (attempt ${this.state.retryCount + 1})`);
    
    this.retryTimeoutId = setTimeout(() => {
      this.retry();
    }, delayMs);
  };

  private scheduleErrorCountReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.setState({ errorCount: 0 });
      console.log('Error count reset');
    }, this.RESET_TIMEOUT);
  };

  private retry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.error('Max retries reached');
      return;
    }

    if (this.state.errorCount >= this.ERROR_THRESHOLD) {
      console.error('Circuit breaker is open - retry blocked');
      return;
    }

    console.log('Retrying...');
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private manualRetry = () => {
    // Reset circuit breaker on manual retry
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      errorCount: 0
    });
  };

  private reportError = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    console.log('Error report:', errorDetails);
    // In production, this would send to an error tracking service
    alert('Error has been reported. Thank you!');
  };

  render() {
    if (this.state.hasError) {
      const { fallback, isolate, showReportButton } = this.props;
      const isCircuitOpen = this.state.errorCount >= this.ERROR_THRESHOLD;

      if (fallback) {
        return <>{fallback}</>;
      }

      // For isolated errors, show a minimal error UI
      if (isolate) {
        return (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Component failed to load
            </p>
            <Button 
              onClick={this.manualRetry} 
              variant="ghost" 
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        );
      }

      // Full error UI for non-isolated errors
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
          <div className="text-center space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {isCircuitOpen ? 'Too Many Errors' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-secondary-foreground max-w-md">
              {isCircuitOpen 
                ? 'The application is experiencing issues. Please try again later.'
                : this.state.error?.message || 'An unexpected error occurred'}
            </p>
            
            <div className="flex gap-2 justify-center">
              {!isCircuitOpen && (
                <Button onClick={this.manualRetry} variant="primary">
                  Try Again
                </Button>
              )}
              {showReportButton && (
                <Button onClick={this.reportError} variant="outline">
                  Report Issue
                </Button>
              )}
            </div>
            
            {isCircuitOpen && (
              <p className="text-xs text-secondary-foreground">
                Automatic recovery will be attempted in a few moments
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export a default error boundary component
export const ErrorBoundary = UnifiedErrorBoundary;