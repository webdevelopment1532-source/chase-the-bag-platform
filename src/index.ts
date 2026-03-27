import { registerAdvancedCommands, startAutomatedAdDrops } from './advanced-commands';
import { announceUpcomingEvents } from './events';
import { registerAffiliateCommands } from './affiliates';
import { startApiServer } from './api';
import { Client, GatewayIntentBits, Partials, ChannelType, Message } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

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
// Replace 'YOUR_DISCORD_USER_ID' with your actual Discord user ID for owner control
registerAffiliateCommands(client, 'cyber44securethebag');

// Start automated Stake ad drops
startAutomatedAdDrops(client);

// Announce regular events and tournaments on startup
client.once('clientReady', () => {
	announceUpcomingEvents(client);
});


// Channel ID to restrict games to (from https://discord.com/channels/1486424942768685249/1486424943594836080)
const GAME_CHANNEL_ID = '1486424943594836080';

client.on('messageCreate', (message: Message) => {
	// Ignore messages from bots
	if (message.author.bot) return;

	// Restrict to the game channel (v14+)
	if (message.channel.id !== GAME_CHANNEL_ID) return;

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
		message.reply('🃏 Blackjack: (Game logic coming soon!)');
	} else if (content === '!slots') {
		const symbols = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
		const slot = () => symbols[Math.floor(Math.random() * symbols.length)];
		const result = [slot(), slot(), slot()].join(' ');
		message.reply(`🎰 Slots: ${result}`);
	} else if (content === '!plinko') {
		message.reply('🔵 Plinko: (Game logic coming soon!)');
	} else if (content === '!mines') {
		message.reply('💣 Mines: (Game logic coming soon!)');
	}
});

startApiServer(3001);
client.login(process.env.DISCORD_TOKEN);
