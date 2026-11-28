import type { GuildSettings } from '@skystats/api-client';
import { ChannelType, EmbedBuilder, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { accountsEnabled } from '../api.js';
import { SYSTEM } from '../channels.js';
import { ephemeral } from './account.js';
import type { Command } from './types.js';

const KINDS = {
  status: { label: 'Hypixel outage alerts', key: 'statusChannelId' },
  news: { label: 'SkyBlock patch notes', key: 'newsChannelId' },
  board: { label: 'Weekly server leaderboard', key: 'boardChannelId' },
  bazaar: { label: 'Live bazaar movers', key: 'bazaarChannelId' },
} as const;
type Kind = keyof typeof KINDS;

const show = (s: GuildSettings) =>
  new EmbedBuilder()
    .setColor(0xf5b942)
    .setTitle('SkyStats settings for this server')
    .addFields(
      ...Object.values(KINDS).map((k) => ({ name: k.label, value: s[k.key] ? `<#${s[k.key]}>` : 'Off', inline: true })),
      { name: 'Verified role (/verify)', value: s.verifiedRoleId ? `<@&${s.verifiedRoleId}>` : 'Off', inline: true },
    )
    .setFooter({ text: 'Only people with Manage Server can change these.' });

/** Per-server settings, for server admins only (Discord hides it from others by default). */
export const setup: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Choose where SkyStats posts in this server (admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((s) => s.setName('show').setDescription('Show the current settings'))
    .addSubcommand((s) =>
      s
        .setName('channel')
        .setDescription('Pick a channel for a kind of post, or leave it empty to turn it off')
        .addStringOption((o) =>
          o.setName('post').setDescription('What to post').setRequired(true).addChoices(...Object.entries(KINDS).map(([value, k]) => ({ name: k.label, value }))),
        )
        .addChannelOption((o) => o.setName('channel').setDescription('Channel (empty = off)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)),
    )
    .addSubcommand((s) =>
      s
        .setName('verified-role')
        .setDescription('Role /verify gives to members who linked SkyStats (empty = off)')
        .addRoleOption((o) => o.setName('role').setDescription('Role (empty = off)')),
    )
    .addSubcommand((s) => s.setName('reset').setDescription('Turn everything off for this server')),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    if (!interaction.inGuild() || !interaction.guildId) return void (await interaction.editReply('Use this in a server.'));
    // Discord's default permission can be overridden by server admins, so check again here
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return void (await interaction.editReply('You need the Manage Server permission to change this.'));
    }
    if (!accountsEnabled()) return void (await interaction.editReply('Server settings are not available on this bot.'));
    const api = SYSTEM.bot;
    const guildId = interaction.guildId;
    const sub = interaction.options.getSubcommand();

    let s: GuildSettings;
    if (sub === 'channel') {
      const kind = interaction.options.getString('post', true) as Kind;
      const ch = interaction.options.getChannel('channel');
      if (ch) {
        const me = interaction.guild?.members.me;
        const real = interaction.guild?.channels.cache.get(ch.id);
        if (me && real && !real.permissionsFor(me)?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ViewChannel])) {
          return void (await interaction.editReply(`I can't post in <#${ch.id}>. Give me View Channel, Send Messages and Embed Links there first.`));
        }
      }
      s = await api.updateGuildSettings(guildId, { [KINDS[kind].key]: ch?.id ?? null });
    } else if (sub === 'verified-role') {
      const role = interaction.options.getRole('role');
      if (role) {
        const me = interaction.guild?.members.me;
        if (role.managed || role.id === guildId) return void (await interaction.editReply('Pick a normal role, not @everyone or a bot role.'));
        if (me && (!me.permissions.has(PermissionFlagsBits.ManageRoles) || me.roles.highest.comparePositionTo(role.id) <= 0)) {
          return void (await interaction.editReply('I need Manage Roles, and my role must be above that role in Server Settings → Roles.'));
        }
        if (role.permissions && typeof role.permissions !== 'string' && role.permissions.has(PermissionFlagsBits.Administrator)) {
          return void (await interaction.editReply('That role has Administrator. Pick a role without moderation powers.'));
        }
      }
      s = await api.updateGuildSettings(guildId, { verifiedRoleId: role?.id ?? null });
    } else if (sub === 'reset') {
      s = await api.updateGuildSettings(guildId, { statusChannelId: null, newsChannelId: null, boardChannelId: null, bazaarChannelId: null, verifiedRoleId: null });
    } else {
      s = await api.guildSettings(guildId);
    }
    await interaction.editReply({ content: sub === 'show' ? '' : 'Saved.', embeds: [show(s)] });
  },
};
