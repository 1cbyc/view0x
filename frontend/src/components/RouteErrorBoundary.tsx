import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };

type State = { error: Error | null };

class RouteErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[view0x] Route error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container mx-auto max-w-lg px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Something went wrong on this page</AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm">{this.state.error.message}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => this.setState({ error: null })}
                >
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
    return this.props.children;
  }
}

/**
 * Remounts the error boundary when the URL changes so a crash on one page
 * does not leave the rest of the app stuck until a full refresh.
 */
export const RouteErrorBoundary: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  return (
    <RouteErrorBoundaryInner key={location.pathname}>
      {children}
    </RouteErrorBoundaryInner>
  );
};
