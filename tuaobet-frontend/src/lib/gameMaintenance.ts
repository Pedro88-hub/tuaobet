function envFlag(value: string | undefined, defaultWhenUnset: boolean): boolean {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return defaultWhenUnset;
}

/** Em produção o Baccarat fica em manutenção; em local continua jogável. */
export const BACCARAT_IN_MAINTENANCE = envFlag(
  import.meta.env.VITE_BACCARAT_MAINTENANCE,
  import.meta.env.PROD
);
