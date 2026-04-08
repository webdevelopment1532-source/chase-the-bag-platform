"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutomatedAdDrops = startAutomatedAdDrops;
exports.getUserReward = getUserReward;
exports.addUserPoints = addUserPoints;
exports.registerAdvancedCommands = registerAdvancedCommands;
// Simple in-memory rate limiter
const userTimestamps = {};
const RATE_LIMIT_MS = 5000; // 5 seconds per user
// List of admin user IDs (replace with real Discord user IDs)
const ADMIN_USERS = [
// Add your Discord user ID here for full admin access
// Example: 'YOUR_DISCORD_USER_ID',
];
// Only allow this Stake affiliate code
const APPROVED_AFFILIATE_CODE = process.env.STAKE_AFFILIATE_CODE ?? 'selfmade';
const scraper_1 = require("./scraper");
const virtual_board_1 = require("./virtual-board");
const chart_1 = require("./chart");
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
const export_data_1 = require("./export-data");
const analytics_1 = require("./analytics");
const referral_1 = require("./referral");
const antifraud_1 = require("./antifraud");
const personalize_1 = require("./personalize");
// --- Automated Stake Ad Drops ---
const timers_1 = require("timers");
const AD_CHANNEL_NAME = 'stake-ads';
const STAKE_AD_MESSAGES = [
    `🔥 Join Stake with code **${APPROVED_AFFILIATE_CODE}** for exclusive rewards! https://stake.us/?c=${APPROVED_AFFILIATE_CODE}`,
    `💸 Don't miss out! Use code **${APPROVED_AFFILIATE_CODE}** on Stake for bonuses and VIP perks.`,
    `🎲 Play, win, and earn more with Stake code **${APPROVED_AFFILIATE_CODE}**!`
];
let adDropInitialized = false;
function startAutomatedAdDrops(client) {
    if (adDropInitialized)
        return;
    adDropInitialized = true;
    (0, timers_1.setInterval)(async () => {
        const guilds = client.guilds.cache;
        for (const [, guild] of guilds) {
            const channel = guild.channels.cache.find((ch) => ch.name === AD_CHANNEL_NAME && ch.isTextBased && typeof ch.send === 'function');
            if (channel && typeof channel.send === 'function') {
                const msg = STAKE_AD_MESSAGES[Math.floor(Math.random() * STAKE_AD_MESSAGES.length)];
                await channel.send(msg);
            }
        }
    }, 1000 * 60 * 60); // Every hour
}
const userRewards = {};
function getUserReward(userId) {
    if (!userRewards[userId]) {
        userRewards[userId] = { userId, tier: 'Bronze', points: 0, cashback: 0, bonus: 0 };
    }
    return userRewards[userId];
}
function addUserPoints(userId, points) {
    const reward = getUserReward(userId);
    reward.points += points;
    // Tier upgrade logic
    if (reward.points > 1000)
        reward.tier = 'VIP';
    else if (reward.points > 500)
        reward.tier = 'Gold';
    else if (reward.points > 200)
        reward.tier = 'Silver';
    // Cashback and bonus logic
    if (reward.tier === 'VIP') {
        reward.cashback = reward.points * 0.05;
        reward.bonus = 100;
    }
    else if (reward.tier === 'Gold') {
        reward.cashback = reward.points * 0.03;
        reward.bonus = 50;
    }
    else if (reward.tier === 'Silver') {
        reward.cashback = reward.points * 0.01;
        reward.bonus = 10;
    }
    else {
        reward.cashback = 0;
        reward.bonus = 0;
    }
}
// Command: !myrewards
// Shows user their current reward tier, points, cashback, and bonus
function registerAdvancedCommands(client) {
    // Welcome letter: DM new users when they join the server
    client.on('guildMemberAdd', async (member) => {
        try {
            await member.send(`👋 Welcome to the server, ${member.user.username}!
This community is run by the owner (selfmade).
Join Stake with our official invite code: **${APPROVED_AFFILIATE_CODE}**
https://stake.us/?c=${APPROVED_AFFILIATE_CODE}
Enjoy the games, rewards, and exclusive features!`);
        }
        catch {
            // Ignore if DMs are closed
        }
    });
    client.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        try {
            // Anti-fraud: check for suspicious activity
            const fraudAlerts = await (0, antifraud_1.checkFraudulentActivity)(message.author.id);
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
                    await (0, audit_log_1.logOperation)({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'send_affiliate_link', details: 'Sent Stake affiliate link' });
                }
                catch {
                    await message.reply('Could not DM you. Please check your privacy settings.');
                }
                return;
            }
            // !myrewards command
            if (message.content === '!myrewards') {
                const reward = getUserReward(message.author.id);
                // Optionally, fetch more stats/history from DB here
                await message.reply(`🏅 Your Reward Tier: **${reward.tier}**\n` +
                    `Points: **${reward.points}**\n` +
                    `Cashback: **$${reward.cashback.toFixed(2)}**\n` +
                    `Bonus: **$${reward.bonus.toFixed(2)}**\n` +
                    `Type !myoffer for a personalized bonus!`);
                return;
            }
            // !myoffer: Show personalized offer to user
            if (message.content === '!myoffer') {
                const offer = (0, personalize_1.getPersonalizedOffer)(message.author.id);
                await message.reply(offer);
                return;
            }
            // !referralboard: Show top referrers leaderboard
            if (message.content === '!referralboard') {
                const board = await (0, referral_1.getReferralLeaderboard)(10);
                if (!board.length) {
                    await message.reply('No referral activity yet. Be the first to invite friends!');
                }
                else {
                    const lines = board.map((row, i) => `#${i + 1} <@${row.user_id}> — **${row.referrals}** referrals`);
                    await message.reply('🏆 **Referral Leaderboard**\n' + lines.join('\n'));
                }
                return;
            }
            // !myreferrals: Show your referral count
            if (message.content === '!myreferrals') {
                const count = await (0, referral_1.getUserReferralCount)(message.author.id);
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
                    const path = await (0, export_data_1.exportAllDataZip)();
                    await message.reply({ content: '📦 Exported all data:', files: [path] });
                    await (0, audit_log_1.logOperation)({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'export_data', details: `Exported all operational data to ${path}` });
                }
                catch (err) {
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
                    const stats = await (0, analytics_1.getPlatformAnalytics)();
                    await message.reply(`📊 **Platform Analytics**\n` +
                        `Users: **${stats.userCount}**\n` +
                        `Codes: **${stats.codeCount}**\n` +
                        `Affiliates: **${stats.affiliateCount}**\n` +
                        `Total Rewards: **${stats.totalRewards}**`);
                }
                catch (err) {
                    await message.reply('❌ Failed to fetch analytics.');
                }
                return;
            }
            // !help command
            if (message.content === '!help') {
                await message.reply('**Available Commands:**\n' +
                    '!help — Show this help message\n' +
                    '!top5 — Show top 5 leaderboard as chart\n' +
                    '!stats <user> — Show recent scores for a user as chart\n' +
                    '!latestcodes — Show the latest scraped codes\n' +
                    '!board — Show the virtual board (recent codes)\n' +
                    '!mycode — Generate and DM you a selfmade code\n');
                return;
            }
            // !latestcodes command
            if (message.content === '!latestcodes') {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 5');
                if (rows.length === 0) {
                    await message.reply('No codes available right now. Please try again later.');
                }
                else {
                    const codes = rows.map(row => `**${row.code}** (${row.source}, ${new Date(row.created_at).toLocaleString()})`).join('\n');
                    await message.reply('**Latest Codes:**\n' + codes);
                }
                return;
            }
            // !board command
            if (message.content === '!board') {
                const rows = await (0, virtual_board_1.getVirtualBoardData)();
                if (rows.length === 0) {
                    await message.reply('The board is empty. Codes will appear here as they are scraped.');
                }
                else {
                    const board = rows.map(row => `**${row.code}** (${row.source}, ${new Date(row.created_at).toLocaleString()})`).join('\n');
                    await message.reply('**Virtual Board (Recent Codes):**\n' + board);
                }
                return;
            }
            // !mycode command
            if (message.content === '!mycode') {
                const code = (0, scraper_1.generateSelfCode)('CYBER44', 8);
                const db = await (0, db_1.getDbConnection)();
                await db.execute('INSERT IGNORE INTO codes (code, source) VALUES (?, ?)', [code, 'selfmade']);
                try {
                    await message.author.send(`Your selfmade code: **${code}**`);
                    await message.reply('I have sent you a DM with your code!');
                    await (0, audit_log_1.logOperation)({ userId: message.author.id, serverId: message.guild?.id || 'dm', action: 'generate_self_code', details: `Generated code: ${code}` });
                }
                catch {
                    await message.reply('Could not DM you. Please check your privacy settings.');
                }
                return;
            }
            // Top 5 leaderboard chart
            if (message.content === '!top5') {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT 5');
                const labels = rows.map(row => row.user);
                const data = rows.map(row => row.score);
                const url = await (0, chart_1.getChartUrl)(data, labels, 'Top 5 Players');
                if (message.channel && message.channel.send) {
                    await message.channel.send({ files: [url] });
                }
            }
            // User stats chart
            if (message.content.startsWith('!stats ')) {
                const user = message.content.split(' ')[1];
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT game, score FROM game_results WHERE user = ? ORDER BY created_at DESC LIMIT 10', [user]);
                const labels = rows.map(row => row.game);
                const data = rows.map(row => row.score);
                const url = await (0, chart_1.getChartUrl)(data, labels, `${user}'s Recent Scores`);
                if (message.channel && message.channel.send) {
                    await message.channel.send({ files: [url] });
                }
            }
        }
        catch (error) {
            console.error('Advanced command handler failed:', error);
            if (message.content.startsWith('!')) {
                await message.reply('Command unavailable right now. Check database configuration and try again.');
            }
        }
    });
}
