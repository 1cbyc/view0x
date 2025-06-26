import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ContractAnalyzer from './pages/ContractAnalyzer';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<ContractAnalyzer />} />
            <Route path="/analyze" element={<ContractAnalyzer />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App; 