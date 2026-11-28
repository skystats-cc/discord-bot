import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from 'discord.js';
import { config } from '../config.js';
import { ephemeral } from './account.js';
import type { Command } from './types.js';

const MODAL_ID = 'skystats-feedback';
const recent = new Map<string, number[]>();
const LIMIT = 3; // per user per hour

/** Opens a form; what you write goes to the SkyStats team's private channel (not posted publicly). */
export const feedback: Command = {
  data: new SlashCommandBuilder().setName('feedback').setDescription('Send an idea or a bug report to the SkyStats team'),

  async execute(interaction) {
    if (!config.FEEDBACK_CHANNEL_ID) return void (await interaction.reply({ ...ephemeral, content: 'Feedback is off on this bot. Use the contact link on skystats.cc.' }));
    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Feedback for SkyStats')
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder().setCustomId('kind').setLabel('Idea, bug or other?').setStyle(TextInputStyle.Short).setMaxLength(20).setRequired(false),
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('text')
            .setLabel('Your message (the team sees your Discord name)')
            .setStyle(TextInputStyle.Paragraph)
            .setMinLength(10)
            .setMaxLength(1000)
            .setPlaceholder("Please don't include passwords or payment details."),
        ),
      );
    await interaction.showModal(modal);
  },
};

export async function handleFeedbackModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== MODAL_ID) return false;
  const now = Date.now();
  const times = (recent.get(interaction.user.id) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= LIMIT) {
    await interaction.reply({ ...ephemeral, content: 'Thanks! You have sent a few already; try again in an hour.' });
    return true;
  }
  recent.set(interaction.user.id, [...times, now]);
  const kind = interaction.fields.getTextInputValue('kind').trim().slice(0, 20) || 'feedback';
  const text = interaction.fields.getTextInputValue('text').trim();
  const ch = await interaction.client.channels.fetch(config.FEEDBACK_CHANNEL_ID).catch(() => null);
  if (!ch?.isSendable()) {
    await interaction.reply({ ...ephemeral, content: "Sorry, feedback couldn't be delivered right now." });
    return true;
  }
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`New ${kind}`)
    .setDescription(text)
    .setFooter({ text: `From ${interaction.user.username} (${interaction.user.id})${interaction.guild ? ` in ${interaction.guild.name}` : ''}` })
    .setTimestamp();
  // No pings: the text is shown as-is, never parsed for mentions
  await ch.send({ embeds: [embed], allowedMentions: { parse: [] } });
  await interaction.reply({ ...ephemeral, content: 'Thanks, the team will read it.' });
  return true;
}
