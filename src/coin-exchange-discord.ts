import { Client, Message, User } from 'discord.js';
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

export function registerCoinExchangeCommands(client: Client, ownerId: string) {
  const adminIds = getAdminIds(ownerId);
  const channelId = process.env.COIN_EXCHANGE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
  const commandTimestamps = new Map<string, number>();

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.content.toLowerCase().startsWith('!exchange')) return;
    if (!message.guild) return;

    const now = Date.now();
    const previous = commandTimestamps.get(message.author.id) ?? 0;
    if (now - previous < EXCHANGE_COMMAND_COOLDOWN_MS) {
      return;
    }
    commandTimestamps.set(message.author.id, now);

    if (message.channel.id !== channelId) {
      await message.reply(`Use coin exchange commands in <#${channelId}>.`);
      return;
    }

    const args = getCommandArgs(message);
    const action = args[1]?.toLowerCase() ?? 'help';

    try {
      if (action === 'help') {
        await message.reply(
          [
            '**Coin Exchange Commands**',
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