export type PlinkoRisk = 'low' | 'medium' | 'high';

export function generatePlinkoMultipliers(rows: number, risk: PlinkoRisk): number[] {
  const count = rows + 1;
  const result = new Array(count).fill(0);
  const center = (count - 1) / 2;

  const riskSettings = {
    low: { base: 0.5, power: 2.2 },
    medium: { base: 0.3, power: 3.5 },
    high: { base: 0.1, power: 5.5 },
  };

  const { base, power } = riskSettings[risk];

  for (let i = 0; i < count; i++) {
    const dist = Math.abs(i - center);
    const normalizedDist = center > 0 ? dist / center : 0;
    const val = base + Math.pow(normalizedDist * 3, power);
    let rounded: number;
    if (val > 100) rounded = Math.round(val);
    else if (val > 10) rounded = Math.round(val);
    else rounded = Math.round(val * 10) / 10;
    result[i] = rounded;
  }

  if (rows === 8) {
    if (risk === 'low') return [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];
    if (risk === 'medium') return [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13];
    if (risk === 'high') return [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29];
  }

  return result;
}
