import { getDbConnection } from './db';

export type LeaderboardCategory = 'points' | 'volume' | 'trades' | 'profit';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  tier: string;
  points: number;
  totalVolume: number;
  totalTrades: number;
  totalProfit: number;
  winRate: number;
}

export function tierEmoji(tier: string): string {
  switch (tier) {
    case 'VIP': return '💎';
    case 'Gold': return '🥇';
    case 'Silver': return '🥈';
    default: return '🥉';
  }
}

export function tierColor(tier: string): number {
  switch (tier) {
    case 'VIP': return 0x7B2FBE;
    case 'Gold': return 0xFFD700;
    case 'Silver': return 0xC0C0C0;
    default: return 0xCD7F32;
  }
}

export function rankEmoji(rank: number): string {
  if (rank === 1) return '🏆';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `**${rank}.**`;
}

export async function getLeaderboard(category: LeaderboardCategory = 'points', limit = 10): Promise<LeaderboardEntry[]> {
  const db = await getDbConnection();
  try {
    const orderBy =
      category === 'points' ? 'p.points' :
      category === 'volume' ? 'totalVolume' :
      category === 'trades' ? 'totalTrades' :
      'totalProfit';

    const [rows] = await db.execute(`
      SELECT
        p.userId,
        p.tier,
        p.points,
        COALESCE(SUM(t.fromAmount * t.entryPrice), 0) AS totalVolume,
        COUNT(t.id) AS totalTrades,
        COALESCE(SUM(t.profit), 0) AS totalProfit,
        COALESCE(
          SUM(CASE WHEN t.profit > 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(t.id), 0),
          0
        ) AS winRate
      FROM user_exchange_profiles p
      LEFT JOIN trading_activities t ON t.userId = p.userId AND t.status = 'completed'
      GROUP BY p.userId, p.tier, p.points
      ORDER BY ${orderBy} DESC
      LIMIT ?
    `, [limit]) as any;

    return (rows as any[]).map((row: any, idx: number) => ({
      rank: idx + 1,
      userId: String(row.userId),
      tier: String(row.tier ?? 'Bronze'),
      points: Number(row.points ?? 0),
      totalVolume: Number(row.totalVolume ?? 0),
      totalTrades: Number(row.totalTrades ?? 0),
      totalProfit: Number(row.totalProfit ?? 0),
      winRate: Number(row.winRate ?? 0),
    }));
  } finally {
    await db.end();
  }
}

export async function getUserRank(userId: string): Promise<{ rank: number; totalUsers: number } | null> {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute(`
      SELECT COUNT(*) + 1 AS userRank
      FROM user_exchange_profiles
      WHERE points > (SELECT COALESCE(points, 0) FROM user_exchange_profiles WHERE userId = ? LIMIT 1)
    `, [userId]) as any;
    const [total] = await db.execute('SELECT COUNT(*) AS cnt FROM user_exchange_profiles') as any;
    const rank = Number((rows as any[])[0]?.userRank ?? 0);
    const totalUsers = Number((total as any[])[0]?.cnt ?? 0);
    if (rank === 0 || totalUsers === 0) return null;
    return { rank, totalUsers };
  } finally {
    await db.end();
  }
}
