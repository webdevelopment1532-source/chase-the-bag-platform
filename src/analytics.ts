// Real-time analytics dashboard API (scaffold)
// This module will aggregate and provide analytics for admins
import { getDbConnection } from './db';

export async function getPlatformAnalytics() {
  const db = await getDbConnection();
  const [userRows] = await db.execute('SELECT COUNT(DISTINCT user) as count FROM leaderboard');
  const [codeRows] = await db.execute('SELECT COUNT(*) as count FROM codes');
  const [affiliateRows] = await db.execute('SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE action = "send_affiliate_link"');
  const [rewardRows] = await db.execute('SELECT SUM(score) as total FROM leaderboard');
  const userCount = (userRows as any[])[0];
  const codeCount = (codeRows as any[])[0];
  const affiliateCount = (affiliateRows as any[])[0];
  const totalRewards = (rewardRows as any[])[0];
  return {
    userCount: userCount.count,
    codeCount: codeCount.count,
    affiliateCount: affiliateCount.count,
    totalRewards: totalRewards.total
  };
}
