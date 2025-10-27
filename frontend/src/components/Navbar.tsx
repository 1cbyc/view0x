import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string } | null>(null);

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

  useEffect(() => {
    checkAuthState();

    // Listen for storage changes to sync login/logout across tabs
    window.addEventListener("storage", checkAuthState);

    return () => {
      window.removeEventListener("storage", checkAuthState);
    };
  }, []);

  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // Update state and redirect
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and App Name */}
          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center space-x-2 text-xl font-bold text-gray-800"
            >
              <ShieldCheck className="h-7 w-7 text-blue-600" />
              <span>SecureAudit</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <Link
              to="/analyze"
              className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
            >
              Scanner
            </Link>
            {/* Future links can be added here */}
          </div>

          {/* Auth Links */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-sm text-gray-700">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
