import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RateLimitAlertProps {
  remaining?: number;
  reset?: number;
  retryAfter?: number;
  onDismiss?: () => void;
}

export const RateLimitAlert: React.FC<RateLimitAlertProps> = ({
  remaining,
  reset,
  retryAfter,
  onDismiss,
}) => {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  };

  return (
    <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/20">
      <AlertTriangle className="h-4 w-4 text-yellow-400" />
      <AlertTitle className="text-yellow-400">Rate Limit Exceeded</AlertTitle>
      <AlertDescription className="text-yellow-400">
        <div className="space-y-2">
          <p>You've exceeded the rate limit for this endpoint.</p>
          {remaining !== undefined && (
            <p className="text-sm">Remaining requests: {remaining}</p>
          )}
          {retryAfter !== undefined && (
            <p className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Please try again in {formatTime(retryAfter)}
            </p>
          )}
          {reset && (
            <p className="text-xs text-yellow-400/70">
              Reset at: {new Date(reset * 1000).toLocaleTimeString()}
            </p>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
