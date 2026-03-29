jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import {
  getLeaderboard,
  getUserRank,
  rankEmoji,
  tierColor,
  tierEmoji,
} from '../src/leaderboard';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('leaderboard utilities', () => {
  test('tier helpers return expected emojis/colors', () => {
    expect(tierEmoji('VIP')).toBe('💎');
    expect(tierEmoji('Gold')).toBe('🥇');
    expect(tierEmoji('Silver')).toBe('🥈');
    expect(tierEmoji('Bronze')).toBe('🥉');

    expect(tierColor('VIP')).toBe(0x7B2FBE);
    expect(tierColor('Gold')).toBe(0xFFD700);
    expect(tierColor('Silver')).toBe(0xC0C0C0);
    expect(tierColor('Bronze')).toBe(0xCD7F32);
  });

  test('rankEmoji formats medal and numeric ranks', () => {
    expect(rankEmoji(1)).toBe('🏆');
    expect(rankEmoji(2)).toBe('🥈');
    expect(rankEmoji(3)).toBe('🥉');
    expect(rankEmoji(4)).toBe('**4.**');
  });
});

describe('leaderboard queries', () => {
  test('getLeaderboard maps rows and applies points ordering by default', async () => {
    mockExecute.mockResolvedValueOnce([[{
      userId: 'u1',
      tier: 'Gold',
      points: '500',
      totalVolume: '1000',
      totalTrades: '4',
      totalProfit: '50',
      winRate: '75.5',
    }]]);

    const rows = await getLeaderboard();
    expect(rows[0]).toEqual({
      rank: 1,
      userId: 'u1',
      tier: 'Gold',
      points: 500,
      totalVolume: 1000,
      totalTrades: 4,
      totalProfit: 50,
      winRate: 75.5,
    });

    const query = mockExecute.mock.calls[0][0] as string;
    expect(query).toContain('ORDER BY p.points DESC');
    expect(mockExecute.mock.calls[0][1]).toEqual([10]);
  });

  test('getLeaderboard supports alternate ordering categories', async () => {
    mockExecute.mockResolvedValue([[]]);

    await getLeaderboard('volume', 5);
    expect((mockExecute.mock.calls[0][0] as string)).toContain('ORDER BY totalVolume DESC');

    await getLeaderboard('trades', 5);
    expect((mockExecute.mock.calls[1][0] as string)).toContain('ORDER BY totalTrades DESC');

    await getLeaderboard('profit', 5);
    expect((mockExecute.mock.calls[2][0] as string)).toContain('ORDER BY totalProfit DESC');
  });

  test('getLeaderboard maps nullish row fields to defaults', async () => {
    mockExecute.mockResolvedValueOnce([[{
      userId: 'u-null',
      tier: null,
      points: null,
      totalVolume: null,
      totalTrades: null,
      totalProfit: null,
      winRate: null,
    }]]);

    await expect(getLeaderboard('points', 1)).resolves.toEqual([
      {
        rank: 1,
        userId: 'u-null',
        tier: 'Bronze',
        points: 0,
        totalVolume: 0,
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
      },
    ]);
  });

  test('getUserRank returns null or rank payload based on DB rows', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ userRank: 0 }]])
      .mockResolvedValueOnce([[{ cnt: 3 }]]);
    await expect(getUserRank('none')).resolves.toBeNull();

    mockExecute
      .mockResolvedValueOnce([[{ userRank: 2 }]])
      .mockResolvedValueOnce([[{ cnt: 10 }]]);
    await expect(getUserRank('u2')).resolves.toEqual({ rank: 2, totalUsers: 10 });

    mockExecute
      .mockResolvedValueOnce([[{ userRank: 2 }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]]);
    await expect(getUserRank('u3')).resolves.toBeNull();
  });
});
