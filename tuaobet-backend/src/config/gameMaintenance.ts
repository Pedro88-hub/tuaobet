function envFlag(value: string | undefined, defaultWhenUnset: boolean): boolean {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return defaultWhenUnset;
}

/** Em produção o Baccarat fica em manutenção; em local continua jogável. */
export function isBaccaratInMaintenance(): boolean {
  return envFlag(process.env.BACCARAT_MAINTENANCE, process.env.NODE_ENV === 'production');
}
