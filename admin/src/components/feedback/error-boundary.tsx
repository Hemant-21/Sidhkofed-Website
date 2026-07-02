'use client';

/**
 * Reusable React error boundary. Catches render-time exceptions in a subtree and
 * shows a safe fallback instead of a white screen. Pair with React Query's own
 * error states for data errors; this catches the rest. (Next.js route-level
 * error.tsx handles segment errors; this is for finer-grained in-page guards.)
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './error-state';

interface Props {
  children: ReactNode;
  /** Custom fallback; receives the error + a reset() to retry the subtree. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional reporting hook (e.g. send to a logger). */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return <ErrorState error={error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
