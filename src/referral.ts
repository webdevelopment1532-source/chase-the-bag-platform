// Referral competition and leaderboard logic
import { getDbConnection } from './db';

export async function getReferralLeaderboard(limit = 10) {
  const db = await getDbConnection();
  // Count successful affiliate invites per user
  const [rows] = await db.execute(`
    SELECT user_id, COUNT(*) as referrals
    FROM audit_logs
    WHERE action = 'send_affiliate_link'
    GROUP BY user_id
    ORDER BY referrals DESC
    LIMIT ?
  `, [limit]);
  return rows as any[];
}

export async function getUserReferralCount(userId: string) {
  const db = await getDbConnection();
  const [rows] = await db.execute(
    'SELECT COUNT(*) as count FROM audit_logs WHERE action = "send_affiliate_link" AND user_id = ?',
    [userId]
  );
  const row = (rows as any[])[0];
  return row.count;
}
