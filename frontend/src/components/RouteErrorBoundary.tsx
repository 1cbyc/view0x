import React from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };

type State = { error: Error | null; resetKey: number };

class RouteErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[view0x] Route error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="container mx-auto max-w-lg px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Something went wrong on this page</AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm">{this.state.error.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={this.handleRetry}>
                  Try again
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link to="/">Go home</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
    );
  }
}

/** Per-route boundary: unmounting the route clears errors on navigation. */
export const RouteErrorBoundary: React.FC<Props> = ({ children }) => (
  <RouteErrorBoundaryInner>{children}</RouteErrorBoundaryInner>
);
