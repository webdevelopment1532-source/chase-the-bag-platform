"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const discord_js_1 = require("discord.js");
const axios_1 = __importDefault(require("axios"));
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages] });
client.on('messageCreate', async (msg) => {
    if (msg.content.startsWith('/sell')) {
        try {
            const [_, btc, usd] = msg.content.split(' ');
            const res = await axios_1.default.post('http://localhost:4000/api/offer', {
                userId: msg.author.id,
                btcAmount: btc,
                usdAmount: usd
            });
            if (res && res.data && res.data.id) {
                msg.reply(`Offer created: ${res.data.id}`);
            }
            else {
                msg.reply('Offer creation failed.');
            }
        }
        catch (err) {
            // Optionally log error
            // console.error('Failed to create offer:', err);
            // Optionally reply with error message
            // msg.reply('Failed to create offer.');
        }
    }
});
client.login(process.env.DISCORD_TOKEN);
