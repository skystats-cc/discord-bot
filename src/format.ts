// 1234 -> "1.23k", 3_400_000 -> "3.4M", 1_100_000_000 -> "1.1B"
export function coins(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'k'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) return `${trim(n / size)}${suffix}`;
  }
  return trim(n);
}

function trim(n: number): string {
  const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return Number(n.toFixed(digits)).toString();
}

export function percent(from: number, to: number): string {
  if (from === 0) return 'n/a';
  const p = ((to - from) / from) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

const BLOCKS = '▁▂▃▄▅▆▇█';
/** Text sparkline, e.g. ▁▃▅▇█ */
export function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => BLOCKS[Math.round(((v - min) / span) * (BLOCKS.length - 1))]).join('');
}

/** Parses "1.5m", "20k", "1,200" */
export function parseCoins(s: string): number | null {
  const m = s.trim().toLowerCase().replace(/,/g, '').match(/^(\d+(?:\.\d+)?)([kmb]?)$/);
  if (!m) return null;
  return Number(m[1]) * ({ '': 1, k: 1e3, m: 1e6, b: 1e9 } as const)[m[2] as '' | 'k' | 'm' | 'b'];
}

