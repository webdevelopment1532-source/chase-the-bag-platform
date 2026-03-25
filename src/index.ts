import { Client, GatewayIntentBits, Message } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
	console.log(`Logged in as ${client.user?.tag}!`);
});


// Channel name to restrict games to
const GAME_CHANNEL = 'coin-exchange-payed-games';

client.on('messageCreate', (message: Message) => {
	// Ignore messages from bots
	if (message.author.bot) return;

	// Restrict to the game channel
	if (message.channel.type === 0 && (message.channel as any).name !== GAME_CHANNEL) return;

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

client.login(process.env.DISCORD_TOKEN);
