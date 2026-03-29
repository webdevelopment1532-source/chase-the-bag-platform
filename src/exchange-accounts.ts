import { getDbConnection } from './db';

export type ExchangeTier = 'Bronze' | 'Silver' | 'Gold' | 'VIP';

export interface ExchangeProfile {
  userId: string;
  exchangeEnabled: boolean;
  tier: ExchangeTier;
  points: number;
  dailyVolumeLimit: number;
  maxTradeSize: number;
}

export interface ExchangeBalance {
  asset: string;
  balance: number;
  holdBalance: number;
}

const TIER_LIMITS: Record<ExchangeTier, { dailyVolumeLimit: number; maxTradeSize: number }> = {
  Bronze: { dailyVolumeLimit: 10000, maxTradeSize: 2500 },
  Silver: { dailyVolumeLimit: 50000, maxTradeSize: 10000 },
  Gold: { dailyVolumeLimit: 250000, maxTradeSize: 50000 },
  VIP: { dailyVolumeLimit: 1000000, maxTradeSize: 250000 },
};

function toTier(points: number): ExchangeTier {
  if (points > 1000) return 'VIP';
  if (points > 500) return 'Gold';
  if (points > 200) return 'Silver';
  return 'Bronze';
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDefaultProfile(userId: string): ExchangeProfile {
  return {
    userId,
    exchangeEnabled: true,
    tier: 'Bronze',
    points: 0,
    dailyVolumeLimit: TIER_LIMITS.Bronze.dailyVolumeLimit,
    maxTradeSize: TIER_LIMITS.Bronze.maxTradeSize,
  };
}

export async function ensureExchangeProfile(userId: string): Promise<ExchangeProfile> {
  const db = await getDbConnection();
  const defaults = getDefaultProfile(userId);

  await db.execute(
    `INSERT IGNORE INTO user_exchange_profiles (
      userId, exchangeEnabled, tier, points, dailyVolumeLimit, maxTradeSize
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      defaults.userId,
      defaults.exchangeEnabled ? 1 : 0,
      defaults.tier,
      defaults.points,
      defaults.dailyVolumeLimit,
      defaults.maxTradeSize,
    ]
  );

  const [rows] = await db.execute(
    'SELECT userId, exchangeEnabled, tier, points, dailyVolumeLimit, maxTradeSize FROM user_exchange_profiles WHERE userId = ? LIMIT 1',
    [userId]
  ) as any;
  await db.end();

  const row = rows?.[0];
  const points = normalizeNumber(row?.points);
  const derivedTier = (row?.tier as ExchangeTier) || toTier(points);
  const limits = TIER_LIMITS[derivedTier] || TIER_LIMITS.Bronze;

  return {
    userId,
    exchangeEnabled: Boolean(row?.exchangeEnabled ?? defaults.exchangeEnabled),
    tier: derivedTier,
    points,
    dailyVolumeLimit: normalizeNumber(row?.dailyVolumeLimit) || limits.dailyVolumeLimit,
    maxTradeSize: normalizeNumber(row?.maxTradeSize) || limits.maxTradeSize,
  };
}

export async function listUserBalances(userId: string): Promise<ExchangeBalance[]> {
  const db = await getDbConnection();
  const [rows] = await db.execute(
    'SELECT asset, balance, holdBalance FROM user_exchange_balances WHERE userId = ? ORDER BY asset ASC',
    [userId]
  ) as any;
  await db.end();

  return (rows ?? []).map((row: any) => ({
    asset: String(row.asset),
    balance: normalizeNumber(row.balance),
    holdBalance: normalizeNumber(row.holdBalance),
  }));
}

export async function getUsedDailyVolume(userId: string): Promise<number> {
  const db = await getDbConnection();
  const [rows] = await db.execute(
    `SELECT COALESCE(SUM(fromAmount * entryPrice), 0) AS usedVolume
     FROM trading_activities
     WHERE userId = ? AND status = 'completed' AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
    [userId]
  ) as any;
  await db.end();
  return normalizeNumber(rows?.[0]?.usedVolume);
}

export async function assertExchangeAccess(userId: string, requestedVolumeUsd: number): Promise<ExchangeProfile> {
  const profile = await ensureExchangeProfile(userId);
  if (!profile.exchangeEnabled) {
    throw new Error('Exchange access is disabled for this account');
  }
  if (requestedVolumeUsd > profile.maxTradeSize) {
    throw new Error(`Trade exceeds max trade size for ${profile.tier} tier`);
  }

  const usedDailyVolume = await getUsedDailyVolume(userId);
  if (usedDailyVolume + requestedVolumeUsd > profile.dailyVolumeLimit) {
    throw new Error(`Trade exceeds daily volume limit for ${profile.tier} tier`);
  }

  return profile;
}

export async function getBalance(userId: string, asset: string): Promise<number> {
  const normalizedAsset = asset.trim().toUpperCase();
  const balances = await listUserBalances(userId);
  const match = balances.find((item) => item.asset === normalizedAsset);
  return match?.balance ?? 0;
}

export async function upsertUserBalance(userId: string, asset: string, delta: number): Promise<void> {
  const normalizedAsset = asset.trim().toUpperCase();
  const db = await getDbConnection();
  await db.execute(
    `INSERT INTO user_exchange_balances (userId, asset, balance, holdBalance)
     VALUES (?, ?, ?, 0)
     ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`,
    [userId, normalizedAsset, delta]
  );
  await db.end();
}

export async function debitUserBalance(userId: string, asset: string, amount: number): Promise<void> {
  const currentBalance = await getBalance(userId, asset);
  if (currentBalance < amount) {
    throw new Error(`Insufficient ${asset.toUpperCase()} balance`);
  }
  await upsertUserBalance(userId, asset, -amount);
}

export async function creditUserBalance(userId: string, asset: string, amount: number): Promise<void> {
  await upsertUserBalance(userId, asset, amount);
}

export async function awardExchangePoints(userId: string, pointsDelta: number): Promise<ExchangeProfile> {
  const profile = await ensureExchangeProfile(userId);
  const nextPoints = Math.max(0, profile.points + Math.floor(pointsDelta));
  const tier = toTier(nextPoints);
  const limits = TIER_LIMITS[tier];

  const db = await getDbConnection();
  await db.execute(
    `UPDATE user_exchange_profiles
     SET points = ?, tier = ?, dailyVolumeLimit = ?, maxTradeSize = ?
     WHERE userId = ?`,
    [nextPoints, tier, limits.dailyVolumeLimit, limits.maxTradeSize, userId]
  );
  await db.end();

  return {
    ...profile,
    points: nextPoints,
    tier,
    dailyVolumeLimit: limits.dailyVolumeLimit,
    maxTradeSize: limits.maxTradeSize,
  };
}

export async function getExchangeOverview(userId: string) {
  const [profile, balances, usedDailyVolume] = await Promise.all([
    ensureExchangeProfile(userId),
    listUserBalances(userId),
    getUsedDailyVolume(userId),
  ]);

  return {
    profile,
    balances,
    limits: {
      usedDailyVolume,
      remainingDailyVolume: Math.max(0, profile.dailyVolumeLimit - usedDailyVolume),
    },
  };
}
