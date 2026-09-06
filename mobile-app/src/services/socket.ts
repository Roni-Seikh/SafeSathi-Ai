import { io, Socket } from 'socket.io-client';
import { firebaseAuth } from './firebase';
import { SOCKET_URL } from '../constants/config';

export interface LocationUpdatePayload {
  sharerUserId: string;
  coordinates: [number, number];
  accuracy?: number;
  batteryLevel?: number;
  recordedAt: string;
}

let socket: Socket | null = null;

async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await firebaseAuth.currentUser?.getIdToken();
  if (!token) throw new Error('Not signed in');

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

/** Joins the sharer's live-location room. Resolves false if the backend
 * rejects it (sharing isn't active, or this viewer isn't on the shared
 * list) rather than throwing — callers show that as an EmptyState, not
 * an error. */
export async function watchLocation(
  sharerUserId: string,
  onUpdate: (payload: LocationUpdatePayload) => void,
  onStopped: () => void
): Promise<boolean> {
  const client = await getSocket();

  client.off('location:update');
  client.off('location:sharing-stopped');
  client.on('location:update', (payload: LocationUpdatePayload) => {
    if (payload.sharerUserId === sharerUserId) onUpdate(payload);
  });
  client.on('location:sharing-stopped', (payload: { sharerUserId: string }) => {
    if (payload.sharerUserId === sharerUserId) onStopped();
  });

  const ack = await new Promise<{ ok: boolean }>((resolve) => {
    client.emit('location:watch', { sharerUserId }, (res: { ok: boolean }) => resolve(res));
  });

  return ack.ok;
}

export async function unwatchLocation(sharerUserId: string): Promise<void> {
  const client = await getSocket();
  client.emit('location:unwatch', { sharerUserId });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
