import { getPlatformAnalytics } from '../src/analytics';
import { checkFraudulentActivity } from '../src/antifraud';
import { getChartUrl } from '../src/chart';
import { getPersonalizedOffer } from '../src/personalize';
import { getReferralLeaderboard, getUserReferralCount } from '../src/referral';
import { getVirtualBoardData } from '../src/virtual-board';
import { getUserReward } from '../src/advanced-commands';
import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';

jest.mock('../src/db', () => ({
  getDbConnection: jest.fn(),
}));

jest.mock('../src/audit-log', () => ({
  logOperation: jest.fn(),
}));

jest.mock('../src/advanced-commands', () => ({
  getUserReward: jest.fn(),
}));

describe('platform utility modules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserReward as jest.Mock).mockImplementation((userId: string) => {
      const tierMap: Record<string, string> = {
        vip: 'VIP',
        gold: 'Gold',
        silver: 'Silver',
        other: 'Bronze',
      };
      return { tier: tierMap[userId] ?? 'Bronze' };
    });
  });

  test('getPlatformAnalytics aggregates db counts correctly', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ count: 12 }], []])
      .mockResolvedValueOnce([[{ count: 7 }], []])
      .mockResolvedValueOnce([[{ count: 4 }], []])
      .mockResolvedValueOnce([[{ total: 530 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const result = await getPlatformAnalytics();

    expect(result).toEqual({
      userCount: 12,
      codeCount: 7,
      affiliateCount: 4,
      totalRewards: 530,
    });
    expect(execute).toHaveBeenCalledTimes(4);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      'SELECT COUNT(DISTINCT user) as count FROM leaderboard'
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'SELECT COUNT(*) as count FROM codes'
    );
    expect(execute).toHaveBeenNthCalledWith(
      3,
      'SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE action = "send_affiliate_link"'
    );
    expect(execute).toHaveBeenNthCalledWith(
      4,
      'SELECT SUM(score) as total FROM leaderboard'
    );
  });

  test('checkFraudulentActivity returns no alerts for low activity', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ count: 2 }], []])
      .mockResolvedValueOnce([[{ count: 3 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const alerts = await checkFraudulentActivity('user-low');

    expect(alerts).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'send_affiliate_link' AND created_at > NOW() - INTERVAL 1 HOUR`,
      ['user-low']
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'generate_self_code' AND created_at > NOW() - INTERVAL 1 HOUR`,
      ['user-low']
    );
  });

  test('checkFraudulentActivity returns both alerts for high activity', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ count: 6 }], []])
      .mockResolvedValueOnce([[{ count: 11 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const alerts = await checkFraudulentActivity('user-high');

    expect(alerts).toEqual([
      'High referral activity detected (possible abuse)',
      'Excessive code generation detected',
    ]);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'send_affiliate_link' AND created_at > NOW() - INTERVAL 1 HOUR`,
      ['user-high']
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      `SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND action = 'generate_self_code' AND created_at > NOW() - INTERVAL 1 HOUR`,
      ['user-high']
    );
  });

  test('checkFraudulentActivity does not alert at exact threshold values', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ count: 5 }], []])
      .mockResolvedValueOnce([[{ count: 10 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const alerts = await checkFraudulentActivity('user-threshold');

    expect(alerts).toEqual([]);
  });

  test('checkFraudulentActivity handles empty aggregate rows without throwing', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const alerts = await checkFraudulentActivity('user-empty');

    expect(alerts).toEqual([]);
  });

  test('getChartUrl returns encoded quickchart URL', async () => {
    const url = await getChartUrl([1, 2], ['A', 'B'], 'Demo');
    expect(url.startsWith('https://quickchart.io/chart?c=')).toBe(true);
    const encoded = url.split('=')[1];
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain('"type":"bar"');
    expect(decoded).toContain('"labels":["A","B"]');
    expect(decoded).toContain('"label":"Demo"');
    expect(decoded).toContain('"data":[1,2]');
  });

  test('getChartUrl uses default title when omitted', async () => {
    const url = await getChartUrl([3], ['Only']);
    const encoded = url.split('=')[1];
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain('"label":"Game Stats"');
  });

  test('getPersonalizedOffer covers tier branches', () => {
    expect(getPersonalizedOffer('vip')).toContain('VIP Bonus');
    expect(getPersonalizedOffer('gold')).toContain('Gold Bonus');
    expect(getPersonalizedOffer('silver')).toContain('Silver Bonus');
    expect(getPersonalizedOffer('other')).toContain('unlock exclusive bonuses');
  });

  test('referral helpers return leaderboard and user count', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ user_id: 'u1', referrals: 3 }], []])
      .mockResolvedValueOnce([[{ user_id: 'u2', referrals: 2 }], []])
      .mockResolvedValueOnce([[{ count: 9 }], []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const leaderboardWithLimit = await getReferralLeaderboard(5);
    const leaderboardDefault = await getReferralLeaderboard();
    const count = await getUserReferralCount('u1');

    expect(leaderboardWithLimit).toEqual([{ user_id: 'u1', referrals: 3 }]);
    expect(leaderboardDefault).toEqual([{ user_id: 'u2', referrals: 2 }]);
    expect(count).toBe(9);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT user_id, COUNT(*) as referrals"),
      [5]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SELECT user_id, COUNT(*) as referrals"),
      [10]
    );
    expect(execute).toHaveBeenNthCalledWith(
      3,
      'SELECT COUNT(*) as count FROM audit_logs WHERE action = "send_affiliate_link" AND user_id = ?',
      ['u1']
    );
  });

  test('getVirtualBoardData logs only when user and server are provided', async () => {
    const rows = [{ code: 'A1', source: 'stake.us', created_at: '2026-04-01' }];
    const execute = jest.fn().mockResolvedValue([rows, []]);

    (getDbConnection as jest.Mock).mockResolvedValue({ execute });

    const withoutAudit = await getVirtualBoardData();
    expect(withoutAudit).toEqual(rows);
    expect(logOperation).not.toHaveBeenCalled();

    const withAudit = await getVirtualBoardData('user-1', 'guild-1');
    expect(withAudit).toEqual(rows);
    expect(logOperation).toHaveBeenCalledWith({
      userId: 'user-1',
      serverId: 'guild-1',
      action: 'view_virtual_board',
      details: 'Viewed 1 codes',
    });
    expect(execute).toHaveBeenCalledWith(
      'SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 50'
    );

    await getVirtualBoardData('user-only');
    expect(logOperation).toHaveBeenCalledTimes(1);
  });
});
