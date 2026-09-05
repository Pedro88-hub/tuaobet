import { io, Socket } from 'socket.io-client';
import { getApiBase } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('tuaobet_token') || '';
    socket = io(getApiBase(), {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

/** Chame após login/logout para o handshake JWT ser atualizado. */
export function refreshSocketAuth(): void {
  if (!socket) return;
  const token = localStorage.getItem('tuaobet_token') || '';
  socket.auth = { token };
  socket.disconnect();
  socket.connect();
}
