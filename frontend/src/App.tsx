import React, { useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Lazy load page components for code splitting
const ContractAnalyzer = lazy(() => import("./pages/ContractAnalyzer"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AnalysisDetailPage = lazy(() => import("./pages/AnalysisResult"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Webhooks = lazy(() => import("./pages/Webhooks"));
const RepositoryAnalyzer = lazy(() => import("./pages/RepositoryAnalyzer"));

// Layout Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { CommandPalette } from "./components/CommandPalette";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Loader2 } from "lucide-react";

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-black">
    <Loader2 className="w-8 h-8 animate-spin text-accent" />
  </div>
);

const App: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global keyboard shortcuts
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
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-accent/30 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main analysis page */}
              <Route path="/" element={<ContractAnalyzer />} />
              <Route path="/analyze" element={<ContractAnalyzer />} />
              <Route path="/repository" element={<RepositoryAnalyzer />} />

              {/* Authentication pages */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* User-specific pages */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/webhooks" element={<Webhooks />} />
              <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </div>
    </Router>
  );
};

export default App;
