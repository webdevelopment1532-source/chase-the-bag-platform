"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAffiliateCommands = registerAffiliateCommands;
const db_1 = require("./db");
const STAKE_CODE = () => process.env.STAKE_AFFILIATE_CODE ?? 'selfmade';
function registerAffiliateCommands(client, ownerId) {
    client.on('messageCreate', async (message) => {
        if (message.author.bot)
            return;
        // User requests to become an affiliate
        if (message.content === '!affiliate request') {
            try {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT status FROM affiliates WHERE user_id = ?', [message.author.id]);
                await db.end();
                const existing = rows[0];
                if (existing && (existing.status === 'pending' || existing.status === 'active')) {
                    await message.reply('You have already requested or are already an affiliate.');
                    return;
                }
                const db2 = await (0, db_1.getDbConnection)();
                await db2.execute('INSERT INTO affiliates (user_id, status) VALUES (?, \'pending\') ON DUPLICATE KEY UPDATE status = \'pending\', requested_at = CURRENT_TIMESTAMP', [message.author.id]);
                await db2.end();
                await message.reply('Your affiliate request has been submitted for review.');
                const owner = await client.users.fetch(ownerId);
                await owner.send(`Affiliate request from: ${message.author.tag} (${message.author.id})`);
            }
            catch (err) {
                await message.reply('Could not process your request right now. Please try again later.');
            }
            return;
        }
        // Owner approves affiliate
        if (message.content.startsWith('!affiliate approve ') && message.author.id === ownerId) {
            const userId = message.content.split(' ')[2];
            try {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT status FROM affiliates WHERE user_id = ? AND status = \'pending\'', [userId]);
                if (rows.length === 0) {
                    await db.end();
                    await message.reply('No pending request from that user.');
                    return;
                }
                await db.execute('UPDATE affiliates SET status = \'active\', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE user_id = ?', [ownerId, userId]);
                await db.end();
                await message.reply(`User <@${userId}> has been approved as an affiliate.`);
                const user = await client.users.fetch(userId);
                await user.send(`You have been approved as a Stake affiliate! Share this link: https://stake.us/?c=${STAKE_CODE()}`);
            }
            catch (err) {
                await message.reply('Database error. Please try again later.');
            }
            return;
        }
        // Owner removes affiliate
        if (message.content.startsWith('!affiliate remove ') && message.author.id === ownerId) {
            const userId = message.content.split(' ')[2];
            try {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT status FROM affiliates WHERE user_id = ? AND status = \'active\'', [userId]);
                if (rows.length === 0) {
                    await db.end();
                    await message.reply('That user is not an active affiliate.');
                    return;
                }
                await db.execute('UPDATE affiliates SET status = \'removed\' WHERE user_id = ?', [userId]);
                await db.end();
                await message.reply(`User <@${userId}> has been removed from affiliates.`);
            }
            catch (err) {
                await message.reply('Database error. Please try again later.');
            }
            return;
        }
        // Owner lists affiliates
        if (message.content === '!affiliate list' && message.author.id === ownerId) {
            try {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT user_id FROM affiliates WHERE status = \'active\'');
                await db.end();
                const list = rows;
                if (list.length === 0) {
                    await message.reply('No affiliates yet.');
                }
                else {
                    await message.reply('Affiliates:\n' + list.map(r => `<@${r.user_id}>`).join(', '));
                }
            }
            catch (err) {
                await message.reply('Database error. Please try again later.');
            }
            return;
        }
        // Affiliate shares link
        if (message.content === '!affiliate link') {
            try {
                const db = await (0, db_1.getDbConnection)();
                const [rows] = await db.execute('SELECT user_id FROM affiliates WHERE user_id = ? AND status = \'active\'', [message.author.id]);
                await db.end();
                if (rows.length === 0)
                    return;
                await message.reply(`Your Stake affiliate link: https://stake.us/?c=${STAKE_CODE()}`);
            }
            catch (err) {
                // silently ignore — user may not be an affiliate
            }
            return;
        }
    });
}
