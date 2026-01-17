import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Page Components
import ContractAnalyzer from "./pages/ContractAnalyzer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AnalysisDetailPage from "./pages/AnalysisResult";

// Layout Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white flex flex-col">
        <Navbar />
        <main className="flex-1 w-full">
          <Routes>
            {/* Main analysis page */}
            <Route path="/" element={<ContractAnalyzer />} />
            <Route path="/analyze" element={<ContractAnalyzer />} />

            {/* Authentication pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* User-specific pages */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
