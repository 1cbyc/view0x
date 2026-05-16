import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Menu, ShieldCheck } from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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
      } catch {
        setUser(null);
      }
    };

    checkAuthState();
    window.addEventListener("storage", checkAuthState);
    return () => window.removeEventListener("storage", checkAuthState);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setMenuOpen(false);
    navigate("/login");
  };

  const navLinks = (
    <>
      <Link
        to="/analyze"
        className="block py-2 text-sm font-medium text-white/80 hover:text-white md:py-0"
        onClick={() => setMenuOpen(false)}
      >
        Scanner
      </Link>
      {user ? (
        <>
          <Link
            to="/dashboard"
            className="block py-2 text-sm font-medium text-white/80 hover:text-white md:py-0"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/profile"
            className="block py-2 text-sm font-medium text-white/80 hover:text-white md:py-0"
            onClick={() => setMenuOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/notifications"
            className="block py-2 text-sm font-medium text-white/80 hover:text-white md:py-0"
            onClick={() => setMenuOpen(false)}
          >
            Notifications
          </Link>
        </>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <nav className="container flex h-14 max-w-screen-2xl items-center justify-between px-3 sm:px-4 md:px-6 gap-2">
        <div className="flex items-center min-w-0 flex-shrink gap-2">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white shrink-0"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,20rem)] bg-black border-white/10">
              <SheetHeader>
                <SheetTitle className="text-white text-left">view0x</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-1">{navLinks}</div>
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-2">
                {user ? (
                  <Button
                    onClick={handleLogout}
                    className="w-full bg-white text-black hover:bg-gray-200"
                  >
                    Logout
                  </Button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}>
                      <Button className="w-full bg-white text-black hover:bg-gray-200">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to="/"
            className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0 min-w-0"
          >
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-accent flex-shrink-0" />
            <span className="font-bold text-white text-sm sm:text-base md:text-lg truncate">
              view0x
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-6 text-sm font-medium ml-4">
            {navLinks}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-1 sm:space-x-2 min-w-0">
          <ThemeToggle />
          {user ? (
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/notifications">
                <Button
                  variant="ghost"
                  className="text-white/60 hover:text-white px-2"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                onClick={handleLogout}
                className="bg-white text-black hover:bg-gray-200 text-sm px-4"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" className="text-white/60 hover:text-white text-sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-white text-black hover:bg-gray-200 text-sm">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
