const BR_TZ = 'America/Sao_Paulo';

function ymdInTimeZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (y && m && day) return `${y}-${m}-${day}`;
  return d.toISOString().slice(0, 10);
}

function daysBetweenYmd(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  const t1 = Date.UTC(ya, (ma ?? 1) - 1, da ?? 1);
  const t2 = Date.UTC(yb, (mb ?? 1) - 1, db ?? 1);
  return Math.round((t2 - t1) / 86400000);
}

/** Hoje / amanhã e hora no fuso de Brasília (padrão casas BR). */
export function formatMatchWhen(iso: string, timeZone: string = BR_TZ): string {
  try {
    const d = new Date(iso);
    const matchDay = ymdInTimeZone(iso, timeZone);
    const todayDay = ymdInTimeZone(new Date().toISOString(), timeZone);
    const diffDays = daysBetweenYmd(todayDay, matchDay);
    const time = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    });
    if (diffDays === 0) return `Hoje, ${time}`;
    if (diffDays === 1) return `Amanhã, ${time}`;
    if (diffDays === -1) return `Ontem, ${time}`;
    return d.toLocaleString('pt-BR', {
      timeZone,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '—';
}
