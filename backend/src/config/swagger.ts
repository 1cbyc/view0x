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
        { name: "chainId", in: "query", schema: { type: "integer", enum: [1, 56] } },
      ],
      responses: { "200": { description: "Outbound tool links" } },
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
        },
      },
      tags: [
        { name: "Health", description: "Liveness and dependency checks" },
        { name: "Authentication", description: "Registration, login, email verification" },
        { name: "Analysis", description: "Contract analysis jobs and results" },
        { name: "Address scan", description: "On-chain address reputation and explorer fetch" },
        { name: "Wallet risk", description: "Allowance tooling links (indexed allowance graph later)" },
      ],
    },
    apis: swaggerApiGlobs(),
  };

  cachedSpec = swaggerJsdoc(options);
  return cachedSpec;
}

/** @deprecated Use getSwaggerSpec() — kept for tests that import swaggerSpec */
export const swaggerSpec = getSwaggerSpec();
