import { Server as IOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { firebaseAuth } from '../config/firebase';
import { userRepository } from '../repositories/user.repository';
import { corsOrigins } from '../config/env';
import { logger } from '../utils/logger';

let io: IOServer | null = null;

export function locationRoom(sharerUserId: string): string {
  return `location:${sharerUserId}`;
}

/**
 * Authorization is checked here directly against the User repository
 * rather than through LocationService, specifically to avoid a module
 * cycle: LocationService needs to reach back into this file to emit
 * updates (getSocketServer, below), so this file must not import anything
 * that imports LocationService. The check itself is a two-line boolean
 * read, not business logic worth the indirection.
 */
async function isAuthorizedViewer(sharerUserId: string, viewerUserId: string): Promise<boolean> {
  const sharer = await userRepository.findById(sharerUserId);
  if (!sharer || !sharer.locationSharing.isActive) return false;
  return sharer.locationSharing.sharedWithUserIds.some((id) => id.toString() === viewerUserId);
}

export function initSocketServer(httpServer: HttpServer): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
    },
  });

  // Every socket connection authenticates the same way REST requests do —
  // a Firebase ID token, passed via the client's `auth` handshake payload
  // rather than a header (socket.io convention).
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Missing auth token');

      const decoded = await firebaseAuth.verifyIdToken(token);
      const user = await userRepository.findByFirebaseUid(decoded.uid);
      if (!user || !user.isActive) throw new Error('No active SafeSathi account');

      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    logger.info('Socket connected', { userId, socketId: socket.id });

    socket.on(
      'location:watch',
      async (payload: { sharerUserId: string }, ack?: (res: { ok: boolean; error?: string }) => void) => {
        const authorized = await isAuthorizedViewer(payload.sharerUserId, userId);
        if (!authorized) {
          ack?.({ ok: false, error: 'FORBIDDEN' });
          return;
        }
        await socket.join(locationRoom(payload.sharerUserId));
        ack?.({ ok: true });
      }
    );

    socket.on('location:unwatch', (payload: { sharerUserId: string }) => {
      void socket.leave(locationRoom(payload.sharerUserId));
    });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  return io;
}

export function getSocketServer(): IOServer {
  if (!io) {
    throw new Error('Socket server accessed before initSocketServer() ran');
  }
  return io;
}
