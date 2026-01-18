import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./environment";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "view0x API",
      version: env.API_VERSION || "1.0.0",
      description: "API documentation for view0x - Smart Contract Security Analysis Platform",
      contact: {
        name: "view0x Support",
        email: "support@view0x.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:3001",
        description: "Development server",
      },
      {
        url: "https://api.view0x.com",
        description: "Production server",
      },
    ],
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
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  example: "VALIDATION_ERROR",
                },
                message: {
                  type: "string",
                  example: "Invalid input provided",
                },
              },
            },
          },
        },
        Analysis: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            contractName: {
              type: "string",
              nullable: true,
            },
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
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "number" },
            limit: { type: "number" },
            total: { type: "number" },
            totalPages: { type: "number" },
            hasNext: { type: "boolean" },
            hasPrev: { type: "boolean" },
          },
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication and authorization endpoints",
      },
      {
        name: "Analysis",
        description: "Smart contract analysis endpoints",
      },
      {
        name: "Vulnerabilities",
        description: "Vulnerability management and comments",
      },
      {
        name: "Templates",
        description: "Analysis template management",
      },
      {
        name: "Webhooks",
        description: "Webhook configuration and management",
      },
      {
        name: "Activity Logs",
        description: "User activity logging",
      },
      {
        name: "2FA",
        description: "Two-factor authentication",
      },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
