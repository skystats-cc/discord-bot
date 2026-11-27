import { describe, expect, it } from 'vitest';
import { coins, percent, sparkline } from './format.js';

describe('coins', () => {
  it('abbreviates', () => {
    expect(coins(950)).toBe('950');
    expect(coins(1234)).toBe('1.23k');
    expect(coins(3_400_000)).toBe('3.4M');
    expect(coins(1_100_000_000)).toBe('1.1B');
    expect(coins(12.345)).toBe('12.3');
  });
});

describe('percent', () => {
  it('shows signed change', () => {
    expect(percent(100, 110)).toBe('+10.0%');
    expect(percent(100, 95)).toBe('-5.0%');
    expect(percent(0, 5)).toBe('n/a');
  });
});

describe('sparkline', () => {
  it('maps values to block heights', () => {
    expect(sparkline([0, 7])).toBe('▁█');
    expect(sparkline([5, 5, 5])).toBe('▁▁▁');
    expect(sparkline([])).toBe('');
  });
});
