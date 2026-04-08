"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const advanced_commands_1 = require("./advanced-commands");
const events_1 = require("./events");
const affiliates_1 = require("./affiliates");
const api_1 = require("./api");
const coin_exchange_discord_1 = require("./coin-exchange-discord");
const games_1 = require("./games");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const OWNER_DISCORD_USER_ID = process.env.OWNER_DISCORD_USER_ID ?? '';
const GAME_CHANNEL_IDS = (process.env.GAME_CHANNEL_IDS ?? process.env.GAME_CHANNEL_ID ?? '1486424943594836080')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const ALLOWED_GUILD_IDS = (process.env.DISCORD_GUILD_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const API_PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
const COMMAND_COOLDOWN_MS = process.env.COMMAND_COOLDOWN_MS ? Number(process.env.COMMAND_COOLDOWN_MS) : 1200;
const userCommandTimestamps = new Map();
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
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ],
    partials: [discord_js_1.Partials.Channel, discord_js_1.Partials.GuildMember, discord_js_1.Partials.Message]
});
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
});
// Register advanced commands (charts, stats, etc.)
(0, advanced_commands_1.registerAdvancedCommands)(client);
(0, affiliates_1.registerAffiliateCommands)(client, OWNER_DISCORD_USER_ID);
(0, coin_exchange_discord_1.registerCoinExchangeCommands)(client, OWNER_DISCORD_USER_ID);
// Start automated promo ad drops
(0, advanced_commands_1.startAutomatedAdDrops)(client);
// Announce regular events and tournaments on startup
client.once('clientReady', () => {
    (0, events_1.announceUpcomingEvents)(client);
});
client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (message.author.bot)
        return;
    if (!message.guild)
        return;
    if (ALLOWED_GUILD_IDS.length && !ALLOWED_GUILD_IDS.includes(message.guild.id))
        return;
    // Restrict to configured game channels (v14+)
    if (!GAME_CHANNEL_IDS.includes(message.channel.id))
        return;
    const now = Date.now();
    const previous = userCommandTimestamps.get(message.author.id) ?? 0;
    if (now - previous < COMMAND_COOLDOWN_MS)
        return;
    userCommandTimestamps.set(message.author.id, now);
    const content = message.content.trim().toLowerCase();
    if (content === '!ping') {
        message.reply('Pong!');
    }
    else if (content === '!coinflip') {
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        message.reply(`🪙 Coin flip: **${result}**!`);
    }
    else if (content === '!dice') {
        const roll = Math.floor(Math.random() * 6) + 1;
        message.reply(`🎲 You rolled a **${roll}**!`);
    }
    else if (content === '!roulette') {
        const colors = ['Red', 'Black', 'Green'];
        const result = colors[Math.floor(Math.random() * colors.length)];
        message.reply(`🎡 Roulette: **${result}**!`);
    }
    else if (content === '!crash') {
        const multiplier = (Math.random() * 10 + 1).toFixed(2);
        message.reply(`🚀 Crash multiplier: **${multiplier}x**!`);
    }
    else if (content === '!blackjack') {
        message.reply((0, games_1.playBlackjack)());
    }
    else if (content === '!slots') {
        const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
        const slot = () => symbols[Math.floor(Math.random() * symbols.length)];
        const result = [slot(), slot(), slot()].join(' ');
        message.reply(`🎰 Slots: ${result}`);
    }
    else if (content === '!plinko') {
        message.reply((0, games_1.playPlinko)());
    }
    else if (content === '!mines') {
        message.reply((0, games_1.playMines)());
    }
});
(0, api_1.startApiServer)(API_PORT);
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
client.login(process.env.DISCORD_TOKEN);
