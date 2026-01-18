import React, { useState, useEffect } from "react";
import { Settings, Type, Contrast, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export const AccessibilitySettings: React.FC = () => {
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedFontSize = localStorage.getItem("accessibility-font-size");
    const savedHighContrast = localStorage.getItem("accessibility-high-contrast");
    
    if (savedFontSize) {
      setFontSize(parseInt(savedFontSize, 10));
      document.documentElement.style.fontSize = `${savedFontSize}px`;
    }
    
    if (savedHighContrast === "true") {
      setHighContrast(true);
      document.documentElement.classList.add("high-contrast");
    }
  }, []);

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
    localStorage.setItem("accessibility-font-size", newSize.toString());
  };

  const handleHighContrastToggle = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    if (newValue) {
      document.documentElement.classList.add("high-contrast");
      localStorage.setItem("accessibility-high-contrast", "true");
    } else {
      document.documentElement.classList.remove("high-contrast");
      localStorage.setItem("accessibility-high-contrast", "false");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white"
          aria-label="Accessibility settings"
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline ml-2">Accessibility</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Accessibility Settings</DialogTitle>
          <DialogDescription>
            Customize the interface to improve accessibility and readability.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" aria-hidden="true" />
              <Label htmlFor="font-size">Font Size</Label>
            </div>
            <Slider
              id="font-size"
              min={12}
              max={24}
              step={1}
              value={[fontSize]}
              onValueChange={handleFontSizeChange}
              className="w-full"
              aria-label="Font size adjustment"
            />
            <p className="text-sm text-muted-foreground">
              Current size: {fontSize}px
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Contrast className="h-4 w-4" aria-hidden="true" />
                <Label htmlFor="high-contrast">High Contrast Mode</Label>
              </div>
              <Button
                id="high-contrast"
                variant={highContrast ? "default" : "outline"}
                size="sm"
                onClick={handleHighContrastToggle}
                aria-pressed={highContrast}
                aria-label="Toggle high contrast mode"
              >
                {highContrast ? "On" : "Off"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Increase contrast for better visibility
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
