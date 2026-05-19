import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AppRoutes } from "./components/AppRoutes";
import { CommandPalette } from "./components/CommandPalette";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { WalletProvider } from "./providers/WalletProvider";

const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      meta: true,
      action: () => setCommandPaletteOpen(true),
      description: "Open command palette",
    },
  ]);

  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 flex flex-col">
          <Navbar />
          <main className="flex-1 w-full min-w-0 overflow-x-hidden">
            <AppRoutes />
          </main>
          <Footer />
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
          />
        </div>
      </Router>
    </WalletProvider>
  );
};

export default App;
