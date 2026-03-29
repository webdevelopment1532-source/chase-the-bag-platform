"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announceUpcomingEvents = announceUpcomingEvents;
const EVENT_CHANNEL = 'events';
const UPCOMING_EVENTS = [
    { name: 'Weekly Tournament', time: 'Friday 8pm', description: 'Compete for top prizes every Friday!' },
    { name: 'Flash Bonus', time: 'Random', description: 'Surprise bonus drops for active users!' }
];
function announceUpcomingEvents(client) {
    const guilds = client.guilds.cache;
    for (const [, guild] of guilds) {
        const channel = guild.channels.cache.find((ch) => ch.name === EVENT_CHANNEL && ch.isTextBased && typeof ch.send === 'function');
        if (channel) {
            UPCOMING_EVENTS.forEach(event => {
                channel.send(`📅 **${event.name}** — ${event.time}\n${event.description}`);
            });
        }
    }
}
