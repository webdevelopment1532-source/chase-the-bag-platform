jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import { checkFraudulentActivity } from '../src/antifraud';

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('checkFraudulentActivity', () => {
  test('returns empty array when no suspicious activity', async () => {
    // referral count = 2 (≤5), code generation count = 3 (≤10)
    mockExecute
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ count: 3 }]]);

    const alerts = await checkFraudulentActivity('user123');
    expect(alerts).toEqual([]);
  });

  test('flags high referral activity when count exceeds 5', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 6 }]])   // >5 referrals
      .mockResolvedValueOnce([[{ count: 0 }]]);  // normal code gen

    const alerts = await checkFraudulentActivity('spammer');
    expect(alerts).toContain('High referral activity detected (possible abuse)');
  });

  test('flags excessive code generation when count exceeds 10', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 0 }]])   // normal referrals
      .mockResolvedValueOnce([[{ count: 11 }]]); // >10 code gen

    const alerts = await checkFraudulentActivity('codeabuser');
    expect(alerts).toContain('Excessive code generation detected');
  });

  test('returns both alerts when both thresholds are exceeded', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 100 }]])
      .mockResolvedValueOnce([[{ count: 100 }]]);

    const alerts = await checkFraudulentActivity('superabuser');
    expect(alerts).toHaveLength(2);
  });

  test('passes userId to both queries', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]]);

    await checkFraudulentActivity('specificUser');
    expect(mockExecute.mock.calls[0][1]).toContain('specificUser');
    expect(mockExecute.mock.calls[1][1]).toContain('specificUser');
  });

  test('queries audit_logs for referral activity', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ count: 0 }]]);

    await checkFraudulentActivity('u1');
    const firstQuery = mockExecute.mock.calls[0][0] as string;
    expect(firstQuery).toContain('send_affiliate_link');
    expect(firstQuery).toContain('INTERVAL 1 HOUR');
  });
});
