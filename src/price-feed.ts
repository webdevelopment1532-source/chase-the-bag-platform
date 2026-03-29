import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getBinancePrices } from './exchange-integration';

const FEED_TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'MATIC'];

// In-memory price cache for alerts and comparisons
const _priceCache = new Map<string, number>();

export function getCachedPrice(token: string): number {
  return _priceCache.get(token.toUpperCase()) ?? 0;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function postPriceFeedUpdate(client: Client): Promise<void> {
  const channelId = process.env.CTB_PRICE_FEED_CHANNEL_ID?.trim();
  if (!channelId) return;

  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel || typeof channel.send !== 'function') return;

  try {
    const prices = await getBinancePrices(FEED_TOKENS);
    if (prices.size === 0) return;

    const fields = FEED_TOKENS.map(token => {
      const current = prices.get(token) ?? 0;
      const prev = _priceCache.get(token) ?? current;
      const pct = prev > 0 ? ((current - prev) / prev) * 100 : 0;
      const trend = pct > 0.5 ? '📈' : pct < -0.5 ? '📉' : '➡️';
      const sign = pct >= 0 ? '+' : '';
      return {
        name: `${trend} ${token}`,
        value: `**$${fmt(current)}**\n\`${sign}${pct.toFixed(2)}%\``,
        inline: true,
      };
    });

    // Determine overall sentiment
    const gainers = FEED_TOKENS.filter(t => {
      const curr = prices.get(t) ?? 0;
      const prev = _priceCache.get(t) ?? curr;
      return curr > prev;
    }).length;
    const sentiment = gainers >= 4 ? '🐂 Bullish' : gainers <= 2 ? '🐻 Bearish' : '😐 Neutral';
    const embedColor = gainers >= 4 ? 0x00FF88 : gainers <= 2 ? 0xFF4444 : 0x00D4FF;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('📊 Chase The Bag — Live Market Prices')
      .setDescription(`Market Sentiment: **${sentiment}**`)
      .addFields(fields)
      .setTimestamp()
      .setFooter({ text: 'Chase The Bag Exchange • Auto-updates every 15 min • /exchange prices' });

    await channel.send({ embeds: [embed] });

    // Update cache after posting
    for (const [token, price] of prices) {
      _priceCache.set(token, price);
    }
  } catch (err) {
    console.error('[PriceFeed] Failed to post update:', err);
  }
}

export function startPriceFeed(client: Client): void {
  const channelId = process.env.CTB_PRICE_FEED_CHANNEL_ID?.trim();
  if (!channelId) {
    console.log('[PriceFeed] CTB_PRICE_FEED_CHANNEL_ID not set — price feed disabled');
    return;
  }

  const intervalMs = Math.max(
    5 * 60 * 1000, // minimum 5 minutes
    Number(process.env.CTB_PRICE_FEED_INTERVAL_MS ?? 15 * 60 * 1000)
  );

  // Initial post after 10s delay (let bot fully connect first)
  setTimeout(async () => {
    await postPriceFeedUpdate(client);
    setInterval(() => postPriceFeedUpdate(client), intervalMs);
  }, 10_000);

  console.log(`[PriceFeed] Started — channel ${channelId}, interval ${Math.round(intervalMs / 60000)} min`);
}
