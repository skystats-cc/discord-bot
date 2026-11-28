import { describe, expect, it } from 'vitest';
import { presenceLines } from './presenceLines.js';

describe('presence', () => {
  it('describes status and server count', () => {
    expect(presenceLines({ servers: 1, skyblockUp: true })).toContain('in 1 server');
    expect(presenceLines({ servers: 3, skyblockUp: false })).toContain('SkyBlock is having problems');
    expect(presenceLines({ servers: 3, skyblockUp: null })).toContain('skystats.cc');
  });
});
