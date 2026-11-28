import { alerts } from './alerts.js';
import { bazaar } from './bazaar.js';
import { bzHistory, craft, events, flip, mayor, mmm } from './market.js';
import { ping } from './ping.js';
import { coop, session } from './insight.js';
import { achievementsCmd, compare, compete, guessPrice, leaderboard, predict, profileContextMenu, richOrNot, wrapped } from './social.js';
import { link } from './link.js';
import { me } from './me.js';
import { privacy } from './privacy.js';
import { subscribe } from './subscribe.js';
import { whois } from './whois.js';
import { feedback } from './feedback.js';
import { setup } from './setup.js';
import { verify } from './verify.js';
import { profile } from './profile.js';
import { status } from './status.js';
import type { Command } from './types.js';

// /bz is a short alias of /bazaar
const bz: Command = { ...bazaar, data: { name: 'bz', toJSON: () => ({ ...bazaar.data.toJSON(), name: 'bz' }) } };

// Add new commands here, then run `npm run deploy-commands`.
export const commands: Command[] = [ping, bazaar, status, profile, privacy, me, link, subscribe, whois, alerts, bz, bzHistory, flip, craft, mmm, mayor, events, session, coop, leaderboard, compare, achievementsCmd, wrapped, compete, guessPrice, predict, richOrNot, setup, verify, feedback];

// Right-click menu commands (registered alongside slash commands)
export const contextMenus = [profileContextMenu];
export const contextMenuMap = new Map(contextMenus.map((c) => [c.data.name, c]));

export const commandMap = new Map(commands.map((c) => [c.data.name, c]));
