// server/src/swagger.ts
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerJSDoc from 'swagger-jsdoc';
import { serverConfig } from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ext = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
const routeGlob = path.join(__dirname, 'routes', `*.${ext}`);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Asset Mngmnt API',
      version: '1.0.0',
      description: `
## Secure Authentication API

### Features
- **Single-device login** (old session revoked on new login)
- **UUID-based user IDs** (MySQL \`CHAR(36)\`)
- **Email verification & password reset**
- **JWT access + refresh tokens**
- **Rate limiting** (5 auth / 15 min, 20 refresh / hour)
- **HTTP-only** (self-signed cert for dev)

> **Security**: All protected routes require \`Authorization: Bearer <accessToken>\`
      `.trim(),
      contact: {
        name: 'API Support',
        email: 'support@assetmngmnt.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${serverConfig.port}`,
        description: 'Local (localhost)',
      },
      ...(serverConfig.apiPublicUrl
        ? [
            {
              url: serverConfig.apiPublicUrl,
              description: 'Network (LAN IP)',
            },
          ]
        : []),
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your **access token** (from login/verify/reset)',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', description: 'Response payload' },
            message: { type: 'string' },
            error: { type: 'string' },
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationError' },
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
            value: { description: 'Invalid value' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/ValidationError' },
            },
          },
        },
        PaginatedResponse: {
          allOf: [
            { $ref: '#/components/schemas/ApiResponse' },
            {
              type: 'object',
              required: ['meta'],
              properties: {
                meta: {
                  type: 'object',
                  required: ['page', 'limit', 'total', 'totalPages'],
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          ],
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [routeGlob],
};

export const specs = swaggerJSDoc(options);
