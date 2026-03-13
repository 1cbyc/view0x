import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Log to external error tracking service if configured
        if (process.env.VITE_ERROR_TRACKING_DSN) {
            this.logErrorToService(error, errorInfo);
        }
    }

    private logErrorToService(error: Error, errorInfo: ErrorInfo) {
        // Placeholder for error tracking service (e.g., Sentry, Rollbar)
        // Implementation would depend on the chosen service
        console.log('Logging error to tracking service:', {
            error: error.toString(),
            componentStack: errorInfo.componentStack,
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                    <div className="max-w-md w-full">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Something went wrong</AlertTitle>
                            <AlertDescription>
                                <div className="mt-2 space-y-2">
                                    <p>We encountered an unexpected error. Please try refreshing the page.</p>
                                    {process.env.NODE_ENV === 'development' && this.state.error && (
                                        <details className="mt-4 text-xs">
                                            <summary className="cursor-pointer font-semibold">Error Details</summary>
                                            <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded overflow-auto">
                                                {this.state.error.toString()}
                                                {this.state.errorInfo?.componentStack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </AlertDescription>
                        </Alert>
                        <div className="mt-4 flex gap-2">
                            <Button onClick={this.handleReset} className="flex-1">
                                Return to Home
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="flex-1"
                            >
                                Reload Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
