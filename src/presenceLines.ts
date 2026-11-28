/** Rotating status line under the bot's name. Read-only public data; no player names. */
export function presenceLines(o: { servers: number; skyblockUp: boolean | null }): string[] {
  return [
    '/bz for bazaar prices',
    o.skyblockUp === null ? 'skystats.cc' : o.skyblockUp ? 'SkyBlock is up' : 'SkyBlock is having problems',
    `in ${o.servers} server${o.servers === 1 ? '' : 's'}`,
    '/mayor · /events · /flip',
  ];
}
