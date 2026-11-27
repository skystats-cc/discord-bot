import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { accountsEnabled, SkystatsApiError, userApi } from '../api.js';

/** Shared guard for commands that act as the caller's SkyStats account. Replies and returns null on failure. */
export async function withAccount<T>(
  interaction: ChatInputCommandInteraction,
  fn: (api: ReturnType<typeof userApi>) => Promise<T>,
): Promise<T | null> {
  if (!accountsEnabled()) {
    await interaction.editReply('Account commands aren’t switched on for this bot yet.');
    return null;
  }
  try {
    return await fn(userApi(interaction.user.id));
  } catch (err) {
    if (err instanceof SkystatsApiError && err.code === 'not_linked') {
      await interaction.editReply('Your Discord isn’t linked to SkyStats yet. Run `/link` to connect your Minecraft account.');
      return null;
    }
    if (err instanceof SkystatsApiError && err.code === 'upgrade_required') {
      await interaction.editReply(err.message);
      return null;
    }
    throw err;
  }
}

export const ephemeral = { flags: MessageFlags.Ephemeral } as const;
