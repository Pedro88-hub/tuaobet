import { randomBytes } from 'crypto';
import { MAX_BET, MIN_BET } from '../../services/ledger';

const TZ = process.env.GAME_SIMULATOR_TZ ?? process.env.DOUBLE_SIMULATOR_TZ ?? 'America/Sao_Paulo';

function hourInTz(date: Date): number {
  const s = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    timeZone: TZ,
  }).format(date);
  return parseInt(s, 10);
}

/**
 * Intensidade 0–1 conforme a hora no fuso (pico à noite / fim de tarde, vale à madrugada).
 */
export function simulatorTrafficIntensity(date = new Date()): number {
  const h = hourInTz(date);
  if (h >= 3 && h <= 7) return 0.2;
  if (h >= 8 && h <= 11) return 0.48;
  if (h >= 12 && h <= 13) return 0.72;
  if (h >= 14 && h <= 17) return 0.42;
  if (h >= 18 && h <= 23) return 0.98;
  if (h >= 0 && h <= 2) return 0.35;
  return 0.5;
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

const SYLLABLES = [
  'ka',
  'zu',
  'mi',
  'to',
  'lu',
  'na',
  're',
  'vi',
  'po',
  'de',
  'sa',
  'no',
  'ti',
  'ra',
  'be',
  'go',
  'fa',
  'xi',
  'ju',
  'le',
];

const PT_FIRST = [
  'Lucas',
  'Ana',
  'Pedro',
  'Maria',
  'Gabriel',
  'Julia',
  'Rafael',
  'Beatriz',
  'Bruno',
  'Larissa',
  'Felipe',
  'Camila',
  'Thiago',
  'Amanda',
  'Gustavo',
  'Fernanda',
  'Diego',
  'Patricia',
  'Andre',
  'Carla',
  'Marcos',
  'Renata',
  'Vinicius',
  'Priscila',
  'Rodrigo',
  'Daniela',
  'Henrique',
  'Aline',
  'Paulo',
  'Vanessa',
];

const TAG_SUFFIXES = ['_', '.', 'x', 'xz', 'pro', 'tv', 'br', '7', '99', '13', '21'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function randomUsername(): string {
  const mode = Math.random();
  if (mode < 0.34) {
    const a = pick(PT_FIRST);
    const n = randInt(1, 9999);
    return Math.random() < 0.5 ? `${a}${n}` : `${a}_${n}`;
  }
  if (mode < 0.55) {
    const parts = [pick(SYLLABLES), pick(SYLLABLES), pick(SYLLABLES)];
    return parts.join('') + randInt(10, 99);
  }
  if (mode < 0.72) {
    const base = pick(PT_FIRST).toLowerCase();
    return `${pick(TAG_SUFFIXES)}${base}${pick(TAG_SUFFIXES)}${randInt(0, 99) || ''}`;
  }
  if (mode < 0.88) {
    return `${pick(PT_FIRST)}${pick(TAG_SUFFIXES)}${randInt(1, 999)}`;
  }
  const raw = randomBytes(3).toString('hex');
  return `user_${raw}`;
}

export function randomAmount(): number {
  const cap = Math.min(MAX_BET, 950);
  const low = MIN_BET;
  const roll = Math.random();
  let raw: number;
  if (roll < 0.42) {
    raw = low + Math.random() * Math.min(14, cap - low);
  } else if (roll < 0.86) {
    raw = 4 + Math.random() * Math.min(220, cap - 4);
  } else {
    raw = 40 + Math.random() * Math.max(0, cap - 40);
  }
  if (Math.random() < 0.55) {
    raw = Math.floor(raw) + randInt(0, 99) / 100;
  } else {
    raw = Math.round(raw * 100) / 100;
  }
  return Math.round(Math.max(low, Math.min(MAX_BET, raw)) * 100) / 100;
}

export function plannedFakeBetEvents(intensity = simulatorTrafficIntensity()): number {
  const j = 0.88 + Math.random() * 0.26;
  const t = intensity * j;
  const minE = Math.max(1, Math.floor(1 + t * 9));
  const maxE = Math.max(minE + 2, Math.floor(4 + t * 34));
  return randInt(minE, maxE);
}
