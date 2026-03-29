jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import {
  ALL_ACHIEVEMENTS,
  announceNewAchievements,
  checkAndAwardAchievements,
  getEarnedAchievements,
  setAchievementAnnouncer,
} from '../src/achievements';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  setAchievementAnnouncer(async () => Promise.resolve());
});

describe('achievements', () => {
  test('getEarnedAchievements maps earned rows to canonical achievement definitions', async () => {
    mockExecute.mockResolvedValueOnce([[
      { achievementId: 'first_trade', earnedAt: '2026-01-01' },
      { achievementId: 'streak_3', earnedAt: '2026-01-02' },
      { achievementId: 'unknown', earnedAt: '2026-01-03' },
    ]]);

    const earned = await getEarnedAchievements('u1');
    expect(earned).toHaveLength(2);
    expect(earned[0].id).toBe('first_trade');
    expect(earned[1].id).toBe('streak_3');
  });

  test('checkAndAwardAchievements inserts newly unlocked achievements', async () => {
    mockExecute.mockResolvedValue([{}]);
    mockExecute
      .mockResolvedValueOnce([[{ achievementId: 'first_trade' }]])
      .mockResolvedValueOnce([[{ tradeCount: 10, totalVolume: 10000, totalProfit: 1000 }]])
      .mockResolvedValueOnce([[{ cnt: 5 }]])
      .mockResolvedValueOnce([[{ cnt: 5 }]]);

    const unlocked = await checkAndAwardAchievements('u2', {
      tier: 'Gold',
      streak: 7,
      singleTradeUsdVolume: 10000,
    });

    const unlockedIds = unlocked.map((a) => a.id);
    expect(unlockedIds).toContain('trader_10');
    expect(unlockedIds).toContain('high_roller');
    expect(unlockedIds).toContain('tier_gold');
    expect(unlockedIds).toContain('streak_7');
    expect(unlockedIds).not.toContain('first_trade');
  });

  test('checkAndAwardAchievements ignores insertion conflicts and continues', async () => {
    mockExecute.mockResolvedValue([{}]);
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ tradeCount: 1, totalVolume: 0, totalProfit: 0 }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]])
      .mockRejectedValueOnce(new Error('duplicate key'));

    const unlocked = await checkAndAwardAchievements('u3');
    expect(unlocked).toEqual([]);
  });

  test('checkAndAwardAchievements uses nullish defaults when aggregate rows are missing', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const unlocked = await checkAndAwardAchievements('u-nullish');
    expect(unlocked).toEqual([]);
  });

  test('checkAndAwardAchievements skips pushing when achievement lookup returns undefined', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ tradeCount: 1, totalVolume: 0, totalProfit: 0 }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]])
      .mockResolvedValueOnce([{}]);

    const findSpy = jest.spyOn(ALL_ACHIEVEMENTS, 'find').mockReturnValue(undefined as any);
    const unlocked = await checkAndAwardAchievements('u-missing-def');
    expect(unlocked).toEqual([]);
    findSpy.mockRestore();
  });

  test('announceNewAchievements no-ops for empty input and handles announcer errors', async () => {
    const announcer = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);
    setAchievementAnnouncer(announcer);

    await announceNewAchievements('u4', []);
    expect(announcer).not.toHaveBeenCalled();

    await announceNewAchievements('u4', [ALL_ACHIEVEMENTS[0], ALL_ACHIEVEMENTS[1]]);
    expect(announcer).toHaveBeenCalledTimes(2);
  });
});
