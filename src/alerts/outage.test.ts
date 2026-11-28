import { describe, expect, it, vi } from 'vitest';

vi.mock('../config.js', () => ({ config: { SKYSTATS_WEB_URL: 'https://skystats.cc', STATUS_ALERT_CHANNEL_IDS: [] } }));
vi.mock('../api.js', () => ({ api: {}, userApi: () => ({}), accountsEnabled: () => false }));
const { skyblockDown } = await import('./outage.js');

const base = { description: '', incidents: [], checkedAt: null };
const sb = (status: string) => [{ name: 'SkyBlock', status, impact: null, url: null }];

describe('skyblockDown', () => {
  it('is down when the SkyBlock component is not operational', () => {
    expect(skyblockDown({ ...base, indicator: 'minor', components: sb('major_outage') } as never)).toBe(true);
  });
  it('is up for minor issues elsewhere', () => {
    expect(skyblockDown({ ...base, indicator: 'minor', components: sb('operational') } as never)).toBe(false);
  });
  it('is down for a major network incident', () => {
    expect(skyblockDown({ ...base, indicator: 'major', components: [] } as never)).toBe(true);
  });
});
