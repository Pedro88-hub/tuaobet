import { apiFetch } from './api';

export type AnnouncementDisplayMode = 'BAR' | 'MODAL' | 'TOAST';

export type PublicAnnouncement = {
  id: string;
  title: string;
  message: string;
  updatedAt: string;
  displayMode: AnnouncementDisplayMode;
  imageUrl: string | null;
  bgColor: string | null;
  titleColor: string | null;
  messageColor: string | null;
  accentColor: string | null;
};

/** Payload do socket `site:announcement` (alinhar com backend). */
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

export async function fetchPublicBanners(): Promise<Record<string, string>> {
  const r = await apiFetch<{ banners: Record<string, string> }>('/api/public/banners');
  return r.banners ?? {};
}

export async function fetchPublicAnnouncement(): Promise<PublicAnnouncement | null> {
  const r = await apiFetch<{ announcement: PublicAnnouncement | null }>('/api/public/announcement');
  const a = r.announcement;
  if (!a) return null;
  return {
    ...a,
    displayMode: a.displayMode ?? 'BAR',
    imageUrl: a.imageUrl ?? null,
    bgColor: a.bgColor ?? null,
    titleColor: a.titleColor ?? null,
    messageColor: a.messageColor ?? null,
    accentColor: a.accentColor ?? null,
  };
}
