// Shared TypeScript interfaces for user management and authentication

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  apiKey?: string;
  usageLimit: number;
  usageCount: number;
  emailVerified: boolean;
  avatar?: string;
  company?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  plan: User['plan'];
  avatar?: string;
  company?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface UserUsageStats {
  currentMonth: {
    analysesUsed: number;
    analysesLimit: number;
    percentageUsed: number;
  };
  totalAnalyses: number;
  averageAnalysisTime: number;
  mostUsedFeatures: string[];
  planUtilization: {
    features: Array<{
      name: string;
      used: boolean;
      limit?: number;
      current?: number;
    }>;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  company?: string;
  agreeToTerms: boolean;
  subscribeTo Newsletter?: boolean;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
  message: string;
}

export interface RegisterResponse {
  user: UserProfile;
  tokens: AuthTokens;
  message: string;
  requiresEmailVerification: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  company?: string;
  avatar?: string;
}

export interface ApiKeyResponse {
  apiKey: string;
  createdAt: string;
  lastUsed?: string;
}

// Team/Organization types (for future enterprise features)
export interface Team {
  id: string;
  name: string;
  ownerId: string;
  plan: 'team' | 'enterprise';
  memberCount: number;
  analysisLimit: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'owner' | 'admin' | 'member';
  user: UserProfile;
  joinedAt: string;
  lastActive?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamMember['role'];
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  accepted: boolean;
}

// Plan and billing types
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: 'USD';
  interval: 'month' | 'year';
  features: {
    analysesPerMonth: number;
    concurrentAnalyses: number;
    apiAccess: boolean;
    prioritySupport: boolean;
    teamMembers?: number;
    customIntegrations: boolean;
    advancedReporting: boolean;
    whiteLabel: boolean;
  };
  popular?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

// Authentication middleware types
export interface JWTPayload {
  userId: string;
  email: string;
  plan: User['plan'];
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    plan: User['plan'];
  };
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
}
