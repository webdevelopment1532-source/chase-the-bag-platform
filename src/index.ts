import { registerAdvancedCommands, startAutomatedAdDrops } from './advanced-commands';
import { announceUpcomingEvents } from './events';
import { registerAffiliateCommands } from './affiliates';
import { startApiServer } from './api';
import { registerCoinExchangeCommands } from './coin-exchange-discord';
import { playBlackjack, playMines, playPlinko } from './games';
import { Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const OWNER_DISCORD_USER_ID = process.env.OWNER_DISCORD_USER_ID ?? '';
const GAME_CHANNEL_ID = process.env.GAME_CHANNEL_ID ?? '1486424943594836080';
const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
const COMMAND_COOLDOWN_MS = process.env.COMMAND_COOLDOWN_MS ? Number(process.env.COMMAND_COOLDOWN_MS) : 1200;
const userCommandTimestamps = new Map<string, number>();

if (!process.env.DISCORD_TOKEN) {
	throw new Error('Missing DISCORD_TOKEN in environment.');
}

if (!OWNER_DISCORD_USER_ID) {
	console.warn('OWNER_DISCORD_USER_ID not set. Owner-only commands will be disabled until configured.');
}

if (!Number.isFinite(API_PORT) || API_PORT < 1 || API_PORT > 65535) {
	throw new Error('API_PORT must be a valid TCP port between 1 and 65535.');
}

if (!Number.isFinite(COMMAND_COOLDOWN_MS) || COMMAND_COOLDOWN_MS < 0) {
	throw new Error('COMMAND_COOLDOWN_MS must be a number greater than or equal to 0.');
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

client.once('clientReady', () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});

// Register advanced commands (charts, stats, etc.)
registerAdvancedCommands(client);
registerAffiliateCommands(client, OWNER_DISCORD_USER_ID);
registerCoinExchangeCommands(client, OWNER_DISCORD_USER_ID);

// Start automated Stake ad drops
startAutomatedAdDrops(client);

// Announce regular events and tournaments on startup
client.once('clientReady', () => {
	announceUpcomingEvents(client);
});

client.on('messageCreate', (message: Message) => {
	// Ignore messages from bots
	if (message.author.bot) return;
	if (!message.guild) return;

	// Restrict to the game channel (v14+)
	if (message.channel.id !== GAME_CHANNEL_ID) return;

	const now = Date.now();
	const previous = userCommandTimestamps.get(message.author.id) ?? 0;
	if (now - previous < COMMAND_COOLDOWN_MS) return;
	userCommandTimestamps.set(message.author.id, now);

	const content = message.content.trim().toLowerCase();

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
	}
});

startApiServer(API_PORT);

process.on('unhandledRejection', (error) => {
	console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
});

client.login(process.env.DISCORD_TOKEN);
