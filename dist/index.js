"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const advanced_commands_1 = require("./advanced-commands");
const events_1 = require("./events");
const affiliates_1 = require("./affiliates");
const api_1 = require("./api");
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
// Replace 'YOUR_DISCORD_USER_ID' with your actual Discord user ID for owner control
(0, affiliates_1.registerAffiliateCommands)(client, 'cyber44securethebag');
// Start automated Stake ad drops
(0, advanced_commands_1.startAutomatedAdDrops)(client);
// Announce regular events and tournaments on startup
client.once('clientReady', () => {
    (0, events_1.announceUpcomingEvents)(client);
});
// Channel ID to restrict games to (from https://discord.com/channels/1486424942768685249/1486424943594836080)
const GAME_CHANNEL_ID = '1486424943594836080';
client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (message.author.bot)
        return;
    // Restrict to the game channel (v14+)
    if (message.channel.id !== GAME_CHANNEL_ID)
        return;
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
        message.reply('🃏 Blackjack: (Game logic coming soon!)');
    }
    else if (content === '!slots') {
        const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
        const slot = () => symbols[Math.floor(Math.random() * symbols.length)];
        const result = [slot(), slot(), slot()].join(' ');
        message.reply(`🎰 Slots: ${result}`);
    }
    else if (content === '!plinko') {
        message.reply('🔵 Plinko: (Game logic coming soon!)');
    }
    else if (content === '!mines') {
        message.reply('💣 Mines: (Game logic coming soon!)');
    }
});
(0, api_1.startApiServer)(3001);
client.login(process.env.DISCORD_TOKEN);
