// SkyBlock calendar maths. One SkyBlock year = 124 real hours; a day = 20 real minutes.
// Event times are calculated, not read from Hypixel, so the bot says "check in game".

export const EPOCH = 1560275700000; // Year 1, Early Spring 1, 00:00
const DAY = 20 * 60_000;
const MONTH = 31 * DAY;
const YEAR = 12 * MONTH;
export const MONTHS = ['Early Spring', 'Spring', 'Late Spring', 'Early Summer', 'Summer', 'Late Summer', 'Early Autumn', 'Autumn', 'Late Autumn', 'Early Winter', 'Winter', 'Late Winter'];

export function skyblockDate(ms: number) {
  const t = ms - EPOCH;
  const year = Math.floor(t / YEAR) + 1;
  const month = Math.floor((t % YEAR) / MONTH); // 0-11
  const day = Math.floor((t % MONTH) / DAY) + 1; // 1-31
  return { year, month, monthName: MONTHS[month]!, day };
}

/** Real time when a SkyBlock date starts, in the year containing `from` or the next one */
function nextDate(from: number, month: number, day: number) {
  const t = from - EPOCH;
  const yearStart = EPOCH + Math.floor(t / YEAR) * YEAR;
  const at = yearStart + month * MONTH + (day - 1) * DAY;
  return at > from ? at : at + YEAR;
}

/** Next real time at `minute` past the hour */
function nextMinute(from: number, minute: number) {
  const d = new Date(from);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(minute);
  return d.getTime() > from ? d.getTime() : d.getTime() + 3_600_000;
}

export interface UpcomingEvent {
  name: string;
  start: number;
  durationMs: number;
}

export function upcomingEvents(now = Date.now()): UpcomingEvent[] {
  const zooA = nextDate(now, 3, 1);
  const zooB = nextDate(now, 9, 1);
  return [
    { name: 'Dark Auction', start: nextMinute(now, 55), durationMs: 5 * 60_000 },
    { name: 'Jacob’s Farming Contest', start: nextMinute(now, 15), durationMs: 20 * 60_000 },
    { name: 'Traveling Zoo', start: Math.min(zooA, zooB), durationMs: 3 * DAY },
    { name: 'Spooky Festival', start: nextDate(now, 7, 29), durationMs: 3 * DAY },
    { name: 'Season of Jerry', start: nextDate(now, 11, 24), durationMs: 3 * DAY },
    { name: 'New Year Celebration', start: nextDate(now, 11, 29), durationMs: 3 * DAY },
  ].sort((a, b) => a.start - b.start);
}
