import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.section || 'unknown'}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Something went wrong
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {this.props.section
              ? `The ${this.props.section} section ran into an issue.`
              : 'An unexpected error occurred.'}{' '}
            Your progress is safe — try again or reload the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="text-xs text-destructive bg-destructive/5 rounded-lg p-3 mb-4 max-w-md overflow-auto text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={this.handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="secondary" size="sm" onClick={this.handleReload}>
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
