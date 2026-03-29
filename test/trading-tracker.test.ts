jest.mock('../src/db');

import {
  recordTrade,
  getUserTrades,
  getUserTradeStats,
  getTimeSeriesMetrics,
  getPlatformTradeStats,
  getPriceHistory,
  recordPriceSnapshot,
  getPlatformMetricsByExchange,
  getTopPerformingUsers,
} from '../src/trading-tracker';
import { getDbConnection } from '../src/db';

const mockExecute = jest.fn();
const mockDb = { execute: mockExecute };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockDb as any);
});

describe('trading-tracker', () => {
  test('recordTrade inserts trade and returns generated id', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    const result = await recordTrade({
      userId: 'u1',
      tradeType: 'crypto_swap',
      fromToken: 'BTC',
      toToken: 'USDT',
      fromAmount: 1,
      toAmount: 70000,
      entryPrice: 70000,
      exitPrice: 70000,
      exchangeFee: 10,
      platformFee: 5,
      profit: 100,
      profitPercent: 0.1,
      exchange: 'binance',
      status: 'completed',
      ipAddress: '127.0.0.1',
      metadata: { source: 'test' },
    });

    expect(result.id).toContain('trade_');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  test('recordTrade falls back metadata to an empty object when omitted', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    await recordTrade({
      userId: 'u2',
      tradeType: 'crypto_swap',
      fromToken: 'ETH',
      toToken: 'USDT',
      fromAmount: 2,
      toAmount: 6000,
      entryPrice: 3000,
      exitPrice: 3000,
      exchangeFee: 1,
      platformFee: 1,
      profit: 0,
      profitPercent: 0,
      exchange: 'binance',
      status: 'completed',
      ipAddress: '127.0.0.1',
    });

    const insertedParams = mockExecute.mock.calls[0][1];
    expect(insertedParams[18]).toBe('{}');
  });

  test('getUserTrades applies filter parameters and parses metadata', async () => {
    mockExecute.mockResolvedValueOnce([[{ metadata: '{"x":1}', id: 't1' }]]);

    const result = await getUserTrades('u1', {
      limit: 20,
      offset: 5,
      filter: {
        tradeType: 'mixing',
        exchange: 'internal',
        minProfit: 1,
        maxProfit: 2,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-02'),
        status: 'completed',
      },
    });

    expect(result[0].metadata).toEqual({ x: 1 });
    const [query, params] = mockExecute.mock.calls[0];
    expect(query).toContain('tradeType = ?');
    expect(params).toContain('mixing');
    expect(params).toContain(20);
    expect(params).toContain(5);
  });

  test('getUserTrades uses defaults when options are omitted and empty metadata fallback', async () => {
    mockExecute.mockResolvedValueOnce([[{ metadata: undefined, id: 't2' }]]);

    const result = await getUserTrades('u1');

    expect(result[0].metadata).toEqual({});
    const [query, params] = mockExecute.mock.calls[0];
    expect(query).toContain('ORDER BY createdAt DESC LIMIT ? OFFSET ?');
    expect(params[params.length - 2]).toBe(100);
    expect(params[params.length - 1]).toBe(0);
  });

  test('getUserTrades keeps query minimal when filter object is provided without fields', async () => {
    mockExecute.mockResolvedValueOnce([[{ metadata: '{}', id: 't3' }]]);

    await getUserTrades('u1', { filter: {} });

    const [query] = mockExecute.mock.calls[0];
    expect(query).not.toContain('tradeType = ?');
    expect(query).not.toContain('exchange = ?');
    expect(query).not.toContain('profit >= ?');
    expect(query).not.toContain('profit <= ?');
    expect(query).not.toContain('createdAt >= ?');
    expect(query).not.toContain('createdAt <= ?');
    expect(query).not.toContain('status = ?');
  });

  test('getUserTradeStats returns normalized stats with fallback tokens', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ totalTrades: 2, totalVolume: 100, totalProfit: 20, totalLoss: 5, avgProfitPercent: 3, winRate: 0.5, averageTradeSize: 50, largestWin: 30, largestLoss: -10 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const result = await getUserTradeStats('u1');

    expect(result.totalTrades).toBe(2);
    expect(result.bestPerformingToken).toBe('N/A');
    expect(result.worstPerformingToken).toBe('N/A');
  });

  test('getUserTradeStats reads best and worst tokens when present', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ totalTrades: 1 }]])
      .mockResolvedValueOnce([[{ toToken: 'BTC' }]])
      .mockResolvedValueOnce([[{ toToken: 'ETH' }]]);

    const result = await getUserTradeStats('u1');
    expect(result.bestPerformingToken).toBe('BTC');
    expect(result.worstPerformingToken).toBe('ETH');
  });

  test('getTimeSeriesMetrics maps db rows by period', async () => {
    mockExecute.mockResolvedValueOnce([[{ bucketTime: '2026-01-01', volumeIn: 1, volumeOut: 2, profitLoss: 3, tradeCount: 4, uniqueTokens: 5, averagePrice: 6 }]]);

    const result = await getTimeSeriesMetrics('u1', 'daily', new Date('2026-01-01'), new Date('2026-01-02'));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ period: 'daily', volumeIn: 1, tradeCount: 4 });
  });

  test('getTimeSeriesMetrics falls back missing aggregates to zero', async () => {
    mockExecute.mockResolvedValueOnce([[{ bucketTime: '2026-01-01' }]]);

    const result = await getTimeSeriesMetrics('u1', 'hourly', new Date('2026-01-01'), new Date('2026-01-02'));

    expect(result[0]).toMatchObject({
      period: 'hourly',
      volumeIn: 0,
      volumeOut: 0,
      profitLoss: 0,
      tradeCount: 0,
      uniqueTokens: 0,
      averagePrice: 0,
    });
  });

  test('getPlatformTradeStats maps aggregate fields', async () => {
    mockExecute.mockResolvedValueOnce([[{ totalTrades: 9, totalVolume: 1000, totalProfit: 100, totalLoss: 10, avgProfitPercent: 2, winRate: 0.6, averageTradeSize: 100, largestWin: 50, largestLoss: -20 }]]);
    const result = await getPlatformTradeStats();
    expect(result.totalTrades).toBe(9);
    expect(result.bestPerformingToken).toBe('BTC');
  });

  test('getPlatformTradeStats falls back empty aggregate values to zero', async () => {
    mockExecute.mockResolvedValueOnce([[{}]]);
    const result = await getPlatformTradeStats();
    expect(result).toMatchObject({
      totalTrades: 0,
      totalVolume: 0,
      totalProfit: 0,
      totalLoss: 0,
      profitPercent: 0,
      winRate: 0,
      averageTradeSize: 0,
      largestWin: 0,
      largestLoss: 0,
    });
  });

  test('getPriceHistory returns raw snapshot rows', async () => {
    mockExecute.mockResolvedValueOnce([[{ token: 'BTC', price: 1 }]]);
    const result = await getPriceHistory('BTC', 3);
    expect(result).toEqual([{ token: 'BTC', price: 1 }]);
  });

  test('getUserTradeStats uses zero and N/A fallbacks when stats row is empty', async () => {
    mockExecute
      .mockResolvedValueOnce([[{}]])  // stats row with no values (all falsy)
      .mockResolvedValueOnce([[]])    // no best token
      .mockResolvedValueOnce([[]]);   // no worst token

    const result = await getUserTradeStats('u-empty');
    expect(result.totalTrades).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.bestPerformingToken).toBe('N/A');
    expect(result.worstPerformingToken).toBe('N/A');
  });

  test('getPriceHistory uses default 7-day window when days is omitted', async () => {
    mockExecute.mockResolvedValueOnce([[{ token: 'ETH', price: 2 }]]);
    const result = await getPriceHistory('ETH');
    expect(result).toEqual([{ token: 'ETH', price: 2 }]);
    expect(mockExecute.mock.calls[0][1]).toEqual(['ETH', 7]);
  });

  test('recordPriceSnapshot inserts snapshot values', async () => {
    mockExecute.mockResolvedValueOnce([{}]);
    await recordPriceSnapshot({ token: 'BTC', price: 1, change24h: 2, change7d: 3, change30d: 4, marketCap: 5, volume24h: 6 });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0][0]).toContain('INSERT INTO price_snapshots');
  });

  test('getPlatformMetricsByExchange returns keyed metrics object', async () => {
    mockExecute.mockResolvedValueOnce([[
      { exchange: 'binance', tradeCount: 2, totalVolume: 3, totalProfit: 4, avgProfit: 5 },
      { exchange: 'uniswap', tradeCount: 6, totalVolume: 7, totalProfit: 8, avgProfit: 9 },
    ]]);

    const result = await getPlatformMetricsByExchange();
    expect(result.binance.tradeCount).toBe(2);
    expect(result.uniswap.averageProfit).toBe(9);
  });

  test('getTopPerformingUsers returns sorted rows payload', async () => {
    mockExecute.mockResolvedValueOnce([[{ userId: 'u1', totalProfit: 10 }]]);
    const result = await getTopPerformingUsers(3);
    expect(result).toEqual([{ userId: 'u1', totalProfit: 10 }]);
    expect(mockExecute.mock.calls[0][1]).toEqual([3]);
  });

  test('getTopPerformingUsers uses default limit when omitted', async () => {
    mockExecute.mockResolvedValueOnce([[{ userId: 'u2', totalProfit: 20 }]]);

    await getTopPerformingUsers();

    expect(mockExecute.mock.calls[0][1]).toEqual([10]);
  });
});
