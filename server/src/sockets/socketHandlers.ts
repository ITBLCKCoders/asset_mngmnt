import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../logger.js';
import { jwtConfig } from '../config/database.js';
import { verifyAccessToken, refreshSessionTokens } from '../auth/index.js';
import { verifyRefreshToken } from '../auth/session.js';
import { cookieOptions, accessTokenCookieOptions } from '../cookieConfig.js';
import { ASSET_ACCESS_COOKIE_NAME, ASSET_REFRESH_COOKIE_NAME } from '../auth/cookieNames.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: AuthenticatedSocket) => {
    // Extract token from handshake auth
    const token = socket.handshake.auth.token;
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.sessionId) {
        socket.userId = decoded.userID;

        // Automatically join user-specific room
        const roomName = `user_${socket.userId}`;
        socket.join(roomName);
        logger.debug(`[SOCKET] Authenticated ${socket.id} as user ${socket.userId}`);
      } else {
        logger.debug(`[SOCKET] Invalid or expired token for ${socket.id}, waiting for re-authentication`);
        // Don't disconnect - allow client to re-authenticate with fresh token
      }
    } else {
      logger.debug(
        `[SOCKET] No token provided for ${socket.id}, waiting for authentication`
      );
    }

    // Handle authentication
    socket.on('authenticate', (token: string) => {
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.sessionId) {
        socket.userId = decoded.userID;

        // Join user-specific room after authentication
        const roomName = `user_${socket.userId}`;
        socket.join(roomName);
        logger.debug(`[SOCKET] Re-authenticated ${socket.id} as user ${socket.userId}`);
        socket.emit('authenticated', { success: true, userId: socket.userId });
      } else {
        logger.error(`[SOCKET] Authentication failed for ${socket.id}: invalid or expired token`);
        socket.emit('authenticated', { success: false, error: 'Invalid or expired token' });
        // Don't disconnect - allow client to retry with fresh token
      }
    });

    // Handle token refresh
    socket.on('refresh-token', async (callback) => {
      try {
        // Get refresh token from signed cookies (socket.request has the Express request object)
        const req = socket.request as Request;
        const refreshToken = req.signedCookies?.[ASSET_REFRESH_COOKIE_NAME];
        
        if (!refreshToken) {
          logger.warn(`[SOCKET] Refresh token missing for ${socket.id}`);
          callback?.({ success: false, error: 'No refresh token' });
          return;
        }

        // Verify refresh token and get session info
        const payload = await verifyRefreshToken(refreshToken, req);
        if (!payload || !payload.sessionId) {
          logger.warn(`[SOCKET] Invalid refresh token for ${socket.id}`);
          callback?.({ success: false, error: 'Invalid refresh token' });
          return;
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await refreshSessionTokens(
          payload.sessionId,
          payload.userId,
          payload.email,
          req
        );

        // Set new cookies on the response
        const res = (socket.request as any).res;
        if (res) {
          res.cookie(ASSET_ACCESS_COOKIE_NAME, accessToken, accessTokenCookieOptions);
          res.cookie(ASSET_REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);
        }

        logger.debug(`[SOCKET] Token refreshed for ${socket.id}, user ${payload.userId}`);
        callback?.({ success: true, accessToken });
      } catch (error: any) {
        logger.error(`[SOCKET] Token refresh failed for ${socket.id}:`, error);
        callback?.({ success: false, error: 'Refresh failed' });
      }
    });

    // Handle joining user-specific room
    socket.on('join-user-room', (userId: string) => {
      if (socket.userId === userId) {
        socket.join(`user_${userId}`);
      } else {
        logger.warn(
          `[SOCKET] Client ${socket.id} tried to join room for different user`
        );
      }
    });

    // Handle disconnection
    socket.on('disconnect', reason => {
      logger.info(
        `[SOCKET] Client disconnected: ${socket.id}, reason: ${reason}`
      );
    });
  });
}

// Function to emit notifications to specific users
export function emitNotification(
  io: SocketIOServer,
  userId: string,
  event: string,
  data: any
) {
  const roomName = `user_${userId}`;
  io.to(roomName).emit(event, data);
}
