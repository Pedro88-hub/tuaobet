import type { GlobalAnnouncement } from '@prisma/client';
import type { Server } from 'socket.io';

let ioRef: Server | null = null;

export function registerSiteIo(io: Server): void {
  ioRef = io;
}

/** Payload enviado ao cliente (alinhar com o frontend). */
export type SiteAnnouncementPayload = {
  id: string;
  title: string;
  message: string;
  displayMode: string;
  imageUrl: string | null;
  bgColor: string | null;
  titleColor: string | null;
  messageColor: string | null;
  accentColor: string | null;
  updatedAt: string;
};

export function announcementToSocketPayload(row: GlobalAnnouncement): SiteAnnouncementPayload {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    displayMode: row.displayMode,
    imageUrl: row.imageUrl,
    bgColor: row.bgColor,
    titleColor: row.titleColor,
    messageColor: row.messageColor,
    accentColor: row.accentColor,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function emitGlobalAnnouncement(row: GlobalAnnouncement): void {
  ioRef?.emit('site:announcement', announcementToSocketPayload(row));
}
