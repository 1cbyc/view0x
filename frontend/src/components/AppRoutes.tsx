import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const ContractAnalyzer = lazy(() => import("../pages/ContractAnalyzer"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const AnalysisDetailPage = lazy(() => import("../pages/AnalysisResult"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail"));
const Profile = lazy(() => import("../pages/Profile"));
const Webhooks = lazy(() => import("../pages/Webhooks"));
const RepositoryAnalyzer = lazy(() => import("../pages/RepositoryAnalyzer"));
const AnalyticsDashboard = lazy(() => import("../pages/AnalyticsDashboard"));
const SharedAddressScan = lazy(() => import("../pages/SharedAddressScan"));
const Notifications = lazy(() => import("../pages/Notifications"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh] bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-accent" />
  </div>
);

export const AppRoutes: React.FC = () => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<ContractAnalyzer />} />
        <Route path="/shared/scan/:token" element={<SharedAddressScan />} />
        <Route path="/analyze" element={<ContractAnalyzer />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/analysis/:id" element={<AnalysisDetailPage />} />
      </Routes>
    </Suspense>
  </RouteErrorBoundary>
);
