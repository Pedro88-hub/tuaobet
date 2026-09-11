/** Verificação client-side (mesma lógica que o servidor). */

async function sha256Buffer(message: string): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  return crypto.subtle.digest('SHA-256', enc.encode(message));
}

export async function sha256HexUtf8(text: string): Promise<string> {
  const buf = await sha256Buffer(text);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function crashPointFromSeedClient(serverSeed: string, roundId: number): Promise<number> {
  const buf = await sha256Buffer(`${serverSeed}:${roundId}:crash`);
  const view = new DataView(buf);
  const h = view.getUint32(0, false);
  const e = 2 ** 32;
  if (h % 33 === 0) return 1.0;
  return Math.floor((100 * e - h) / (e - h)) / 100;
}

export async function doubleResultFromSeedClient(
  serverSeed: string,
  roundId: number
): Promise<{ resultNumber: number; color: 'red' | 'black' | 'white' }> {
  const buf = await sha256Buffer(`${serverSeed}:${roundId}:double`);
  const view = new DataView(buf);
  const n = view.getUint32(0, false);
  const resultNumber = n % 15;
  const color =
    resultNumber === 0 ? 'white' : resultNumber <= 7 ? 'red' : 'black';
  return { resultNumber, color };
}

export async function verifyCrashRound(
  serverSeed: string,
  serverSeedHash: string,
  roundId: number,
  expectedCrashPoint: number
): Promise<{ ok: boolean; hashOk: boolean; crashOk: boolean; computed?: number }> {
  const hash = await sha256HexUtf8(serverSeed);
  const hashOk = hash === serverSeedHash;
  if (!hashOk) return { ok: false, hashOk: false, crashOk: false };
  const computed = await crashPointFromSeedClient(serverSeed, roundId);
  const crashOk = Math.abs(computed - expectedCrashPoint) < 0.005;
  return { ok: crashOk, hashOk: true, crashOk, computed };
}

export async function verifyDoubleRound(
  serverSeed: string,
  serverSeedHash: string,
  roundId: number,
  expectedNumber: number,
  expectedColor: 'red' | 'black' | 'white'
): Promise<{ ok: boolean; hashOk: boolean; outcomeOk: boolean }> {
  const hash = await sha256HexUtf8(serverSeed);
  const hashOk = hash === serverSeedHash;
  if (!hashOk) return { ok: false, hashOk: false, outcomeOk: false };
  const { resultNumber, color } = await doubleResultFromSeedClient(serverSeed, roundId);
  const outcomeOk = resultNumber === expectedNumber && color === expectedColor;
  return { ok: outcomeOk, hashOk: true, outcomeOk };
}

/** Mesma lógica que `minesPositionsFromSeed` no backend. */
export async function minesPositionsFromSeedClient(
  serverSeed: string,
  gameId: string,
  minesCount: number
): Promise<number[]> {
  const n = Math.min(Math.max(Math.floor(minesCount), 0), 25);
  const cells = Array.from({ length: 25 }, (_, i) => i);
  let counter = 0;
  const nextU32 = async (): Promise<number> => {
    const buf = await sha256Buffer(`${serverSeed}:${gameId}:mines:${counter++}`);
    const view = new DataView(buf);
    return view.getUint32(0, false);
  };
  for (let i = cells.length - 1; i > 0; i--) {
    const j = (await nextU32()) % (i + 1);
    const tmp = cells[i]!;
    cells[i] = cells[j]!;
    cells[j] = tmp;
  }
  return cells.slice(0, n).sort((a, b) => a - b);
}

export async function verifyMinesRound(
  serverSeed: string,
  serverSeedHash: string,
  gameId: string,
  minesCount: number,
  expectedPositions: number[]
): Promise<{ ok: boolean; hashOk: boolean; positionsOk: boolean }> {
  const hash = await sha256HexUtf8(serverSeed);
  const hashOk = hash === serverSeedHash;
  if (!hashOk) return { ok: false, hashOk: false, positionsOk: false };
  const computed = await minesPositionsFromSeedClient(serverSeed, gameId, minesCount);
  const expected = [...expectedPositions].sort((a, b) => a - b);
  const positionsOk =
    computed.length === expected.length && computed.every((v, i) => v === expected[i]);
  return { ok: positionsOk, hashOk: true, positionsOk };
}
