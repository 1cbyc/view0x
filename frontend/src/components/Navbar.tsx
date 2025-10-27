import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string } | null>(null);

  // Effect to check auth state on mount and on storage change
  useEffect(() => {
    const checkAuthState = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const accessToken = localStorage.getItem("accessToken");
        if (storedUser && accessToken) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        setUser(null);
      }
    };

    checkAuthState();
    window.addEventListener("storage", checkAuthState);

    return () => {
      window.removeEventListener("storage", checkAuthState);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-bold">SecureAudit</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/analyze"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Scanner
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {user ? (
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <Button onClick={handleLogout}>Logout</Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
