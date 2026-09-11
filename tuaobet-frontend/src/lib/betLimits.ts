import { maskDigitsFromNumber, numberFromMaskDigits, sanitizeMaskDigits } from './brlMask';

/** Mínimo de aposta (R$), alinhado ao backend `MIN_BET`. */
export const MIN_BET = 0.5;

export function roundStake(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Limita ao saldo (2 casas). Não sobe abaixo do mínimo. */
export function clampStake(amount: number, balance: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const bal = Number.isFinite(balance) && balance > 0 ? balance : 0;
  return roundStake(Math.min(amount, bal));
}

export function isStakeValid(amount: number, balance: number): boolean {
  if (!Number.isFinite(amount) || !Number.isFinite(balance)) return false;
  return amount >= MIN_BET && amount <= balance;
}

export function stakeHint(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (balance < MIN_BET) return 'Saldo insuficiente';
  if (amount < MIN_BET) return 'Mínimo R$ 0,50';
  if (amount > balance) return 'Saldo insuficiente';
  return null;
}

/** Sanitize + clamp máscara ao saldo. */
export function sanitizeMaskDigitsClamped(raw: string, balance: number, maxDigits = 12): string {
  const digits = sanitizeMaskDigits(raw, maxDigits);
  const value = numberFromMaskDigits(digits);
  if (!Number.isFinite(value)) return digits;
  const bal = Number.isFinite(balance) && balance > 0 ? roundStake(balance) : 0;
  if (value > bal) return maskDigitsFromNumber(bal, maxDigits);
  return digits;
}

/** Metade do valor; se cair abaixo do mínimo, usa MIN_BET (se saldo permitir). */
export function halveStake(amount: number, balance: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const half = roundStake(amount / 2);
  if (half < MIN_BET) {
    return balance >= MIN_BET ? MIN_BET : 0;
  }
  return clampStake(half, balance);
}

/** Dobra o valor, limitado ao saldo. */
export function doubleStake(amount: number, balance: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return clampStake(roundStake(amount * 2), balance);
}

export function halveMaskDigits(digits: string, balance: number): string {
  const v = numberFromMaskDigits(digits);
  const next = halveStake(v, balance);
  return next > 0 ? maskDigitsFromNumber(next) : '';
}

export function doubleMaskDigits(digits: string, balance: number): string {
  const v = numberFromMaskDigits(digits);
  const next = doubleStake(v, balance);
  return next > 0 ? maskDigitsFromNumber(next) : '';
}

/** Parse + clamp para inputs `type="number"` / string livre. */
export function parseStakeInput(raw: string, balance: number): number {
  const n = Number.parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return clampStake(n, balance);
}
