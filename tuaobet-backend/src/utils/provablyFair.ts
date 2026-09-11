import { createHash, randomBytes } from 'crypto';

export type DoubleColor = 'red' | 'black' | 'white';

export function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function hashServerSeed(serverSeed: string): string {
  return sha256Hex(serverSeed);
}

/** Mesma distribuição do crash clássico (house edge ~1/33 em 1.00x). */
export function crashPointFromSeed(serverSeed: string, roundId: number): number {
  const digest = createHash('sha256').update(`${serverSeed}:${roundId}:crash`, 'utf8').digest();
  const h = digest.readUInt32BE(0);
  const e = 2 ** 32;
  if (h % 33 === 0) return 1.0;
  return Math.floor((100 * e - h) / (e - h)) / 100;
}

/** Resultado uniforme em 0..14 para Double. */
export function doubleResultFromSeed(
  serverSeed: string,
  roundId: number
): { resultNumber: number; color: DoubleColor } {
  const digest = createHash('sha256').update(`${serverSeed}:${roundId}:double`, 'utf8').digest();
  const n = digest.readUInt32BE(0);
  const resultNumber = n % 15;
  const color: DoubleColor =
    resultNumber === 0 ? 'white' : resultNumber <= 7 ? 'red' : 'black';
  return { resultNumber, color };
}

/**
 * Posições de minas (0–24) a partir do seed — Fisher–Yates determinístico.
 * Retorna `minesCount` índices únicos, ordenados.
 */
export function minesPositionsFromSeed(
  serverSeed: string,
  gameId: string,
  minesCount: number
): number[] {
  const n = Math.min(Math.max(Math.floor(minesCount), 0), 25);
  const cells = Array.from({ length: 25 }, (_, i) => i);
  let counter = 0;
  const nextU32 = (): number => {
    const digest = createHash('sha256')
      .update(`${serverSeed}:${gameId}:mines:${counter++}`, 'utf8')
      .digest();
    return digest.readUInt32BE(0);
  };
  for (let i = cells.length - 1; i > 0; i--) {
    const j = nextU32() % (i + 1);
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
  return cells.slice(0, n).sort((a, b) => a - b);
}
