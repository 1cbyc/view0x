import React from 'react';
import { Twitter, Linkedin, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-gray-600">
            <span>© 2025 by </span>
            <a
              href="https://nsisong.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Isaac Emmanuel
            </a>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Made with</span>
            <Heart className="w-4 h-4 text-red-500" />
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://x.com/1cbyc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Twitter className="w-5 h-5" />
              <span className="hidden sm:inline">Twitter</span>
            </a>
            
            <a
              href="https://linkedin.com/in/isaacnsisong"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Secure Audit by Nsisong Labs - Smart Contract Vuln Scanner</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 