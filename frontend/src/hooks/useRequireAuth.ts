import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Redirects to login when there is no access token.
 * Returns false until auth is confirmed (show loader on protected pages).
 */
export function useRequireAuth(): { ready: boolean; isAuthenticated: boolean } {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setReady(true);
      navigate("/login", {
        replace: true,
        state: { from: location.pathname, tab: (location.state as { tab?: string })?.tab },
      });
      return;
    }
    setReady(true);
  }, [navigate, location.pathname, location.state]);

  const isAuthenticated = !!localStorage.getItem("accessToken");
  return { ready, isAuthenticated };
}
