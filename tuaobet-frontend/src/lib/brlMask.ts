/** Máscara BR da direita para a esquerda (centavos → 1.234,56). */

export function formatCentsMask(digits: string): string {
  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned) return '';
  const num = parseInt(cleaned, 10) / 100;
  if (!Number.isFinite(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function numberFromMaskDigits(digits: string): number {
  const cleaned = digits.replace(/\D/g, '');
  if (!cleaned) return NaN;
  return parseInt(cleaned, 10) / 100;
}

export function sanitizeMaskDigits(raw: string, maxDigits = 12): string {
  return raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, maxDigits);
}

export function maskDigitsFromNumber(value: number, maxDigits = 12): string {
  if (!Number.isFinite(value) || value <= 0) return '';
  const cents = Math.round(value * 100);
  if (cents <= 0) return '';
  return String(cents).replace(/^0+(?=\d)/, '').slice(0, maxDigits);
}
