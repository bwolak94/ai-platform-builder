import { Component } from "react";
import type { ErrorInfo } from "react";
import type { ErrorBoundaryProps, ErrorBoundaryState } from "./ErrorBoundary.types";

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-destructive font-medium">Something went wrong</p>
          <p className="text-muted-foreground text-sm">{this.state.error?.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
