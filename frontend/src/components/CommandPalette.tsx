import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  ShieldAlert,
  User,
  Settings,
  LogOut,
  Home,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
  category: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    {
      id: "analyze",
      label: "New Analysis",
      icon: <ShieldAlert className="w-4 h-4" />,
      action: () => {
        navigate("/analyze");
        onOpenChange(false);
      },
      keywords: ["new", "analyze", "scan", "contract"],
      category: "actions",
    },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Home className="w-4 h-4" />,
      action: () => {
        navigate("/dashboard");
        onOpenChange(false);
      },
      keywords: ["dashboard", "home", "main"],
      category: "navigation",
    },
    {
      id: "profile",
      label: "Profile",
      icon: <User className="w-4 h-4" />,
      action: () => {
        navigate("/profile");
        onOpenChange(false);
      },
      keywords: ["profile", "account", "user", "settings"],
      category: "navigation",
    },
    {
      id: "logout",
      label: "Logout",
      icon: <LogOut className="w-4 h-4" />,
      action: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("storage"));
        navigate("/login");
        onOpenChange(false);
      },
      keywords: ["logout", "sign out", "exit"],
      category: "settings",
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords.some((kw) => kw.includes(searchLower))
    );
  });

  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredCommands, selectedIndex, onOpenChange]);

  const handleCommandClick = (command: Command) => {
    command.action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            ESC
          </kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="mb-4">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                  {category}
                </div>
                {cmds.map((cmd, idx) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => handleCommandClick(cmd)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors",
                        isSelected
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <span className="text-muted-foreground">{cmd.icon}</span>
                      <span>{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                ↵
              </kbd>
              <span>Select</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
