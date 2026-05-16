import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { PageFrame } from "./PageFrame";

const PageLoader = () => (
  <PageFrame>
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-accent" aria-label="Loading" />
    </div>
  </PageFrame>
);

/**
 * Each route gets its own error boundary + suspense scope so a crash on one page
 * cannot poison navigation to other pages.
 */
export const SafeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <PageFrame>{children}</PageFrame>
    </Suspense>
  </RouteErrorBoundary>
);
