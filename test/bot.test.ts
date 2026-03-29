import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

describe('Bot Core Commands', () => {
  let client: Client;
  beforeAll(() => {
    client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  });
  test('Client initializes', () => {
    expect(client).toBeDefined();
  });
  // Add more tests for command logic as needed
});
