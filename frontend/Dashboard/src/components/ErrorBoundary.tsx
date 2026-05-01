/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you could send to error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  // Use window.location for navigation since we can't use hooks in class component context
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="glass-card p-8 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">An unexpected error occurred</p>
          </div>
        </div>

        {import.meta.env.DEV && error && (
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-destructive/20">
            <p className="text-sm font-mono text-destructive mb-2">{error.name}</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {error.stack && (
              <details className="mt-4">
                <summary className="text-xs text-muted-foreground cursor-pointer">
                  Stack trace
                </summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-background rounded">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={onReset} variant="default" className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={handleGoHome} variant="outline" className="flex-1">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          If this problem persists, please contact support
        </p>
      </Card>
    </div>
  );
}

export default ErrorBoundary;

