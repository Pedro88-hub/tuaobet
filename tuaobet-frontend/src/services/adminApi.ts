import { apiFetch } from './api';

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  balance: number;
  xp: number;
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  role: 'USER' | 'ADMIN';
  status: UserAccountStatus;
  createdAt: string;
};

export type AdminDashboardStats = {
  usersTotal: number;
  usersActive: number;
  usersSuspended: number;
  usersBanned: number;
  newUsersLast24h: number;
  betsTotal: number;
  betsLast24h: number;
  betVolumeLast24h: number;
  transactionsLast24h: number;
  totalBalanceInSystem: number;
};

export type SiteBannerRow = {
  id: string;
  key: string;
  imageUrl: string;
  active: boolean;
  updatedAt: string;
};

export type AnnouncementDisplayMode = 'BAR' | 'MODAL' | 'TOAST';

export type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  displayMode: AnnouncementDisplayMode;
  imageUrl: string | null;
  bgColor: string | null;
  titleColor: string | null;
  messageColor: string | null;
  accentColor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTransactionRow = {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
};

export type AdminBetRow = {
  id: string;
  game: string;
  amount: number;
  multiplier: number | null;
  payout: number | null;
  result: string;
  sportMarket: string | null;
  sportSelection: string | null;
  createdAt: string;
  sportFixture: {
    homeTeamName: string;
    awayTeamName: string;
    competitionName: string | null;
    utcDate: string;
    status: string;
  } | null;
};

/** Lista global de apostas (admin) — inclui utilizador. */
export type AdminBetLogRow = AdminBetRow & {
  user: { id: string; username: string; email: string };
};

export type AdminAuditLogRow = {
  id: string;
  adminId: string;
  action: string;
  targetUserId: string | null;
  metadata: unknown;
  createdAt: string;
  admin: { email: string; username: string };
};

export type UserSortField = 'createdAt' | 'balance' | 'xp' | 'email' | 'username' | 'status';

export async function fetchAdminDashboard() {
  return apiFetch<AdminDashboardStats>('/api/admin/dashboard');
}

export async function fetchAdminUsers(params: {
  q?: string;
  limit?: number;
  offset?: number;
  sort?: UserSortField;
  order?: 'asc' | 'desc';
  status?: UserAccountStatus | '';
}) {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  if (params.status) sp.set('status', params.status);
  const q = sp.toString();
  return apiFetch<{ users: AdminUser[]; total: number }>(`/api/admin/users${q ? `?${q}` : ''}`);
}

export async function patchAdminUser(
  id: string,
  body: {
    email: string;
    username: string;
    role: 'USER' | 'ADMIN';
    xp: number;
    status: UserAccountStatus;
  }
) {
  return apiFetch<AdminUser>(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function postAdminUserPassword(id: string, password: string) {
  return apiFetch(`/api/admin/users/${id}/password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function postAdminUserBalance(id: string, delta: number, reason: string) {
  return apiFetch<{ balance: number }>(`/api/admin/users/${id}/balance`, {
    method: 'POST',
    body: JSON.stringify({ delta, reason }),
  });
}

export async function deleteAdminUser(id: string) {
  return apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function fetchUserTransactions(userId: string, limit: number, offset: number) {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<{ transactions: AdminTransactionRow[]; total: number }>(
    `/api/admin/users/${userId}/transactions?${sp}`
  );
}

export async function fetchUserBets(userId: string, limit: number, offset: number) {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<{ bets: AdminBetRow[]; total: number }>(`/api/admin/users/${userId}/bets?${sp}`);
}

export async function fetchAdminBetsLog(params: {
  limit?: number;
  offset?: number;
  q?: string;
  game?: string;
  result?: string;
}) {
  const sp = new URLSearchParams();
  if (params.limit != null) sp.set('limit', String(params.limit));
  if (params.offset != null) sp.set('offset', String(params.offset));
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.game) sp.set('game', params.game);
  if (params.result) sp.set('result', params.result);
  return apiFetch<{ bets: AdminBetLogRow[]; total: number }>(`/api/admin/bets?${sp}`);
}

export async function fetchAdminBanners() {
  return apiFetch<{ banners: SiteBannerRow[] }>('/api/admin/banners');
}

export async function putAdminBanner(key: string, imageUrl: string, active: boolean) {
  return apiFetch(`/api/admin/banners/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ imageUrl, active }),
  });
}

export async function patchAdminBannerActive(key: string, active: boolean) {
  return apiFetch<SiteBannerRow>(`/api/admin/banners/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function deleteAdminBanner(key: string) {
  return apiFetch(`/api/admin/banners/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

export async function fetchAnnouncements() {
  return apiFetch<{ announcements: AnnouncementRow[] }>('/api/admin/announcements');
}

export async function postAnnouncement(body: {
  title: string;
  message: string;
  active: boolean;
  deactivateOthers: boolean;
  displayMode: AnnouncementDisplayMode;
  imageUrl: string | null;
  bgColor: string | null;
  titleColor: string | null;
  messageColor: string | null;
  accentColor: string | null;
}) {
  return apiFetch('/api/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchAnnouncement(
  id: string,
  body: Partial<{
    active: boolean;
    title: string;
    message: string;
    displayMode: AnnouncementDisplayMode;
    imageUrl: string | null;
    bgColor: string | null;
    titleColor: string | null;
    messageColor: string | null;
    accentColor: string | null;
  }>
) {
  return apiFetch(`/api/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function deleteAnnouncement(id: string) {
  return apiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
}

export async function broadcastAnnouncement(id: string) {
  return apiFetch(`/api/admin/announcements/${id}/broadcast`, { method: 'POST' });
}

export async function fetchAuditLogs(limit: number, offset: number) {
  const sp = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<{ logs: AdminAuditLogRow[]; total: number }>(`/api/admin/audit-logs?${sp}`);
}
