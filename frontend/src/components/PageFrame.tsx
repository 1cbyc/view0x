import React from "react";

/** Ensures every page has minimum visible layout (never an empty main area). */
export const PageFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-[40vh] w-full">{children}</div>
);
