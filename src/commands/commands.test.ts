import { describe, expect, it, vi } from 'vitest';

vi.mock('../config.js', () => ({
  config: { SKYSTATS_API_URL: 'http://localhost:3000', SKYSTATS_WEB_URL: 'https://skystats.cc', SKYSTATS_PUBLIC_API_URL: 'https://skystats.cc', BOT_API_KEY: '', STATUS_ALERT_CHANNEL_IDS: [], SERVER_LEADERBOARD_CHANNEL_IDS: [], FEEDBACK_CHANNEL_ID: '', SENTRY_DSN: '' },
}));
const { commands, contextMenus } = await import('./index.js');

// The same JSON `npm run deploy-commands` sends, so CI catches invalid commands before Discord does
describe('slash commands', () => {
  const body = [...commands.map((c) => c.data.toJSON()), ...contextMenus.map((c) => c.data.toJSON())];
  it('build valid, unique definitions', () => {
    const names = body.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
    for (const b of body) expect(b.name).toMatch(/^[\w-]{1,32}$|^[\w -]{1,32}$/);
  });
  it('keeps descriptions within Discord limits', () => {
    for (const b of body) if ('description' in b && b.description) expect(b.description.length).toBeLessThanOrEqual(100);
  });
  it('stays under the 100 global command limit', () => expect(body.length).toBeLessThanOrEqual(100));
  it('includes the phase 7 commands', () => expect(body.map((b) => b.name)).toEqual(expect.arrayContaining(['setup', 'verify', 'feedback'])));
});
