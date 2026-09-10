/** Máscara pública para feeds (ex.: Pedro88 → Pe***88). */
export function maskUsername(username: string): string {
  const name = (username || '').trim();
  if (!name) return '***';
  if (name.length <= 2) return `${name[0] ?? '*'}*`;
  if (name.length <= 4) return `${name.slice(0, 1)}***${name.slice(-1)}`;
  return `${name.slice(0, 2)}***${name.slice(-2)}`;
}
