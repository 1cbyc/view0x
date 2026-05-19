import path from "path";
import fs from "fs";
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./environment";

const apiVersion = env.API_VERSION || "v1";

const publicApiOrigin = (): string =>
  (env.API_PUBLIC_URL || "https://api.view0x.com").replace(/\/$/, "");

const localApiOrigin = (): string => {
  const port = process.env.API_PORT || "18091";
  return `http://localhost:${port}`;
};

/** OpenAPI paths maintained in code (route files have no JSDoc blocks). */
const documentedPaths: swaggerJsdoc.OAS3Definition["paths"] = {
  "/health": {
    get: {
      tags: ["Health"],
      summary: "Service health check",
      responses: {
        "200": { description: "Healthy" },
        "503": { description: "Unhealthy" },
      },
    },
  },
  "/api/auth/register": {
    post: {
      tags: ["Authentication"],
      summary: "Register a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password", "name"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string", minLength: 8 },
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "User created" },
        "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    },
  },
  "/api/auth/login": {
    post: {
      tags: ["Authentication"],
      summary: "Login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Tokens issued" },
        "401": { description: "Invalid credentials" },
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      tags: ["Authentication"],
      summary: "Refresh access token",
      responses: { "200": { description: "New access token" } },
    },
  },
  "/api/auth/forgot-password": {
    post: {
      tags: ["Authentication"],
      summary: "Request password reset email",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email"],
              properties: { email: { type: "string", format: "email" } },
            },
          },
        },
      },
      responses: { "200": { description: "Reset email queued (if account exists)" } },
    },
  },
  "/api/auth/reset-password": {
    post: {
      tags: ["Authentication"],
      summary: "Reset password with token",
      responses: { "200": { description: "Password updated" } },
    },
  },
  "/api/auth/verify-email": {
    post: {
      tags: ["Authentication"],
      summary: "Verify email with token",
      responses: { "200": { description: "Email verified" } },
    },
  },
  "/api/auth/resend-verification": {
    post: {
      tags: ["Authentication"],
      summary: "Resend verification email",
      responses: { "200": { description: "Verification email sent" } },
    },
  },
  "/api/auth/me": {
    get: {
      tags: ["Authentication"],
      summary: "Current user profile",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "User profile" } },
    },
  },
  "/api/analysis": {
    get: {
      tags: ["Analysis"],
      summary: "List analyses for the authenticated user",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      responses: { "200": { description: "Paginated analysis list" } },
    },
    post: {
      tags: ["Analysis"],
      summary: "Submit contract source for analysis",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                sourceCode: { type: "string" },
                contractName: { type: "string" },
                fileName: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "202": { description: "Analysis queued", content: { "application/json": { schema: { $ref: "#/components/schemas/Analysis" } } } },
      },
    },
  },
  "/api/analysis/{id}": {
    get: {
      tags: ["Analysis"],
      summary: "Get analysis by ID",
      security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "Analysis result" } },
    },
    delete: {
      tags: ["Analysis"],
      summary: "Delete an analysis",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "204": { description: "Deleted" } },
    },
  },
  "/api/analysis/{id}/status": {
    get: {
      tags: ["Analysis"],
      summary: "Poll analysis job status",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "Job status" } },
    },
  },
  "/api/analysis/public": {
    post: {
      tags: ["Analysis"],
      summary: "Run a one-off public analysis (no account)",
      responses: { "200": { description: "Analysis result" } },
    },
  },
  [`/api/${apiVersion}/auth/register`]: {
    post: {
      tags: ["Authentication"],
      summary: "Register (versioned)",
      responses: { "201": { description: "User created" } },
    },
  },
  [`/api/${apiVersion}/analysis`]: {
    post: {
      tags: ["Analysis"],
      summary: "Submit analysis (versioned)",
      security: [{ bearerAuth: [] }],
      responses: { "202": { description: "Analysis queued" } },
    },
  },
  "/api/scan/chains": {
    get: {
      tags: ["Address scan"],
      summary: "List supported chains for address scanning",
      responses: { "200": { description: "Chain list" } },
    },
  },
  "/api/scan/address": {
    post: {
      tags: ["Address scan"],
      summary: "Scan contract address (heuristics + optional Slither queue)",
      description:
        "Returns reputation score and flags. Set runSlither=true when signed in and source is verified to queue full Slither analysis.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["address", "chainId"],
              properties: {
                address: { type: "string", example: "0x0000000000000000000000000000000000000000" },
                chainId: { type: "integer", enum: [1, 56] },
                runSlither: { type: "boolean", default: false },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Scan result with scanId" },
        "429": { description: "Rate limit exceeded" },
      },
    },
  },
  "/api/scan/address/{id}": {
    get: {
      tags: ["Address scan"],
      summary: "Get address scan by ID",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": { description: "Stored scan result" },
        "404": { description: "Not found" },
      },
    },
  },
  "/api/scan/address/{id}/share": {
    post: {
      tags: ["Address scan"],
      summary: "Create or return share link for a scan (authenticated owner)",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": { description: "shareUrl + token" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/api/scan/shared/{token}": {
    get: {
      tags: ["Address scan"],
      summary: "Load a publicly shared scan by token",
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Scan snapshot" }, "404": { description: "Expired or invalid" } },
    },
  },
  "/api/wallet/risk-resources": {
    get: {
      tags: ["Wallet risk"],
      summary: "Curated revoke / approval / portfolio URLs (Phase 5 light)",
      parameters: [
        { name: "address", in: "query", schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Outbound tool links" } },
    },
  },
  "/api/shield/chains": {
    get: {
      tags: ["Shield"],
      summary: "List chains supported by Shield indexer",
      responses: { "200": { description: "Chain list with indexer notes" } },
    },
  },
  "/api/shield/snapshot": {
    get: {
      tags: ["Shield"],
      summary: "Wallet health snapshot (approvals + holdings summary)",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Shield snapshot" } },
    },
  },
  "/api/shield/approvals": {
    get: {
      tags: ["Shield"],
      summary: "ERC-20 token approvals with spender/token risk scores",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Approval list" } },
    },
  },
  "/api/shield/nft-approvals": {
    get: {
      tags: ["Shield"],
      summary: "NFT operator approvals (ApprovalForAll)",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "NFT approval list" } },
    },
  },
  "/api/shield/holdings": {
    get: {
      tags: ["Shield"],
      summary: "ERC-20 balances for tokens with active approvals",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Holdings list" } },
    },
  },
  "/api/shield/scan": {
    get: {
      tags: ["Shield"],
      summary: "Full wallet shield scan (snapshot, approvals, NFT, Permit2, history, EIP-7702)",
      description:
        "Single-call aggregate used by the Shield UI. Results are cached briefly per address+chain.",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer", example: 1 } },
      ],
      responses: {
        "200": {
          description: "Shield scan payload",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: { $ref: "#/components/schemas/ShieldScanResult" },
                },
              },
            },
          },
        },
        "429": { description: "RPC rate limit" },
      },
    },
  },
  "/api/shield/permit2-approvals": {
    get: {
      tags: ["Shield"],
      summary: "Uniswap Permit2 sub-allowances for a wallet",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Permit2 allowance list" } },
    },
  },
  "/api/shield/history": {
    get: {
      tags: ["Shield"],
      summary: "Recent approval and revoke events (log-indexed)",
      parameters: [
        { name: "address", in: "query", required: true, schema: { type: "string" } },
        { name: "chainId", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "Approval activity timeline" } },
    },
  },
  "/api/rekt/stats": {
    get: {
      tags: ["Rekt"],
      summary: "Aggregate hack / incident statistics",
      responses: { "200": { description: "Stats summary" } },
    },
  },
  "/api/rekt/facets": {
    get: {
      tags: ["Rekt"],
      summary: "Facet counts for filtering the Rekt database",
      responses: { "200": { description: "Facet map" } },
    },
  },
  "/api/rekt/incidents": {
    get: {
      tags: ["Rekt"],
      summary: "List Rekt incidents (paginated, filterable)",
      parameters: [
        { name: "page", in: "query", schema: { type: "integer" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "chain", in: "query", schema: { type: "string" } },
        { name: "category", in: "query", schema: { type: "string" } },
      ],
      responses: { "200": { description: "Incident list" } },
    },
  },
  "/api/rekt/incidents/{slug}": {
    get: {
      tags: ["Rekt"],
      summary: "Get a single Rekt incident by slug",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "Incident detail" },
        "404": { description: "Not found" },
      },
    },
  },
  "/api/scan/discovery": {
    get: {
      tags: ["Address scan"],
      summary: "Featured / recent public scans for discovery UI",
      responses: { "200": { description: "Discovery feed" } },
    },
  },
  "/api/scan/history": {
    get: {
      tags: ["Address scan"],
      summary: "Authenticated user's address scan history",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Scan history list" } },
    },
  },
  "/api/analysis/public/{token}": {
    get: {
      tags: ["Analysis"],
      summary: "Load a publicly shared analysis by token",
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Public analysis" }, "404": { description: "Not found" } },
    },
  },
  "/api/analysis/{id}/report": {
    post: {
      tags: ["Analysis"],
      summary: "Generate downloadable report for an analysis",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "Report URL or payload" } },
    },
  },
  "/api/analysis/{id}/share": {
    post: {
      tags: ["Analysis"],
      summary: "Create public share link for an analysis",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "Share token" } },
    },
    delete: {
      tags: ["Analysis"],
      summary: "Revoke public share link",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "204": { description: "Share revoked" } },
    },
  },
  "/api/analysis/{id}/favorite": {
    patch: {
      tags: ["Analysis"],
      summary: "Toggle analysis bookmark",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: { "200": { description: "Favorite toggled" } },
    },
  },
  "/api/analysis/batch": {
    post: {
      tags: ["Analysis"],
      summary: "Submit multiple analyses in one request",
      security: [{ bearerAuth: [] }],
      responses: { "202": { description: "Batch queued" } },
    },
  },
  "/api/analysis/compare": {
    post: {
      tags: ["Analysis"],
      summary: "Compare two or more completed analyses",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Comparison result" } },
    },
  },
  "/api/auth/logout": {
    post: {
      tags: ["Authentication"],
      summary: "Logout (invalidate session)",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Logged out" } },
    },
  },
  "/api/auth/api-key": {
    post: {
      tags: ["Authentication"],
      summary: "Generate API key",
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "API key created" } },
    },
    delete: {
      tags: ["Authentication"],
      summary: "Revoke API key",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "API key revoked" } },
    },
  },
  "/api/auth/claim-guest-work": {
    post: {
      tags: ["Authentication"],
      summary: "Attach guest scans to authenticated account",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Guest work claimed" } },
    },
  },
  "/api/vulnerabilities/{vulnerabilityId}/comments": {
    post: {
      tags: ["Vulnerabilities"],
      summary: "Add comment on a vulnerability finding",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "vulnerabilityId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { "201": { description: "Comment created" } },
    },
    get: {
      tags: ["Vulnerabilities"],
      summary: "List comments for a vulnerability",
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "vulnerabilityId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { "200": { description: "Comment list" } },
    },
  },
  "/api/templates": {
    get: {
      tags: ["Templates"],
      summary: "List analysis templates",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Template list" } },
    },
    post: {
      tags: ["Templates"],
      summary: "Create analysis template",
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Template created" } },
    },
  },
  "/api/templates/{id}": {
    get: {
      tags: ["Templates"],
      summary: "Get template by ID",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Template" } },
    },
    put: {
      tags: ["Templates"],
      summary: "Update template",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Template updated" } },
    },
    delete: {
      tags: ["Templates"],
      summary: "Delete template",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "204": { description: "Deleted" } },
    },
  },
  "/api/webhooks": {
    get: {
      tags: ["Webhooks"],
      summary: "List webhooks",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Webhook list" } },
    },
    post: {
      tags: ["Webhooks"],
      summary: "Register webhook",
      security: [{ bearerAuth: [] }],
      responses: { "201": { description: "Webhook created" } },
    },
  },
  "/api/webhooks/{id}": {
    delete: {
      tags: ["Webhooks"],
      summary: "Delete webhook",
      security: [{ bearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "204": { description: "Deleted" } },
    },
  },
  "/api/2fa/generate": {
    post: {
      tags: ["Two-factor auth"],
      summary: "Start 2FA setup (TOTP secret)",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "QR / secret" } },
    },
  },
  "/api/2fa/enable": {
    post: {
      tags: ["Two-factor auth"],
      summary: "Enable 2FA after verification",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "2FA enabled" } },
    },
  },
  "/api/repository/analyze": {
    post: {
      tags: ["Repository"],
      summary: "Analyze remote repository (auto-detect host)",
      security: [{ bearerAuth: [] }],
      responses: { "202": { description: "Analysis queued" } },
    },
  },
  "/api/analytics/dashboard": {
    get: {
      tags: ["Analytics"],
      summary: "Analytics dashboard metrics",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Dashboard data" } },
    },
  },
  "/api/activity-logs": {
    get: {
      tags: ["Activity logs"],
      summary: "List activity logs for current user",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Activity log list" } },
    },
  },
  "/api/users/profile": {
    get: {
      tags: ["Users"],
      summary: "Get user profile",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Profile" } },
    },
    put: {
      tags: ["Users"],
      summary: "Update user profile",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Profile updated" } },
    },
  },
  "/api/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "List authenticated user's notifications",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Notifications and unread count" } },
    },
  },
  "/api/notifications/{id}/read": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark one notification as read",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Notification marked read" } },
    },
  },
  "/api/notifications/read-all": {
    patch: {
      tags: ["Notifications"],
      summary: "Mark all notifications as read",
      security: [{ bearerAuth: [] }],
      responses: { "200": { description: "Notifications marked read" } },
    },
  },
};

function swaggerApiGlobs(): string[] {
  const base = path.join(__dirname, "..");
  const routesDir = path.join(base, "routes");
  if (!fs.existsSync(routesDir)) {
    return [];
  }
  const ext = fs.existsSync(path.join(routesDir, "auth.js")) ? "js" : "ts";
  return [
    path.join(routesDir, `*.${ext}`),
    path.join(base, "controllers", `*.${ext}`),
  ];
}

let cachedSpec: ReturnType<typeof swaggerJsdoc> | null = null;

export function getSwaggerSpec(): ReturnType<typeof swaggerJsdoc> {
  if (cachedSpec) {
    return cachedSpec;
  }

  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "view0x API",
        version: apiVersion,
        description:
          "Smart contract security analysis API. Submit Solidity source; results include Slither findings and severity summaries.",
        contact: {
          name: "view0x Support",
          email: "support@view0x.com",
        },
      },
      servers: [
        {
          url: publicApiOrigin(),
          description: "Production API (api.view0x.com)",
        },
        {
          url: localApiOrigin(),
          description: "Local direct API port",
        },
      ],
      paths: documentedPaths,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          apiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              error: {
                type: "object",
                properties: {
                  code: { type: "string", example: "VALIDATION_ERROR" },
                  message: { type: "string", example: "Invalid input provided" },
                },
              },
            },
          },
          Analysis: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              contractName: { type: "string", nullable: true },
              status: {
                type: "string",
                enum: ["queued", "processing", "completed", "failed"],
              },
              summary: {
                type: "object",
                properties: {
                  highSeverity: { type: "number" },
                  mediumSeverity: { type: "number" },
                  lowSeverity: { type: "number" },
                },
              },
              createdAt: { type: "string", format: "date-time" },
            },
          },
          ShieldScanResult: {
            type: "object",
            properties: {
              snapshot: { $ref: "#/components/schemas/ShieldSnapshot" },
              approvals: { type: "array", items: { type: "object" } },
              nftApprovals: { type: "array", items: { type: "object" } },
              holdings: { type: "array", items: { type: "object" } },
              permit2Approvals: { type: "array", items: { type: "object" } },
              history: { type: "array", items: { type: "object" } },
              eip7702: {
                type: "object",
                nullable: true,
                properties: {
                  hasDelegation: { type: "boolean" },
                  delegate: { type: "string", nullable: true },
                },
              },
            },
          },
          ShieldSnapshot: {
            type: "object",
            properties: {
              address: { type: "string" },
              chainId: { type: "integer" },
              chainName: { type: "string" },
              healthScore: { type: "number" },
              healthLevel: { type: "string" },
              counts: {
                type: "object",
                properties: {
                  approvals: { type: "integer" },
                  highRiskApprovals: { type: "integer" },
                  holdings: { type: "integer" },
                  highRiskHoldings: { type: "integer" },
                  nftApprovals: { type: "integer" },
                  eip7702Delegations: { type: "integer" },
                  permit2Approvals: { type: "integer" },
                },
              },
              scannedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      tags: [
        { name: "Health", description: "Liveness and dependency checks" },
        { name: "Authentication", description: "Registration, login, email verification" },
        { name: "Analysis", description: "Contract analysis jobs and results" },
        { name: "Address scan", description: "On-chain address reputation and explorer fetch" },
        { name: "Wallet risk", description: "Allowance tooling links" },
        { name: "Shield", description: "Wallet approval indexer and revoke helpers (revoke.cash-style)" },
        { name: "Rekt", description: "Hack and incident database" },
        { name: "Vulnerabilities", description: "Finding comments" },
        { name: "Templates", description: "Reusable analysis templates" },
        { name: "Webhooks", description: "Outbound event hooks" },
        { name: "Two-factor auth", description: "TOTP 2FA" },
        { name: "Repository", description: "GitHub/GitLab repo analysis" },
        { name: "Analytics", description: "Usage analytics" },
        { name: "Activity logs", description: "Audit trail" },
        { name: "Users", description: "Profile management" },
        { name: "Notifications", description: "In-app notifications" },
      ],
    },
    apis: swaggerApiGlobs(),
  };

  cachedSpec = swaggerJsdoc(options);
  return cachedSpec;
}

/** @deprecated Use getSwaggerSpec() — kept for tests that import swaggerSpec */
export const swaggerSpec = getSwaggerSpec();
