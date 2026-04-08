"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCoinExchangeCommands = registerCoinExchangeCommands;
const discord_js_1 = require("discord.js");
const coin_exchange_1 = require("./coin-exchange");
const DEFAULT_CHANNEL_ID = '1486424943594836080';
const EXCHANGE_COMMAND_COOLDOWN_MS = process.env.EXCHANGE_COMMAND_COOLDOWN_MS ? Number(process.env.EXCHANGE_COMMAND_COOLDOWN_MS) : 1200;
const EXCHANGE_WEB_URL = (process.env.EXCHANGE_WEB_URL ?? '').trim();
const EXCHANGE_HUB_REFRESH_MS = process.env.EXCHANGE_HUB_REFRESH_MS ? Number(process.env.EXCHANGE_HUB_REFRESH_MS) : 120000;
const EXCHANGE_HUB_MESSAGE_MARKER = 'CTB-EXCHANGE-HUB';
if (!Number.isFinite(EXCHANGE_COMMAND_COOLDOWN_MS) || EXCHANGE_COMMAND_COOLDOWN_MS < 0) {
    throw new Error('EXCHANGE_COMMAND_COOLDOWN_MS must be a number greater than or equal to 0.');
}
function resolveServerScope(serverId) {
    return serverId ?? 'global';
}
async function canUseExchange(serverId, userId, adminIds) {
    if (adminIds.has(userId))
        return true;
    return (0, coin_exchange_1.isExchangeUserAllowed)(serverId, userId);
}
function getAdminIds(ownerId) {
    return new Set([ownerId, ...(process.env.COIN_EXCHANGE_ADMIN_IDS ?? '').split(',')]
        .map((value) => value.trim())
        .filter(Boolean));
}
function getCommandArgs(message) {
    return message.content.trim().split(/\s+/);
}
function formatWalletMessage(user, wallet) {
    return [
        `💰 ${user.username}'s wallet`,
        `Available: **${wallet.availableBalance.toFixed(2)}**`,
        `Locked: **${wallet.lockedBalance.toFixed(2)}**`,
        `Total: **${wallet.totalBalance.toFixed(2)}**`,
    ].join('\n');
}
function formatOffersMessage(userId, offers) {
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
function formatHistoryMessage(transactions) {
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
function buildSectionDivider(title) {
    return `──── ${title} ────`;
}
function buildMetricGrid(items) {
    return items.map((item) => `• ${item.label}: **${item.value}**`).join('\n');
}
function buildOfferPreviewRows(limitOffers) {
    if (!limitOffers.length) {
        return '_No open market offers_';
    }
    return limitOffers
        .slice(0, 4)
        .map((offer, index) => {
        return [
            `**${index + 1}.** <@${offer.senderUserId}> -> <@${offer.recipientUserId}>`,
            `Amount: **${offer.amount.toFixed(2)} CTB**`,
            offer.note ? `Note: _${offer.note}_` : 'Note: _No note_',
        ].join('\n');
    })
        .join('\n\n');
}
function buildHubButtons() {
    const rows = [
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('exchange_hub_open').setLabel('Open Exchange').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId('exchange_hub_profile').setLabel('My Profile').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId('exchange_hub_market').setLabel('Market').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId('exchange_hub_status').setLabel('Status').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId('exchange_hub_refresh').setLabel('Refresh Boards').setStyle(discord_js_1.ButtonStyle.Secondary)),
    ];
    if (EXCHANGE_WEB_URL) {
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setStyle(discord_js_1.ButtonStyle.Link).setURL(EXCHANGE_WEB_URL).setLabel('Open Full-Screen Exchange')));
    }
    return rows;
}
async function buildHubEmbeds() {
    const serverId = resolveServerScope(process.env.DISCORD_GUILD_IDS?.split(',')[0]?.trim() || null);
    const [overview, openOffers, recentTransactions, leaders] = await Promise.all([
        (0, coin_exchange_1.getCoinExchangeOverview)(serverId),
        (0, coin_exchange_1.listCoinOffers)(8, 'open', serverId),
        (0, coin_exchange_1.listCoinTransactions)(8, '', serverId),
        (0, coin_exchange_1.listCoinWallets)(10, serverId),
    ]);
    const hero = new discord_js_1.EmbedBuilder()
        .setTitle('Chase The Bag Coin Exchange')
        .setDescription([
        buildSectionDivider('EXCHANGE HUB'),
        'This channel is the dedicated CTB exchange surface.',
        '',
        buildMetricGrid([
            { label: 'Total Supply', value: `${overview.totalSupply.toFixed(2)} CTB` },
            { label: 'Locked Supply', value: `${overview.lockedSupply.toFixed(2)} CTB` },
            { label: 'Open Offers', value: String(overview.openOffers) },
            { label: 'Wallets', value: String(overview.wallets) },
        ]),
    ].join('\n'))
        .setColor(0xf39c12)
        .setFooter({ text: `${EXCHANGE_HUB_MESSAGE_MARKER}:hero` })
        .setTimestamp();
    const market = new discord_js_1.EmbedBuilder()
        .setTitle('Live Market Board')
        .setDescription([
        buildSectionDivider('OPEN OFFERS'),
        buildOfferPreviewRows(openOffers),
    ].join('\n'))
        .setColor(0x3498db)
        .setFooter({ text: `${EXCHANGE_HUB_MESSAGE_MARKER}:market` })
        .setTimestamp();
    const traderPortal = new discord_js_1.EmbedBuilder()
        .setTitle('Wallet and Profile Portal')
        .setDescription([
        buildSectionDivider('TOP HOLDERS'),
        leaders.length
            ? leaders.slice(0, 5).map((entry, index) => `${index + 1}. <@${entry.userId}> — **${entry.totalBalance.toFixed(2)} CTB**`).join('\n')
            : '_No holders yet._',
        '',
        buildSectionDivider('PERSONAL TOOLS'),
        'Use the buttons below or `/exchange` slash commands to open your wallet, profile, market, and trading tools.',
    ].join('\n'))
        .setColor(0x2ecc71)
        .setFooter({ text: `${EXCHANGE_HUB_MESSAGE_MARKER}:profile` })
        .setTimestamp();
    const activity = new discord_js_1.EmbedBuilder()
        .setTitle('Recent Trades Feed')
        .setDescription([
        buildSectionDivider('LATEST ACTIVITY'),
        recentTransactions.length
            ? recentTransactions.map((tx) => {
                const sign = tx.direction === 'credit' ? '🟢 +' : '🔴 -';
                return `${sign} **${tx.amount.toFixed(2)} CTB** · ${tx.kind.replace(/_/g, ' ')} · <@${tx.userId}>`;
            }).join('\n')
            : '_No recent trades._',
    ].join('\n'))
        .setColor(0x9b59b6)
        .setFooter({ text: `${EXCHANGE_HUB_MESSAGE_MARKER}:activity` })
        .setTimestamp();
    const admin = new discord_js_1.EmbedBuilder()
        .setTitle('Admin Control Deck')
        .setDescription([
        buildSectionDivider('ADMIN ACTIONS'),
        'Use `/exchange hub` to republish the hub if needed.',
        'Use `/exchange grant` to seed balances.',
        'Use `Refresh Boards` to force a live refresh.',
        EXCHANGE_WEB_URL ? 'A full-screen exchange launch button is enabled below.' : 'Set EXCHANGE_WEB_URL to add a full-screen exchange launch button.',
    ].join('\n'))
        .setColor(0xe74c3c)
        .setFooter({ text: `${EXCHANGE_HUB_MESSAGE_MARKER}:admin` })
        .setTimestamp();
    return { hero, market, traderPortal, activity, admin };
}
function getHubFooterKey(message) {
    return message.embeds[0]?.footer?.text ?? '';
}
async function findExistingHubMessages(channel) {
    const pinned = await channel.messages.fetchPins().catch(() => null);
    const source = [];
    if (pinned) {
        const anyPinned = pinned;
        if (Array.isArray(anyPinned)) {
            source.push(...anyPinned);
        }
        else if (typeof anyPinned.values === 'function') {
            source.push(...Array.from(anyPinned.values()));
        }
        else if (typeof anyPinned[Symbol.iterator] === 'function') {
            source.push(...Array.from(anyPinned));
        }
    }
    return source.filter((message) => message.author.id === channel.client.user?.id && getHubFooterKey(message).startsWith(EXCHANGE_HUB_MESSAGE_MARKER));
}
async function cleanupLegacyHubMessages(client) {
    const channelIds = (process.env.COIN_EXCHANGE_CHANNEL_IDS ?? process.env.COIN_EXCHANGE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    for (const channelId of channelIds) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased() || channel.isDMBased())
            continue;
        const hubMessages = await findExistingHubMessages(channel);
        for (const message of hubMessages) {
            await message.unpin().catch(() => undefined);
            await message.delete().catch(() => undefined);
        }
    }
}
async function buildMainPanelEmbed(user, serverId) {
    const [wallet, overview, recentTx, openOffers] = await Promise.all([
        (0, coin_exchange_1.getCoinWallet)(user.id, serverId),
        (0, coin_exchange_1.getCoinExchangeOverview)(serverId),
        (0, coin_exchange_1.listUserTransactions)(user.id, 3, serverId),
        (0, coin_exchange_1.listCoinOffers)(6, 'open', serverId),
    ]);
    const balanceBar = buildBalanceBar(wallet.availableBalance, wallet.totalBalance);
    const recentActivity = recentTx.length
        ? recentTx.map((tx) => {
            const sign = tx.direction === 'credit' ? '🟢 +' : '🔴 -';
            const kind = tx.kind.replace(/_/g, ' ');
            return `${sign}${tx.amount.toFixed(2)} · ${kind}`;
        }).join('\n')
        : '_No recent activity_';
    const marketPreview = buildOfferPreviewRows(openOffers);
    const marketSummary = openOffers.length
        ? `${openOffers.length} open offers right now`
        : 'No open offers right now';
    return new discord_js_1.EmbedBuilder()
        .setTitle('🏦  Chase The Bag Coin Exchange')
        .setDescription([
        `> **${user.username}**, welcome to the CTB trading floor.`,
        '> Fast transfers, clean offer management, and live exchange stats.',
        '',
        'Use the buttons below to navigate like a simple app.',
    ].join('\n'))
        .addFields({
        name: '📊 Exchange Snapshot',
        value: [
            buildMetricGrid([
                { label: 'Total Supply', value: `${overview.totalSupply.toFixed(2)} CTB` },
                { label: 'Locked in Offers', value: `${overview.lockedSupply.toFixed(2)} CTB` },
                { label: 'Open Offers', value: String(overview.openOffers) },
                { label: 'Active Wallets', value: String(overview.wallets) },
            ]),
            '',
            `• ${marketSummary}`,
        ].join('\n'),
        inline: false,
    }, {
        name: '💼 Your Portfolio',
        value: [
            buildMetricGrid([
                { label: 'Available', value: `${wallet.availableBalance.toFixed(2)} CTB` },
                { label: 'Locked', value: `${wallet.lockedBalance.toFixed(2)} CTB` },
                { label: 'Total', value: `${wallet.totalBalance.toFixed(2)} CTB` },
            ]),
            '',
            balanceBar,
        ].join('\n'),
        inline: false,
    }, {
        name: '🧾 Recent Activity',
        value: [
            recentActivity,
        ].join('\n'),
        inline: false,
    }, {
        name: '🧭 What To Do Next',
        value: [
            '1. Check **Wallet** and **Market**',
            '2. Use **Send Coins** or **Create Offer** to trade',
            '3. Use **Offer Desk** to accept/cancel offers',
            '4. Use **Status** for analytics and **History** for logs',
        ].join('\n'),
        inline: false,
    }, {
        name: '🔥 Live Market Preview',
        value: [
            marketPreview,
            '',
            'Use **Live Market** for paged browsing.',
        ].join('\n'),
        inline: false,
    })
        .setColor(0xffb347)
        .setFooter({ text: `Chase The Bag Exchange • ${user.username}` })
        .setTimestamp();
}
function buildBalanceBar(available, total) {
    if (total === 0)
        return '`░░░░░░░░░░` 0%';
    const pct = Math.round((available / total) * 10);
    const filled = '█'.repeat(pct);
    const empty = '░'.repeat(10 - pct);
    return `\`${filled}${empty}\` ${Math.round((available / total) * 100)}% available`;
}
function buildWalletEmbed(user, wallet) {
    const bar = buildBalanceBar(wallet.availableBalance, wallet.totalBalance);
    const locked = wallet.lockedBalance > 0
        ? `🔒 **${wallet.lockedBalance.toFixed(2)} CTB** locked in active offers`
        : '✅ No coins currently locked';
    return new discord_js_1.EmbedBuilder()
        .setTitle('💰  My Wallet')
        .setDescription([
        `> Account: <@${user.id}>`,
        '',
        buildSectionDivider('WALLET OVERVIEW'),
    ].join('\n'))
        .addFields({
        name: '💵 Available Balance',
        value: `**${wallet.availableBalance.toFixed(2)} CTB**\n${bar}`,
        inline: false,
    }, {
        name: '🔐 Locked Balance',
        value: locked,
        inline: true,
    }, {
        name: '🏦 Total Balance',
        value: `**${wallet.totalBalance.toFixed(2)} CTB**`,
        inline: true,
    }, {
        name: '⚡ Quick Actions',
        value: [
            'Use **Send** to transfer CTB to another user',
            'Use **New Offer** to create a conditional transfer',
            'Use **Profile** to compare your standing',
        ].join('\n'),
        inline: false,
    })
        .setColor(0x2ecc71)
        .setFooter({ text: 'Chase The Bag  •  Wallet' })
        .setTimestamp();
}
async function buildMarketEmbed(userId, page, pageSize, serverId) {
    const allOffers = await (0, coin_exchange_1.listCoinOffers)(50, 'open', serverId);
    const others = allOffers.filter((o) => o.senderUserId !== userId);
    const totalPages = Math.max(1, Math.ceil(others.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = others.slice(start, start + pageSize);
    const rows = pageItems.length
        ? pageItems.map((o, i) => {
            const num = start + i + 1;
            return `**${num}.** 📤 <@${o.senderUserId}> offers **${o.amount.toFixed(2)} CTB** → <@${o.recipientUserId}>${o.note ? `\n    💬 _${o.note}_` : ''}`;
        }).join('\n\n')
        : '_No open market offers right now. Be the first to create one!_';
    return {
        embed: new discord_js_1.EmbedBuilder()
            .setTitle('📊  Live Market — Open Offers')
            .setDescription([
            '> Browse all active coin exchange offers below.',
            '> Use **My Offers** to accept offers directed to you.',
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            rows,
        ].join('\n'))
            .addFields({
            name: '📋 Market Stats',
            value: `${others.length} open offer${others.length !== 1 ? 's' : ''} available`,
            inline: false,
        })
            .setColor(0x3498db)
            .setFooter({ text: `Chase The Bag  •  Market  •  Page ${safePage}/${totalPages}` })
            .setTimestamp(),
        page: safePage,
        totalPages,
    };
}
async function buildLeaderboardEmbed(serverId) {
    const wallets = await (0, coin_exchange_1.listCoinWallets)(10, serverId);
    const medals = ['🥇', '🥈', '🥉'];
    const rows = wallets.length
        ? wallets.map((w, i) => {
            const medal = medals[i] ?? `**${i + 1}.**`;
            return `${medal} <@${w.userId}> — **${w.totalBalance.toFixed(2)} CTB**`;
        }).join('\n')
        : '_No holders yet. Be the first!_';
    return new discord_js_1.EmbedBuilder()
        .setTitle('🏆  CTB Leaderboard — Top Holders')
        .setDescription([
        '> The richest Chase The Bag Coin Exchange holders.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        rows,
    ].join('\n'))
        .setColor(0xf1c40f)
        .setFooter({ text: 'Chase The Bag  •  Leaderboard' })
        .setTimestamp();
}
async function buildProfileEmbed(user, serverId) {
    const [wallet, leaderboard] = await Promise.all([
        (0, coin_exchange_1.getCoinWallet)(user.id, serverId),
        (0, coin_exchange_1.listCoinWallets)(100, serverId),
    ]);
    const rank = leaderboard.findIndex((entry) => entry.userId === user.id);
    const rankText = rank >= 0 ? `#${rank + 1}` : 'Unranked';
    return new discord_js_1.EmbedBuilder()
        .setTitle('👤  Trader Profile')
        .setDescription([
        `> Profile for <@${user.id}>`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `🏅 Rank: **${rankText}**`,
        `💰 Available: **${wallet.availableBalance.toFixed(2)} CTB**`,
        `🔒 Locked: **${wallet.lockedBalance.toFixed(2)} CTB**`,
        `🏦 Total: **${wallet.totalBalance.toFixed(2)} CTB**`,
        '',
        buildBalanceBar(wallet.availableBalance, wallet.totalBalance),
    ].join('\n'))
        .setColor(0x00bcd4)
        .setFooter({ text: 'Chase The Bag  •  Trader Profile' })
        .setTimestamp();
}
async function buildStatusEmbed(serverId) {
    const [overview, recentTransactions, recentOffers] = await Promise.all([
        (0, coin_exchange_1.getCoinExchangeOverview)(serverId),
        (0, coin_exchange_1.listCoinTransactions)(150, '', serverId),
        (0, coin_exchange_1.listCoinOffers)(150, '', serverId),
    ]);
    const completedOffers = recentOffers.filter((offer) => offer.status === 'accepted').length;
    const cancelledOffers = recentOffers.filter((offer) => offer.status === 'cancelled').length;
    const grossVolume = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const uniqueTraders = new Set(recentTransactions.map((tx) => tx.userId)).size;
    return new discord_js_1.EmbedBuilder()
        .setTitle('📈  Exchange Status')
        .setDescription([
        '> Real-time exchange health snapshot.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `💹 Gross Tx Volume (recent): **${grossVolume.toFixed(2)} CTB**`,
        `👥 Active Traders (recent): **${uniqueTraders}**`,
        `✅ Accepted Offers (recent): **${completedOffers}**`,
        `❌ Cancelled Offers (recent): **${cancelledOffers}**`,
        '',
        `🏦 Total Supply: **${overview.totalSupply.toFixed(2)} CTB**`,
        `📋 Open Offers: **${overview.openOffers}**`,
        `🧾 Lifetime Transactions: **${overview.transactions}**`,
    ].join('\n'))
        .setColor(0xff7043)
        .setFooter({ text: 'Chase The Bag  •  Exchange Analytics' })
        .setTimestamp();
}
function buildOffersEmbed(userId, offers, page, pageSize, totalPages) {
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
    return new discord_js_1.EmbedBuilder()
        .setTitle('📨  My Exchange Offers')
        .setDescription([
        '> Your incoming and outgoing CTB offers.',
        '> Accept incoming offers or cancel your outgoing ones.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...rows,
    ].join('\n'))
        .setColor(0x3498db)
        .addFields({ name: '⚡ Actions', value: 'Use the **Accept/Cancel** buttons below to manage offers.' })
        .setFooter({ text: `Chase The Bag  •  My Offers  •  Page ${page}/${totalPages}` })
        .setTimestamp();
}
function buildHistoryEmbed(transactions, page, pageSize, totalPages) {
    const start = (page - 1) * pageSize;
    const pageItems = transactions.slice(start, start + pageSize);
    const rows = pageItems.length
        ? pageItems.map((entry) => {
            const sign = entry.direction === 'credit' ? '+' : '-';
            const counterparty = entry.counterpartyUserId ? ` with <@${entry.counterpartyUserId}>` : '';
            return `#${entry.id} ${entry.kind}${counterparty} | ${sign}${entry.amount.toFixed(2)} | bal ${entry.balanceAfter.toFixed(2)}`;
        })
        : ['No coin exchange history yet.'];
    const formattedRows = pageItems.length
        ? pageItems.map((entry) => {
            const sign = entry.direction === 'credit' ? '🟢 +' : '🔴 -';
            const kind = entry.kind.replace(/_/g, ' ');
            const counterparty = entry.counterpartyUserId ? ` with <@${entry.counterpartyUserId}>` : '';
            return `${sign}**${entry.amount.toFixed(2)} CTB** · _${kind}_${counterparty}\n    Balance after: **${entry.balanceAfter.toFixed(2)} CTB**`;
        })
        : ['_No transaction history yet._'];
    return new discord_js_1.EmbedBuilder()
        .setTitle('🧾  Transaction History')
        .setDescription([
        '> Your full coin exchange activity log.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        formattedRows.join('\n\n'),
    ].join('\n'))
        .setColor(0x9b59b6)
        .setFooter({ text: `Chase The Bag  •  History  •  Page ${page}/${totalPages}` })
        .setTimestamp();
}
function buildMainButtons(userId) {
    const rows = [
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`exchange_wallet:${userId}`).setLabel('💰 Wallet').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`exchange_market:${userId}:1`).setLabel('📊 Live Market').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_offers:${userId}:1`).setLabel('📨 Offer Desk').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_history:${userId}:1`).setLabel('🧾 History').setStyle(discord_js_1.ButtonStyle.Secondary)),
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`exchange_send_modal:${userId}`).setLabel('➡️ Send').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`exchange_offer_modal:${userId}`).setLabel('📝 Create').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_accept_modal:${userId}`).setLabel('✅ Accept').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`exchange_cancel_modal:${userId}`).setLabel('🛑 Cancel').setStyle(discord_js_1.ButtonStyle.Danger)),
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`exchange_profile:${userId}`).setLabel('👤 Profile').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_status:${userId}`).setLabel('📈 Status').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_leaderboard:${userId}`).setLabel('🏆 Top').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_help:${userId}`).setLabel('❓ Help').setStyle(discord_js_1.ButtonStyle.Secondary)),
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`exchange_refresh:${userId}`).setLabel('🔄 Refresh Dashboard').setStyle(discord_js_1.ButtonStyle.Secondary)),
    ];
    if (EXCHANGE_WEB_URL) {
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setStyle(discord_js_1.ButtonStyle.Link)
            .setURL(EXCHANGE_WEB_URL)
            .setLabel('🖥️ Open Full-Screen Exchange')));
    }
    return rows;
}
function buildBackButtons(userId) {
    return [
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`exchange_send_modal:${userId}`).setLabel('➡️ Send Coins').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId(`exchange_offer_modal:${userId}`).setLabel('📝 New Offer').setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_back:${userId}`).setLabel('🏠 Home').setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId(`exchange_refresh:${userId}`).setLabel('🔄 Refresh').setStyle(discord_js_1.ButtonStyle.Secondary)),
    ];
}
function buildPagedButtons(userId, action, page, totalPages) {
    const prevPage = Math.max(1, page - 1);
    const nextPage = Math.min(totalPages, page + 1);
    return [
        new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${action}:${userId}:${prevPage}`)
            .setLabel('Prev')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(page <= 1), new discord_js_1.ButtonBuilder()
            .setCustomId(`exchange_back:${userId}`)
            .setLabel('Back')
            .setStyle(discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${action}:${userId}:${nextPage}`)
            .setLabel('Next')
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)),
    ];
}
function buildOfferActionButtons(userId, offers, page, pageSize) {
    const start = (page - 1) * pageSize;
    const pageItems = offers.slice(start, start + pageSize);
    const buttons = [];
    for (const offer of pageItems) {
        if (offer.status !== 'open')
            continue;
        if (offer.recipientUserId === userId) {
            buttons.push(new discord_js_1.ButtonBuilder()
                .setCustomId(`exchange_offer_accept:${userId}:${offer.id}:${page}`)
                .setLabel(`Accept #${offer.id}`)
                .setStyle(discord_js_1.ButtonStyle.Success));
        }
        else if (offer.senderUserId === userId) {
            buttons.push(new discord_js_1.ButtonBuilder()
                .setCustomId(`exchange_offer_cancel:${userId}:${offer.id}:${page}`)
                .setLabel(`Cancel #${offer.id}`)
                .setStyle(discord_js_1.ButtonStyle.Danger));
        }
        if (buttons.length >= 5)
            break;
    }
    if (!buttons.length)
        return [];
    return [new discord_js_1.ActionRowBuilder().addComponents(...buttons)];
}
function buildSendModal(userId) {
    const modal = new discord_js_1.ModalBuilder().setCustomId(`exchange_send_submit:${userId}`).setTitle('Send Coins');
    const recipientInput = new discord_js_1.TextInputBuilder()
        .setCustomId('recipientUserId')
        .setLabel('Recipient Discord User ID')
        .setPlaceholder('123456789012345678')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const amountInput = new discord_js_1.TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Amount')
        .setPlaceholder('25.5')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(recipientInput), new discord_js_1.ActionRowBuilder().addComponents(amountInput));
    return modal;
}
function buildOfferIdModal(userId, mode) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`exchange_${mode}_submit:${userId}`)
        .setTitle(mode === 'accept' ? 'Accept Offer' : 'Cancel Offer');
    const offerIdInput = new discord_js_1.TextInputBuilder()
        .setCustomId('offerId')
        .setLabel('Offer ID')
        .setPlaceholder('Example: 42')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(offerIdInput));
    return modal;
}
function buildOfferModal(userId) {
    const modal = new discord_js_1.ModalBuilder().setCustomId(`exchange_offer_submit:${userId}`).setTitle('Create Offer');
    const recipientInput = new discord_js_1.TextInputBuilder()
        .setCustomId('recipientUserId')
        .setLabel('Recipient Discord User ID')
        .setPlaceholder('123456789012345678')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const amountInput = new discord_js_1.TextInputBuilder()
        .setCustomId('amount')
        .setLabel('Amount')
        .setPlaceholder('50')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const noteInput = new discord_js_1.TextInputBuilder()
        .setCustomId('note')
        .setLabel('Note (optional)')
        .setPlaceholder('Optional context for this offer')
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(false);
    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(recipientInput), new discord_js_1.ActionRowBuilder().addComponents(amountInput), new discord_js_1.ActionRowBuilder().addComponents(noteInput));
    return modal;
}
async function handlePanelButton(interaction) {
    if (interaction.replied || interaction.deferred)
        return;
    const serverId = resolveServerScope(interaction.guild?.id);
    const parts = interaction.customId.split(':');
    const action = parts[0];
    const ownerId = parts[1];
    const pageRaw = action === 'exchange_offer_accept' || action === 'exchange_offer_cancel' ? parts[3] : parts[2];
    const page = Number.isFinite(Number(pageRaw)) ? Math.max(1, Number(pageRaw)) : 1;
    if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: 'This panel belongs to another user.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (action === 'exchange_send_modal') {
        await interaction.showModal(buildSendModal(interaction.user.id));
        const submit = await interaction.awaitModalSubmit({
            time: 120000,
            filter: (modal) => modal.customId === `exchange_send_submit:${interaction.user.id}` && modal.user.id === interaction.user.id,
        }).catch(() => null);
        if (!submit)
            return;
        const recipientUserId = submit.fields.getTextInputValue('recipientUserId').trim();
        const amount = (0, coin_exchange_1.parseCoinAmount)(submit.fields.getTextInputValue('amount').trim());
        if (!recipientUserId || amount === null) {
            await submit.reply({ content: 'Invalid recipient or amount.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await (0, coin_exchange_1.transferCoins)({
            fromUserId: submit.user.id,
            toUserId: recipientUserId,
            amount,
            serverId: submit.guild?.id ?? 'dm',
        });
        await submit.reply({ content: `Transferred **${amount.toFixed(2)}** coins to <@${recipientUserId}>.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (action === 'exchange_offer_modal') {
        await interaction.showModal(buildOfferModal(interaction.user.id));
        const submit = await interaction.awaitModalSubmit({
            time: 120000,
            filter: (modal) => modal.customId === `exchange_offer_submit:${interaction.user.id}` && modal.user.id === interaction.user.id,
        }).catch(() => null);
        if (!submit)
            return;
        const recipientUserId = submit.fields.getTextInputValue('recipientUserId').trim();
        const amount = (0, coin_exchange_1.parseCoinAmount)(submit.fields.getTextInputValue('amount').trim());
        const note = submit.fields.getTextInputValue('note').trim();
        if (!recipientUserId || amount === null) {
            await submit.reply({ content: 'Invalid recipient or amount.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const offerId = await (0, coin_exchange_1.createExchangeOffer)({
            senderUserId: submit.user.id,
            recipientUserId,
            amount,
            note: note || undefined,
            serverId: submit.guild?.id ?? 'dm',
        });
        await submit.reply({ content: `Created offer **#${offerId}** for <@${recipientUserId}> worth **${amount.toFixed(2)}** coins.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (action === 'exchange_accept_modal' || action === 'exchange_cancel_modal') {
        const mode = action === 'exchange_accept_modal' ? 'accept' : 'cancel';
        await interaction.showModal(buildOfferIdModal(interaction.user.id, mode));
        const submit = await interaction.awaitModalSubmit({
            time: 120000,
            filter: (modal) => modal.customId === `exchange_${mode}_submit:${interaction.user.id}` && modal.user.id === interaction.user.id,
        }).catch(() => null);
        if (!submit)
            return;
        const offerId = Number(submit.fields.getTextInputValue('offerId').trim());
        if (!Number.isInteger(offerId) || offerId < 1) {
            await submit.reply({ content: 'Invalid offer id.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (mode === 'accept') {
            await (0, coin_exchange_1.acceptExchangeOffer)({ recipientUserId: submit.user.id, offerId, serverId: submit.guild?.id ?? 'dm' });
            await submit.reply({ content: `Accepted offer **#${offerId}**.`, flags: discord_js_1.MessageFlags.Ephemeral });
        }
        else {
            await (0, coin_exchange_1.cancelExchangeOffer)({ requesterUserId: submit.user.id, offerId, serverId: submit.guild?.id ?? 'dm' });
            await submit.reply({ content: `Cancelled offer **#${offerId}**.`, flags: discord_js_1.MessageFlags.Ephemeral });
        }
        return;
    }
    if (action === 'exchange_wallet') {
        const wallet = await (0, coin_exchange_1.getCoinWallet)(interaction.user.id, serverId);
        await interaction.update({ embeds: [buildWalletEmbed(interaction.user, wallet)], components: buildBackButtons(interaction.user.id) });
        return;
    }
    if (action === 'exchange_market') {
        const pageSize = 4;
        const { embed, page: safePage, totalPages } = await buildMarketEmbed(interaction.user.id, page, pageSize, serverId);
        await interaction.update({
            embeds: [embed],
            components: [
                ...buildPagedButtons(interaction.user.id, 'exchange_market', safePage, totalPages),
                ...buildBackButtons(interaction.user.id),
            ],
        });
        return;
    }
    if (action === 'exchange_leaderboard') {
        await interaction.update({ embeds: [await buildLeaderboardEmbed(serverId)], components: buildBackButtons(interaction.user.id) });
        return;
    }
    if (action === 'exchange_profile') {
        await interaction.update({ embeds: [await buildProfileEmbed(interaction.user, serverId)], components: buildBackButtons(interaction.user.id) });
        return;
    }
    if (action === 'exchange_status') {
        await interaction.update({ embeds: [await buildStatusEmbed(serverId)], components: buildBackButtons(interaction.user.id) });
        return;
    }
    if (action === 'exchange_offers') {
        const offers = await (0, coin_exchange_1.listUserOffers)(interaction.user.id, serverId);
        const pageSize = 3;
        const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
        const safePage = Math.min(page, totalPages);
        await interaction.update({
            embeds: [buildOffersEmbed(interaction.user.id, offers, safePage, pageSize, totalPages)],
            components: [...buildOfferActionButtons(interaction.user.id, offers, safePage, pageSize), ...buildPagedButtons(interaction.user.id, 'exchange_offers', safePage, totalPages)],
        });
        return;
    }
    if (action === 'exchange_offer_accept' || action === 'exchange_offer_cancel') {
        const offerId = Number(parts[2]);
        if (!Number.isInteger(offerId) || offerId < 1) {
            await interaction.reply({ content: 'Invalid offer id.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (action === 'exchange_offer_accept') {
            await (0, coin_exchange_1.acceptExchangeOffer)({ recipientUserId: interaction.user.id, offerId, serverId: interaction.guild?.id ?? 'dm' });
        }
        else {
            await (0, coin_exchange_1.cancelExchangeOffer)({ requesterUserId: interaction.user.id, offerId, serverId: interaction.guild?.id ?? 'dm' });
        }
        const offers = await (0, coin_exchange_1.listUserOffers)(interaction.user.id, serverId);
        const pageSize = 3;
        const totalPages = Math.max(1, Math.ceil(offers.length / pageSize));
        const safePage = Math.min(page, totalPages);
        await interaction.update({
            embeds: [buildOffersEmbed(interaction.user.id, offers, safePage, pageSize, totalPages)],
            components: [...buildOfferActionButtons(interaction.user.id, offers, safePage, pageSize), ...buildPagedButtons(interaction.user.id, 'exchange_offers', safePage, totalPages)],
        });
        return;
    }
    if (action === 'exchange_history') {
        const transactions = await (0, coin_exchange_1.listUserTransactions)(interaction.user.id, 24, serverId);
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
                '`!exchange market`',
                '`!exchange top`',
                '`!exchange profile`',
                '`!exchange status`',
                '`!exchange wallet`',
                '`!exchange send @user amount`',
                '`!exchange offer @user amount optional note`',
                '`!exchange offers`',
                '`!exchange accept offerId`',
                '`!exchange cancel offerId`',
                '`!exchange history`',
                '`!exchange hub` (admin only)',
                '`!exchange grant @user amount` (admin only)',
            ].join('\n'),
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (action === 'exchange_back' || action === 'exchange_refresh') {
        await interaction.update({ embeds: [await buildMainPanelEmbed(interaction.user, serverId)], components: buildMainButtons(interaction.user.id) });
        return;
    }
    await interaction.reply({ content: 'Unsupported dashboard action.', flags: discord_js_1.MessageFlags.Ephemeral });
}
async function sendExchangePanel(message) {
    const embed = await buildMainPanelEmbed(message.author, resolveServerScope(message.guild?.id));
    return message.reply({
        embeds: [embed],
        components: buildMainButtons(message.author.id),
    });
}
async function publishExchangeHub(channel) {
    const existing = await findExistingHubMessages(channel);
    const embeds = await buildHubEmbeds();
    const targets = [
        { key: 'hero', embed: embeds.hero, components: buildHubButtons() },
        { key: 'market', embed: embeds.market, components: [] },
        { key: 'profile', embed: embeds.traderPortal, components: [] },
        { key: 'activity', embed: embeds.activity, components: [] },
        { key: 'admin', embed: embeds.admin, components: buildHubButtons() },
    ];
    for (const target of targets) {
        const existingMessage = existing.find((message) => getHubFooterKey(message).includes(`:${target.key}`));
        if (existingMessage) {
            await existingMessage.edit({ embeds: [target.embed], components: target.components });
            continue;
        }
        const sent = await channel.send({ embeds: [target.embed], components: target.components });
        await sent.pin().catch(() => undefined);
    }
}
async function refreshAllExchangeHubs(client) {
    const channelIds = (process.env.COIN_EXCHANGE_CHANNEL_IDS ?? process.env.COIN_EXCHANGE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    for (const channelId of channelIds) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased() || channel.isDMBased())
            continue;
        await publishExchangeHub(channel).catch(() => undefined);
    }
}
function buildExchangeSlashCommands() {
    return [
        new discord_js_1.SlashCommandBuilder()
            .setName('exchange')
            .setDescription('Open and manage the Chase The Bag coin exchange')
            .addSubcommand((sub) => sub.setName('open').setDescription('Open your exchange dashboard'))
            .addSubcommand((sub) => sub.setName('wallet').setDescription('View your wallet'))
            .addSubcommand((sub) => sub.setName('market').setDescription('View live market offers'))
            .addSubcommand((sub) => sub.setName('top').setDescription('View the CTB leaderboard'))
            .addSubcommand((sub) => sub.setName('profile').setDescription('View your trader profile'))
            .addSubcommand((sub) => sub.setName('status').setDescription('View exchange analytics'))
            .addSubcommand((sub) => sub.setName('history').setDescription('View your transaction history'))
            .addSubcommand((sub) => sub.setName('hub').setDescription('Publish or refresh the exchange hub'))
            .addSubcommand((sub) => sub
            .setName('allow-add')
            .setDescription('Allow a user to access exchange (admin only)')
            .addUserOption((opt) => opt.setName('user').setDescription('User to allow').setRequired(true)))
            .addSubcommand((sub) => sub
            .setName('allow-remove')
            .setDescription('Remove user from exchange allowlist (admin only)')
            .addUserOption((opt) => opt.setName('user').setDescription('User to remove').setRequired(true)))
            .addSubcommand((sub) => sub.setName('allow-list').setDescription('Show exchange allowlist (admin only)'))
            .addSubcommand((sub) => sub
            .setName('send')
            .setDescription('Send CTB to another user')
            .addUserOption((opt) => opt.setName('user').setDescription('Recipient').setRequired(true))
            .addNumberOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true)))
            .addSubcommand((sub) => sub
            .setName('offer')
            .setDescription('Create a CTB offer')
            .addUserOption((opt) => opt.setName('user').setDescription('Recipient').setRequired(true))
            .addNumberOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true))
            .addStringOption((opt) => opt.setName('note').setDescription('Optional note').setRequired(false)))
            .addSubcommand((sub) => sub
            .setName('accept')
            .setDescription('Accept an offer by ID')
            .addIntegerOption((opt) => opt.setName('offer_id').setDescription('Offer ID').setRequired(true)))
            .addSubcommand((sub) => sub
            .setName('cancel')
            .setDescription('Cancel an offer by ID')
            .addIntegerOption((opt) => opt.setName('offer_id').setDescription('Offer ID').setRequired(true)))
            .addSubcommand((sub) => sub
            .setName('grant')
            .setDescription('Grant CTB to a user (admin only)')
            .addUserOption((opt) => opt.setName('user').setDescription('Recipient').setRequired(true))
            .addNumberOption((opt) => opt.setName('amount').setDescription('Amount').setRequired(true)))
            .toJSON(),
    ];
}
async function registerExchangeSlashCommands(client, guildIds) {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!token || !clientId || !guildIds.length)
        return;
    const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
    const commands = buildExchangeSlashCommands();
    for (const guildId of guildIds) {
        await rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands }).catch(() => undefined);
    }
}
async function handleExchangeSlashCommand(interaction, adminIds) {
    const serverId = resolveServerScope(interaction.guildId);
    const subcommand = interaction.options.getSubcommand();
    if (subcommand.startsWith('allow-')) {
        if (!adminIds.has(interaction.user.id)) {
            await interaction.reply({ content: 'Only exchange admins can manage the allowlist.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (subcommand === 'allow-list') {
            const entries = await (0, coin_exchange_1.listExchangeAllowlist)(serverId, 200);
            const content = entries.length
                ? entries.map((entry, index) => `${index + 1}. <@${entry.userId}>`).join('\n')
                : 'Allowlist is empty (exchange currently open to all users).';
            await interaction.reply({ content: `**Exchange Allowlist**\n${content}`, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const target = interaction.options.getUser('user', true);
        if (subcommand === 'allow-add') {
            const added = await (0, coin_exchange_1.addUserToExchangeAllowlist)({ serverId, userId: target.id, addedByUserId: interaction.user.id });
            await interaction.reply({ content: added ? `Added <@${target.id}> to exchange allowlist.` : `<@${target.id}> is already allowlisted.`, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        if (subcommand === 'allow-remove') {
            const removed = await (0, coin_exchange_1.removeUserFromExchangeAllowlist)({ serverId, userId: target.id });
            await interaction.reply({ content: removed ? `Removed <@${target.id}> from exchange allowlist.` : `<@${target.id}> was not in the allowlist.`, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
    }
    const allowed = await canUseExchange(serverId, interaction.user.id, adminIds);
    if (!allowed) {
        await interaction.reply({ content: 'Exchange access is restricted. Ask an admin to add you to the allowlist.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'open') {
        const embed = await buildMainPanelEmbed(interaction.user, serverId);
        await interaction.reply({ embeds: [embed], components: buildMainButtons(interaction.user.id), flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'wallet') {
        const wallet = await (0, coin_exchange_1.getCoinWallet)(interaction.user.id, serverId);
        await interaction.reply({ embeds: [buildWalletEmbed(interaction.user, wallet)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'market') {
        const { embed, page, totalPages } = await buildMarketEmbed(interaction.user.id, 1, 6, serverId);
        await interaction.reply({ embeds: [embed], components: buildPagedButtons(interaction.user.id, 'exchange_market', page, totalPages), flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'top') {
        await interaction.reply({ embeds: [await buildLeaderboardEmbed(serverId)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'profile') {
        await interaction.reply({ embeds: [await buildProfileEmbed(interaction.user, serverId)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'status') {
        await interaction.reply({ embeds: [await buildStatusEmbed(serverId)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'history') {
        const tx = await (0, coin_exchange_1.listUserTransactions)(interaction.user.id, 24, serverId);
        await interaction.reply({ embeds: [buildHistoryEmbed(tx, 1, 6, Math.max(1, Math.ceil(tx.length / 6)))], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'hub') {
        if (!adminIds.has(interaction.user.id)) {
            await interaction.reply({ content: 'You do not have permission to publish the exchange hub.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
            await interaction.reply({ content: 'Hub publishing requires a guild text channel.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        await publishExchangeHub(channel);
        await interaction.editReply({ content: 'Exchange hub refreshed and pinned.' });
        return;
    }
    if (subcommand === 'send') {
        const user = interaction.options.getUser('user', true);
        const amount = (0, coin_exchange_1.parseCoinAmount)(String(interaction.options.getNumber('amount', true)));
        if (amount === null) {
            await interaction.reply({ content: 'Invalid amount.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await (0, coin_exchange_1.transferCoins)({ fromUserId: interaction.user.id, toUserId: user.id, amount, serverId: interaction.guildId ?? 'dm' });
        await interaction.reply({ content: `Transferred **${amount.toFixed(2)}** coins to <@${user.id}>.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'offer') {
        const user = interaction.options.getUser('user', true);
        const amount = (0, coin_exchange_1.parseCoinAmount)(String(interaction.options.getNumber('amount', true)));
        const note = interaction.options.getString('note') ?? undefined;
        if (amount === null) {
            await interaction.reply({ content: 'Invalid amount.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const offerId = await (0, coin_exchange_1.createExchangeOffer)({ senderUserId: interaction.user.id, recipientUserId: user.id, amount, note, serverId: interaction.guildId ?? 'dm' });
        await interaction.reply({ content: `Created offer **#${offerId}** for <@${user.id}> worth **${amount.toFixed(2)}** coins.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'accept') {
        const offerId = interaction.options.getInteger('offer_id', true);
        await (0, coin_exchange_1.acceptExchangeOffer)({ recipientUserId: interaction.user.id, offerId, serverId: interaction.guildId ?? 'dm' });
        await interaction.reply({ content: `Accepted offer **#${offerId}**.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'cancel') {
        const offerId = interaction.options.getInteger('offer_id', true);
        await (0, coin_exchange_1.cancelExchangeOffer)({ requesterUserId: interaction.user.id, offerId, serverId: interaction.guildId ?? 'dm' });
        await interaction.reply({ content: `Cancelled offer **#${offerId}**.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (subcommand === 'grant') {
        if (!adminIds.has(interaction.user.id)) {
            await interaction.reply({ content: 'You do not have permission to grant exchange coins.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const user = interaction.options.getUser('user', true);
        const amount = (0, coin_exchange_1.parseCoinAmount)(String(interaction.options.getNumber('amount', true)));
        if (amount === null) {
            await interaction.reply({ content: 'Invalid amount.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const wallet = await (0, coin_exchange_1.grantCoins)({ actorUserId: interaction.user.id, targetUserId: user.id, amount, serverId: interaction.guildId ?? 'dm', details: `Granted by ${interaction.user.tag}` });
        await interaction.reply({ content: `Granted **${amount.toFixed(2)}** coins to <@${user.id}>. New balance: **${wallet.availableBalance.toFixed(2)}**.`, flags: discord_js_1.MessageFlags.Ephemeral });
    }
}
async function handleHubButton(interaction, adminIds) {
    if (interaction.replied || interaction.deferred)
        return;
    const serverId = resolveServerScope(interaction.guild?.id);
    const allowed = await canUseExchange(serverId, interaction.user.id, adminIds);
    if (!allowed) {
        await interaction.reply({ content: 'Exchange access is restricted. Ask an admin to add you to the allowlist.', flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.customId === 'exchange_hub_open') {
        const embed = await buildMainPanelEmbed(interaction.user, serverId);
        await interaction.reply({ embeds: [embed], components: buildMainButtons(interaction.user.id), flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.customId === 'exchange_hub_profile') {
        await interaction.reply({ embeds: [await buildProfileEmbed(interaction.user, serverId)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.customId === 'exchange_hub_market') {
        const { embed, page, totalPages } = await buildMarketEmbed(interaction.user.id, 1, 6, serverId);
        await interaction.reply({ embeds: [embed], components: buildPagedButtons(interaction.user.id, 'exchange_market', page, totalPages), flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.customId === 'exchange_hub_status') {
        await interaction.reply({ embeds: [await buildStatusEmbed(serverId)], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (interaction.customId === 'exchange_hub_refresh') {
        if (!adminIds.has(interaction.user.id)) {
            await interaction.reply({ content: 'Only exchange admins can refresh the hub boards.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
            await interaction.reply({ content: 'Hub refresh requires a guild text channel.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        await publishExchangeHub(channel);
        await interaction.editReply({ content: 'Exchange hub refreshed.' });
    }
}
function registerCoinExchangeCommands(client, ownerId) {
    const adminIds = getAdminIds(ownerId);
    const channelIds = (process.env.COIN_EXCHANGE_CHANNEL_IDS ?? process.env.COIN_EXCHANGE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const allowedGuildIds = (process.env.DISCORD_GUILD_IDS ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const commandTimestamps = new Map();
    client.once('clientReady', async () => {
        await registerExchangeSlashCommands(client, allowedGuildIds);
        await cleanupLegacyHubMessages(client);
    });
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('exchange_hub_')) {
                    await handleHubButton(interaction, adminIds);
                    return;
                }
                if (interaction.customId.startsWith('exchange_')) {
                    const serverId = resolveServerScope(interaction.guild?.id);
                    const allowed = await canUseExchange(serverId, interaction.user.id, adminIds);
                    if (!allowed) {
                        await interaction.reply({ content: 'Exchange access is restricted. Ask an admin to add you to the allowlist.', flags: discord_js_1.MessageFlags.Ephemeral });
                        return;
                    }
                    await handlePanelButton(interaction);
                    return;
                }
            }
            if (interaction.isChatInputCommand() && interaction.commandName === 'exchange') {
                await handleExchangeSlashCommand(interaction, adminIds);
            }
        }
        catch (error) {
            const messageText = error instanceof Error ? error.message : 'Exchange interaction failed.';
            if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `Coin exchange error: ${messageText}`, flags: discord_js_1.MessageFlags.Ephemeral });
            }
        }
    });
    client.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        if (!message.content.toLowerCase().startsWith('!exchange'))
            return;
        if (!message.guild)
            return;
        if (allowedGuildIds.length && !allowedGuildIds.includes(message.guild.id))
            return;
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
        const serverId = resolveServerScope(message.guild?.id);
        const args = getCommandArgs(message);
        const action = args[1]?.toLowerCase() ?? 'panel';
        if (action === 'allow') {
            if (!adminIds.has(message.author.id)) {
                await message.reply('Only exchange admins can manage the allowlist.');
                return;
            }
            const mode = args[2]?.toLowerCase() ?? '';
            if (mode === 'list') {
                const entries = await (0, coin_exchange_1.listExchangeAllowlist)(serverId, 200);
                const content = entries.length
                    ? entries.map((entry, index) => `${index + 1}. <@${entry.userId}>`).join('\n')
                    : 'Allowlist is empty (exchange currently open to all users).';
                await message.reply(`**Exchange Allowlist**\n${content}`);
                return;
            }
            const targetUser = message.mentions.users.first();
            if (!targetUser) {
                await message.reply('Usage: !exchange allow add @user | !exchange allow remove @user | !exchange allow list');
                return;
            }
            if (mode === 'add') {
                const added = await (0, coin_exchange_1.addUserToExchangeAllowlist)({ serverId, userId: targetUser.id, addedByUserId: message.author.id });
                await message.reply(added ? `Added <@${targetUser.id}> to exchange allowlist.` : `<@${targetUser.id}> is already allowlisted.`);
                return;
            }
            if (mode === 'remove') {
                const removed = await (0, coin_exchange_1.removeUserFromExchangeAllowlist)({ serverId, userId: targetUser.id });
                await message.reply(removed ? `Removed <@${targetUser.id}> from exchange allowlist.` : `<@${targetUser.id}> was not in the allowlist.`);
                return;
            }
            await message.reply('Usage: !exchange allow add @user | !exchange allow remove @user | !exchange allow list');
            return;
        }
        const allowed = await canUseExchange(serverId, message.author.id, adminIds);
        if (!allowed) {
            await message.reply('Exchange access is restricted. Ask an admin to add you to the allowlist.');
            return;
        }
        try {
            if (action === 'help') {
                await message.reply([
                    '**Coin Exchange Commands**',
                    '`!exchange` (open dashboard)',
                    '`!exchange market`',
                    '`!exchange top`',
                    '`!exchange profile`',
                    '`!exchange status`',
                    '`!exchange wallet`',
                    '`!exchange send @user amount`',
                    '`!exchange offer @user amount optional note`',
                    '`!exchange offers`',
                    '`!exchange accept offerId`',
                    '`!exchange cancel offerId`',
                    '`!exchange history`',
                    '`!exchange allow add @user` (admin only)',
                    '`!exchange allow remove @user` (admin only)',
                    '`!exchange allow list` (admin only)',
                    '`!exchange hub` (admin only)',
                    '`!exchange grant @user amount` (admin only)',
                ].join('\n'));
                return;
            }
            if (action === 'market') {
                const { embed } = await buildMarketEmbed(message.author.id, 1, 6, resolveServerScope(message.guild?.id));
                await message.reply({ embeds: [embed] });
                return;
            }
            if (action === 'top' || action === 'leaderboard') {
                await message.reply({ embeds: [await buildLeaderboardEmbed(resolveServerScope(message.guild?.id))] });
                return;
            }
            if (action === 'profile') {
                await message.reply({ embeds: [await buildProfileEmbed(message.author, resolveServerScope(message.guild?.id))] });
                return;
            }
            if (action === 'status') {
                await message.reply({ embeds: [await buildStatusEmbed(resolveServerScope(message.guild?.id))] });
                return;
            }
            if (action === 'hub') {
                if (!adminIds.has(message.author.id)) {
                    await message.reply('You do not have permission to publish the exchange hub.');
                    return;
                }
                const panel = await sendExchangePanel(message);
                try {
                    await panel.pin();
                }
                catch {
                    // Pin requires channel permissions. Continue without failing the command.
                }
                return;
            }
            if (action === 'panel' || action === 'ui' || action === 'app') {
                await sendExchangePanel(message);
                return;
            }
            if (action === 'wallet') {
                const wallet = await (0, coin_exchange_1.getCoinWallet)(message.author.id, resolveServerScope(message.guild?.id));
                await message.reply(formatWalletMessage(message.author, wallet));
                return;
            }
            if (action === 'grant') {
                if (!adminIds.has(message.author.id)) {
                    await message.reply('You do not have permission to grant exchange coins.');
                    return;
                }
                const target = message.mentions.users.first();
                const amount = (0, coin_exchange_1.parseCoinAmount)(args[3] ?? '');
                if (!target || amount === null) {
                    await message.reply('Usage: !exchange grant @user amount');
                    return;
                }
                const wallet = await (0, coin_exchange_1.grantCoins)({
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
                const amount = (0, coin_exchange_1.parseCoinAmount)(args[3] ?? '');
                if (!target || amount === null) {
                    await message.reply('Usage: !exchange send @user amount');
                    return;
                }
                await (0, coin_exchange_1.transferCoins)({
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
                const amount = (0, coin_exchange_1.parseCoinAmount)(args[3] ?? '');
                const note = args.slice(4).join(' ').trim();
                if (!target || amount === null) {
                    await message.reply('Usage: !exchange offer @user amount optional note');
                    return;
                }
                const offerId = await (0, coin_exchange_1.createExchangeOffer)({
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
                const offers = await (0, coin_exchange_1.listUserOffers)(message.author.id, resolveServerScope(message.guild?.id));
                await message.reply(formatOffersMessage(message.author.id, offers));
                return;
            }
            if (action === 'accept') {
                const offerId = Number(args[2]);
                if (!Number.isInteger(offerId) || offerId < 1) {
                    await message.reply('Usage: !exchange accept offerId');
                    return;
                }
                await (0, coin_exchange_1.acceptExchangeOffer)({
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
                await (0, coin_exchange_1.cancelExchangeOffer)({
                    requesterUserId: message.author.id,
                    offerId,
                    serverId: message.guild?.id ?? 'dm',
                });
                await message.reply(`Cancelled exchange offer **#${offerId}**.`);
                return;
            }
            if (action === 'history') {
                const transactions = await (0, coin_exchange_1.listUserTransactions)(message.author.id, 8, resolveServerScope(message.guild?.id));
                await message.reply(formatHistoryMessage(transactions));
                return;
            }
            await message.reply('Unknown coin exchange command. Use `!exchange help`.');
        }
        catch (error) {
            const messageText = error instanceof Error ? error.message : 'Coin exchange command failed.';
            await message.reply(`Coin exchange error: ${messageText}`);
        }
    });
}
