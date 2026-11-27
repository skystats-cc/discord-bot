import { describe, expect, it } from 'vitest';
import { EPOCH, skyblockDate, upcomingEvents } from './calendar.js';

describe('SkyBlock calendar', () => {
  it('starts at Year 1, Early Spring 1', () => {
    expect(skyblockDate(EPOCH)).toEqual({ year: 1, month: 0, monthName: 'Early Spring', day: 1 });
  });
  it('rolls days, months and years', () => {
    expect(skyblockDate(EPOCH + 20 * 60_000).day).toBe(2);
    expect(skyblockDate(EPOCH + 31 * 20 * 60_000).monthName).toBe('Spring');
    expect(skyblockDate(EPOCH + 124 * 3_600_000).year).toBe(2);
  });
  it('lists future events in order', () => {
    const now = EPOCH + 1000;
    const ev = upcomingEvents(now);
    expect(ev.every((e) => e.start > now)).toBe(true);
    expect(ev.map((e) => e.start)).toEqual([...ev.map((e) => e.start)].sort((a, b) => a - b));
    expect(new Date(ev.find((e) => e.name === 'Dark Auction')!.start).getUTCMinutes()).toBe(55);
  });
});
