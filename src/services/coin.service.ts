

import { pool } from '../models/db';
import { validateGrantCoinsInput } from '../validation/coin.validation';
import { GrantCoinsOptions, GrantCoinsResult } from '../types/coin.types';

export async function grantCoins(opts: GrantCoinsOptions): Promise<GrantCoinsResult> {
// ...existing code...

  validateGrantCoinsInput(opts);
  const { actorUserId, targetUserId, amount, serverId, details } = opts;
  const userId = `${serverId}:${targetUserId}`;
  const actorId = `${serverId}:${actorUserId}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Update wallet balance
    await conn.execute(
      `INSERT INTO wallets (user_id, balance, currency) VALUES (?, ?, 'USD')
       ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
      [userId, amount]
    );
    // Write to audit log
    await conn.execute(
      `INSERT INTO audit_log (user_id, operation, details) VALUES (?, 'grantCoins', ?)`,
      [actorId, details || '']
    );
    // Get new balances
    const [rows]: any = await conn.execute(
      `SELECT balance FROM wallets WHERE user_id = ? AND currency = 'USD'`,
      [userId]
    );
    await conn.commit();
    return {
      userId,
      availableBalance: rows[0]?.balance || 0,
      lockedBalance: 0,
      totalBalance: rows[0]?.balance || 0,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
