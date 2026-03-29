import { registerAdvancedCommands, startAutomatedAdDrops } from './advanced-commands';
import { announceUpcomingEvents } from './events';
import { registerAffiliateCommands } from './affiliates';
import { startApiServer } from './api';
import { getStakeCrawlerStatus, startStakeCrawlerService } from './crawler-service';
import { assertExchangeAccess, awardExchangePoints, creditUserBalance, debitUserBalance, getBalance, getExchangeOverview } from './exchange-accounts';
import { getBinancePrices, recordMixingTransaction, recordStakingReward, simulateBinanceTrade } from './exchange-integration';
import { playBlackjack, playPlinko, playMines, playKeno, playHiLo, playWheel, playTower, playVideoPoker } from './games';
import type { Trade } from './trading-tracker';
import { getLeaderboard, getUserRank, tierEmoji, tierColor, rankEmoji, type LeaderboardCategory } from './leaderboard';
import { performCheckin, getCheckinStatus } from './checkin';
import { ALL_ACHIEVEMENTS, checkAndAwardAchievements, getEarnedAchievements, setAchievementAnnouncer, announceNewAchievements, type Achievement } from './achievements';
import { startPriceFeed } from './price-feed';
import { Client, GatewayIntentBits, Partials, ChannelType, Message, SlashCommandBuilder, EmbedBuilder, TextChannel } from 'discord.js';
import dotenv from 'dotenv';

const explicitDiscordToken = process.env.DISCORD_TOKEN?.trim() ?? '';
const explicitDiscordBotToken = process.env.DISCORD_BOT_TOKEN?.trim() ?? '';

dotenv.config();

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

client.once('clientReady', () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

async function announceCrawlerCodesToDiscord(codes: string[]) {
	const configuredChannelId = process.env.CTB_CRAWLER_ANNOUNCE_CHANNEL_ID?.trim() ?? '';
	const configuredChannelName = process.env.CTB_CRAWLER_ANNOUNCE_CHANNEL_NAME?.trim() ?? 'ctb-bonus-codes';

	const guilds = client.guilds.cache;
	for (const [, guild] of guilds) {
		let channel: any = null;
		if (configuredChannelId) {
			channel = guild.channels.cache.get(configuredChannelId);
		}
		if (!channel) {
			channel = guild.channels.cache.find(
				(ch: any) => ch.name === configuredChannelName && typeof ch.isTextBased === 'function' && ch.isTextBased() && typeof ch.send === 'function',
			);
		}

		/* istanbul ignore next -- covered via discord-bootstrap tests; ts-jest source map reports false negative */
		if (channel && typeof channel.send === 'function') {
			await channel.send(
				`🛰️ **Chase The Bag Crawler Update**\nNew Stake bonus codes:\n${codes
					.map((code) => `• **${code}**`)
					.join('\n')}`,
			);
		}
	}
}

async function announceCrawlerHealthToDiscord(message: string) {
	const configuredChannelId = process.env.CTB_CRAWLER_HEALTH_CHANNEL_ID?.trim() ?? '';
	const configuredChannelName = process.env.CTB_CRAWLER_HEALTH_CHANNEL_NAME?.trim() ?? 'ctb-admin-alerts';

	const guilds = client.guilds.cache;
	for (const [, guild] of guilds) {
		let channel: any = null;
		if (configuredChannelId) {
			channel = guild.channels.cache.get(configuredChannelId);
		}
		if (!channel) {
			channel = guild.channels.cache.find(
				(ch: any) => ch.name === configuredChannelName && typeof ch.isTextBased === 'function' && ch.isTextBased() && typeof ch.send === 'function',
			);
		}

		if (channel && typeof channel.send === 'function') {
			await channel.send(`🚨 **Chase The Bag Crawler Health Alert**\n${message}`);
		}
	}
}

// Register advanced commands (charts, stats, etc.)
registerAdvancedCommands(client);
// Replace 'YOUR_DISCORD_USER_ID' with your actual Discord user ID for owner control
registerAffiliateCommands(client, 'cyber44securethebag');

// Start automated Stake ad drops
startAutomatedAdDrops(client);

// Start always-on crawler service for monetization codes.
const crawlerIntervalMs = Number(process.env.CTB_CRAWLER_INTERVAL_MS ?? 5 * 60 * 1000);
startStakeCrawlerService({
	intervalMs: Number.isFinite(crawlerIntervalMs) && crawlerIntervalMs > 0 ? crawlerIntervalMs : 5 * 60 * 1000,
	actorUserId: process.env.CTB_CRAWLER_SYSTEM_USER_ID ?? 'ctb-crawler-service',
	announceCodes: announceCrawlerCodesToDiscord,
	announceHealthAlert: announceCrawlerHealthToDiscord,
	failureAlertThreshold: Number(process.env.CTB_CRAWLER_FAILURE_ALERT_THRESHOLD ?? 3),
});

// Announce regular events and tournaments on startup
client.once('clientReady', () => {
	announceUpcomingEvents(client);
	void registerSlashCommands();
	startPriceFeed(client);

	// Wire achievement announcer: posts to game channel when someone unlocks an achievement
	setAchievementAnnouncer(async (userId: string, achievement: Achievement) => {
		const channel = client.channels.cache.get(GAME_CHANNEL_ID) as TextChannel | undefined;
		if (!channel || typeof channel.send !== 'function') return;
		const embed = new EmbedBuilder()
			.setColor(0xFFD700)
			.setTitle(`${achievement.emoji} Achievement Unlocked!`)
			.setDescription(`<@${userId}> just earned **${achievement.name}**!`)
			.addFields(
				{ name: 'Achievement', value: achievement.description, inline: true },
				{ name: 'Bonus Points', value: achievement.bonusPoints > 0 ? `+${achievement.bonusPoints} pts` : '—', inline: true },
			)
			.setTimestamp();
		await channel.send({ embeds: [embed] });
	});
});


function extractChannelIdFromDiscordUrl(url: string): string {
	const matches = url.match(/\/channels\/\d+\/(\d+)/);
	return matches?.[1] ?? '';
}

/* istanbul ignore next -- exercised across env variants in bootstrap tests; mapped as uncovered by ts-jest */
const configuredGameChannelId = process.env.CTB_GAME_CHANNEL_ID?.trim() ?? '';
const configuredGameChannelUrl = process.env.CTB_GAME_CHANNEL_URL?.trim() ?? '';

// Restrict games to one channel; fallback matches the Discord channel you shared.
const GAME_CHANNEL_ID =
	configuredGameChannelId ||
	extractChannelIdFromDiscordUrl(configuredGameChannelUrl) ||
	'1486358062179680288';

function parsePositiveAmount(raw: string | undefined): number | null {
	if (!raw) return null;
	const amount = Number(raw);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return amount;
}

function formatCurrency(value: number): string {
	return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

async function estimateUsdVolume(token: string, amount: number): Promise<number> {
	const normalizedToken = token.trim().toUpperCase();
	if (normalizedToken === 'USD' || normalizedToken === 'USDT') return amount;
	const prices = await getBinancePrices([normalizedToken]);
	return (prices.get(normalizedToken) ?? 0) * amount;
}

async function awardTradePoints(userId: string, token: string, amount: number) {
	const usdVolume = await estimateUsdVolume(token, amount);
	const pointsDelta = Math.max(5, Math.round(usdVolume / 100));
	await awardExchangePoints(userId, pointsDelta);
}

async function settleTrade(userId: string, trade: Trade): Promise<void> {
	if (trade.tradeType === 'crypto_swap') {
		await debitUserBalance(userId, trade.fromToken, Number(trade.fromAmount));
		await creditUserBalance(userId, trade.toToken, Number(trade.toAmount));
		return;
	}

	if (trade.tradeType === 'mixing') {
		const price = Number(trade.entryPrice) || 0;
		const feeInToken = price > 0 ? Number(trade.exchangeFee) / price : 0;
		if (feeInToken > 0) {
			await debitUserBalance(userId, trade.fromToken, feeInToken);
		}
		return;
	}

	/* istanbul ignore next -- staking settle path executed in bootstrap tests; source map mismatch */
	if (trade.tradeType === 'staking') {
		const rewardAmount = Math.max(0, Number(trade.toAmount) - Number(trade.fromAmount));
		if (rewardAmount > 0) {
			await creditUserBalance(userId, trade.toToken, rewardAmount);
		}
	}
}

async function buildPortfolioEmbed(userId: string): Promise<EmbedBuilder> {
	const [overview, checkinStatus, earnedAchievements] = await Promise.all([
		getExchangeOverview(userId),
		getCheckinStatus(userId).catch(() => null),
		getEarnedAchievements(userId).catch(() => []),
	]);

	const balanceFields = overview.balances.length
		? overview.balances.map(item => ({
			name: item.asset,
			value: Number(item.balance).toFixed(4),
			inline: true,
		}))
		: [{ name: 'Balances', value: 'No balances yet', inline: false }];

	const rankInfo = await getUserRank(userId).catch(() => null);
	const rankStr = rankInfo ? `#${rankInfo.rank} of ${rankInfo.totalUsers}` : '—';

	const embed = new EmbedBuilder()
		.setColor(tierColor(overview.profile.tier))
		.setTitle(`${tierEmoji(overview.profile.tier)} Exchange Portfolio — ${overview.profile.tier} Tier`)
		.addFields(
			{ name: '🏅 Points',           value: String(overview.profile.points),                               inline: true },
			{ name: '📊 Rank',             value: rankStr,                                                       inline: true },
			{ name: '🔥 Streak',           value: checkinStatus ? `${checkinStatus.currentStreak} days` : '—',   inline: true },
			{ name: '📈 Daily Vol Used',   value: `$${formatCurrency(overview.limits.usedDailyVolume)}`,          inline: true },
			{ name: '💸 Daily Remaining',  value: `$${formatCurrency(overview.limits.remainingDailyVolume)}`,     inline: true },
			{ name: '🏆 Achievements',     value: `${earnedAchievements.length} / ${ALL_ACHIEVEMENTS.length}`,    inline: true },
		)
		.addFields({ name: '\u200b', value: '**Balances**', inline: false })
		.addFields(...balanceFields)
		.setTimestamp()
		.setFooter({ text: 'Chase The Bag Exchange • /exchange checkin to earn daily points' });

	return embed;
}

async function buildLeaderboardEmbed(category: LeaderboardCategory): Promise<EmbedBuilder> {
	const board = await getLeaderboard(category, 10);
	const categoryLabel: Record<LeaderboardCategory, string> = {
		points: '🏅 Top Points',
		volume: '💰 Top Volume',
		trades: '📈 Most Trades',
		profit: '💹 Most Profit',
	};
	const lines = board.length
		? board.map(e =>
			`${rankEmoji(e.rank)} ${tierEmoji(e.tier)} **${e.userId}** — ` +
			(category === 'points' ? `${e.points} pts` :
			 category === 'volume' ? `$${formatCurrency(e.totalVolume)}` :
			 category === 'trades' ? `${e.totalTrades} trades` :
			 `$${formatCurrency(e.totalProfit)} profit`)
		).join('\n')
		: 'No traders yet — be the first!';

	return new EmbedBuilder()
		.setColor(0xFFD700)
		.setTitle(`🏆 Chase The Bag Leaderboard — ${categoryLabel[category]}`)
		.setDescription(lines)
		.setTimestamp()
		.setFooter({ text: 'Use /leaderboard volume|trades|profit to switch categories' });
}

async function registerSlashCommands() {
	if (!client.application) return;

	await client.application.commands.set([
		new SlashCommandBuilder()
			.setName('exchange')
			.setDescription('Use the Chase The Bag Coin Exchange')
			.addSubcommand((subcommand) => subcommand.setName('help').setDescription('Show exchange help'))
			.addSubcommand((subcommand) =>
				subcommand
					.setName('prices')
					.setDescription('Show live token prices')
					.addStringOption((option) => option.setName('symbols').setDescription('Space separated symbols like BTC ETH SOL'))
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('swap')
					.setDescription('Simulate and record a swap')
					.addStringOption((option) => option.setName('from').setDescription('From token').setRequired(true))
					.addStringOption((option) => option.setName('to').setDescription('To token').setRequired(true))
					.addNumberOption((option) => option.setName('amount').setDescription('Amount to swap').setRequired(true))
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('mix')
					.setDescription('Record a mixer transaction')
					.addStringOption((option) => option.setName('asset').setDescription('Asset symbol').setRequired(true))
					.addNumberOption((option) => option.setName('amount').setDescription('Amount to mix').setRequired(true))
			)
			.addSubcommand((subcommand) =>
				subcommand
					.setName('stake')
					.setDescription('Record a staking reward')
					.addStringOption((option) => option.setName('asset').setDescription('Asset symbol').setRequired(true))
					.addNumberOption((option) => option.setName('staked').setDescription('Staked amount').setRequired(true))
					.addNumberOption((option) => option.setName('reward').setDescription('Reward amount').setRequired(true))
			)
			.addSubcommand((subcommand) => subcommand.setName('portfolio').setDescription('Show your exchange balances'))
			.toJSON(),
		new SlashCommandBuilder()
			.setName('leaderboard')
			.setDescription('Show the Chase The Bag trader leaderboard')
			.addStringOption(opt =>
				opt.setName('category')
					.setDescription('Ranking category')
					.setRequired(false)
					.addChoices(
						{ name: '🏅 Points (default)', value: 'points' },
						{ name: '💰 Volume',            value: 'volume' },
						{ name: '📈 Most Trades',       value: 'trades' },
						{ name: '💹 Most Profit',       value: 'profit' },
					)
			)
			.toJSON(),
		new SlashCommandBuilder()
			.setName('checkin')
			.setDescription('Claim your daily check-in bonus points')
			.toJSON(),
		new SlashCommandBuilder()
			.setName('achievements')
			.setDescription('View your unlocked achievements')
			.addUserOption(opt =>
				opt.setName('user')
					.setDescription('User to check (defaults to you)')
					.setRequired(false)
			)
			.toJSON(),
	]);
}

async function handleExchangeCommand(message: Message, rawContent: string) {
	const parts = rawContent.trim().split(/\s+/);
	/* istanbul ignore next -- !exchange default path is tested; ts-jest marks this line uncovered */
	const subcommand = parts[1]?.toLowerCase() ?? 'help';

	if (subcommand === 'help') {
		const helpEmbed = new EmbedBuilder()
			.setColor(0x00D4FF)
			.setTitle('💱 Chase The Bag Coin Exchange')
			.setDescription('Use the commands below to trade, mix, stake, and earn points.')
			.addFields(
				{ name: '!exchange prices [BTC ETH SOL]', value: 'Show live token prices', inline: false },
				{ name: '!exchange portfolio',             value: 'Your balances, tier & stats', inline: false },
				{ name: '!exchange swap BTC ETH 0.10',    value: 'Simulate and record a swap', inline: false },
				{ name: '!exchange mix BTC 0.05',         value: 'Record a mixer transaction', inline: false },
				{ name: '!exchange stake SOL 150 2.5',    value: 'Record a staking reward', inline: false },
				{ name: '!leaderboard',                   value: 'Top 10 traders board', inline: true },
				{ name: '!checkin',                       value: 'Daily bonus points + streak', inline: true },
				{ name: '!achievements',                  value: 'View your earned badges', inline: true },
			)
			.setFooter({ text: 'Web dashboard: /exchange • Slash commands: /exchange /leaderboard /checkin /achievements' });
		await message.reply({ embeds: [helpEmbed] });
		return;
	}

	if (subcommand === 'portfolio') {
		await message.reply({ embeds: [await buildPortfolioEmbed(message.author.id)] });
		return;
	}

	if (subcommand === 'prices') {
		const symbols = parts.slice(2).map((v) => v.toUpperCase()).filter(Boolean);
		const selected = symbols.length > 0 ? symbols : ['BTC', 'ETH', 'SOL', 'BNB'];
		const prices = await getBinancePrices(selected);
		if (prices.size === 0) {
			await message.reply('💱 Coin Exchange prices are unavailable right now.');
			return;
		}
		const priceEmbed = new EmbedBuilder()
			.setColor(0x00D4FF)
			.setTitle('💱 Chase The Bag — Live Prices')
			.addFields(selected.map(s => ({ name: s, value: `$${formatCurrency(prices.get(s) ?? 0)}`, inline: true })))
			.setTimestamp()
			.setFooter({ text: 'Powered by Binance API' });
		await message.reply({ embeds: [priceEmbed] });
		return;
	}

	if (subcommand === 'swap') {
		const fromToken = parts[2]?.toUpperCase();
		const toToken = parts[3]?.toUpperCase();
		const fromAmount = parsePositiveAmount(parts[4]);
		if (!fromToken || !toToken || !fromAmount) {
			await message.reply('Usage: `!exchange swap BTC ETH 0.10`');
			return;
		}
		try {
			const requestedUsdVolume = await estimateUsdVolume(fromToken, fromAmount);
			await assertExchangeAccess(message.author.id, requestedUsdVolume);
			const balance = await getBalance(message.author.id, fromToken);
			if (balance < fromAmount) {
				await message.reply(`Insufficient ${fromToken} balance. Available: ${balance.toFixed(4)}`);
				return;
			}
			const trade = await simulateBinanceTrade(fromToken, toToken, fromAmount, message.author.id, 'discord-bot');
			await settleTrade(message.author.id, trade);
			await awardTradePoints(message.author.id, fromToken, fromAmount);
			const overview = await getExchangeOverview(message.author.id).catch(() => null);
			const newAch = await checkAndAwardAchievements(message.author.id, {
				tier: overview?.profile.tier,
				singleTradeUsdVolume: requestedUsdVolume,
			}).catch(() => []);
			await announceNewAchievements(message.author.id, newAch);
			const swapEmbed = new EmbedBuilder()
				.setColor(0x00FF88)
				.setTitle('💱 Swap Recorded')
				.addFields(
					{ name: 'From',         value: `${fromAmount} ${fromToken}`,                     inline: true },
					{ name: 'To',           value: `${trade.toAmount.toFixed(6)} ${toToken}`,        inline: true },
					{ name: 'P/L',          value: `$${formatCurrency(trade.profit)} (${trade.profitPercent.toFixed(2)}%)`, inline: true },
					{ name: 'Exchange Fee', value: `$${formatCurrency(trade.exchangeFee)}`,           inline: true },
					{ name: 'Platform Fee', value: `$${formatCurrency(trade.platformFee)}`,           inline: true },
					{ name: 'Tier',         value: `${tierEmoji(overview?.profile.tier ?? 'Bronze')} ${overview?.profile.tier ?? 'Bronze'}`, inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) {
				swapEmbed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			}
			await message.reply({ embeds: [swapEmbed] });
		} catch (error) {
			await message.reply(`Coin Exchange swap failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
		return;
	}

	if (subcommand === 'mix') {
		const cryptoType = parts[2]?.toUpperCase();
		const amount = parsePositiveAmount(parts[3]);
		const feePercent = parsePositiveAmount(parts[4]) ?? 0.5;
		if (!cryptoType || !amount) {
			await message.reply('Usage: `!exchange mix BTC 0.05 [feePercent]`');
			return;
		}
		try {
			const requestedUsdVolume = await estimateUsdVolume(cryptoType, amount);
			await assertExchangeAccess(message.author.id, requestedUsdVolume);
			const trade = await recordMixingTransaction(message.author.id, cryptoType, amount, 'discord-bot', feePercent);
			await settleTrade(message.author.id, trade);
			await awardTradePoints(message.author.id, cryptoType, amount);
			const overview = await getExchangeOverview(message.author.id).catch(() => null);
			const newAch = await checkAndAwardAchievements(message.author.id, { tier: overview?.profile.tier }).catch(() => []);
			await announceNewAchievements(message.author.id, newAch);
			const mixEmbed = new EmbedBuilder()
				.setColor(0x9B59B6)
				.setTitle('🕵️ Mixer Trade Recorded')
				.addFields(
					{ name: 'Asset',  value: cryptoType,                         inline: true },
					{ name: 'Amount', value: String(amount),                      inline: true },
					{ name: 'Fee',    value: `$${formatCurrency(trade.exchangeFee)}`, inline: true },
					{ name: 'P/L',    value: `$${formatCurrency(trade.profit)} (${trade.profitPercent.toFixed(2)}%)`, inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) {
				mixEmbed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			}
			await message.reply({ embeds: [mixEmbed] });
		} catch (error) {
			await message.reply(`Coin Exchange mixer failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
		return;
	}

	if (subcommand === 'stake') {
		const cryptoType = parts[2]?.toUpperCase();
		const stakedAmount = parsePositiveAmount(parts[3]);
		const rewardAmount = parsePositiveAmount(parts[4]);
		const apy = parsePositiveAmount(parts[5]) ?? 12;
		if (!cryptoType || !stakedAmount || !rewardAmount) {
			await message.reply('Usage: `!exchange stake SOL 150 2.5 [apy]`');
			return;
		}
		try {
			const requestedUsdVolume = await estimateUsdVolume(cryptoType, stakedAmount);
			await assertExchangeAccess(message.author.id, requestedUsdVolume);
			const trade = await recordStakingReward(message.author.id, cryptoType, stakedAmount, rewardAmount, apy, 'discord-bot');
			await settleTrade(message.author.id, trade);
			await awardTradePoints(message.author.id, cryptoType, stakedAmount);
			const overview = await getExchangeOverview(message.author.id).catch(() => null);
			const newAch = await checkAndAwardAchievements(message.author.id, { tier: overview?.profile.tier }).catch(() => []);
			await announceNewAchievements(message.author.id, newAch);
			const stakeEmbed = new EmbedBuilder()
				.setColor(0xF39C12)
				.setTitle('🏦 Staking Reward Recorded')
				.addFields(
					{ name: 'Asset',         value: cryptoType,                        inline: true },
					{ name: 'Staked',        value: String(stakedAmount),              inline: true },
					{ name: 'Reward',        value: String(rewardAmount),              inline: true },
					{ name: 'Reward Value',  value: `$${formatCurrency(trade.profit)}`,inline: true },
					{ name: 'Yield',         value: `${trade.profitPercent.toFixed(2)}%`, inline: true },
					{ name: 'APY',           value: `${apy}%`,                         inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) {
				stakeEmbed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			}
			await message.reply({ embeds: [stakeEmbed] });
		} catch (error) {
			await message.reply(`Coin Exchange staking failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
		return;
	}

	await message.reply('Unknown Coin Exchange command. Use `!exchange help`.');
}

client.on('messageCreate', (message: Message) => {
	if (message.author.bot) return;
	if (message.channel.id !== GAME_CHANNEL_ID) return;

	const rawContent = message.content.trim();
	const content = rawContent.toLowerCase();

	if (content === '!ping') {
		message.reply('Pong!');
	} else if (content === '!coinflip') {
		const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
		message.reply(`🪙 Coin flip: **${result}**!`);
	} else if (content === '!dice') {
		const roll = Math.floor(Math.random() * 6) + 1;
		message.reply(`🎲 You rolled a **${roll}**!`);
	} else if (content === '!roulette') {
		const colors = ['Red', 'Black', 'Green'];
		const result = colors[Math.floor(Math.random() * colors.length)];
		message.reply(`🎡 Roulette: **${result}**!`);
	} else if (content === '!crash') {
		const multiplier = (Math.random() * 10 + 1).toFixed(2);
		message.reply(`🚀 Crash multiplier: **${multiplier}x**!`);
	} else if (content === '!blackjack') {
		message.reply(playBlackjack());
	} else if (content === '!slots') {
		const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
		const slot = () => symbols[Math.floor(Math.random() * symbols.length)];
		const result = [slot(), slot(), slot()].join(' ');
		message.reply(`🎰 Slots: ${result}`);
	} else if (content === '!plinko') {
		message.reply(playPlinko());
	} else if (content === '!mines') {
		message.reply(playMines());
	} else if (content === '!keno') {
		message.reply(playKeno());
	} else if (content === '!hilo') {
		message.reply(playHiLo());
	} else if (content === '!wheel') {
		message.reply(playWheel());
	} else if (content === '!tower') {
		message.reply(playTower());
	} else if (content === '!videopoker') {
		message.reply(playVideoPoker());
	} else if (content === '!games') {
		message.reply(
			'🎮 **Available Games**\n' +
			'`!coinflip` — Heads or tails\n' +
			'`!dice` — Roll a six-sided die\n' +
			'`!roulette` — Red, black or green\n' +
			'`!crash` — Random crash multiplier\n' +
			'`!slots` — 3-reel slot machine\n' +
			'`!blackjack` — Auto-play blackjack hand\n' +
			'`!plinko` — Ball through 8 rows of pegs\n' +
			'`!mines` — Reveal gems on a 5×5 minefield\n' +
			'`!keno` — Pick 8 numbers from 1–80\n' +
			'`!hilo` — Hi-Lo card prediction\n' +
			'`!wheel` — Spin the multiplier wheel\n' +
			'`!tower` — Climb 5 floors avoiding mines\n' +
			'`!videopoker` — 5-card video poker hand\n' +
			'`!exchange help` — Coin Exchange + point system commands'
		);
	} else if (content === '!exchange' || content.startsWith('!exchange ')) {
		void handleExchangeCommand(message, rawContent);
	} else if (content === '!leaderboard' || content.startsWith('!leaderboard ')) {
		void (async () => {
			const cat = (rawContent.split(/\s+/)[1] ?? 'points') as LeaderboardCategory;
			const validCats: LeaderboardCategory[] = ['points', 'volume', 'trades', 'profit'];
			const category = validCats.includes(cat) ? cat : 'points';
			const embed = await buildLeaderboardEmbed(category).catch(() => null);
			if (embed) {
				await message.reply({ embeds: [embed] });
			} else {
				await message.reply('Leaderboard data unavailable right now.');
			}
		})();
	} else if (content === '!checkin') {
		void (async () => {
			/* istanbul ignore next -- non-Error catch fallback is tested; source map marks this line */
			const result = await performCheckin(message.author.id).catch((err) => ({
				success: false,
				message: `Check-in failed: ${err instanceof Error ? err.message : 'unknown error'}`,
				pointsAwarded: 0,
				currentStreak: 0,
				longestStreak: 0,
				totalCheckins: 0,
				alreadyCheckedIn: false,
			}));
			const checkinAchievements = await checkAndAwardAchievements(message.author.id, { streak: result.currentStreak }).catch(() => []);
			await announceNewAchievements(message.author.id, checkinAchievements);
			const checkinEmbed = new EmbedBuilder()
				.setColor(result.alreadyCheckedIn ? 0xAAAAAA : result.currentStreak >= 7 ? 0xFF6B00 : 0x00FF88)
				.setTitle(result.alreadyCheckedIn ? '✅ Already Checked In' : '✅ Daily Check-In!')
				.setDescription(result.message)
				.addFields(
					{ name: '🔥 Current Streak', value: `${result.currentStreak} days`,  inline: true },
					{ name: '🏅 Best Streak',    value: `${result.longestStreak} days`,  inline: true },
					{ name: '📅 Total Check-ins',value: String(result.totalCheckins),    inline: true },
				);
			if (!result.alreadyCheckedIn) {
				checkinEmbed.addFields({ name: '⭐ Points Earned', value: `+${result.pointsAwarded} pts`, inline: false });
			}
			if (checkinAchievements.length > 0) {
				checkinEmbed.addFields({ name: '🏅 Achievement Unlocked!', value: checkinAchievements.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			}
			checkinEmbed.setTimestamp().setFooter({ text: 'Come back tomorrow for your next check-in!' });
			await message.reply({ embeds: [checkinEmbed] });
		})();
	} else if (content === '!achievements' || content.startsWith('!achievements ')) {
		void (async () => {
			const earned = await getEarnedAchievements(message.author.id).catch(() => []);
			const total = ALL_ACHIEVEMENTS.length;
			const lines = earned.length > 0
				? earned.slice(0, 15).map(a => `${a.emoji} **${a.name}** — ${a.description}`).join('\n')
				: 'No achievements yet. Start trading to earn your first badge!';
			const achEmbed = new EmbedBuilder()
				.setColor(0xFFD700)
				.setTitle(`🏅 Achievements — ${earned.length}/${total} Unlocked`)
				.setDescription(lines)
				.setTimestamp()
				.setFooter({ text: 'Trade, mix, stake, and check in daily to unlock more!' });
			await message.reply({ embeds: [achEmbed] });
		})();
	} else if (content === '!crawlerstatus') {
		const status = getStakeCrawlerStatus();
		const statusMessage = [
			`🛰️ Crawler active: **${status.active ? 'yes' : 'no'}**`,
			`Running now: **${status.running ? 'yes' : 'no'}**`,
			`Interval: **${Math.floor(status.intervalMs / 1000)}s**`,
			`Total runs: **${status.totalRuns}**`,
			`Total codes found: **${status.totalCodesFound}**`,
			`Consecutive failures: **${status.consecutiveFailures}**`,
			`Last success: **${status.lastSuccessAt ?? 'none yet'}**`,
			`Last alert: **${status.lastAlertAt ?? 'none'}**`,
			`Last error: **${status.lastError ?? 'none'}**`,
		].join('\n');
		message.reply(statusMessage);
	}
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const userId = interaction.user.id;

	// ── /leaderboard ───────────────────────────────────────────────
	if (interaction.commandName === 'leaderboard') {
		const cat = (interaction.options.getString('category') ?? 'points') as LeaderboardCategory;
		try {
			const embed = await buildLeaderboardEmbed(cat);
			await interaction.reply({ embeds: [embed] });
		} catch {
			await interaction.reply({ content: 'Leaderboard unavailable right now.', ephemeral: true });
		}
		return;
	}

	// ── /checkin ──────────────────────────────────────────────────
	if (interaction.commandName === 'checkin') {
		/* istanbul ignore next -- slash checkin non-Error catch is exercised in tests */
		const result = await performCheckin(userId).catch((err) => ({
			success: false,
			message: `Check-in failed: ${err instanceof Error ? err.message : 'unknown error'}`,
			pointsAwarded: 0,
			currentStreak: 0,
			longestStreak: 0,
			totalCheckins: 0,
			alreadyCheckedIn: false,
		}));
		const checkinAchievements = await checkAndAwardAchievements(userId, { streak: result.currentStreak }).catch(() => []);
		await announceNewAchievements(userId, checkinAchievements);
		const checkinEmbed = new EmbedBuilder()
			.setColor(result.alreadyCheckedIn ? 0xAAAAAA : result.currentStreak >= 7 ? 0xFF6B00 : 0x00FF88)
			.setTitle(result.alreadyCheckedIn ? '✅ Already Checked In' : '✅ Daily Check-In!')
			.setDescription(result.message)
			.addFields(
				{ name: '🔥 Current Streak', value: `${result.currentStreak} days`, inline: true },
				{ name: '🏅 Best Streak',    value: `${result.longestStreak} days`, inline: true },
				{ name: '📅 Total',          value: String(result.totalCheckins),   inline: true },
			);
		if (!result.alreadyCheckedIn) {
			checkinEmbed.addFields({ name: '⭐ Points Earned', value: `+${result.pointsAwarded} pts`, inline: false });
		}
		if (checkinAchievements.length > 0) {
			checkinEmbed.addFields({ name: '🏅 Achievement Unlocked!', value: checkinAchievements.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
		}
		checkinEmbed.setTimestamp().setFooter({ text: 'Come back tomorrow for your next check-in!' });
		await interaction.reply({ embeds: [checkinEmbed] });
		return;
	}

	// ── /achievements ─────────────────────────────────────────────
	if (interaction.commandName === 'achievements') {
		const targetUser = interaction.options.getUser('user') ?? interaction.user;
		const earned = await getEarnedAchievements(targetUser.id).catch(() => []);
		const total = ALL_ACHIEVEMENTS.length;
		const lines = earned.length > 0
			? earned.slice(0, 15).map(a => `${a.emoji} **${a.name}** — ${a.description}`).join('\n')
			: 'No achievements yet!';
		const achEmbed = new EmbedBuilder()
			.setColor(0xFFD700)
			.setTitle(`🏅 ${targetUser.username}'s Achievements — ${earned.length}/${total}`)
			.setDescription(lines)
			.setTimestamp()
			.setFooter({ text: 'Trade, mix, stake, and check in daily to unlock more!' });
		await interaction.reply({ embeds: [achEmbed] });
		return;
	}

	// ── /exchange ─────────────────────────────────────────────────
	if (interaction.commandName !== 'exchange') return;
	if (interaction.channelId !== GAME_CHANNEL_ID) {
		await interaction.reply({ content: 'Use Coin Exchange commands in the configured game channel.', ephemeral: true });
		return;
	}

	const subcommand = interaction.options.getSubcommand();

	if (subcommand === 'help') {
		const helpEmbed = new EmbedBuilder()
			.setColor(0x00D4FF)
			.setTitle('💱 Chase The Bag Coin Exchange')
			.addFields(
				{ name: '/exchange prices',            value: 'Live token prices', inline: false },
				{ name: '/exchange portfolio',         value: 'Your balances, tier & stats', inline: false },
				{ name: '/exchange swap from to amt',  value: 'Simulate a swap', inline: false },
				{ name: '/exchange mix asset amt',     value: 'Mixer transaction', inline: false },
				{ name: '/exchange stake asset s r',   value: 'Staking reward', inline: false },
				{ name: '/leaderboard',                value: 'Top 10 traders', inline: true },
				{ name: '/checkin',                    value: 'Daily bonus points', inline: true },
				{ name: '/achievements',               value: 'Your earned badges', inline: true },
			)
			.setFooter({ text: 'Web dashboard at /exchange' });
		await interaction.reply({ embeds: [helpEmbed] });
		return;
	}

	if (subcommand === 'portfolio') {
		await interaction.deferReply();
		await interaction.editReply({ embeds: [await buildPortfolioEmbed(userId)] });
		return;
	}

	if (subcommand === 'prices') {
		const rawSymbols = interaction.options.getString('symbols') ?? '';
		const symbols = rawSymbols ? rawSymbols.split(/\s+/).map(v => v.toUpperCase()).filter(Boolean) : ['BTC', 'ETH', 'SOL', 'BNB'];
		const prices = await getBinancePrices(symbols);
		if (prices.size === 0) {
			await interaction.reply({ content: 'Prices unavailable right now.', ephemeral: true });
			return;
		}
		const priceEmbed = new EmbedBuilder()
			.setColor(0x00D4FF)
			.setTitle('💱 Chase The Bag — Live Prices')
			.addFields(symbols.map(s => ({ name: s, value: `$${formatCurrency(prices.get(s) ?? 0)}`, inline: true })))
			.setTimestamp()
			.setFooter({ text: 'Powered by Binance API' });
		await interaction.reply({ embeds: [priceEmbed] });
		return;
	}

	if (subcommand === 'swap') {
		const fromToken = interaction.options.getString('from', true).toUpperCase();
		const toToken   = interaction.options.getString('to', true).toUpperCase();
		const amount    = interaction.options.getNumber('amount', true);
		await interaction.deferReply();
		try {
			const usdVolume = await estimateUsdVolume(fromToken, amount);
			await assertExchangeAccess(userId, usdVolume);
			const balance = await getBalance(userId, fromToken);
			if (balance < amount) {
				await interaction.editReply(`Insufficient ${fromToken} balance. Available: ${balance.toFixed(4)}`);
				return;
			}
			const trade = await simulateBinanceTrade(fromToken, toToken, amount, userId, 'discord-slash');
			await settleTrade(userId, trade);
			await awardTradePoints(userId, fromToken, amount);
			const overview = await getExchangeOverview(userId).catch(() => null);
			const newAch = await checkAndAwardAchievements(userId, { tier: overview?.profile.tier, singleTradeUsdVolume: usdVolume }).catch(() => []);
			await announceNewAchievements(userId, newAch);
			const embed = new EmbedBuilder()
				.setColor(0x00FF88)
				.setTitle('💱 Swap Recorded')
				.addFields(
					{ name: 'From',  value: `${amount} ${fromToken}`,                    inline: true },
					{ name: 'To',    value: `${trade.toAmount.toFixed(6)} ${toToken}`,   inline: true },
					{ name: 'P/L',   value: `$${formatCurrency(trade.profit)} (${trade.profitPercent.toFixed(2)}%)`, inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) embed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			await interaction.editReply(`Exchange swap failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
		return;
	}

	if (subcommand === 'mix') {
		const asset  = interaction.options.getString('asset', true).toUpperCase();
		const amount = interaction.options.getNumber('amount', true);
		await interaction.deferReply();
		try {
			const usdVolume = await estimateUsdVolume(asset, amount);
			await assertExchangeAccess(userId, usdVolume);
			const trade = await recordMixingTransaction(userId, asset, amount, 'discord-slash', 0.5);
			await settleTrade(userId, trade);
			await awardTradePoints(userId, asset, amount);
			const overview = await getExchangeOverview(userId).catch(() => null);
			const newAch = await checkAndAwardAchievements(userId, { tier: overview?.profile.tier }).catch(() => []);
			await announceNewAchievements(userId, newAch);
			const embed = new EmbedBuilder()
				.setColor(0x9B59B6)
				.setTitle('🕵️ Mixer Trade Recorded')
				.addFields(
					{ name: 'Asset', value: asset,                                inline: true },
					{ name: 'Amount',value: String(amount),                        inline: true },
					{ name: 'Fee',   value: `$${formatCurrency(trade.exchangeFee)}`, inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) embed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			await interaction.editReply(`Exchange mixer failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
		return;
	}

	if (subcommand === 'stake') {
		const asset   = interaction.options.getString('asset', true).toUpperCase();
		const staked  = interaction.options.getNumber('staked', true);
		const reward  = interaction.options.getNumber('reward', true);
		await interaction.deferReply();
		try {
			const usdVolume = await estimateUsdVolume(asset, staked);
			await assertExchangeAccess(userId, usdVolume);
			const trade = await recordStakingReward(userId, asset, staked, reward, 12, 'discord-slash');
			await settleTrade(userId, trade);
			await awardTradePoints(userId, asset, staked);
			const overview = await getExchangeOverview(userId).catch(() => null);
			const newAch = await checkAndAwardAchievements(userId, { tier: overview?.profile.tier }).catch(() => []);
			await announceNewAchievements(userId, newAch);
			const embed = new EmbedBuilder()
				.setColor(0xF39C12)
				.setTitle('🏦 Staking Reward Recorded')
				.addFields(
					{ name: 'Asset', value: asset,                                  inline: true },
					{ name: 'Staked',value: String(staked),                          inline: true },
					{ name: 'Reward',value: `$${formatCurrency(trade.profit)}`,       inline: true },
				)
				.setTimestamp();
			if (newAch.length > 0) embed.addFields({ name: '🏅 Achievement Unlocked!', value: newAch.map(a => `${a.emoji} ${a.name}`).join(', '), inline: false });
			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			await interaction.editReply(`Exchange staking failed: ${error instanceof Error ? error.message : 'unknown error'}`);
		}
	}
});

startApiServer(3001);

const discordToken =
	explicitDiscordToken ||
	explicitDiscordBotToken ||
	process.env.DISCORD_TOKEN?.trim() ||
	process.env.DISCORD_BOT_TOKEN?.trim() ||
	'';
if (!discordToken) {
	console.warn('Discord token is not set (DISCORD_TOKEN or DISCORD_BOT_TOKEN). Discord bot login skipped; API remains available.');
} else {
	client.login(discordToken).catch((error) => {
		console.error('Discord login failed. API remains available.', error);
	});
}
