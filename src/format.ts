// 1234 -> "1.23k", 3_400_000 -> "3.4M", 1_100_000_000 -> "1.1B"
export function coins(n: number): string {
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
