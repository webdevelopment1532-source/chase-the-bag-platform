import { getDbConnection } from './db';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bonusPoints: number;
  category: 'trading' | 'mixer' | 'staking' | 'streak' | 'tier' | 'volume';
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  // Trading milestones
  { id: 'first_trade',  name: 'First Trade',    description: 'Complete your first trade',          emoji: '🚀', bonusPoints: 50,   category: 'trading' },
  { id: 'trader_10',   name: 'Active Trader',   description: 'Complete 10 trades',                emoji: '📈', bonusPoints: 100,  category: 'trading' },
  { id: 'trader_50',   name: 'Power Trader',    description: 'Complete 50 trades',                emoji: '⚡', bonusPoints: 250,  category: 'trading' },
  { id: 'trader_100',  name: 'Trade Master',    description: 'Complete 100 trades',               emoji: '🎯', bonusPoints: 500,  category: 'trading' },
  { id: 'high_roller', name: 'High Roller',     description: 'Execute a single trade over $10k',  emoji: '🎰', bonusPoints: 150,  category: 'trading' },
  { id: 'profit_1k',   name: 'Profit King',     description: 'Earn $1,000 total profit',          emoji: '💹', bonusPoints: 200,  category: 'trading' },
  { id: 'profit_10k',  name: 'Money Maker',     description: 'Earn $10,000 total profit',         emoji: '💵', bonusPoints: 500,  category: 'trading' },
  // Volume tiers
  { id: 'volume_10k',  name: 'High Stakes',     description: 'Trade $10,000 total volume',        emoji: '💰', bonusPoints: 100,  category: 'volume' },
  { id: 'volume_100k', name: 'Big Money',       description: 'Trade $100,000 total volume',       emoji: '🏦', bonusPoints: 300,  category: 'volume' },
  { id: 'volume_1m',   name: 'Whale',           description: 'Trade $1,000,000 total volume',     emoji: '🐋', bonusPoints: 1000, category: 'volume' },
  // Tier achievements
  { id: 'tier_silver', name: 'Going Silver',    description: 'Reach Silver tier',                 emoji: '🥈', bonusPoints: 0,    category: 'tier' },
  { id: 'tier_gold',   name: 'Golden Touch',    description: 'Reach Gold tier',                   emoji: '🥇', bonusPoints: 0,    category: 'tier' },
  { id: 'tier_vip',    name: 'VIP Elite',       description: 'Reach VIP tier',                    emoji: '💎', bonusPoints: 0,    category: 'tier' },
  // Mixer achievements
  { id: 'mixer_5',     name: 'Privacy First',   description: 'Complete 5 mixer transactions',     emoji: '🕵️', bonusPoints: 75,   category: 'mixer' },
  { id: 'mixer_20',    name: 'Ghost Protocol',  description: 'Complete 20 mixer transactions',    emoji: '👻', bonusPoints: 200,  category: 'mixer' },
  { id: 'mixer_50',    name: 'Shadow Broker',   description: 'Complete 50 mixer transactions',    emoji: '🌑', bonusPoints: 500,  category: 'mixer' },
  // Staking achievements
  { id: 'staking_5',   name: 'Yield Farmer',    description: 'Record 5 staking rewards',          emoji: '🌾', bonusPoints: 75,   category: 'staking' },
  { id: 'staking_20',  name: 'Staking Pro',     description: 'Record 20 staking rewards',         emoji: '🌱', bonusPoints: 200,  category: 'staking' },
  { id: 'staking_king',name: 'Staking King',    description: 'Record 50 staking rewards',         emoji: '👑', bonusPoints: 500,  category: 'staking' },
  // Streak achievements
  { id: 'streak_3',    name: 'Committed',       description: '3-day check-in streak',             emoji: '✅', bonusPoints: 30,   category: 'streak' },
  { id: 'streak_7',    name: 'Week Warrior',    description: '7-day check-in streak',             emoji: '🔥', bonusPoints: 100,  category: 'streak' },
  { id: 'streak_30',   name: 'Monthly Master',  description: '30-day check-in streak',            emoji: '📅', bonusPoints: 500,  category: 'streak' },
  { id: 'streak_100',  name: 'Centurion',       description: '100-day check-in streak',           emoji: '🏅', bonusPoints: 2000, category: 'streak' },
];

export async function getEarnedAchievements(userId: string): Promise<Array<Achievement & { earnedAt: string }>> {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute(
      'SELECT achievementId, earnedAt FROM user_achievements WHERE userId = ? ORDER BY earnedAt DESC',
      [userId]
    ) as any;
    const earned = new Map((rows as any[]).map((r: any) => [r.achievementId, r.earnedAt]));
    return ALL_ACHIEVEMENTS
      .filter(a => earned.has(a.id))
      .map(a => ({ ...a, earnedAt: earned.get(a.id) as string }));
  } finally {
    await db.end();
  }
}

export async function checkAndAwardAchievements(
  userId: string,
  context: {
    tier?: string;
    streak?: number;
    singleTradeUsdVolume?: number;
  } = {}
): Promise<Achievement[]> {
  const db = await getDbConnection();
  try {
    // Existing achievements
    const [earnedRows] = await db.execute(
      'SELECT achievementId FROM user_achievements WHERE userId = ?',
      [userId]
    ) as any;
    const earned = new Set((earnedRows as any[]).map((r: any) => r.achievementId));

    // Aggregate stats
    const [statsRows] = await db.execute(`
      SELECT
        COUNT(*) AS tradeCount,
        COALESCE(SUM(fromAmount * entryPrice), 0) AS totalVolume,
        COALESCE(SUM(profit), 0) AS totalProfit
      FROM trading_activities
      WHERE userId = ? AND status = 'completed'
    `, [userId]) as any;
    const stats = (statsRows as any[])[0] ?? {};
    const tradeCount = Number(stats.tradeCount ?? 0);
    const totalVolume = Number(stats.totalVolume ?? 0);
    const totalProfit = Number(stats.totalProfit ?? 0);

    const [mixRows] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM trading_activities WHERE userId = ? AND tradeType = 'mixing' AND status = 'completed'`,
      [userId]
    ) as any;
    const [stakeRows] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM trading_activities WHERE userId = ? AND tradeType = 'staking' AND status = 'completed'`,
      [userId]
    ) as any;
    const mixCount  = Number((mixRows as any[])[0]?.cnt ?? 0);
    const stakeCount = Number((stakeRows as any[])[0]?.cnt ?? 0);

    const tier   = context.tier ?? '';
    const streak = context.streak ?? 0;
    const singleUsd = context.singleTradeUsdVolume ?? 0;

    // Build a mapping of achievement id → should unlock condition
    const checks: Array<[string, boolean]> = [
      ['first_trade',  tradeCount >= 1],
      ['trader_10',    tradeCount >= 10],
      ['trader_50',    tradeCount >= 50],
      ['trader_100',   tradeCount >= 100],
      ['high_roller',  singleUsd >= 10000],
      ['profit_1k',    totalProfit >= 1000],
      ['profit_10k',   totalProfit >= 10000],
      ['volume_10k',   totalVolume >= 10000],
      ['volume_100k',  totalVolume >= 100000],
      ['volume_1m',    totalVolume >= 1000000],
      ['tier_silver',  ['Silver', 'Gold', 'VIP'].includes(tier)],
      ['tier_gold',    ['Gold', 'VIP'].includes(tier)],
      ['tier_vip',     tier === 'VIP'],
      ['mixer_5',      mixCount >= 5],
      ['mixer_20',     mixCount >= 20],
      ['mixer_50',     mixCount >= 50],
      ['staking_5',    stakeCount >= 5],
      ['staking_20',   stakeCount >= 20],
      ['staking_king', stakeCount >= 50],
      ['streak_3',     streak >= 3],
      ['streak_7',     streak >= 7],
      ['streak_30',    streak >= 30],
      ['streak_100',   streak >= 100],
    ];

    const newAchievements: Achievement[] = [];
    for (const [id, condition] of checks) {
      if (condition && !earned.has(id)) {
        try {
          await db.execute(
            'INSERT IGNORE INTO user_achievements (userId, achievementId) VALUES (?, ?)',
            [userId, id]
          );
          const achievement = ALL_ACHIEVEMENTS.find(a => a.id === id);
          if (achievement) newAchievements.push(achievement);
        } catch {
          // ignore insertion conflicts
        }
      }
    }

    return newAchievements;
  } finally {
    await db.end();
  }
}

// Announcement callback — set from index.ts once the Discord client is ready
let _announcer: ((userId: string, achievement: Achievement) => Promise<void>) | null = null;

export function setAchievementAnnouncer(fn: (userId: string, achievement: Achievement) => Promise<void>): void {
  _announcer = fn;
}

export async function announceNewAchievements(userId: string, achievements: Achievement[]): Promise<void> {
  if (!_announcer || achievements.length === 0) return;
  for (const a of achievements) {
    await _announcer(userId, a).catch(() => { /* don't let announcement errors bubble up */ });
  }
}
