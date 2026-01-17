import React from 'react';
import { Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-white/10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2 text-white/60">
            <span>© {new Date().getFullYear()} </span>
            <span className="font-bold text-white">view0x</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://x.com/1cbyc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
            >
              <Twitter className="w-5 h-5" />
              <span className="hidden sm:inline">Twitter</span>
            </a>
            
            <a
              href="https://linkedin.com/in/isaacnsisong"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
            >
              <Linkedin className="w-5 h-5" />
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
          </div>
        </div>
        
        <div className="mt-4 text-center text-sm text-white/40">
          <p>Smart Contract Security Analysis Platform</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 