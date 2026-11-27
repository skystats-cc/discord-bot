import { describe, expect, it } from 'vitest';
import { diffRoles, rolesFor } from './plan.js';

const ids = { linked: 'L', pro: 'P', max: 'M' };
describe('role sync', () => {
  it('gives roles only for opt-ins', () => {
    expect([...rolesFor({ discordId: '1', linked: true, tier: 'max' }, ids)]).toEqual(['L', 'M']);
    expect([...rolesFor({ discordId: '1', linked: false, tier: 'free' }, ids)]).toEqual([]);
    expect([...rolesFor(undefined, ids)]).toEqual([]);
  });
  it('adds and removes only managed roles', () => {
    expect(diffRoles(['P', 'other'], new Set(['L', 'M']), ids)).toEqual({ add: ['L', 'M'], remove: ['P'] });
    expect(diffRoles(['other'], new Set(), ids)).toEqual({ add: [], remove: [] });
  });
});
