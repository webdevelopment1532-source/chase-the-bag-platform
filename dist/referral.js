"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReferralLeaderboard = getReferralLeaderboard;
exports.getUserReferralCount = getUserReferralCount;
// Referral competition and leaderboard logic
const db_1 = require("./db");
async function getReferralLeaderboard(limit = 10) {
    const db = await (0, db_1.getDbConnection)();
    // Count successful affiliate invites per user
    const [rows] = await db.execute(`
    SELECT user_id, COUNT(*) as referrals
    FROM audit_logs
    WHERE action = 'send_affiliate_link'
    GROUP BY user_id
    ORDER BY referrals DESC
    LIMIT ?
  `, [limit]);
    return rows;
}
async function getUserReferralCount(userId) {
    const db = await (0, db_1.getDbConnection)();
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM audit_logs WHERE action = "send_affiliate_link" AND user_id = ?', [userId]);
    const row = rows[0];
    return row.count;
}
