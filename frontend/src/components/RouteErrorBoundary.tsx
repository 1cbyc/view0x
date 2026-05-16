import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = { children: React.ReactNode };

type State = { error: Error | null };

export class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container mx-auto max-w-lg px-4 py-16">
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">{this.state.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  this.setState({ error: null });
                  window.location.href = "/";
                }}
              >
                Go home
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return this.props.children;
  }
}
