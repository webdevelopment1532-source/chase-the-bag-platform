import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message,
  User,
} from 'discord.js';
import {
  acceptExchangeOffer,
  cancelExchangeOffer,
  createExchangeOffer,
  getCoinWallet,
  grantCoins,
  listUserOffers,
  listUserTransactions,
  parseCoinAmount,
  transferCoins,
} from './coin-exchange';

const DEFAULT_CHANNEL_ID = '1486424943594836080';
const EXCHANGE_COMMAND_COOLDOWN_MS = process.env.EXCHANGE_COMMAND_COOLDOWN_MS ? Number(process.env.EXCHANGE_COMMAND_COOLDOWN_MS) : 1200;

if (!Number.isFinite(EXCHANGE_COMMAND_COOLDOWN_MS) || EXCHANGE_COMMAND_COOLDOWN_MS < 0) {
  throw new Error('EXCHANGE_COMMAND_COOLDOWN_MS must be a number greater than or equal to 0.');
}

function getAdminIds(ownerId: string) {
  return new Set(
    [ownerId, ...(process.env.COIN_EXCHANGE_ADMIN_IDS ?? '').split(',')]
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function getCommandArgs(message: Message) {
  return message.content.trim().split(/\s+/);
}

function formatWalletMessage(user: User, wallet: Awaited<ReturnType<typeof getCoinWallet>>) {
  return [
    `💰 ${user.username}'s wallet`,
    `Available: **${wallet.availableBalance.toFixed(2)}**`,
    `Locked: **${wallet.lockedBalance.toFixed(2)}**`,
    `Total: **${wallet.totalBalance.toFixed(2)}**`,
  ].join('\n');
}

function formatOffersMessage(userId: string, offers: Awaited<ReturnType<typeof listUserOffers>>) {
  if (!offers.length) {
    return 'No exchange offers yet.';
  }

  return [
    '📨 Your latest exchange offers',
    ...offers.map((offer) => {
      const role = offer.senderUserId === userId ? 'outgoing' : 'incoming';
      const counterparty = role === 'outgoing' ? offer.recipientUserId : offer.senderUserId;
      const note = offer.note ? ` | ${offer.note}` : '';
      return `#${offer.id} ${role} ${offer.amount.toFixed(2)} with <@${counterparty}> | ${offer.status}${note}`;
    }),
  ].join('\n');
}

function formatHistoryMessage(transactions: Awaited<ReturnType<typeof listUserTransactions>>) {
  if (!transactions.length) {
    return 'No coin exchange history yet.';
  }

  return [
    '🧾 Recent coin exchange activity',
    ...transactions.map((entry) => {
      const sign = entry.direction === 'credit' ? '+' : '-';
      const counterparty = entry.counterpartyUserId ? ` with <@${entry.counterpartyUserId}>` : '';
      const detail = entry.details ? ` | ${entry.details}` : '';
      return `#${entry.id} ${entry.kind}${counterparty} | ${sign}${entry.amount.toFixed(2)} | balance ${entry.balanceAfter.toFixed(2)}${detail}`;
    }),
  ].join('\n');
}

function buildMainPanelEmbed(user: User) {
  return new EmbedBuilder()
    .setTitle('Chase The Bag Coin Exchange')
    .setDescription(
      [
        'Welcome to your exchange dashboard.',
        '',
        'Use the controls below to check your wallet, offers, and history.',
        'Quick actions still work with text commands.',
      ].join('\n')
    )
    .addFields(
      {
        name: 'Quick Actions',
        value: [
          '`!exchange send @user amount`',
          '`!exchange offer @user amount optional note`',
          '`!exchange accept offerId`',
          '`!exchange cancel offerId`',
        ].join('\n'),
      },
      {
        name: 'Panel Scope',
        value: `Bound to <@${user.id}> for secure interaction.`,
      }
    )
    .setColor(0x1f8b4c)
    .setFooter({ text: 'Chase The Bag Exchange UI' })
    .setTimestamp();
}

function buildWalletEmbed(user: User, wallet: Awaited<ReturnType<typeof getCoinWallet>>) {
  return new EmbedBuilder()
    .setTitle('Wallet Overview')
    .setDescription(`Account: <@${user.id}>`)
    .addFields(
      { name: 'Available', value: wallet.availableBalance.toFixed(2), inline: true },
      { name: 'Locked', value: wallet.lockedBalance.toFixed(2), inline: true },
      { name: 'Total', value: wallet.totalBalance.toFixed(2), inline: true }
    )
    .setColor(0x2ecc71)
    .setFooter({ text: 'Exchange Wallet' })
    .setTimestamp();
}

function buildOffersEmbed(
  userId: string,
  offers: Awaited<ReturnType<typeof listUserOffers>>,
  page: number,
  pageSize: number,
  totalPages: number,
) {
  const start = (page - 1) * pageSize;
  const pageItems = offers.slice(start, start + pageSize);
  const rows = pageItems.length
    ? pageItems.map((offer) => {
        const role = offer.senderUserId === userId ? 'OUT' : 'IN';
        const counterparty = offer.senderUserId === userId ? offer.recipientUserId : offer.senderUserId;
        const note = offer.note ? ` | ${offer.note}` : '';
        return `#${offer.id} ${role} ${offer.amount.toFixed(2)} with <@${counterparty}> | ${offer.status}${note}`;
      })
    : ['No exchange offers yet.'];

  return new EmbedBuilder()
    .setTitle('My Exchange Offers')
    .setDescription(rows.join('\n'))
    .setColor(0x3498db)
    .setFooter({ text: `Offers page ${page}/${totalPages}` })
    .setTimestamp();
}

function buildHistoryEmbed(
  transactions: Awaited<ReturnType<typeof listUserTransactions>>,
  page: number,
  pageSize: number,
  totalPages: number,
) {
  const start = (page - 1) * pageSize;
  const pageItems = transactions.slice(start, start + pageSize);
  const rows = pageItems.length
    ? pageItems.map((entry) => {
        const sign = entry.direction === 'credit' ? '+' : '-';
        const counterparty = entry.counterpartyUserId ? ` with <@${entry.counterpartyUserId}>` : '';
        return `#${entry.id} ${entry.kind}${counterparty} | ${sign}${entry.amount.toFixed(2)} | bal ${entry.balanceAfter.toFixed(2)}`;
      })
    : ['No coin exchange history yet.'];

  return new EmbedBuilder()
    .setTitle('Recent Exchange History')
    .setDescription(rows.join('\n'))
    .setColor(0x9b59b6)
    .setFooter({ text: `History page ${page}/${totalPages}` })
    .setTimestamp();
}

function buildMainButtons(userId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`exchange_wallet:${userId}`).setLabel('Wallet').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`exchange_offers:${userId}:1`).setLabel('Offers').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`exchange_history:${userId}:1`).setLabel('History').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`exchange_help:${userId}`).setLabel('Commands').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`exchange_refresh:${userId}`).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function buildBackButtons(userId: string) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`exchange_back:${userId}`).setLabel('Back').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`exchange_refresh:${userId}`).setLabel('Refresh').setStyle(ButtonStyle.Secondary)
    ),
  ];
}

function buildPagedButtons(userId: string, action: 'exchange_offers' | 'exchange_history', page: number, totalPages: number) {
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`${action}:${userId}:${prevPage}`)
        .setLabel('Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`exchange_back:${userId}`)
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${action}:${userId}:${nextPage}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages)
    ),
  ];
}

async function handlePanelButton(interaction: ButtonInteraction) {
  const [action, ownerId, pageRaw] = interaction.customId.split(':');
  const page = Number.isFinite(Number(pageRaw)) ? Math.max(1, Number(pageRaw)) : 1;
  if (interaction.user.id !== ownerId) {
    await interaction.reply({ content: 'This panel belongs to another user.', ephemeral: true });
    return;
  }

  if (action === 'exchange_wallet') {
    const wallet = await getCoinWallet(interaction.user.id);
    await interaction.update({ embeds: [buildWalletEmbed(interaction.user, wallet)], components: buildBackButtons(interaction.user.id) });
    return;
  }

  if (action === 'exchange_offers') {
    const offers = await listUserOffers(interaction.user.id);
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
    const safePage = Math.min(page, totalPages);
    await interaction.update({
      embeds: [buildOffersEmbed(interaction.user.id, offers, safePage, pageSize, totalPages)],
      components: buildPagedButtons(interaction.user.id, 'exchange_offers', safePage, totalPages),
    });
    return;
  }

  if (action === 'exchange_history') {
    const transactions = await listUserTransactions(interaction.user.id, 24);
    const pageSize = 6;
    const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
    const safePage = Math.min(page, totalPages);
    await interaction.update({
      embeds: [buildHistoryEmbed(transactions, safePage, pageSize, totalPages)],
      components: buildPagedButtons(interaction.user.id, 'exchange_history', safePage, totalPages),
    });
    return;
  }

  if (action === 'exchange_help') {
    await interaction.reply({
      content: [
        '**Coin Exchange Commands**',
        '`!exchange` (open dashboard)',
        '`!exchange wallet`',
        '`!exchange send @user amount`',
        '`!exchange offer @user amount optional note`',
        '`!exchange offers`',
        '`!exchange accept offerId`',
        '`!exchange cancel offerId`',
        '`!exchange history`',
        '`!exchange grant @user amount` (admin only)',
      ].join('\n'),
      ephemeral: true,
    });
    return;
  }

  if (action === 'exchange_back' || action === 'exchange_refresh') {
    await interaction.update({ embeds: [buildMainPanelEmbed(interaction.user)], components: buildMainButtons(interaction.user.id) });
    return;
  }

  await interaction.reply({ content: 'Unsupported dashboard action.', ephemeral: true });
}

async function sendExchangePanel(message: Message) {
  const panel = await message.reply({
    embeds: [buildMainPanelEmbed(message.author)],
    components: buildMainButtons(message.author.id),
  });

  const collector = panel.createMessageComponentCollector({ time: 10 * 60 * 1000 });

  collector.on('collect', async (interaction) => {
    try {
      await handlePanelButton(interaction as ButtonInteraction);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Panel action failed.';
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `Coin exchange error: ${messageText}`, ephemeral: true });
      }
    }
  });

  collector.on('end', async () => {
    try {
      await panel.edit({ components: [] });
    } catch {
      // Ignore if panel message is deleted or no longer editable.
    }
  });
}

export function registerCoinExchangeCommands(client: Client, ownerId: string) {
  const adminIds = getAdminIds(ownerId);
  const channelIds = (process.env.COIN_EXCHANGE_CHANNEL_IDS ?? process.env.COIN_EXCHANGE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedGuildIds = (process.env.DISCORD_GUILD_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const commandTimestamps = new Map<string, number>();

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.content.toLowerCase().startsWith('!exchange')) return;
    if (!message.guild) return;
    if (allowedGuildIds.length && !allowedGuildIds.includes(message.guild.id)) return;

    const now = Date.now();
    const previous = commandTimestamps.get(message.author.id) ?? 0;
    if (now - previous < EXCHANGE_COMMAND_COOLDOWN_MS) {
      return;
    }
    commandTimestamps.set(message.author.id, now);

    if (!channelIds.includes(message.channel.id)) {
      const preferredChannel = channelIds[0];
      await message.reply(`Use coin exchange commands in <#${preferredChannel}>.`);
      return;
    }

    const args = getCommandArgs(message);
    const action = args[1]?.toLowerCase() ?? 'panel';

    try {
      if (action === 'help') {
        await message.reply(
          [
            '**Coin Exchange Commands**',
            '`!exchange` (open dashboard)',
            '`!exchange wallet`',
            '`!exchange send @user amount`',
            '`!exchange offer @user amount optional note`',
            '`!exchange offers`',
            '`!exchange accept offerId`',
            '`!exchange cancel offerId`',
            '`!exchange history`',
            '`!exchange grant @user amount` (admin only)',
          ].join('\n')
        );
        return;
      }

      if (action === 'panel' || action === 'ui' || action === 'app') {
        await sendExchangePanel(message);
        return;
      }

      if (action === 'wallet') {
        const wallet = await getCoinWallet(message.author.id);
        await message.reply(formatWalletMessage(message.author, wallet));
        return;
      }

      if (action === 'grant') {
        if (!adminIds.has(message.author.id)) {
          await message.reply('You do not have permission to grant exchange coins.');
          return;
        }

        const target = message.mentions.users.first();
        const amount = parseCoinAmount(args[3] ?? '');
        if (!target || amount === null) {
          await message.reply('Usage: !exchange grant @user amount');
          return;
        }

        const wallet = await grantCoins({
          actorUserId: message.author.id,
          targetUserId: target.id,
          amount,
          serverId: message.guild?.id ?? 'dm',
          details: `Granted by ${message.author.tag}`,
        });
        await message.reply(`Granted **${amount.toFixed(2)}** coins to <@${target.id}>. New available balance: **${wallet.availableBalance.toFixed(2)}**.`);
        return;
      }

      if (action === 'send') {
        const target = message.mentions.users.first();
        const amount = parseCoinAmount(args[3] ?? '');
        if (!target || amount === null) {
          await message.reply('Usage: !exchange send @user amount');
          return;
        }

        await transferCoins({
          fromUserId: message.author.id,
          toUserId: target.id,
          amount,
          serverId: message.guild?.id ?? 'dm',
        });
        await message.reply(`Transferred **${amount.toFixed(2)}** coins to <@${target.id}>.`);
        return;
      }

      if (action === 'offer') {
        const target = message.mentions.users.first();
        const amount = parseCoinAmount(args[3] ?? '');
        const note = args.slice(4).join(' ').trim();
        if (!target || amount === null) {
          await message.reply('Usage: !exchange offer @user amount optional note');
          return;
        }

        const offerId = await createExchangeOffer({
          senderUserId: message.author.id,
          recipientUserId: target.id,
          amount,
          note: note || undefined,
          serverId: message.guild?.id ?? 'dm',
        });
        await message.reply(`Created offer **#${offerId}** for <@${target.id}> worth **${amount.toFixed(2)}** coins.`);
        return;
      }

      if (action === 'offers') {
        const offers = await listUserOffers(message.author.id);
        await message.reply(formatOffersMessage(message.author.id, offers));
        return;
      }

      if (action === 'accept') {
        const offerId = Number(args[2]);
        if (!Number.isInteger(offerId) || offerId < 1) {
          await message.reply('Usage: !exchange accept offerId');
          return;
        }

        await acceptExchangeOffer({
          recipientUserId: message.author.id,
          offerId,
          serverId: message.guild?.id ?? 'dm',
        });
        await message.reply(`Accepted exchange offer **#${offerId}**.`);
        return;
      }

      if (action === 'cancel') {
        const offerId = Number(args[2]);
        if (!Number.isInteger(offerId) || offerId < 1) {
          await message.reply('Usage: !exchange cancel offerId');
          return;
        }

        await cancelExchangeOffer({
          requesterUserId: message.author.id,
          offerId,
          serverId: message.guild?.id ?? 'dm',
        });
        await message.reply(`Cancelled exchange offer **#${offerId}**.`);
        return;
      }

      if (action === 'history') {
        const transactions = await listUserTransactions(message.author.id, 8);
        await message.reply(formatHistoryMessage(transactions));
        return;
      }

      await message.reply('Unknown coin exchange command. Use `!exchange help`.');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Coin exchange command failed.';
      await message.reply(`Coin exchange error: ${messageText}`);
    }
  });
}