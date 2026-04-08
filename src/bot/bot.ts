import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.on('messageCreate', async (msg) => {
  if (msg.content.startsWith('/sell')) {
    try {
      const [_, btc, usd] = msg.content.split(' ');
      const res = await axios.post('http://localhost:4000/api/offer', {
        userId: msg.author.id,
        btcAmount: btc,
        usdAmount: usd
      });
      if (res && res.data && res.data.id) {
        msg.reply(`Offer created: ${res.data.id}`);
      } else {
        msg.reply('Offer creation failed.');
      }
    } catch (err) {
      // Optionally log error
      // console.error('Failed to create offer:', err);
      // Optionally reply with error message
      // msg.reply('Failed to create offer.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
