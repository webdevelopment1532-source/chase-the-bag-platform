// Virtual board for real-time code tracking
import { getDbConnection } from './db';
import { logOperation } from './audit-log';

// Optionally pass user/server for logging
export async function getVirtualBoardData(userId?: string, serverId?: string) {
  const db = await getDbConnection();
  const [rows]: [any[], any] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 50');
  if (userId && serverId) {
    await logOperation({ userId, serverId, action: 'view_virtual_board', details: `Viewed ${(rows as any[]).length} codes` });
  }
  return rows;
}
