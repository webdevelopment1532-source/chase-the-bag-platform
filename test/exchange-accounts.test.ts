jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import {
  assertExchangeAccess,
  awardExchangePoints,
  ensureExchangeProfile,
  getBalance,
  getExchangeOverview,
  getUsedDailyVolume,
  listUserBalances,
  upsertUserBalance,
  debitUserBalance,
  creditUserBalance,
} from '../src/exchange-accounts';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('exchange-accounts', () => {
  test('ensureExchangeProfile returns defaults when no row exists', async () => {
    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[]]);

    const profile = await ensureExchangeProfile('u1');
    expect(profile).toEqual({
      userId: 'u1',
      exchangeEnabled: true,
      tier: 'Bronze',
      points: 0,
      dailyVolumeLimit: 10000,
      maxTradeSize: 2500,
    });
  });

  test('ensureExchangeProfile normalizes values and derives limits', async () => {
    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{
        userId: 'u2',
        exchangeEnabled: 1,
        tier: 'Gold',
        points: '777',
        dailyVolumeLimit: 0,
        maxTradeSize: 0,
      }]]);

    const profile = await ensureExchangeProfile('u2');
    expect(profile.tier).toBe('Gold');
    expect(profile.points).toBe(777);
    expect(profile.dailyVolumeLimit).toBe(250000);
    expect(profile.maxTradeSize).toBe(50000);
  });

  test('listUserBalances and getBalance normalize assets and numbers', async () => {
    mockExecute.mockResolvedValueOnce([[
      { asset: 'btc', balance: '1.5', holdBalance: null },
      { asset: 'ETH', balance: 2, holdBalance: '0.25' },
    ]]);

    const balances = await listUserBalances('u3');
    expect(balances[0]).toEqual({ asset: 'btc', balance: 1.5, holdBalance: 0 });

    mockExecute.mockResolvedValueOnce([[{ asset: 'BTC', balance: 9, holdBalance: 0 }]]);
    expect(await getBalance('u3', ' btc ')).toBe(9);
  });

  test('getUsedDailyVolume normalizes bad DB values', async () => {
    mockExecute.mockResolvedValueOnce([[{ usedVolume: '1200.75' }]]);
    await expect(getUsedDailyVolume('u4')).resolves.toBe(1200.75);

    mockExecute.mockResolvedValueOnce([[{ usedVolume: 'NaN' }]]);
    await expect(getUsedDailyVolume('u4')).resolves.toBe(0);
  });

  test('assertExchangeAccess enforces disabled, size, and daily limit checks', async () => {
    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ exchangeEnabled: 0, tier: 'Bronze', points: 0, dailyVolumeLimit: 10000, maxTradeSize: 2500 }]]);
    await expect(assertExchangeAccess('u5', 100)).rejects.toThrow('disabled');

    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ exchangeEnabled: 1, tier: 'Bronze', points: 0, dailyVolumeLimit: 10000, maxTradeSize: 100 }]]);
    await expect(assertExchangeAccess('u5', 500)).rejects.toThrow('max trade size');

    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ exchangeEnabled: 1, tier: 'Silver', points: 400, dailyVolumeLimit: 500, maxTradeSize: 1000 }]])
      .mockResolvedValueOnce([[{ usedVolume: 450 }]]);
    await expect(assertExchangeAccess('u5', 100)).rejects.toThrow('daily volume limit');
  });

  test('assertExchangeAccess returns profile when request is within all limits', async () => {
    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ exchangeEnabled: 1, tier: 'Silver', points: 400, dailyVolumeLimit: 50000, maxTradeSize: 1000 }]])
      .mockResolvedValueOnce([[{ usedVolume: 250 }]]);

    await expect(assertExchangeAccess('u-ok', 100)).resolves.toMatchObject({
      userId: 'u-ok',
      tier: 'Silver',
      maxTradeSize: 1000,
    });
  });

  test('balance mutation helpers update and validate balances', async () => {
    mockExecute.mockResolvedValueOnce([{}]);
    await upsertUserBalance('u6', ' eth ', 2.5);
    expect(mockExecute.mock.calls[0][1]).toEqual(['u6', 'ETH', 2.5]);

    mockExecute.mockResolvedValueOnce([[{ asset: 'ETH', balance: 10, holdBalance: 0 }]]);
    mockExecute.mockResolvedValueOnce([{}]);
    await debitUserBalance('u6', 'eth', 3);

    mockExecute.mockResolvedValueOnce([[{ asset: 'BTC', balance: 1, holdBalance: 0 }]]);
    await expect(debitUserBalance('u6', 'btc', 2)).rejects.toThrow('Insufficient BTC balance');

    mockExecute.mockResolvedValueOnce([{}]);
    await creditUserBalance('u6', 'btc', 5);
  });

  test('awardExchangePoints updates points and tier', async () => {
    mockExecute
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ exchangeEnabled: 1, tier: 'Bronze', points: 190, dailyVolumeLimit: 10000, maxTradeSize: 2500 }]])
      .mockResolvedValueOnce([{}]);

    const profile = await awardExchangePoints('u7', 20.9);
    expect(profile.points).toBe(210);
    expect(profile.tier).toBe('Silver');
    expect(profile.dailyVolumeLimit).toBe(50000);
  });

  test('getExchangeOverview combines profile, balances, and limits', async () => {
    mockExecute.mockImplementation(async (query: string) => {
      if (query.includes('INSERT IGNORE INTO user_exchange_profiles')) return [{} as any];
      if (query.includes('FROM user_exchange_profiles WHERE userId = ? LIMIT 1')) {
        return [[{ exchangeEnabled: 1, tier: 'Gold', points: 700, dailyVolumeLimit: 250000, maxTradeSize: 50000 }]] as any;
      }
      if (query.includes('FROM user_exchange_balances')) {
        return [[{ asset: 'BTC', balance: 3, holdBalance: 0 }]] as any;
      }
      if (query.includes('AS usedVolume')) {
        return [[{ usedVolume: 1000 }]] as any;
      }
      return [[]] as any;
    });

    const overview = await getExchangeOverview('u8');
    expect(overview.profile.tier).toBe('Gold');
    expect(overview.balances).toHaveLength(1);
    expect(overview.limits.usedDailyVolume).toBe(1000);
    expect(overview.limits.remainingDailyVolume).toBe(249000);
  });
});
