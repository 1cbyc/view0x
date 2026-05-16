import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState<Theme>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "theme" || !e.newValue) return;
      if (e.newValue === "light" || e.newValue === "dark") {
        applyTheme(e.newValue);
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleToggle = () => {
    setTheme((prev) => toggleTheme(prev));
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleToggle}
      className="relative shrink-0 border-border bg-background text-foreground hover:bg-accent/10"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

