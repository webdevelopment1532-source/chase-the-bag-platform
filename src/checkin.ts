import { getDbConnection } from './db';
import { awardExchangePoints, ensureExchangeProfile } from './exchange-accounts';

export interface CheckinResult {
  success: boolean;
  message: string;
  pointsAwarded: number;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  alreadyCheckedIn: boolean;
}

const TIER_BASE_POINTS: Record<string, number> = {
  Bronze: 25,
  Silver: 50,
  Gold: 100,
  VIP: 200,
};

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function performCheckin(userId: string): Promise<CheckinResult> {
  const db = await getDbConnection();
  try {
    const today = todayDateString();
    const yesterday = yesterdayDateString();

    const profile = await ensureExchangeProfile(userId);

    const [rows] = await db.execute(
      'SELECT currentStreak, longestStreak, lastCheckin, totalCheckins FROM user_checkins WHERE userId = ?',
      [userId]
    ) as any;
    const row = (rows as any[])[0];

    // Already checked in today
    if (row && row.lastCheckin === today) {
      return {
        success: false,
        message: `Already checked in today! Come back tomorrow to keep your **${row.currentStreak}**-day streak alive.`,
        pointsAwarded: 0,
        currentStreak: Number(row.currentStreak),
        longestStreak: Number(row.longestStreak),
        totalCheckins: Number(row.totalCheckins),
        alreadyCheckedIn: true,
      };
    }

    const prevStreak = row ? Number(row.currentStreak) : 0;
    const prevLongest = row ? Number(row.longestStreak) : 0;
    const prevTotal = row ? Number(row.totalCheckins) : 0;

    const currentStreak = row && row.lastCheckin === yesterday ? prevStreak + 1 : 1;
    const longestStreak = Math.max(prevLongest, currentStreak);
    const totalCheckins = prevTotal + 1;

    // Points: base per tier + streak weekly bonus (capped at +100)
    const base = TIER_BASE_POINTS[profile.tier] ?? 25;
    const weekBonus = Math.min(Math.floor(currentStreak / 7) * 15, 100);
    const pointsAwarded = base + weekBonus;

    await db.execute(`
      INSERT INTO user_checkins (userId, currentStreak, longestStreak, lastCheckin, totalCheckins)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        currentStreak = VALUES(currentStreak),
        longestStreak = VALUES(longestStreak),
        lastCheckin = VALUES(lastCheckin),
        totalCheckins = VALUES(totalCheckins),
        updatedAt = CURRENT_TIMESTAMP
    `, [userId, currentStreak, longestStreak, today, totalCheckins]);

    await awardExchangePoints(userId, pointsAwarded);

    const streakMsg =
      currentStreak >= 30 ? `🔥 **${currentStreak}-day streak!** You're a legend!` :
      currentStreak >= 7  ? `🔥 **${currentStreak}-day streak!** Keep it up for a weekly bonus!` :
      currentStreak > 1   ? `**${currentStreak}-day streak!**` :
      'First check-in — welcome to the grind!';

    const bonusMsg = weekBonus > 0 ? ` +${weekBonus} streak bonus!` : '';

    return {
      success: true,
      message: `${streakMsg}${bonusMsg}`,
      pointsAwarded,
      currentStreak,
      longestStreak,
      totalCheckins,
      alreadyCheckedIn: false,
    };
  } finally {
    await db.end();
  }
}

export async function getCheckinStatus(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
  lastCheckin: string | null;
  checkedInToday: boolean;
}> {
  const db = await getDbConnection();
  try {
    const [rows] = await db.execute(
      'SELECT currentStreak, longestStreak, lastCheckin, totalCheckins FROM user_checkins WHERE userId = ?',
      [userId]
    ) as any;
    const row = (rows as any[])[0];
    if (!row) {
      return { currentStreak: 0, longestStreak: 0, totalCheckins: 0, lastCheckin: null, checkedInToday: false };
    }
    return {
      currentStreak: Number(row.currentStreak),
      longestStreak: Number(row.longestStreak),
      totalCheckins: Number(row.totalCheckins),
      lastCheckin: row.lastCheckin ?? null,
      checkedInToday: row.lastCheckin === todayDateString(),
    };
  } finally {
    await db.end();
  }
}
