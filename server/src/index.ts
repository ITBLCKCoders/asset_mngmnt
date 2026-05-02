/* eslint-disable no-console */
import express from 'express';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger.js';
import logger from './logger.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import companyRoutes from './routes/company.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import typesRoutes from './routes/types.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import locationsRoutes from './routes/locations.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import assetsRoutes from './routes/assets.routes.js';
import assetAssignmentsRoutes from './routes/assetAssignments.routes.js';
import assetReturnsRoutes from './routes/assetReturns.routes.js';
import assetTransfersRoutes from './routes/assetTransfers.routes.js';
import accountabilityFormsRoutes from './routes/accountabilityForms.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import brandsRoutes from './routes/brands.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import auditRoutes from './routes/audit.routes.js';
import auditRetentionRoutes from './routes/auditRetention.routes.js';
import positionsRoutes from './routes/positions.routes.js';
import assetBuildersRoutes from './routes/assetBuilders.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import assetRequestsRoutes from './routes/assetRequests.routes.js';
import assetBorrowRequestsRoutes from './routes/assetBorrowRequests.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import { cleanupExpiredSessions } from './auth/cleanup.js';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketHandlers } from './sockets/socketHandlers.js';
import type { CorsOptions } from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { serverConfig } from './config/database.js';
import {
  enhancedErrorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
  securityHeaders,
  helmetMiddleware,
  requestTimeout,
  requestId,
  requestLogger,
} from './middleware/enhancedErrorHandling.js';
import { resolveCorsDecision } from './middleware/corsPolicy.js';
import { originCheck } from './middleware/originCheck.js';
import { validateAllConfigs } from './config/validation.js';
import { AssetBorrowRequestsService } from './services/assetBorrowRequests.service.js';
import { pool } from './db.js';
const app = express();

// TLS termination is the responsibility of the deployment environment:
//   - Local dev: run `npm run cert --workspace=server` once to generate a
//     self-signed cert under ./certs, then run a local HTTPS proxy if needed.
//   - Production: terminate TLS at a reverse proxy (NGINX, Caddy, Cloudflare,
//     etc.) using a real certificate. The Node app speaks plain HTTP behind
//     the proxy.
//
// `app.set('trust proxy', 1)` below tells Express to honour the X-Forwarded-*
// headers from that single proxy hop.

const PORT = serverConfig.port;

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}
const ip = getLocalIp();

app.set('trust proxy', 1);
// JSON body limit is intentionally tight (1 MB). File uploads (avatar,
// condition photos) use `multer.memoryStorage` — they never hit this limit
// because they arrive as multipart/form-data, not JSON. If a future endpoint
// genuinely needs to accept large JSON, mount a per-route
// `express.json({ limit: '...' })` instead of widening the global default.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(serverConfig.cookieSecret));

// Apply request ID middleware for tracing
app.use(requestId());

// Apply request logging middleware
app.use(requestLogger());

// Apply Helmet (CSP + standard hardening) followed by app-specific overrides
// (auth-route cache-control + wet-PDF iframe X-Frame-Options exemption).
app.use(helmetMiddleware);
app.use(securityHeaders());

// Apply request timeout middleware
app.use(requestTimeout(30000)); // 30 second timeout

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    cb: (err: Error | null, allow?: boolean) => void
  ) => {
    const decision = resolveCorsDecision(origin);
    if (decision.allowed) return cb(null, true);

    logger.warn(
      `[CORS] Blocked origin=${origin ?? 'unknown'} reason=${decision.reason}`
    );
    return cb(new Error('CORS blocked'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Origin/Referer CSRF check on unsafe HTTP methods (uses same allowlist as CORS).
app.use(originCheck);

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(
      `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  next();
});

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.get('/api-docs.json', (_req: Request, res: Response) => res.json(specs));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes); // NEW: Users routes mounted
app.use('/api/companies', companyRoutes); // NEW: Company routes mounted
app.use('/api/categories', categoriesRoutes); // NEW: Categories routes mounted
app.use('/api/types', typesRoutes); // NEW: Types routes mounted
app.use('/api/departments', departmentsRoutes); // NEW: Departments routes mounted
app.use('/api/locations', locationsRoutes); // NEW: Locations routes mounted
app.use('/api/roles', rolesRoutes); // NEW: Roles routes mounted
app.use('/api/assets', assetsRoutes); // NEW: Assets routes mounted
app.use('/api/asset-assignments', assetAssignmentsRoutes); // NEW: Asset assignments routes mounted
app.use('/api/asset-returns', assetReturnsRoutes);
app.use('/api/asset-transfers', assetTransfersRoutes); // NEW: Asset returns routes mounted
app.use('/api/accountability-forms', accountabilityFormsRoutes); // NEW: Accountability forms routes mounted
app.use('/api/suppliers', suppliersRoutes); // NEW: Suppliers routes mounted
app.use('/api/brands', brandsRoutes); // NEW: Brands routes mounted
app.use('/api/settings', settingsRoutes); // NEW: Settings routes mounted
app.use('/api/audit', auditRoutes); // NEW: Audit routes mounted
app.use('/api/audit-retention', auditRetentionRoutes); // NEW: Audit retention routes mounted
app.use('/api/positions', positionsRoutes); // NEW: Positions routes mounted
app.use('/api/asset-builders', assetBuildersRoutes); // NEW: Asset builders routes mounted
app.use('/api/notifications', notificationsRoutes); // NEW: Notifications routes mounted
app.use('/api/asset-requests', assetRequestsRoutes); // NEW: Asset requests routes mounted
app.use('/api/asset-borrow-requests', assetBorrowRequestsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.get('/api/hello', (_req: Request, res: Response) =>
  res.json({ message: 'Hello from server!' })
);

// Health check
app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'OK', uptime: process.uptime() })
);

// Error handlers (must be after all routes)
app.use(notFoundHandler);
app.use(enhancedErrorHandler);

// Start HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with the same CORS allowlist used for HTTP.
const io = new SocketIOServer(server, {
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void
    ) => {
      const decision = resolveCorsDecision(origin);
      if (decision.allowed) return cb(null, true);
      logger.warn(
        `[SOCKET.IO][CORS] Blocked origin=${origin ?? 'unknown'} reason=${decision.reason}`
      );
      return cb(new Error('Socket.IO CORS blocked'));
    },
    credentials: true,
  },
  allowEIO3: true, // Allow older Socket.IO clients
});

// Setup socket handlers
setupSocketHandlers(io);

// Set io instance for use in other modules via socketManager
import { setIoInstance } from './utils/socketManager.js';
setIoInstance(io);

// Export io for use in other modules
export { io };

// Setup global error handlers
setupGlobalErrorHandlers();

// Validate all configurations before starting the server
validateAllConfigs();
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[SERVER] Port ${PORT} is already in use. Try closing the other process or change HTTP_PORT in .env`
    );
  } else {
    console.error('[SERVER] Server error:', err);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', async () => {
  logger.info(`HTTP server with Socket.IO running on port ${PORT}`);
  logger.info(`   Local:   http://localhost:${PORT}`);
  logger.info(`   Network: http://${ip}:${PORT}`);
  logger.info(
    `   Swagger: http://localhost:${PORT}/api-docs${ip !== '127.0.0.1' ? ` or http://${ip}:${PORT}/api-docs` : ''}`
  );
  logger.info(`   Health:  http://localhost:${PORT}/health`);

  await cleanupExpiredSessions();
  logger.info('[CLEANUP] Initial session cleanup completed');
});

const sessionCleanupTimer = setInterval(
  async () => {
    try {
      await cleanupExpiredSessions();
      logger.info('[CLEANUP] Periodic session cleanup done');
    } catch (e) {
      logger.error('[CLEANUP] Error during cleanup', e);
    }
  },
  5 * 60 * 1000
);

const borrowReminderTimer = setInterval(async () => {
  try {
    await AssetBorrowRequestsService.processDueReminders(pool);
  } catch (e) {
    logger.error('[BORROW REMINDERS] Error processing due reminders', e);
  }
}, 60 * 1000);

// Graceful shutdown — clear timers, close Socket.IO + HTTP server, release the
// MySQL pool. Falls back to forced exit after 10 s in case any close callback
// hangs (e.g. an open MySQL transaction stuck on a row lock).
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received. Shutting down gracefully...`);

  clearInterval(sessionCleanupTimer);
  clearInterval(borrowReminderTimer);

  const forceExit = setTimeout(() => {
    logger.warn('[SHUTDOWN] Forced exit after 10s timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref?.();

  try {
    await new Promise<void>(resolve => io.close(() => resolve()));
  } catch (e) {
    logger.warn('[SHUTDOWN] Socket.IO close error', e);
  }

  try {
    await new Promise<void>((resolve, reject) =>
      server.close(err => (err ? reject(err) : resolve()))
    );
    logger.info('[SHUTDOWN] HTTP server closed');
  } catch (e) {
    logger.warn('[SHUTDOWN] HTTP server close error', e);
  }

  try {
    await pool.end();
    logger.info('[SHUTDOWN] MySQL pool closed');
  } catch (e) {
    logger.warn('[SHUTDOWN] MySQL pool close error', e);
  }

  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

export default app;
