/**
 * Global Error Handler
 * Catches and displays errors gracefully
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

class ErrorHandler {
  private errors: ErrorInfo[] = [];
  private maxErrors = 50;

  /**
   * Handle an error
   */
  handleError(error: Error | string, context?: Record<string, unknown>): void {
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      details: context,
      timestamp: new Date().toISOString(),
    };

    // Add to errors list
    this.errors.unshift(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorHandler:', errorInfo);
    }

    // In production, you could send to error tracking service
    // Example: Sentry.captureException(error, { contexts: { custom: context } });
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): ErrorInfo[] {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Handle API errors
   */
  handleAPIError(response: Response, context?: Record<string, unknown>): void {
    response.json().then((data) => {
      this.handleError(
        new Error(data.error || `API Error: ${response.status}`),
        {
          ...context,
          status: response.status,
          statusText: response.statusText,
          data,
        }
      );
    }).catch(() => {
      this.handleError(
        new Error(`API Error: ${response.status} ${response.statusText}`),
        context
      );
    });
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: Error, context?: Record<string, unknown>): void {
    this.handleError(
      new Error('Network error: Unable to connect to server'),
      {
        ...context,
        originalError: error.message,
      }
    );
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Global error handler for unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      {
        type: 'unhandled_promise_rejection',
      }
    );
  });
}

export default errorHandler;

