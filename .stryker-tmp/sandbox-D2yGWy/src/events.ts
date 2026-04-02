// @ts-nocheck
// Event scheduler for regular tournaments and bonus events
import { Client, TextChannel } from 'discord.js';

const EVENT_CHANNEL = 'events';
const UPCOMING_EVENTS = [
  { name: 'Weekly Tournament', time: 'Friday 8pm', description: 'Compete for top prizes every Friday!' },
  { name: 'Flash Bonus', time: 'Random', description: 'Surprise bonus drops for active users!' }
];

export function announceUpcomingEvents(client: Client) {
  const guilds = client.guilds.cache;
  for (const [, guild] of guilds) {
    const channel = guild.channels.cache.find(
      (ch: any) => ch.name === EVENT_CHANNEL && ch.isTextBased && typeof ch.send === 'function'
    ) as TextChannel | undefined;
    if (channel) {
      UPCOMING_EVENTS.forEach(event => {
        channel.send(`📅 **${event.name}** — ${event.time}\n${event.description}`);
      });
    }
  }
}
