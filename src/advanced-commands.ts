// Simple in-memory rate limiter
const userTimestamps: Record<string, number> = {};
const RATE_LIMIT_MS = 5000; // 5 seconds per user

// List of admin user IDs (replace with real Discord user IDs)
const ADMIN_USERS: string[] = [
  // Add your Discord user ID here for full admin access
  // Example: 'YOUR_DISCORD_USER_ID',
];

// Only allow this Stake affiliate code
const APPROVED_AFFILIATE_CODE = process.env.STAKE_AFFILIATE_CODE ?? 'selfmade';
import { scrapeStakeCodes, generateSelfCode } from './scraper';
import { getVirtualBoardData } from './virtual-board';
import { Client, Message } from 'discord.js';
import { getChartUrl } from './chart';
import { getDbConnection } from './db';
import { logOperation } from './audit-log';
import { exportAllDataZip } from './export-data';
import { getPlatformAnalytics } from './analytics';
import { getReferralLeaderboard, getUserReferralCount } from './referral';
import { checkFraudulentActivity } from './antifraud';
import { getPersonalizedOffer } from './personalize';

// --- Automated Stake Ad Drops ---
import { setInterval } from 'timers';
const AD_CHANNEL_NAME = 'stake-ads';
const STAKE_AD_MESSAGES = [
`🔥 Join Stake with code **${APPROVED_AFFILIATE_CODE}** for exclusive rewards! https://stake.us/?c=${APPROVED_AFFILIATE_CODE}`,
  `💸 Don't miss out! Use code **${APPROVED_AFFILIATE_CODE}** on Stake for bonuses and VIP perks.`,
  `🎲 Play, win, and earn more with Stake code **${APPROVED_AFFILIATE_CODE}**!`
];
let adDropInitialized = false;

export function startAutomatedAdDrops(client: Client) {
  if (adDropInitialized) return;
  adDropInitialized = true;
  setInterval(async () => {
    const guilds = client.guilds.cache;
    for (const [, guild] of guilds) {
      const channel = guild.channels.cache.find(
        (ch: any) => ch.name === AD_CHANNEL_NAME && ch.isTextBased && typeof ch.send === 'function'
      );
      if (channel && typeof (channel as any).send === 'function') {
        const msg = STAKE_AD_MESSAGES[Math.floor(Math.random() * STAKE_AD_MESSAGES.length)];
        await (channel as any).send(msg);
      }
    }
  }, 1000 * 60 * 60); // Every hour
}

// --- Advanced Rewards System ---
interface UserReward {
  userId: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  points: number;
  cashback: number;
  bonus: number;
}
const userRewards: Record<string, UserReward> = {};

export function getUserReward(userId: string): UserReward {
  if (!userRewards[userId]) {
    userRewards[userId] = { userId, tier: 'Bronze', points: 0, cashback: 0, bonus: 0 };
  }
  return userRewards[userId];
}

export function addUserPoints(userId: string, points: number) {
  const reward = getUserReward(userId);
  reward.points += points;
  // Tier upgrade logic
  if (reward.points > 1000) reward.tier = 'VIP';
  else if (reward.points > 500) reward.tier = 'Gold';
  else if (reward.points > 200) reward.tier = 'Silver';
  // Cashback and bonus logic
  if (reward.tier === 'VIP') {
    reward.cashback = reward.points * 0.05;
    reward.bonus = 100;
  } else if (reward.tier === 'Gold') {
    reward.cashback = reward.points * 0.03;
    reward.bonus = 50;
  } else if (reward.tier === 'Silver') {
    reward.cashback = reward.points * 0.01;
    reward.bonus = 10;
  } else {
    reward.cashback = 0;
    reward.bonus = 0;
  }
}

// Command: !myrewards
// Shows user their current reward tier, points, cashback, and bonus


export function registerAdvancedCommands(client: Client) {
  // Welcome letter: DM new users when they join the server
  client.on('guildMemberAdd', async (member) => {
    try {
      await member.send(
        `👋 Welcome to the server, ${member.user.username}!
This community is run by the owner (selfmade).
Join Stake with our official invite code: **${APPROVED_AFFILIATE_CODE}**
https://stake.us/?c=${APPROVED_AFFILIATE_CODE}
Enjoy the games, rewards, and exclusive features!`
      );
    } catch {
      // Ignore if DMs are closed
    }
  });

  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;

    try {

    // Anti-fraud: check for suspicious activity
    const fraudAlerts = await checkFraudulentActivity(message.author.id);
    if (fraudAlerts.length) {
      // Alert all admins in the server
      const adminMentions = ADMIN_USERS.map(id => `<@${id}>`).join(' ');
      await message.reply(`⚠️ Suspicious activity detected for <@${message.author.id}>: ${fraudAlerts.join('; ')}\n${adminMentions}`);
    }

    // !mylink command: DM the approved Stake invite code
    if (message.content === '!mylink') {
      try {
        await message.author.send(`Welcome to Stake! Use promo code **${APPROVED_AFFILIATE_CODE}** when you join: https://stake.us/?c=${APPROVED_AFFILIATE_CODE}`);
        await message.reply('I have sent you a DM with the official Stake invite code!');
        await logOperation({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'send_affiliate_link', details: 'Sent Stake affiliate link' });
      } catch {
        await message.reply('Could not DM you. Please check your privacy settings.');
      }
      return;
    }

    // !myrewards command
    if (message.content === '!myrewards') {
      const reward = getUserReward(message.author.id);
      // Optionally, fetch more stats/history from DB here
      await message.reply(
        `🏅 Your Reward Tier: **${reward.tier}**\n` +
        `Points: **${reward.points}**\n` +
        `Cashback: **$${reward.cashback.toFixed(2)}**\n` +
        `Bonus: **$${reward.bonus.toFixed(2)}**\n` +
        `Type !myoffer for a personalized bonus!`
      );
      return;
    }

    // !myoffer: Show personalized offer to user
    if (message.content === '!myoffer') {
      const offer = getPersonalizedOffer(message.author.id);
      await message.reply(offer);
      return;
    }

    // !referralboard: Show top referrers leaderboard
    if (message.content === '!referralboard') {
      const board = await getReferralLeaderboard(10) as any[];
      if (!board.length) {
        await message.reply('No referral activity yet. Be the first to invite friends!');
      } else {
        const lines = board.map((row: any, i: number) => `#${i + 1} <@${row.user_id}> — **${row.referrals}** referrals`);
        await message.reply('🏆 **Referral Leaderboard**\n' + lines.join('\n'));
      }
      return;
    }

    // !myreferrals: Show your referral count
    if (message.content === '!myreferrals') {
      const count = await getUserReferralCount(message.author.id);
      await message.reply(`You have **${count}** successful referrals!`);
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (userTimestamps[message.author.id] && now - userTimestamps[message.author.id] < RATE_LIMIT_MS) {
      await message.reply('⏳ Please wait before using another command.');
      return;
    }
    userTimestamps[message.author.id] = now;

    // Admin command restriction example
    if (message.content.startsWith('!admin')) {
      if (!ADMIN_USERS.includes(message.author.id)) {
        await message.reply('❌ You do not have permission to use this command.');
        return;
      }
      await message.reply('✅ Admin command executed.');
      return;
    }

    // !exportdata (admin only): Export all operational data as zip
    if (message.content === '!exportdata') {
      if (!ADMIN_USERS.includes(message.author.id)) {
        await message.reply('❌ You do not have permission to export data.');
        return;
      }
      try {
        const path = await exportAllDataZip();
        await message.reply({ content: '📦 Exported all data:', files: [path] });
        await logOperation({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'export_data', details: `Exported all operational data to ${path}` });
      } catch (err) {
        await message.reply('❌ Failed to export data.');
      }
      return;
    }

    // !analytics (admin only): Show real-time platform analytics
    if (message.content === '!analytics') {
      if (!ADMIN_USERS.includes(message.author.id)) {
        await message.reply('❌ You do not have permission to view analytics.');
        return;
      }
      try {
        const stats = await getPlatformAnalytics();
        await message.reply(
          `📊 **Platform Analytics**\n` +
          `Users: **${stats.userCount}**\n` +
          `Codes: **${stats.codeCount}**\n` +
          `Affiliates: **${stats.affiliateCount}**\n` +
          `Total Rewards: **${stats.totalRewards}**`
        );
      } catch (err) {
        await message.reply('❌ Failed to fetch analytics.');
      }
      return;
    }
    // !help command
    if (message.content === '!help') {
      await message.reply(
        '**Available Commands:**\n' +
        '!help — Show this help message\n' +
        '!top5 — Show top 5 leaderboard as chart\n' +
        '!stats <user> — Show recent scores for a user as chart\n' +
        '!latestcodes — Show the latest scraped codes\n' +
        '!board — Show the virtual board (recent codes)\n' +
        '!mycode — Generate and DM you a selfmade code\n'
      );
      return;
    }
    // !latestcodes command
    if (message.content === '!latestcodes') {
      const db = await getDbConnection();
      const [rows] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 5');
      if ((rows as any[]).length === 0) {
        await message.reply('No codes available right now. Please try again later.');
      } else {
        const codes = (rows as any[]).map(row => `**${row.code}** (${row.source}, ${new Date(row.created_at).toLocaleString()})`).join('\n');
        await message.reply('**Latest Codes:**\n' + codes);
      }
      return;
    }
    // !board command
    if (message.content === '!board') {
      const rows = await getVirtualBoardData();
      if ((rows as any[]).length === 0) {
        await message.reply('The board is empty. Codes will appear here as they are scraped.');
      } else {
        const board = (rows as any[]).map(row => `**${row.code}** (${row.source}, ${new Date(row.created_at).toLocaleString()})`).join('\n');
        await message.reply('**Virtual Board (Recent Codes):**\n' + board);
      }
      return;
    }
    // !mycode command
    if (message.content === '!mycode') {
      const code = generateSelfCode('CYBER44', 8);
      const db = await getDbConnection();
      await db.execute('INSERT IGNORE INTO codes (code, source) VALUES (?, ?)', [code, 'selfmade']);
      try {
        await message.author.send(`Your selfmade code: **${code}**`);
        await message.reply('I have sent you a DM with your code!');
        await logOperation({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'generate_self_code', details: `Generated code: ${code}` });
      } catch {
        await message.reply('Could not DM you. Please check your privacy settings.');
      }
      return;
    }
    // Top 5 leaderboard chart
    if (message.content === '!top5') {
      const db = await getDbConnection();
      const [rows] = await db.execute('SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT 5');
      const labels = (rows as any[]).map(row => row.user);
      const data = (rows as any[]).map(row => row.score);
      const url = await getChartUrl(data, labels, 'Top 5 Players');
      if (message.channel && (message.channel as any).send) {
        await (message.channel as any).send({ files: [url] });
      }
    }
    // User stats chart
    if (message.content.startsWith('!stats ')) {
      const user = message.content.split(' ')[1];
      const db = await getDbConnection();
      const [rows] = await db.execute('SELECT game, score FROM game_results WHERE user = ? ORDER BY created_at DESC LIMIT 10', [user]);
      const labels = (rows as any[]).map(row => row.game);
      const data = (rows as any[]).map(row => row.score);
      const url = await getChartUrl(data, labels, `${user}'s Recent Scores`);
      if (message.channel && (message.channel as any).send) {
        await (message.channel as any).send({ files: [url] });
      }
    }
    } catch (error) {
      console.error('Advanced command handler failed:', error);
      if (message.content.startsWith('!')) {
        await message.reply('Command unavailable right now. Check database configuration and try again.');
      }
    }
  });
}
