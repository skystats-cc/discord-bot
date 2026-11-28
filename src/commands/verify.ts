import { InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { accountsEnabled, SkystatsApiError, userApi } from '../api.js';
import { SYSTEM } from '../channels.js';
import { viewOnSite } from '../links.js';
import { ephemeral } from './account.js';
import type { Command } from './types.js';

/**
 * Gives you this server's "verified" role if your Discord is linked to SkyStats. You run it
 * yourself, so it's your choice to show the server you've linked; nothing about your account is shared.
 */
export const verify: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription("Get this server's verified role (your Discord must be linked to SkyStats)")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    if (!interaction.inGuild() || !interaction.guild) return void (await interaction.editReply('Use this in a server.'));
    if (!accountsEnabled()) return void (await interaction.editReply('Verification is not available on this bot.'));
    const { verifiedRoleId } = await SYSTEM.bot.guildSettings(interaction.guild.id);
    if (!verifiedRoleId) return void (await interaction.editReply("This server hasn't set up a verified role. An admin can add one with /setup verified-role."));

    try {
      await userApi(interaction.user.id).me.get();
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 401) {
        return void (await interaction.editReply({ content: 'Link your Minecraft account first with /link, then run /verify again.', components: [viewOnSite('/link', 'verify', 'Link on the website')] }));
      }
      throw err;
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return void (await interaction.editReply("I don't have Manage Roles here. Ask an admin to fix that."));
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(verifiedRoleId)) return void (await interaction.editReply("You're already verified."));
    try {
      await member.roles.add(verifiedRoleId, 'Linked to SkyStats (/verify)');
    } catch {
      return void (await interaction.editReply("I couldn't give you the role. An admin needs to move my role above it."));
    }
    await interaction.editReply('✅ Verified. You can remove the role any time, and unlinking SkyStats is on the website.');
  },
};
