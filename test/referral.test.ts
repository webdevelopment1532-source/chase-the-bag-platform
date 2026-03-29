jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import { getReferralLeaderboard, getUserReferralCount } from '../src/referral';

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('getReferralLeaderboard', () => {
  test('returns ordered referral rows from DB', async () => {
    const rows = [{ user_id: 'u1', referrals: 5 }, { user_id: 'u2', referrals: 3 }];
    mockExecute.mockResolvedValueOnce([rows]);

    const result = await getReferralLeaderboard(10);
    expect(result).toEqual(rows);
  });

  test('passes limit to the query', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await getReferralLeaderboard(5);
    expect(mockExecute.mock.calls[0][1]).toEqual([5]);
  });

  test('defaults to 10 when no limit provided', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await getReferralLeaderboard();
    expect(mockExecute.mock.calls[0][1]).toEqual([10]);
  });

  test('queries audit_logs for send_affiliate_link actions', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await getReferralLeaderboard(10);
    const query = mockExecute.mock.calls[0][0] as string;
    expect(query).toContain('send_affiliate_link');
    expect(query).toContain('audit_logs');
  });

  test('returns empty array when no referrals exist', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const result = await getReferralLeaderboard(10);
    expect(result).toEqual([]);
  });
});

describe('getUserReferralCount', () => {
  test('returns the referral count for a given user', async () => {
    mockExecute.mockResolvedValueOnce([[{ count: 7 }]]);

    const count = await getUserReferralCount('user42');
    expect(count).toBe(7);
  });

  test('passes userId to the query', async () => {
    mockExecute.mockResolvedValueOnce([[{ count: 0 }]]);
    await getUserReferralCount('myUser');
    expect(mockExecute.mock.calls[0][1]).toContain('myUser');
  });

  test('returns 0 when user has no referrals', async () => {
    mockExecute.mockResolvedValueOnce([[{ count: 0 }]]);
    const count = await getUserReferralCount('newUser');
    expect(count).toBe(0);
  });
});
