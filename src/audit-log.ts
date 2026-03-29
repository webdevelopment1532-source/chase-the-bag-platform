// Audit log for all payout, code, and user operations
// Only logs actions for users and Discord servers on this bot
import { getDbConnection } from './db';

export async function logOperation({ userId, serverId, action, details }: { userId: string, serverId: string, action: string, details?: string }) {
  const db = await getDbConnection();
  await db.execute(
    'INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)',
    [userId, serverId, action, details || null]
  );
}

// Example usage:
// await logOperation({ userId: message.author.id, serverId: message.guild.id, action: 'payout', details: 'Paid $10 to user' });
