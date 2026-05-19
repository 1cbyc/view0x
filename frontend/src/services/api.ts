import axios from "axios";
import { getGuestSessionId } from "@/lib/guestSession";

// Create a single, configured Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api", // Use relative path for proxy
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to automatically add the JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const guestSessionId = getGuestSessionId();
    if (guestSessionId) {
      config.headers["X-Guest-Session"] = guestSessionId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor for centralized error handling
api.interceptors.response.use(
  (response) => {
    // Extract rate limit headers and store them (using standard RateLimit-* headers)
    const remaining = response.headers["ratelimit-remaining"] || response.headers["x-ratelimit-remaining"];
    const reset = response.headers["ratelimit-reset"] || response.headers["x-ratelimit-reset"];
    const limit = response.headers["ratelimit-limit"] || response.headers["x-ratelimit-limit"];

    if (remaining !== undefined) {
      // Store rate limit info for UI feedback
      localStorage.setItem("rateLimitInfo", JSON.stringify({
        remaining: parseInt(remaining),
        reset: reset ? parseInt(reset) : null,
        limit: limit ? parseInt(limit) : null,
        timestamp: Date.now(),
      }));
    }

    return response;
  },
  (error) => {
    // Handle rate limit errors with detailed info
    if (error.response?.status === 429) {
      const rateLimitData = error.response.data?.rateLimit;
      if (rateLimitData) {
        localStorage.setItem("rateLimitError", JSON.stringify({
          remaining: rateLimitData.remaining || 0,
          reset: rateLimitData.reset,
          retryAfter: rateLimitData.retryAfter,
          timestamp: Date.now(),
        }));
      }
    }

    // Return the more detailed error object from the backend if it exists
    if (error.response && error.response.data) {
      return Promise.reject({
        ...error.response.data,
        status: error.response.status,
        headers: error.response.headers,
      });
    }
    // Otherwise, return a generic error
    return Promise.reject(error);
  },
);

// --- Authentication API Endpoints ---
export const authApi = {
  login: (credentials: {
    email: string;
    password: string;
    guestSessionId?: string;
  }) => api.post("/auth/login", credentials),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    company?: string;
    guestSessionId?: string;
  }) => api.post("/auth/register", userData),

  claimGuestWork: (guestSessionId?: string) =>
    api.post("/auth/claim-guest-work", {
      guestSessionId: guestSessionId || getGuestSessionId(),
    }),

  getCurrentUser: () => api.get("/auth/me"),

  updateProfile: (userData: { name?: string; company?: string; avatar?: string }) =>
    api.put("/users/profile", userData),

  resendVerification: (email: string) =>
    api.post("/auth/resend-verification", { email }),
};

// --- Analysis API Endpoints ---
export const analysisApi = {
  /**
   * Creates a new analysis job for an authenticated user.
   * This endpoint initiates the background job and returns the analysis ID.
   */
  createAnalysis: (data: { contractCode: string; options?: any }) =>
    api.post("/analysis", data, { timeout: 10000 }), // 10 second timeout for job creation

  /**
   * Public analysis endpoint (no authentication required).
   * Returns synchronous results without WebSocket updates.
   */
  createPublicAnalysis: (data: {
    contractCode: string;
    options?: unknown;
    guestSessionId?: string;
  }) =>
    api.post("/analysis/public", {
      ...data,
      guestSessionId: data.guestSessionId || getGuestSessionId(),
    }),

  /**
   * Fetches the analysis history for the logged-in user with pagination, filtering, and sorting.
   */
  getHistory: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }) => api.get("/analysis", { params }),

  /**
   * Fetches the full details of a specific analysis by its ID.
   */
  getAnalysis: (analysisId: string) => api.get(`/analysis/${analysisId}`),

  /**
   * Generates a report for an analysis in the specified format.
   */
  generateReport: (analysisId: string, options: { format: string; includeCode?: boolean; includeRecommendations?: boolean; includeMetadata?: boolean }) =>
    api.post(`/analysis/${analysisId}/report`, options, { responseType: 'blob' }),

  /**
   * Generates a share token for an analysis (creates public link).
   */
  generateShareToken: (analysisId: string) =>
    api.post(`/analysis/${analysisId}/share`),

  /**
   * Revokes the share token for an analysis.
   */
  revokeShareToken: (analysisId: string) =>
    api.delete(`/analysis/${analysisId}/share`),

  /**
   * Gets a public analysis by share token (no auth required).
   */
  getPublicAnalysis: (token: string) =>
    api.get(`/analysis/public/${token}`),

  /**
   * Toggles favorite status for an analysis.
   */
  toggleFavorite: (analysisId: string) =>
    api.patch(`/analysis/${analysisId}/favorite`),
};

// --- Address scan (Token Sniffer / DappBay style) ---
export interface AddressScanFlag {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  guidance?: string;
}

export interface AddressScanResult {
  scanId?: string;
  address: string;
  chainId: number;
  chainName: string;
  contractType: "contract" | "eoa" | "unknown";
  reputationScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  heuristics: AddressScanFlag[];
  explorer: {
    explorerUrl: string;
    contractName: string | null;
    isVerified: boolean;
    isProxy: boolean;
    sourceCode: string | null;
  };
  sourceAvailable: boolean;
  scannedAt: string;
  slitherJobId?: string;
  analysisStatus?: string;
}

export type ScannerDiscoveryItem = {
  id: string;
  kind: "address" | "example" | "rekt";
  title: string;
  subtitle?: string;
  chainId?: number;
  chainName?: string;
  address?: string;
  riskLevel?: string;
  reputationScore?: number;
  href: string;
  badge?: string;
};

export type ScannerDiscovery = {
  recentThreats: ScannerDiscoveryItem[];
  trending: ScannerDiscoveryItem[];
  mostScanned: ScannerDiscoveryItem[];
  highRiskExamples: ScannerDiscoveryItem[];
  practiceExamples: ScannerDiscoveryItem[];
};

export const scanApi = {
  getChains: () => api.get("/scan/chains"),
  getDiscovery: () =>
    api.get<{ success: boolean; data: ScannerDiscovery }>("/scan/discovery"),
  scanAddress: (data: {
    address: string;
    chainId: number;
    runSlither?: boolean;
  }) => api.post("/scan/address", data, { timeout: 90000 }),
  getScan: (scanId: string) => api.get(`/scan/address/${scanId}`),
  getHistory: (limit = 50) =>
    api.get("/scan/history", { params: { limit } }),
  getSharedScan: (token: string) => api.get(`/scan/shared/${token}`),
  createShareLink: (scanId: string) => api.post(`/scan/address/${scanId}/share`),
};

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export const notificationApi = {
  list: (params?: { unread?: boolean; limit?: number }) =>
    api.get("/notifications", { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

export const walletApi = {
  getRiskResources: (address: string, chainId: number) =>
    api.get("/wallet/risk-resources", {
      params: { address: address.trim(), chainId },
    }),
};

export type ShieldChain = {
  chainId: number;
  key: string;
  name: string;
  nativeSymbol: string;
  indexerNote?: string;
};

export type ContractRiskBrief = {
  reputationScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  topFlags: Array<{
    id: string;
    title: string;
    severity: string;
  }>;
};

export type ShieldSnapshot = {
  address: string;
  chainId: number;
  chainName: string;
  healthScore: number;
  healthLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  counts: {
    approvals: number;
    highRiskApprovals: number;
    holdings: number;
    highRiskHoldings: number;
    nftApprovals: number;
  };
  indexerNote: string;
  scannedAt: string;
};

export type ShieldApproval = {
  token: string;
  tokenSymbol: string | null;
  spender: string;
  allowance: string;
  isUnlimited: boolean;
  spenderRisk: ContractRiskBrief | null;
  tokenRisk: ContractRiskBrief | null;
};

export type ShieldNftApproval = {
  collection: string;
  operator: string;
  approved: boolean;
  standard: "erc721" | "erc1155";
  operatorRisk: ContractRiskBrief | null;
};

export type ShieldHolding = {
  token: string;
  tokenSymbol: string | null;
  balance: string;
  tokenRisk: ContractRiskBrief | null;
};

export type ShieldScanResult = {
  snapshot: ShieldSnapshot;
  approvals: ShieldApproval[];
  nftApprovals: ShieldNftApproval[];
  holdings: ShieldHolding[];
};

export const shieldApi = {
  getChains: () => api.get<{ success: boolean; data: ShieldChain[] }>("/shield/chains"),
  scan: (address: string, chainId: number) =>
    api.get<{ success: boolean; data: ShieldScanResult }>("/shield/scan", {
      params: { address: address.trim(), chainId },
      timeout: 120000,
    }),
  getSnapshot: (address: string, chainId: number) =>
    api.get<{ success: boolean; data: ShieldSnapshot }>("/shield/snapshot", {
      params: { address: address.trim(), chainId },
      timeout: 120000,
    }),
  getApprovals: (address: string, chainId: number) =>
    api.get<{
      success: boolean;
      data: {
        address: string;
        chainId: number;
        approvals: ShieldApproval[];
        indexerNote: string;
      };
    }>("/shield/approvals", {
      params: { address: address.trim(), chainId },
      timeout: 120000,
    }),
  getNftApprovals: (address: string, chainId: number) =>
    api.get<{
      success: boolean;
      data: {
        address: string;
        chainId: number;
        nftApprovals: ShieldNftApproval[];
        indexerNote: string;
      };
    }>("/shield/nft-approvals", {
      params: { address: address.trim(), chainId },
      timeout: 120000,
    }),
  getHoldings: (address: string, chainId: number) =>
    api.get<{
      success: boolean;
      data: {
        address: string;
        chainId: number;
        holdings: ShieldHolding[];
        indexerNote: string;
      };
    }>("/shield/holdings", {
      params: { address: address.trim(), chainId },
      timeout: 120000,
    }),
};

// --- Vulnerability Comments API Endpoints ---
export const vulnerabilityApi = {
  /**
   * Creates a comment on a vulnerability.
   */
  createComment: (vulnerabilityId: string, data: { comment: string; lineNumber?: number }) =>
    api.post(`/vulnerabilities/${vulnerabilityId}/comments`, data),

  /**
   * Gets all comments for a vulnerability.
   */
  getComments: (vulnerabilityId: string) =>
    api.get(`/vulnerabilities/${vulnerabilityId}/comments`),

  /**
   * Updates a comment.
   */
  updateComment: (commentId: string, data: { comment: string }) =>
    api.put(`/vulnerabilities/comments/${commentId}`, data),

  /**
   * Deletes a comment.
   */
  deleteComment: (commentId: string) =>
    api.delete(`/vulnerabilities/comments/${commentId}`),
};

// --- Webhook API Endpoints ---
export const webhookApi = {
  /**
   * Creates a new webhook.
   */
  createWebhook: (url: string, events: string[], secret?: string) =>
    api.post("/webhooks", { url, events, secret }),

  /**
   * Gets all webhooks for the authenticated user.
   */
  getWebhooks: () => api.get("/webhooks"),

  /**
   * Gets a specific webhook by ID.
   */
  getWebhookById: (id: string) => api.get(`/webhooks/${id}`),

  /**
   * Updates an existing webhook.
   */
  updateWebhook: (id: string, url: string, events: string[], secret?: string, isActive?: boolean) =>
    api.put(`/webhooks/${id}`, { url, events, secret, isActive }),

  /**
   * Deletes a webhook.
   */
  deleteWebhook: (id: string) => api.delete(`/webhooks/${id}`),

  /**
   * Triggers a test webhook.
   */
  triggerTestWebhook: (id: string) => api.post(`/webhooks/${id}/test`),
};

// --- Activity Logs API Endpoints ---
export const activityLogApi = {
  /**
   * Gets activity logs for the authenticated user.
   */
  getActivityLogs: (params?: { page?: number; limit?: number; search?: string; action?: string }) =>
    api.get("/activity-logs", { params }),

  /**
   * Gets a specific activity log by ID.
   */
  getActivityLogById: (id: string) =>
    api.get(`/activity-logs/${id}`),
};

// --- Two-Factor Authentication API Endpoints ---
export const twoFactorApi = {
  /**
   * Generates a 2FA secret and QR code.
   */
  generate2FASecret: () =>
    api.post("/2fa/generate"),

  /**
   * Verifies a 2FA token.
   */
  verify2FA: (token: string) =>
    api.post("/2fa/verify", { token }),

  /**
   * Enables 2FA after verification.
   */
  enable2FA: (token: string) =>
    api.post("/2fa/enable", { token }),

  /**
   * Disables 2FA (requires password).
   */
  disable2FA: (password: string) =>
    api.post("/2fa/disable", { password }),
};

export interface RektIncident {
  id: string;
  slug: string;
  projectName: string;
  title: string;
  incidentDate: string;
  amountLostUsd: string | null;
  amountRecoveredUsd: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "confirmed" | "disputed" | "recovered" | "partial_recovery";
  chains: string[];
  categories: string[];
  attackTypes: string[];
  auditorNames: string[];
  summary: string;
  rootCause?: string | null;
  technicalDetails?: string | null;
  remediation?: string | null;
  affectedAddresses: Array<{
    label: string;
    address: string;
    chain?: string;
    role?: string;
  }>;
  transactionHashes: Array<{
    label: string;
    hash: string;
    chain?: string;
    url?: string;
  }>;
  sourceUrls: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RektStats {
  summary: {
    incidentCount: number;
    totalLostUsd: number;
    totalRecoveredUsd: number;
    largestLossUsd: number;
  };
  byYear: Array<{ year: number; count: number; lostUsd: number }>;
  bySeverity: Array<{ severity: string; count: number; lostUsd: number }>;
  largest: RektIncident[];
}

export interface RektFacet {
  value: string;
  count: number;
}

export interface RektFacets {
  chains: RektFacet[];
  categories: RektFacet[];
  attackTypes: RektFacet[];
  auditors: RektFacet[];
  severities: RektFacet[];
  statuses: RektFacet[];
}

export const rektApi = {
  listIncidents: (params?: {
    q?: string;
    chain?: string;
    category?: string;
    attackType?: string;
    auditor?: string;
    severity?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sortBy?: "amountLostUsd" | "incidentDate" | "projectName";
    sortOrder?: "ASC" | "DESC";
  }) => api.get("/rekt/incidents", { params }),
  getIncident: (slug: string) => api.get(`/rekt/incidents/${slug}`),
  getStats: () => api.get("/rekt/stats"),
  getFacets: () => api.get("/rekt/facets"),
};

// Export the base API instance for custom requests
export { api };
