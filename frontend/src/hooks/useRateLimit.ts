import { useState, useEffect } from "react";

interface RateLimitInfo {
  remaining: number;
  reset: number | null;
  limit: number | null;
  timestamp: number;
}

interface RateLimitError {
  remaining: number;
  reset: number;
  retryAfter: number;
  timestamp: number;
}

export const useRateLimit = () => {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);

  useEffect(() => {
    const checkRateLimit = () => {
      // Check for rate limit info
      const infoStr = localStorage.getItem("rateLimitInfo");
      if (infoStr) {
        try {
          const info = JSON.parse(infoStr);
          // Only use if less than 5 minutes old
          if (Date.now() - info.timestamp < 5 * 60 * 1000) {
            setRateLimitInfo(info);
          } else {
            localStorage.removeItem("rateLimitInfo");
            setRateLimitInfo(null); // Clear in-memory state when stored value is expired
          }
        } catch (e) {
          localStorage.removeItem("rateLimitInfo");
          setRateLimitInfo(null); // Clear in-memory state when stored value is invalid
        }
      } else {
        setRateLimitInfo(null); // Clear in-memory state when localStorage is empty
      }

      // Check for rate limit errors
      const errorStr = localStorage.getItem("rateLimitError");
      if (errorStr) {
        try {
          const error = JSON.parse(errorStr);
          // Only show if less than 1 hour old
          if (Date.now() - error.timestamp < 60 * 60 * 1000) {
            setRateLimitError(error);
          } else {
            localStorage.removeItem("rateLimitError");
            setRateLimitError(null); // Clear in-memory state when localStorage is cleared
          }
        } catch (e) {
          localStorage.removeItem("rateLimitError");
          setRateLimitError(null); // Clear in-memory state when stored value is invalid
        }
      } else {
        setRateLimitError(null); // Clear in-memory state when localStorage is empty
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  const clearError = () => {
    localStorage.removeItem("rateLimitError");
    setRateLimitError(null);
  };

  return {
    rateLimitInfo,
    rateLimitError,
    clearError,
    isNearLimit: rateLimitInfo ? rateLimitInfo.remaining < 10 : false,
  };
};
