import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Code, Github } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Secure Audit
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Beta
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Zap className="w-4 h-4" />
                <span>Fast Analysis</span>
              </div>
              <div className="flex items-center space-x-1">
                <Code className="w-4 h-4" />
                <span>Smart Detection</span>
              </div>
            </div>
            
            <a
              href="https://github.com/1cbyc/secure-audit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 