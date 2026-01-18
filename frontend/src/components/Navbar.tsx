import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { AccessibilitySettings } from "./AccessibilitySettings";

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
    
    // Listen for storage events (from other tabs) and custom events (from same tab)
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
    <header 
      className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60"
      role="banner"
    >
      <nav 
        className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <div className="mr-4 flex flex-1 sm:flex-initial">
          <Link 
            to="/" 
            className="mr-4 sm:mr-6 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black rounded"
            aria-label="view0x home"
          >
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-accent" aria-hidden="true" />
            <span className="font-bold text-white text-base sm:text-lg">view0x</span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/analyze"
              className="transition-colors hover:text-white text-white/60 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-black rounded px-2"
              aria-label="Contract Scanner"
            >
              Scanner
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2">
          <AccessibilitySettings />
          <ThemeToggle />
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link to="/dashboard">
                <Button 
                  variant="ghost" 
                  className="text-white/60 hover:text-white text-xs sm:text-sm px-2 sm:px-4"
                  aria-label="Dashboard"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden">Dash</span>
                </Button>
              </Link>
              <Link to="/profile">
                <Button 
                  variant="ghost" 
                  className="text-white/60 hover:text-white text-xs sm:text-sm px-2 sm:px-4"
                  aria-label="Profile"
                >
                  Profile
                </Button>
              </Link>
              <Button 
                onClick={handleLogout} 
                className="bg-white text-black hover:bg-gray-200 text-xs sm:text-sm px-2 sm:px-4"
                aria-label="Logout"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Out</span>
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button 
                  variant="ghost" 
                  className="text-white/60 hover:text-white text-xs sm:text-sm px-2 sm:px-4"
                  aria-label="Sign In"
                >
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">In</span>
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  className="bg-white text-black hover:bg-gray-200 text-xs sm:text-sm px-2 sm:px-4"
                  aria-label="Sign Up"
                >
                  <span className="hidden sm:inline">Sign Up</span>
                  <span className="sm:hidden">Up</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
