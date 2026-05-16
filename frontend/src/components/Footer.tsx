import React from 'react';
import { Twitter, Github } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-10 border-t border-border bg-background sm:mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} </span>
            <span className="font-bold text-foreground">view0x</span>
            <span>by</span>
            <a
              href="https://nsisong.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Isaac
            </a>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 min-[420px]:w-auto min-[420px]:flex-row min-[420px]:items-center">
            <a
              href="https://x.com/1cbyc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Twitter className="w-5 h-5" />
              <span>Twitter</span>
            </a>

            <a
              href="https://github.com/1cbyc/view0x"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Github className="w-5 h-5" />
              <span>Star on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
