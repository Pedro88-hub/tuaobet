import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';

export interface SocketData {
  userId?: string;
}

export function verifySocketToken(token: unknown): string | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id?: string };
    return decoded.id ?? null;
  } catch {
    return null;
  }
}

export function attachUserToSocket(socket: Socket, userId: string): void {
  socket.data.userId = userId;
  void socket.join(`user:${userId}`);
}
