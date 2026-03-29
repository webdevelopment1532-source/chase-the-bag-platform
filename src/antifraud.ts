// Anti-fraud and compliance monitoring
import { getDbConnection } from './db';

export async function checkFraudulentActivity(userId: string): Promise<string[]> {
  const db = await getDbConnection();
  const alerts: string[] = [];

  // Example: Too many referrals in a short time
  const [refRows]: [any[], any] = await db.execute(
    `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'send_affiliate_link' AND created_at > NOW() - INTERVAL 1 HOUR`,
    [userId]
  );
  if (refRows[0]?.count > 5) {
    alerts.push('High referral activity detected (possible abuse)');
  }

  // Example: Too many codes generated
  const [codeRows]: [any[], any] = await db.execute(
    `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'generate_self_code' AND created_at > NOW() - INTERVAL 1 HOUR`,
    [userId]
  );
  if (codeRows[0]?.count > 10) {
    alerts.push('Excessive code generation detected');
  }

  return alerts;
}
