"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformAnalytics = getPlatformAnalytics;
// Real-time analytics dashboard API (scaffold)
// This module will aggregate and provide analytics for admins
const db_1 = require("./db");
async function getPlatformAnalytics() {
    const db = await (0, db_1.getDbConnection)();
    const [userRows] = await db.execute('SELECT COUNT(DISTINCT user) as count FROM leaderboard');
    const [codeRows] = await db.execute('SELECT COUNT(*) as count FROM codes');
    const [affiliateRows] = await db.execute('SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE action = "send_affiliate_link"');
    const [rewardRows] = await db.execute('SELECT SUM(score) as total FROM leaderboard');
    const userCount = userRows[0];
    const codeCount = codeRows[0];
    const affiliateCount = affiliateRows[0];
    const totalRewards = rewardRows[0];
    return {
        userCount: userCount.count,
        codeCount: codeCount.count,
        affiliateCount: affiliateCount.count,
        totalRewards: totalRewards.total
    };
}
