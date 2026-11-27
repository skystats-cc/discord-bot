import {
  ActionRowBuilder,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type UserContextMenuCommandInteraction,
} from 'discord.js';
import { accountsEnabled, api, SkystatsApiError, userApi } from '../api.js';
import { coins, parseCoins } from '../format.js';
import { viewOnSite } from '../links.js';
import { ephemeral, withAccount } from './account.js';
import type { Command } from './types.js';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const service = () => userApi('00000000000000000');
const notOn = 'This isn’t switched on for this bot yet.';

/** /leaderboard: global or this server (members who opted in) */
export const leaderboard: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top coin gainers (players who opted in)')
    .addStringOption((o) => o.setName('stat').setDescription('What to rank').addChoices({ name: 'Coins gained', value: 'gain' }, { name: 'Consistency', value: 'consistency' }))
    .addStringOption((o) => o.setName('period').setDescription('Period').addChoices({ name: '7 days', value: '7d' }, { name: '30 days', value: '30d' }))
    .addStringOption((o) => o.setName('scope').setDescription('Who').addChoices({ name: 'Everyone', value: 'global' }, { name: 'This server', value: 'server' })) as SlashCommandBuilder,
  async execute(interaction) {
    await interaction.deferReply();
    const board = (interaction.options.getString('stat') ?? 'gain') as 'gain' | 'consistency';
    const period = (interaction.options.getString('period') ?? '7d') as '7d' | '30d';
    const scope = interaction.options.getString('scope') ?? 'global';
    let entries: { rank: number; label: string; value: number }[];
    if (scope === 'server') {
      if (!interaction.guild || !accountsEnabled()) {
        await interaction.editReply('Server leaderboards only work inside a server with account commands on.');
        return;
      }
      const members = await interaction.guild.members.fetch().catch(() => null);
      if (!members) {
        await interaction.editReply('I need the Server Members intent to rank this server.');
        return;
      }
      entries = (await service().bot.serverLeaderboard([...members.keys()], board, period)).entries;
    } else {
      entries = (await api.social.leaderboard({ board, period })).entries.slice(0, 15);
    }
    const show = (v: number) => (board === 'consistency' ? `${pct(v)} of days up` : `+${coins(v)}`);
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle(`${scope === 'server' ? interaction.guild!.name : 'SkyStats'} · ${board === 'gain' ? 'coins gained' : 'consistency'} · ${period}`)
      .setDescription(entries.length ? entries.map((e) => `**${e.rank}.** ${e.label} · ${show(e.value)}`).join('\n') : 'Nobody here yet. Players appear after turning on leaderboards in /privacy.')
      .setFooter({ text: 'Only players who chose to appear are listed.' });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/leaderboards', 'leaderboard')] });
  },
};

/** /compare: two public profiles side by side */
export const compare: Command = {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare two public profiles')
    .addStringOption((o) => o.setName('a').setDescription('First player').setRequired(true))
    .addStringOption((o) => o.setName('b').setDescription('Second player').setRequired(true)) as SlashCommandBuilder,
  async execute(interaction) {
    await interaction.deferReply();
    const names = [interaction.options.getString('a', true), interaction.options.getString('b', true)];
    const players = await Promise.all(names.map((n) => api.players.get(n.trim()).catch(() => null)));
    if (players.some((p) => !p)) {
      await interaction.editReply(`Both players need public SkyStats profiles. Missing: ${names.filter((_, i) => !players[i]).join(', ')}`);
      return;
    }
    const field = (p: NonNullable<(typeof players)[number]>) => {
      const s = p.profiles[0];
      const week = s?.week.map((w) => w.total).filter((v): v is number => v !== null) ?? [];
      const change = week.length > 1 ? week[week.length - 1]! - week[0]! : null;
      return { name: p.username, value: [`Level **${s?.skyblockLevel ?? '?'}**`, `Coins **${coins(s?.total)}**`, `7 days **${change === null ? '—' : `${change >= 0 ? '+' : ''}${coins(change)}`}**`].join('\n'), inline: true };
    };
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xf5b942).setTitle('Head to head').addFields(field(players[0]!), field(players[1]!))] });
  },
};

/** /achievements and /wrapped (only you see them) */
export const achievementsCmd: Command = {
  data: new SlashCommandBuilder().setName('achievements').setDescription('Your SkyStats achievements (only you can see them)'),
  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const r = await withAccount(interaction, (u) => u.social.achievements());
    if (!r) return;
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle('Achievements')
      .setDescription(r.achievements.map((a) => `${a.earnedAt ? '🏅' : '▫️'} **${a.name}**: ${a.description}`).join('\n'));
    await interaction.editReply({ embeds: [embed] });
  },
};

export const wrapped: Command = {
  data: new SlashCommandBuilder()
    .setName('wrapped')
    .setDescription('Your SkyBlock year or month (only you can see it)')
    .addStringOption((o) => o.setName('period').setDescription('YYYY or YYYY-MM, e.g. 2026-11')) as SlashCommandBuilder,
  async execute(interaction) {
    await interaction.deferReply(ephemeral);
    const period = interaction.options.getString('period') ?? String(new Date().getUTCFullYear());
    const w = await withAccount(interaction, (u) => u.social.wrapped(period));
    if (!w) return;
    const embed = new EmbedBuilder()
      .setColor(0xba68c8)
      .setTitle(`Your SkyBlock ${period.length === 4 ? period : period}`)
      .addFields(
        { name: 'Coins gained', value: `${w.coinsGained >= 0 ? '+' : ''}${coins(w.coinsGained)}`, inline: true },
        { name: 'Played', value: `${w.hoursPlayed}h, ${w.sessions} ${w.sessions === 1 ? 'session' : 'sessions'}`, inline: true },
        { name: 'Longest streak', value: `${w.longestStreak} days`, inline: true },
      );
    if (w.bestDay) embed.addFields({ name: 'Best day', value: `${w.bestDay.day}: +${coins(w.bestDay.change)}`, inline: true });
    if (w.topActivity) embed.addFields({ name: 'Mostly', value: w.topActivity, inline: true });
    if (w.achievements.length) embed.addFields({ name: 'Unlocked', value: w.achievements.join(', ') });
    if (w.clippedByPlan) embed.setFooter({ text: 'Your plan keeps only part of this period.' });
    await interaction.editReply({ embeds: [embed], components: [viewOnSite('/wrapped', 'wrapped', 'See it on SkyStats')] });
  },
};

/** /compete: grinding competitions in this server. No entry fees and no prizes with money value. */
export const compete: Command = {
  data: new SlashCommandBuilder()
    .setName('compete')
    .setDescription('Grinding competitions in this server')
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start one (needs Manage Server)')
        .addStringOption((o) => o.setName('name').setDescription('Name').setRequired(true).setMaxLength(60))
        .addIntegerOption((o) => o.setName('hours').setDescription('How long').setRequired(true).setMinValue(1).setMaxValue(336)),
    )
    .addSubcommand((s) => s.setName('join').setDescription('Join the current competition (shows your name and gain here)'))
    .addSubcommand((s) => s.setName('standings').setDescription('Current standings')) as unknown as SlashCommandBuilder,
  async execute(interaction) {
    if (!interaction.guildId || !accountsEnabled()) {
      await interaction.reply({ content: notOn, flags: MessageFlags.Ephemeral });
      return;
    }
    const sub = interaction.options.getSubcommand();
    const svc = userApi(interaction.user.id);
    if (sub === 'start') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'Only people who can manage this server can start a competition.', flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.deferReply();
      const c = await svc.bot.createCompetition(interaction.guildId, interaction.options.getString('name', true), interaction.options.getInteger('hours', true));
      await interaction.editReply(`🏁 **${c.name}** has started and ends <t:${Math.floor(new Date(c.endsAt).getTime() / 1000)}:R>. Run \`/compete join\` to take part. Coins are counted by the SkyStats mod. Just for fun: no entry fees, no prizes.`);
      return;
    }
    const { competitions } = await svc.bot.competitions(interaction.guildId);
    const current = competitions[0];
    if (!current) {
      await interaction.reply({ content: 'No competition here right now.', flags: MessageFlags.Ephemeral });
      return;
    }
    if (sub === 'join') {
      await interaction.deferReply(ephemeral);
      const ok = await withAccount(interaction, (u) => u.bot.joinCompetition(current.id).then(() => true));
      if (ok) await interaction.editReply(`You're in **${current.name}**. Your name and coin gain will show in this server's standings.`);
      return;
    }
    await interaction.deferReply();
    const { standings } = await svc.bot.standings(current.id);
    const ended = new Date(current.endsAt) < new Date();
    const embed = new EmbedBuilder()
      .setColor(0xf5b942)
      .setTitle(`${current.name}${ended ? ' (finished)' : ''}`)
      .setDescription(standings.length ? standings.slice(0, 20).map((s, i) => `**${i + 1}.** ${s.username ?? '?'} · ${s.gain >= 0 ? '+' : ''}${coins(s.gain)}`).join('\n') : 'Nobody has joined yet.')
      .setFooter({ text: ended ? 'Final standings' : `Ends ${new Date(current.endsAt).toUTCString()}` });
    await interaction.editReply({ embeds: [embed] });
  },
};

/** Daily games: just for fun, no stakes, no prizes */
export const guessPrice: Command = {
  data: new SlashCommandBuilder()
    .setName('guess-price')
    .setDescription("Guess today's mystery bazaar price (just for fun)")
    .addStringOption((o) => o.setName('guess').setDescription('Your guess, e.g. 1.2k (leave empty to see the item)')) as SlashCommandBuilder,
  async execute(interaction) {
    if (!accountsEnabled()) {
      await interaction.reply({ content: notOn, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply(ephemeral);
    const svc = userApi(interaction.user.id);
    const raw = interaction.options.getString('guess');
    const round = await svc.bot.gameToday('guess');
    const name = (await api.bazaar.get(round.productId).catch(() => null))?.name ?? round.productId;
    if (!raw) {
      await interaction.editReply(`Today's item is **${name}**. What does it cost to instabuy? Answer with \`/guess-price guess:<price>\` without looking it up!`);
      return;
    }
    const guess = parseCoins(raw);
    if (!guess) {
      await interaction.editReply('That isn’t a price. Try something like `1.2k`.');
      return;
    }
    try {
      const r = await svc.bot.guess(guess);
      await interaction.editReply(`**${name}** is **${coins(r.actual)}**. You guessed ${coins(guess)}: **${r.points} points**. Come back tomorrow!`);
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 409) await interaction.editReply('You’ve already guessed today. Come back tomorrow!');
      else throw err;
    }
  },
};

export const predict: Command = {
  data: new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Will today’s item go up or down by tomorrow? (just for fun)')
    .addStringOption((o) => o.setName('direction').setDescription('Up or down').addChoices({ name: 'Up', value: '1' }, { name: 'Down', value: '-1' })) as SlashCommandBuilder,
  async execute(interaction) {
    if (!accountsEnabled()) {
      await interaction.reply({ content: notOn, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply(ephemeral);
    const svc = userApi(interaction.user.id);
    const dir = interaction.options.getString('direction');
    const round = await svc.bot.gameToday('predict');
    const name = (await api.bazaar.get(round.productId).catch(() => null))?.name ?? round.productId;
    if (!dir) {
      const board = await svc.bot.gameBoard('predict');
      await interaction.editReply(`Today: **${name}** at ${coins(round.startPrice)}. Up or down by tomorrow? \`/predict direction:Up\`\nTop predictors this month: ${board.entries.slice(0, 5).map((e, i) => `${i + 1}. <@${e.discordId}> ${e.points}`).join(' · ') || 'none yet'}`);
      return;
    }
    try {
      const r = await svc.bot.predict(Number(dir) as 1 | -1);
      await interaction.editReply(`Locked in: **${name}** ${dir === '1' ? 'up' : 'down'} from ${coins(r.startPrice)}. Scored <t:${Math.floor(new Date(r.resolvesAt).getTime() / 1000)}:R>.`);
    } catch (err) {
      if (err instanceof SkystatsApiError && err.status === 409) await interaction.editReply('You’ve already predicted today.');
      else throw err;
    }
  },
};

export const richOrNot: Command = {
  data: new SlashCommandBuilder().setName('rich-or-not').setDescription('Who has more coins? (players with public coin profiles)'),
  async execute(interaction) {
    if (!accountsEnabled()) {
      await interaction.reply({ content: notOn, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply();
    const { a, b } = await service().bot.richOrNot().catch(() => ({ a: null, b: null }));
    if (!a || !b) {
      await interaction.editReply('Not enough public profiles to play yet.');
      return;
    }
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('rich:a').setLabel(a.username).setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('rich:b').setLabel(b.username).setStyle(ButtonStyle.Primary),
    );
    const msg = await interaction.editReply({ content: `Who has more coins: **${a.username}** or **${b.username}**?`, components: [row] });
    const click = await msg.awaitMessageComponent({ time: 60_000 }).catch(() => null);
    const winner = (a.total ?? 0) >= (b.total ?? 0) ? a : b;
    const text = `**${a.username}**: ${coins(a.total)} · **${b.username}**: ${coins(b.total)}. ${winner.username} has more.`;
    if (!click) {
      await interaction.editReply({ content: `Time's up! ${text}`, components: [] });
      return;
    }
    const picked = click.customId === 'rich:a' ? a : b;
    await click.update({ content: `${picked === winner ? '✅ Right!' : '❌ Not this time.'} ${text}`, components: [] });
  },
};

/** Right-click a user → "SkyStats profile" */
export const profileContextMenu = {
  data: new ContextMenuCommandBuilder().setName('SkyStats profile').setType(ApplicationCommandType.User),
  async execute(interaction: UserContextMenuCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!accountsEnabled()) {
      await interaction.editReply(notOn);
      return;
    }
    const res = await service().bot.whois(interaction.targetId).catch(() => null);
    const first = res?.accounts.find((x) => x.profilePublic) ?? res?.accounts[0];
    if (!first) {
      await interaction.editReply(`${interaction.targetUser.displayName} hasn’t shared a Minecraft account on SkyStats.`);
      return;
    }
    await interaction.editReply({ content: `${interaction.targetUser.displayName} is **${first.username}** on SkyStats.`, components: first.profilePublic ? [viewOnSite(`/p/${first.username}`, 'context-menu')] : [] });
  },
};
