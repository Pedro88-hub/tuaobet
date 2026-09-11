import type { Server } from 'socket.io';
import { getWalletProgress } from '../services/ledger';

let ioRef: Server | null = null;

export function registerGameIo(io: Server): void {
  ioRef = io;
}

/** Emite saldo + XP atual para o socket do utilizador (sala `user:{id}`). */
export function pushWalletBalance(userId: string): void {
  if (!ioRef) return;
  void getWalletProgress(userId).then(({ balance, xp }) => {
    ioRef!.to(`user:${userId}`).emit('wallet:balance', { balance, xp });
  });
}

export type UserNotifyPayload = {
  type: string;
  title: string;
  message: string;
};

/** Notificação in-app (ex.: saldo ajustado pelo admin) — requer socket autenticado na sala `user:{id}`. */
export function emitUserNotify(userId: string, payload: UserNotifyPayload): void {
  if (!ioRef) return;
  ioRef.to(`user:${userId}`).emit('user:notify', payload);
}
