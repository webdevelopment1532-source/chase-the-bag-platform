jest.mock('../src/db');
jest.mock('../src/exchange-accounts', () => ({
  ensureExchangeProfile: jest.fn(),
  awardExchangePoints: jest.fn(),
}));

import { getDbConnection } from '../src/db';
import { ensureExchangeProfile, awardExchangePoints } from '../src/exchange-accounts';
import { getCheckinStatus, performCheckin } from '../src/checkin';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;
const mockEnsureProfile = ensureExchangeProfile as jest.MockedFunction<typeof ensureExchangeProfile>;
const mockAwardPoints = awardExchangePoints as jest.MockedFunction<typeof awardExchangePoints>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-01-10T12:00:00.000Z'));
  mockGetDb.mockResolvedValue(mockConn as any);
  mockEnsureProfile.mockResolvedValue({ tier: 'Bronze' } as any);
  mockAwardPoints.mockResolvedValue({} as any);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('checkin', () => {
  test('returns already checked in response for same-day checkin', async () => {
    mockExecute.mockResolvedValueOnce([[{
      currentStreak: 4,
      longestStreak: 8,
      totalCheckins: 20,
      lastCheckin: '2026-01-10',
    }]]);

    const result = await performCheckin('u1');
    expect(result.success).toBe(false);
    expect(result.alreadyCheckedIn).toBe(true);
    expect(result.currentStreak).toBe(4);
    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  test('continues streak, awards weekly bonus, and persists state', async () => {
    mockEnsureProfile.mockResolvedValue({ tier: 'Silver' } as any);
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}]);

    const result = await performCheckin('u2');
    expect(result.success).toBe(true);
    expect(result.currentStreak).toBe(1);
    expect(result.pointsAwarded).toBe(50);

    mockExecute.mockReset();
    mockEnsureProfile.mockResolvedValue({ tier: 'Silver' } as any);
    mockExecute
      .mockResolvedValueOnce([[{
        currentStreak: 6,
        longestStreak: 10,
        totalCheckins: 15,
        lastCheckin: '2026-01-09',
      }]])
      .mockResolvedValueOnce([{}]);

    const streakResult = await performCheckin('u2');
    expect(streakResult.currentStreak).toBe(7);
    expect(streakResult.pointsAwarded).toBe(65);
    expect(streakResult.message).toContain('weekly bonus');
    expect(mockAwardPoints).toHaveBeenCalledWith('u2', 65);
  });

  test('uses fallback base points and caps streak bonus at +100 for very long streaks', async () => {
    mockEnsureProfile.mockResolvedValue({ tier: 'Unranked' } as any);
    mockExecute
      .mockResolvedValueOnce([[{
        currentStreak: 70,
        longestStreak: 70,
        totalCheckins: 100,
        lastCheckin: '2026-01-09',
      }]])
      .mockResolvedValueOnce([{}]);

    const result = await performCheckin('u-long');
    expect(result.currentStreak).toBe(71);
    expect(result.pointsAwarded).toBe(125);
    expect(result.message).toContain("You're a legend");
    expect(result.message).toContain('+100 streak bonus');
    expect(mockAwardPoints).toHaveBeenCalledWith('u-long', 125);
  });

  test('uses mid-tier streak message branch for streaks between 2 and 6', async () => {
    mockEnsureProfile.mockResolvedValue({ tier: 'Bronze' } as any);
    mockExecute
      .mockResolvedValueOnce([[{
        currentStreak: 1,
        longestStreak: 3,
        totalCheckins: 9,
        lastCheckin: '2026-01-09',
      }]])
      .mockResolvedValueOnce([{}]);

    const result = await performCheckin('u-mid');
    expect(result.currentStreak).toBe(2);
    expect(result.pointsAwarded).toBe(25);
    expect(result.message).toContain('2-day streak');
    expect(result.message).not.toContain('weekly bonus');
  });

  test('getCheckinStatus returns defaults and current-day status', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await expect(getCheckinStatus('new')).resolves.toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,
      lastCheckin: null,
      checkedInToday: false,
    });

    mockExecute.mockResolvedValueOnce([[{
      currentStreak: 2,
      longestStreak: 9,
      totalCheckins: 30,
      lastCheckin: '2026-01-10',
    }]]);
    const status = await getCheckinStatus('u3');
    expect(status.checkedInToday).toBe(true);
    expect(status.currentStreak).toBe(2);
  });

  test('getCheckinStatus coerces nullish lastCheckin to null', async () => {
    mockExecute.mockResolvedValueOnce([[{
      currentStreak: 5,
      longestStreak: 8,
      totalCheckins: 20,
      lastCheckin: undefined,
    }]]);

    const status = await getCheckinStatus('u-null-date');
    expect(status.lastCheckin).toBeNull();
    expect(status.checkedInToday).toBe(false);
  });
});
