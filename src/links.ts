import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from './config.js';

/** Site URL with UTM tags so we can tell which commands send people to the site (no personal data). */
export function siteUrl(path: string, command: string) {
  const u = new URL(path, config.SKYSTATS_WEB_URL);
  u.searchParams.set('utm_source', 'discord');
  u.searchParams.set('utm_medium', 'bot');
  u.searchParams.set('utm_campaign', command);
  return u.toString();
}

/** "View on SkyStats" link button for an embed */
export function viewOnSite(path: string, command: string, label = 'View on SkyStats') {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(siteUrl(path, command)),
  );
}
