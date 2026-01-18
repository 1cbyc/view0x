import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Page Components
import ContractAnalyzer from "./pages/ContractAnalyzer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AnalysisDetailPage from "./pages/AnalysisResult";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import Webhooks from "./pages/Webhooks";

// Layout Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white selection:bg-accent/30 flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">
          <Routes>
            {/* Main analysis page */}
            <Route path="/" element={<ContractAnalyzer />} />
            <Route path="/analyze" element={<ContractAnalyzer />} />

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
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
