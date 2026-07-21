import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Emitter } from '@socket.io/redis-emitter';
import { Redis } from 'ioredis';
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
 *
 * Cross-process delivery: the API process attaches the Socket.IO Redis adapter,
 * and the worker process (which has no HTTP server) creates a Redis *emitter*.
 * Emits from either process reach connected clients via the shared Redis, so
 * events produced by the AI worker (report:analysed, workorder:created, …) are
 * delivered to browsers even though the worker never runs a Socket.IO server.
 */

/**
 * A broadcaster exposes the subset of the Socket.IO API the emit helpers use:
 * room-scoped emit (`.to(room).emit()`) and global emit (`.emit()`). Both the
 * real `SocketIOServer` and the Redis `Emitter` satisfy this minimal shape,
 * even though their concrete return types differ.
 */
export interface Broadcaster {
  to(room: string): { emit(event: string, ...args: unknown[]): unknown };
  emit(event: string, ...args: unknown[]): unknown;
}

let _io: SocketIOServer | null = null;
let _emitter: Emitter | null = null;

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

  // ── Redis adapter — lets emits from other processes (the worker) reach clients ──
  const pubClient = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();
  pubClient.on('error', (err) => logger.error('Socket.IO Redis pub error', { error: err.message }));
  subClient.on('error', (err) => logger.error('Socket.IO Redis sub error', { error: err.message }));
  _io.adapter(createAdapter(pubClient, subClient));

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

export function getOptionalIO(): SocketIOServer | null {
  return _io;
}

/**
 * Initialise a Redis-backed emitter for processes that don't run the Socket.IO
 * HTTP server (i.e. the worker). Emits published through it are delivered to
 * connected clients by the API process's Redis adapter.
 */
export function initSocketEmitter(): Emitter {
  if (_emitter) return _emitter;
  const client = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  client.on('error', (err) => logger.error('Socket.IO Redis emitter error', { error: err.message }));
  _emitter = new Emitter(client);
  logger.info('Socket.IO Redis emitter initialised');
  return _emitter;
}

/**
 * Returns whatever can broadcast in the current process: the real io server
 * (API process) or the Redis emitter (worker process). Null when neither has
 * been initialised, in which case emit helpers fall back to log stubs.
 */
export function getBroadcaster(): Broadcaster | null {
  return _io ?? _emitter;
}
