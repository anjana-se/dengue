import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { config, corsOrigins } from '../../config/env';
import { verifyAccessToken } from '../../shared/jwt.util';
import { SOCKET_ROOMS } from '../../config/constants';
import { logger } from '../../shared/logger';

/**
 * services/notifications/socket.server.ts
 *
 * Socket.IO server — JWT-authenticated WebSocket connections.
 * Joins each client to a role-appropriate room on connect:
 *   - ndcu_admin  → 'ndcu_admins'
 *   - phi         → 'phi_user_{userId}'
 *   - others      → no room (community reporters don't receive push notifications)
 *
 * The io instance is exported so notifications.service can emit to rooms.
 */

let _io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (_io) return _io;

  _io = new SocketIOServer(httpServer, {
    path: config.SOCKET_IO_PATH,
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── JWT Authentication middleware ──────────────────────────────────────────
  _io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required: no token provided'));
    }

    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { user: typeof payload }).user = payload;
      next();
    } catch {
      next(new Error('Authentication failed: invalid or expired token'));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  _io.on('connection', (socket: Socket) => {
    const user = (socket as Socket & { user: { sub: string; role: string } }).user;

    logger.debug('Socket connected', { socketId: socket.id, userId: user.sub, role: user.role });

    // Join role-appropriate room
    if (user.role === 'ndcu_admin') {
      socket.join(SOCKET_ROOMS.NDCU_ADMINS);
      logger.debug('Socket joined room', { room: SOCKET_ROOMS.NDCU_ADMINS, userId: user.sub });
    } else if (user.role === 'phi') {
      const phiRoom = SOCKET_ROOMS.phiRoom(user.sub);
      socket.join(phiRoom);
      logger.debug('Socket joined room', { room: phiRoom, userId: user.sub });
    }

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, userId: user.sub, reason });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { socketId: socket.id, error: err.message });
    });
  });

  logger.info('Socket.IO server initialised', { path: config.SOCKET_IO_PATH });
  return _io;
}

export function getIO(): SocketIOServer {
  if (!_io) throw new Error('Socket.IO server not initialised — call initSocketServer() first');
  return _io;
}
