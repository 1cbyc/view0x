import React, { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { SafeRoute } from "./SafeRoute";

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
const NotFound = lazy(() => import("../pages/NotFound"));

export const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<SafeRoute><ContractAnalyzer /></SafeRoute>} />
    <Route path="/shared/scan/:token" element={<SafeRoute><SharedAddressScan /></SafeRoute>} />
    <Route path="/analyze" element={<SafeRoute><ContractAnalyzer /></SafeRoute>} />
    <Route path="/analytics" element={<SafeRoute><AnalyticsDashboard /></SafeRoute>} />
    <Route path="/login" element={<SafeRoute><Login /></SafeRoute>} />
    <Route path="/register" element={<SafeRoute><Register /></SafeRoute>} />
    <Route path="/forgot-password" element={<SafeRoute><ForgotPassword /></SafeRoute>} />
    <Route path="/reset-password" element={<SafeRoute><ResetPassword /></SafeRoute>} />
    <Route path="/verify-email" element={<SafeRoute><VerifyEmail /></SafeRoute>} />
    <Route path="/dashboard" element={<SafeRoute><Dashboard /></SafeRoute>} />
    <Route path="/profile" element={<SafeRoute><Profile /></SafeRoute>} />
    <Route path="/webhooks" element={<SafeRoute><Webhooks /></SafeRoute>} />
    <Route path="/notifications" element={<SafeRoute><Notifications /></SafeRoute>} />
    <Route path="/analysis/:id" element={<SafeRoute><AnalysisDetailPage /></SafeRoute>} />
    <Route path="/repository" element={<SafeRoute><RepositoryAnalyzer /></SafeRoute>} />
    <Route path="*" element={<SafeRoute><NotFound /></SafeRoute>} />
  </Routes>
);
