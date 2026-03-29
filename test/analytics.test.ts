jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import { getPlatformAnalytics } from '../src/analytics';

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('getPlatformAnalytics', () => {
  test('returns aggregated counts from all tables', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 42 }]])   // userCount
      .mockResolvedValueOnce([[{ count: 10 }]])   // codeCount
      .mockResolvedValueOnce([[{ count: 3 }]])    // affiliateCount
      .mockResolvedValueOnce([[{ total: 9999 }]]); // totalRewards

    const result = await getPlatformAnalytics();

    expect(result).toEqual({ userCount: 42, codeCount: 10, affiliateCount: 3, totalRewards: 9999 });
  });

  test('executes four distinct SQL queries', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    await getPlatformAnalytics();
    expect(mockExecute).toHaveBeenCalledTimes(4);
  });

  test('queries audit_logs for affiliate count', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ total: 0 }]]);

    await getPlatformAnalytics();
    const affiliateCall = mockExecute.mock.calls[2][0] as string;
    expect(affiliateCall).toContain('audit_logs');
    expect(affiliateCall).toContain('send_affiliate_link');
  });
});
