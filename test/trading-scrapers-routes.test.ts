process.env.API_AUTH_TOKEN = 'test-token-advanced';
process.env.API_ADMIN_ID = 'dashboard-admin';

jest.mock('../src/db');
jest.mock('../src/audit-log');
jest.mock('../src/trading-tracker', () => ({
  recordTrade: jest.fn(),
  getUserTrades: jest.fn(),
  getUserTradeStats: jest.fn(),
  getTimeSeriesMetrics: jest.fn(),
  getPlatformTradeStats: jest.fn(),
  getPriceHistory: jest.fn(),
  getPlatformMetricsByExchange: jest.fn(),
  getTopPerformingUsers: jest.fn(),
}));

jest.mock('../src/exchange-integration', () => ({
  getBinancePrices: jest.fn(),
  getCoinGeckoPrices: jest.fn(),
  simulateBinanceTrade: jest.fn(),
  recordUniswapSwap: jest.fn(),
  recordStripePayment: jest.fn(),
  recordPayPalWithdrawal: jest.fn(),
  recordMixingTransaction: jest.fn(),
  recordStakingReward: jest.fn(),
  updatePriceSnapshots: jest.fn(),
  calculateSlippage: jest.fn(),
}));

jest.mock('../src/exchange-accounts', () => ({
  assertExchangeAccess: jest.fn(),
  awardExchangePoints: jest.fn(),
  creditUserBalance: jest.fn(),
  debitUserBalance: jest.fn(),
  getBalance: jest.fn(),
  getExchangeOverview: jest.fn(),
}));

import request from 'supertest';
import { app } from '../src/api';
import tradingRouter from '../src/routes/trading';
import scrapersRouter from '../src/routes/scrapers';
import { getDbConnection } from '../src/db';
import {
  getUserTrades,
  getUserTradeStats,
  getTimeSeriesMetrics,
  getPlatformTradeStats,
  getPriceHistory,
  getPlatformMetricsByExchange,
  getTopPerformingUsers,
} from '../src/trading-tracker';
import {
  getBinancePrices,
  simulateBinanceTrade,
  recordUniswapSwap,
  recordStripePayment,
  recordPayPalWithdrawal,
  recordMixingTransaction,
  recordStakingReward,
  updatePriceSnapshots,
  calculateSlippage,
} from '../src/exchange-integration';
import {
  assertExchangeAccess,
  awardExchangePoints,
  creditUserBalance,
  debitUserBalance,
  getBalance,
} from '../src/exchange-accounts';

const authHeaders = {
  Authorization: 'Bearer test-token-advanced',
};

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };

beforeEach(() => {
  jest.clearAllMocks();
  (getDbConnection as jest.Mock).mockResolvedValue(mockConn);
  (assertExchangeAccess as jest.Mock).mockResolvedValue(undefined);
  (awardExchangePoints as jest.Mock).mockResolvedValue(undefined);
  (creditUserBalance as jest.Mock).mockResolvedValue(undefined);
  (debitUserBalance as jest.Mock).mockResolvedValue(undefined);
  (getBalance as jest.Mock).mockResolvedValue(1000000);
});

function getPostHandler(path: string) {
  const layer = (tradingRouter as any).stack.find((item: any) => item.route?.path === path && item.route?.methods?.post);
  if (!layer) {
    throw new Error(`Route handler not found for POST ${path}`);
  }
  return layer.route.stack[0].handle as (req: any, res: any) => Promise<void>;
}

function getGetHandler(path: string) {
  const layer = (tradingRouter as any).stack.find((item: any) => item.route?.path === path && item.route?.methods?.get);
  if (!layer) {
    throw new Error(`Route handler not found for GET ${path}`);
  }
  return layer.route.stack[0].handle as (req: any, res: any) => Promise<void>;
}

function getScraperHandler(method: 'get' | 'post' | 'patch', path: string) {
  const layer = (scrapersRouter as any).stack.find((item: any) => item.route?.path === path && item.route?.methods?.[method]);
  if (!layer) {
    throw new Error(`Route handler not found for ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack[0].handle as (req: any, res: any) => Promise<void>;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('Trading routes', () => {
  test('GET /account returns overview, degraded payload, and 500 branch', async () => {
    const exchangeAccountsModule = require('../src/exchange-accounts');
    const overviewSpy = jest.spyOn(exchangeAccountsModule, 'getExchangeOverview');
    const handler = getGetHandler('/account');

    const okRes = makeRes();
    overviewSpy.mockResolvedValueOnce({ profile: { userId: 'u1', tier: 'Bronze' }, balances: [], limits: {} });
    await handler({ headers: { 'x-user-id': 'u1' } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const degradedRes = makeRes();
    overviewSpy.mockRejectedValueOnce(new Error('ER_NO_SUCH_TABLE'));
    await handler({ headers: { 'x-user-id': 'u2' } } as any, degradedRes);
    expect(degradedRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    const failRes = makeRes();
    overviewSpy.mockRejectedValueOnce(new Error('boom'));
    await handler({ headers: { 'x-user-id': 'u3' } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);

    process.env.NODE_ENV = prevEnv;
    overviewSpy.mockRestore();
  });

  test('POST /account/top-up validates admin, payload, success and failure', async () => {
    const exchangeAccountsModule = require('../src/exchange-accounts');
    const overviewSpy = jest.spyOn(exchangeAccountsModule, 'getExchangeOverview').mockResolvedValue({ profile: { userId: 'u1' }, balances: [], limits: {} });
    const handler = getPostHandler('/account/top-up');

    const unauthorizedRes = makeRes();
    await handler({ headers: {}, body: { userId: 'u1', asset: 'USD', amount: 10 } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(403);

    const invalidRes = makeRes();
    await handler({ headers: { 'x-is-admin': 'true' }, body: { userId: 'u1', asset: 'USD', amount: 0 } } as any, invalidRes);
    expect(invalidRes.status).toHaveBeenCalledWith(400);

    const okRes = makeRes();
    await handler({ headers: { 'x-is-admin': 'true' }, body: { userId: 'u1', asset: 'USD', amount: 25 } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const failRes = makeRes();
    overviewSpy.mockRejectedValueOnce(new Error('boom'));
    await handler({ headers: { 'x-is-admin': 'true' }, body: { userId: 'u1', asset: 'USD', amount: 25 } } as any, failRes);
    expect(failRes.status).toHaveBeenCalledWith(500);

    overviewSpy.mockRestore();
  });

  test('trading routes return degraded payloads in production when errors are connection-class', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const userTradesHandler = getGetHandler('/user-trades');
    const statsHandler = getGetHandler('/stats');
    const metricsHandler = getGetHandler('/metrics/:period');
    const platformHandler = getGetHandler('/platform-stats');
    const historyHandler = getGetHandler('/price-history/:token');

    (getUserTrades as jest.Mock).mockRejectedValueOnce(new Error('ER_NO_SUCH_TABLE'));
    const tradesRes = makeRes();
    await userTradesHandler({ headers: { 'x-user-id': 'u1' }, query: {} } as any, tradesRes);
    expect(tradesRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    (getUserTradeStats as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const statsRes = makeRes();
    await statsHandler({ headers: { 'x-user-id': 'u1' } } as any, statsRes);
    expect(statsRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    (getTimeSeriesMetrics as jest.Mock).mockRejectedValueOnce(new Error("table doesn't exist"));
    const metricsRes = makeRes();
    await metricsHandler({ headers: { 'x-user-id': 'u1' }, params: { period: 'daily' } } as any, metricsRes);
    expect(metricsRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    (getPlatformTradeStats as jest.Mock).mockRejectedValueOnce(new Error('connection failed'));
    const platformRes = makeRes();
    await platformHandler({ headers: { 'x-is-admin': 'true' } } as any, platformRes);
    expect(platformRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    (getPriceHistory as jest.Mock).mockRejectedValueOnce(new Error('access denied'));
    const historyRes = makeRes();
    await historyHandler({ params: { token: 'btc' }, query: {} } as any, historyRes);
    expect(historyRes.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    process.env.NODE_ENV = prevEnv;
  });

  test('GET /api/trading/user-trades returns trades', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([{ id: 't1' }]);

    const res = await request(app)
      .get('/api/trading/user-trades?limit=10&offset=2')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 't1' }]);
  });

  test('GET /api/trading/user-trades handles service failure', async () => {
    (getUserTrades as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    const res = await request(app)
      .get('/api/trading/user-trades')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/stats handles service failure', async () => {
    (getUserTradeStats as jest.Mock).mockRejectedValue(new Error('fail'));

    const res = await request(app)
      .get('/api/trading/stats')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/stats returns stats payload', async () => {
    (getUserTradeStats as jest.Mock).mockResolvedValue({ totalTrades: 2 });

    const res = await request(app)
      .get('/api/trading/stats')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.data.totalTrades).toBe(2);
  });

  test('GET /api/trading/metrics rejects invalid period', async () => {
    const res = await request(app)
      .get('/api/trading/metrics/invalid')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(400);
  });

  test('GET /api/trading/metrics returns data for valid period', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([{ period: 'daily' }]);

    const res = await request(app)
      .get('/api/trading/metrics/daily')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ period: 'daily' }]);
  });

  test('GET /api/trading/metrics handles backend errors', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockRejectedValue(new Error('down'));

    const res = await request(app)
      .get('/api/trading/metrics/hourly')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/platform-stats requires x-is-admin', async () => {
    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders);

    expect(res.status).toBe(403);
  });

  test('GET /api/trading/platform-stats returns aggregate data for admin', async () => {
    (getPlatformTradeStats as jest.Mock).mockResolvedValue({ totalTrades: 1 });
    (getPlatformMetricsByExchange as jest.Mock).mockResolvedValue({ binance: { totalVolume: 10 } });
    (getTopPerformingUsers as jest.Mock).mockResolvedValue([{ userId: 'u1' }]);

    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overall.totalTrades).toBe(1);
  });

  test('GET /api/trading/platform-stats handles service failures', async () => {
    (getPlatformTradeStats as jest.Mock).mockRejectedValue(new Error('fail'));

    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/prices returns current prices', async () => {
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000], ['ETH', 3500]]));

    const res = await request(app)
      .get('/api/trading/prices?tokens=BTC,ETH')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.BTC).toBe(70000);
  });

  test('GET /api/trading/prices uses defaults and handles fetch failure', async () => {
    (getBinancePrices as jest.Mock).mockRejectedValueOnce(new Error('down'));

    const res = await request(app)
      .get('/api/trading/prices')
      .set(authHeaders);

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/price-history returns history', async () => {
    (getPriceHistory as jest.Mock).mockResolvedValue([{ token: 'BTC' }]);

    const res = await request(app)
      .get('/api/trading/price-history/btc?days=14')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ token: 'BTC' }]);
  });

  test('GET /api/trading/price-history handles service failure', async () => {
    (getPriceHistory as jest.Mock).mockRejectedValueOnce(new Error('down'));

    const res = await request(app)
      .get('/api/trading/price-history/eth')
      .set(authHeaders);

    expect(res.status).toBe(500);
  });

  test('POST /api/trading/simulate-binance-trade validates required fields', async () => {
    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .send({ fromToken: 'BTC' });

    expect(res.status).toBe(400);
  });

  test('POST /api/trading/simulate-binance-trade returns simulation result', async () => {
    (simulateBinanceTrade as jest.Mock).mockResolvedValue({ id: 'trade-1', profit: 2 });

    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'BTC', toToken: 'USDT', fromAmount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('trade-1');
  });

  test('POST /api/trading/simulate-binance-trade handles service failure', async () => {
    (simulateBinanceTrade as jest.Mock).mockRejectedValueOnce(new Error('down'));

    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .send({ fromToken: 'BTC', toToken: 'USDT', fromAmount: 1 });

    expect(res.status).toBe(500);
  });

  test('POST /api/trading/simulate-binance-trade enforces balances in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBalance as jest.Mock).mockResolvedValueOnce(0.1);

    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'BTC', toToken: 'USDT', fromAmount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Insufficient BTC balance');

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/simulate-binance-trade settles balances and rewards in production mode', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000]]));
    (getBalance as jest.Mock).mockResolvedValueOnce(2);
    (simulateBinanceTrade as jest.Mock).mockResolvedValue({
      tradeType: 'crypto_swap',
      fromToken: 'BTC',
      toToken: 'USDT',
      fromAmount: 1,
      toAmount: 70000,
    });

    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'BTC', toToken: 'USDT', fromAmount: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(assertExchangeAccess).toHaveBeenCalled();
    expect(debitUserBalance).toHaveBeenCalledWith('u1', 'BTC', 1);
    expect(creditUserBalance).toHaveBeenCalledWith('u1', 'USDT', 70000);
    expect(awardExchangePoints).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-* endpoints call integrations', async () => {
    (recordUniswapSwap as jest.Mock).mockResolvedValue({ id: 'u' });
    (recordStripePayment as jest.Mock).mockResolvedValue({ id: 's' });
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({ id: 'p' });
    (recordMixingTransaction as jest.Mock).mockResolvedValue({ id: 'm' });
    (recordStakingReward as jest.Mock).mockResolvedValue({ id: 'st' });

    const uni = await request(app)
      .post('/api/trading/record-uniswap')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2000, transactionHash: '0x1' });
    const stripe = await request(app)
      .post('/api/trading/record-stripe')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ usdAmount: 100, cryptoType: 'BTC', transactionId: 'tx1' });
    const paypal = await request(app)
      .post('/api/trading/record-paypal')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoAmount: 0.01, cryptoType: 'BTC', transactionId: 'tx2' });
    const mixing = await request(app)
      .post('/api/trading/record-mixing')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'BTC', amount: 0.2, mixingFeePercent: 0.7 });
    const staking = await request(app)
      .post('/api/trading/record-staking')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'BTC', stakedAmount: 1, rewardAmount: 0.02, apy: 12 });

    expect(uni.status).toBe(200);
    expect(stripe.status).toBe(200);
    expect(paypal.status).toBe(200);
    expect(mixing.status).toBe(200);
    expect(staking.status).toBe(200);
  });

  test('POST /api/trading/record-stripe in production tops up USD when balance is insufficient', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (recordStripePayment as jest.Mock).mockResolvedValue({
      tradeType: 'usdt_to_crypto',
      fromToken: 'USD',
      toToken: 'BTC',
      fromAmount: 100,
      toAmount: 0.001,
    });
    (getBalance as jest.Mock).mockResolvedValueOnce(10);

    const res = await request(app)
      .post('/api/trading/record-stripe')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ usdAmount: 100, cryptoType: 'BTC', transactionId: 'tx1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(assertExchangeAccess).toHaveBeenCalledWith('u1', 100);
    expect(creditUserBalance).toHaveBeenCalledWith('u1', 'USD', 100);
    expect(debitUserBalance).toHaveBeenCalledWith('u1', 'USD', 100);
    expect(awardExchangePoints).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-paypal in production settles balances', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000]]));
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({
      tradeType: 'crypto_to_usdt',
      fromToken: 'BTC',
      toToken: 'USD',
      fromAmount: 0.01,
      toAmount: 700,
    });

    const res = await request(app)
      .post('/api/trading/record-paypal')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoAmount: 0.01, cryptoType: 'BTC', transactionId: 'tx2' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(assertExchangeAccess).toHaveBeenCalled();
    expect(debitUserBalance).toHaveBeenCalledWith('u1', 'BTC', 0.01);
    expect(creditUserBalance).toHaveBeenCalledWith('u1', 'USD', 700);
    expect(awardExchangePoints).toHaveBeenCalledWith('u1', 7);

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-uniswap in production enforces access and rewards', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['ETH', 2500]]));
    (recordUniswapSwap as jest.Mock).mockResolvedValue({
      tradeType: 'crypto_swap',
      fromToken: 'ETH',
      toToken: 'USDT',
      fromAmount: 2,
      toAmount: 5000,
    });

    const res = await request(app)
      .post('/api/trading/record-uniswap')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'ETH', toToken: 'USDT', fromAmount: 2, toAmount: 5000, transactionHash: '0xabc' });

    expect(res.status).toBe(200);
    expect(assertExchangeAccess).toHaveBeenCalled();
    expect(debitUserBalance).toHaveBeenCalledWith('u1', 'ETH', 2);
    expect(creditUserBalance).toHaveBeenCalledWith('u1', 'USDT', 5000);
    expect(awardExchangePoints).toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST handlers fall back req.ip to "unknown" when ip is missing', async () => {
    (simulateBinanceTrade as jest.Mock).mockResolvedValue({ id: 't-sim' });
    (recordUniswapSwap as jest.Mock).mockResolvedValue({ id: 't-uni' });
    (recordStripePayment as jest.Mock).mockResolvedValue({ id: 't-stripe' });
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({ id: 't-paypal' });
    (recordMixingTransaction as jest.Mock).mockResolvedValue({ id: 't-mix' });
    (recordStakingReward as jest.Mock).mockResolvedValue({ id: 't-stake' });

    const scenarios = [
      { path: '/simulate-binance-trade', body: { fromToken: 'BTC', toToken: 'USDT', fromAmount: 1 }, fn: simulateBinanceTrade, ipArgIndex: 4 },
      { path: '/record-uniswap', body: { fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2000, transactionHash: '0xabc' }, fn: recordUniswapSwap, ipArgIndex: 5 },
      { path: '/record-stripe', body: { usdAmount: 100, cryptoType: 'BTC', transactionId: 'tx1' }, fn: recordStripePayment, ipArgIndex: 3 },
      { path: '/record-paypal', body: { cryptoAmount: 0.1, cryptoType: 'BTC', transactionId: 'tx2' }, fn: recordPayPalWithdrawal, ipArgIndex: 3 },
      { path: '/record-mixing', body: { cryptoType: 'BTC', amount: 0.2, mixingFeePercent: 0.5 }, fn: recordMixingTransaction, ipArgIndex: 3 },
      { path: '/record-staking', body: { cryptoType: 'BTC', stakedAmount: 1, rewardAmount: 0.02, apy: 12 }, fn: recordStakingReward, ipArgIndex: 5 },
    ];

    for (const scenario of scenarios) {
      const handler = getPostHandler(scenario.path);
      const req = { body: scenario.body, headers: {} } as any;
      const res = makeRes();

      await handler(req, res);

      expect((scenario.fn as jest.Mock).mock.calls[0][scenario.ipArgIndex]).toBe('unknown');
      (scenario.fn as jest.Mock).mockClear();
    }
  });

  test('POST record endpoints return 500 on upstream failures', async () => {
    (recordUniswapSwap as jest.Mock).mockRejectedValueOnce(new Error('u'));
    (recordStripePayment as jest.Mock).mockRejectedValueOnce(new Error('s'));
    (recordPayPalWithdrawal as jest.Mock).mockRejectedValueOnce(new Error('p'));
    (recordMixingTransaction as jest.Mock).mockRejectedValueOnce(new Error('m'));
    (recordStakingReward as jest.Mock).mockRejectedValueOnce(new Error('st'));

    const uni = await request(app)
      .post('/api/trading/record-uniswap')
      .set(authHeaders)
      .send({ fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2000, transactionHash: '0x1' });
    const stripe = await request(app)
      .post('/api/trading/record-stripe')
      .set(authHeaders)
      .send({ usdAmount: 100, cryptoType: 'BTC', transactionId: 'tx1' });
    const paypal = await request(app)
      .post('/api/trading/record-paypal')
      .set(authHeaders)
      .send({ cryptoAmount: 0.01, cryptoType: 'BTC', transactionId: 'tx2' });
    const mixing = await request(app)
      .post('/api/trading/record-mixing')
      .set(authHeaders)
      .send({ cryptoType: 'BTC', amount: 0.2 });
    const staking = await request(app)
      .post('/api/trading/record-staking')
      .set(authHeaders)
      .send({ cryptoType: 'BTC', stakedAmount: 1, rewardAmount: 0.02, apy: 12 });

    expect(uni.status).toBe(500);
    expect(stripe.status).toBe(500);
    expect(paypal.status).toBe(500);
    expect(mixing.status).toBe(500);
    expect(staking.status).toBe(500);
  });

  test('GET /api/trading/slippage validates params and returns value', async () => {
    const bad = await request(app).get('/api/trading/slippage').set(authHeaders);
    expect(bad.status).toBe(400);

    (calculateSlippage as jest.Mock).mockResolvedValue(0.23);
    const ok = await request(app)
      .get('/api/trading/slippage?symbol=BTCUSDT&amount=1')
      .set(authHeaders);

    expect(ok.status).toBe(200);
    expect(ok.body.data.slippage).toBe(0.23);
  });

  test('GET /api/trading/slippage handles calculation failure', async () => {
    (calculateSlippage as jest.Mock).mockRejectedValueOnce(new Error('down'));
    const res = await request(app)
      .get('/api/trading/slippage?symbol=BTCUSDT&amount=1')
      .set(authHeaders);

    expect(res.status).toBe(500);
  });

  test('POST /api/trading/update-prices enforces admin', async () => {
    const unauthorized = await request(app)
      .post('/api/trading/update-prices')
      .set(authHeaders);
    expect(unauthorized.status).toBe(403);

    (updatePriceSnapshots as jest.Mock).mockResolvedValue(undefined);
    const authorized = await request(app)
      .post('/api/trading/update-prices')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(authorized.status).toBe(200);
  });

  test('POST /api/trading/update-prices handles updater failure', async () => {
    (updatePriceSnapshots as jest.Mock).mockRejectedValueOnce(new Error('down'));
    const res = await request(app)
      .post('/api/trading/update-prices')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });

  test('GET /api/trading/user-trades with non-numeric limit uses default', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/user-trades?limit=abc&offset=5')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    const [userId, opts] = (getUserTrades as jest.Mock).mock.calls[0];
    expect(opts.limit).toBe(50); // default when NaN
    expect(opts.offset).toBe(5);
  });

  test('GET /api/trading/user-trades with limit > 200 caps at 200', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/user-trades?limit=500')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    const [userId, opts] = (getUserTrades as jest.Mock).mock.calls[0];
    expect(opts.limit).toBe(200);
  });

  test('GET /api/trading/user-trades with all filter parameters', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/user-trades?tradeType=buy&exchange=binance&minProfit=10&maxProfit=100&status=completed&startDate=2024-01-01&endDate=2024-12-31')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    const [userId, opts] = (getUserTrades as jest.Mock).mock.calls[0];
    expect(opts.filter.tradeType).toBe('buy');
    expect(opts.filter.exchange).toBe('binance');
    expect(opts.filter.minProfit).toBe(10);
    expect(opts.filter.maxProfit).toBe(100);
    expect(opts.filter.status).toBe('completed');
    expect(opts.filter.startDate).toBeInstanceOf(Date);
    expect(opts.filter.endDate).toBeInstanceOf(Date);
  });

  test('GET /api/trading/user-trades with partial filters', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/user-trades?exchange=coinbase&minProfit=5')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    const [userId, opts] = (getUserTrades as jest.Mock).mock.calls[0];
    expect(opts.filter.exchange).toBe('coinbase');
    expect(opts.filter.minProfit).toBe(5);
    expect(opts.filter.tradeType).toBeUndefined();
  });

  test('GET /api/trading/prices with custom tokens', async () => {
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['XRP', 0.5], ['DOGE', 0.08]]));

    const res = await request(app)
      .get('/api/trading/prices?tokens=XRP,DOGE')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.XRP).toBe(0.5);
    expect(res.body.data.DOGE).toBe(0.08);
    expect(getBinancePrices).toHaveBeenCalledWith(['XRP', 'DOGE']);
  });

  test('GET /api/trading/prices with no tokens uses defaults', async () => {
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 100000]]));

    const res = await request(app)
      .get('/api/trading/prices')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(getBinancePrices).toHaveBeenCalledWith(['BTC', 'ETH', 'USDT', 'BNB', 'SOL']);
  });

  test('GET /api/trading/prices handles service failure', async () => {
    (getBinancePrices as jest.Mock).mockRejectedValueOnce(new Error('service down'));

    const res = await request(app)
      .get('/api/trading/prices')
      .set(authHeaders);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/trading/price-history with default days', async () => {
    (getPriceHistory as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/price-history/eth')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(getPriceHistory).toHaveBeenCalledWith('ETH', 7);
  });

  test('GET /api/trading/price-history caps days at 365', async () => {
    (getPriceHistory as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/price-history/btc?days=730')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(getPriceHistory).toHaveBeenCalledWith('BTC', 365);
  });

  test('GET /api/trading/slippage with isBuy=false', async () => {
    (calculateSlippage as jest.Mock).mockResolvedValue(0.5);

    const res = await request(app)
      .get('/api/trading/slippage?symbol=ETHUSDT&amount=10&isBuy=false')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(calculateSlippage).toHaveBeenCalledWith('ETHUSDT', 10, false);
  });

  test('GET /api/trading/slippage with missing symbol', async () => {
    const res = await request(app)
      .get('/api/trading/slippage?amount=10')
      .set(authHeaders);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required parameters');
  });

  test('GET /api/trading/slippage with missing amount', async () => {
    const res = await request(app)
      .get('/api/trading/slippage?symbol=BTCUSDT')
      .set(authHeaders);

    expect(res.status).toBe(400);
  });

  test('POST /api/trading/simulate-binance-trade missing toToken', async () => {
    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .send({ fromToken: 'BTC', fromAmount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required fields');
  });

  test('POST /api/trading/simulate-binance-trade missing fromAmount', async () => {
    const res = await request(app)
      .post('/api/trading/simulate-binance-trade')
      .set(authHeaders)
      .send({ fromToken: 'BTC', toToken: 'USDT' });

    expect(res.status).toBe(400);
  });

  test('POST /api/trading/record-uniswap without transactionHash', async () => {
    (recordUniswapSwap as jest.Mock).mockResolvedValue({ id: 'u2' });

    const res = await request(app)
      .post('/api/trading/record-uniswap')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2000 });

    expect(res.status).toBe(200);
    expect(recordUniswapSwap).toHaveBeenCalled();
  });

  test('POST /api/trading/record-stripe without cryptoType', async () => {
    (recordStripePayment as jest.Mock).mockResolvedValue({ id: 's2' });

    const res = await request(app)
      .post('/api/trading/record-stripe')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ usdAmount: 50, transactionId: 'tx-stripe' });

    expect(res.status).toBe(200);
    expect(recordStripePayment).toHaveBeenCalled();
  });

  test('POST /api/trading/record-paypal without transactionId', async () => {
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({ id: 'p2' });

    const res = await request(app)
      .post('/api/trading/record-paypal')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoAmount: 0.5, cryptoType: 'ETH' });

    expect(res.status).toBe(200);
    expect(recordPayPalWithdrawal).toHaveBeenCalled();
  });

  test('POST /api/trading/record-mixing with default feePercent', async () => {
    (recordMixingTransaction as jest.Mock).mockResolvedValue({ id: 'm2' });

    const res = await request(app)
      .post('/api/trading/record-mixing')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'BTC', amount: 0.5 });

    expect(res.status).toBe(200);
    expect(recordMixingTransaction).toHaveBeenCalledWith(
      expect.any(String),
      'BTC',
      0.5,
      expect.any(String),
      0.5 // default mixingFeePercent
    );
  });

  test('POST /api/trading/record-staking handles service failure', async () => {
    (recordStakingReward as jest.Mock).mockRejectedValueOnce(new Error('db down'));

    const res = await request(app)
      .post('/api/trading/record-staking')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'USDC', stakedAmount: 1000, rewardAmount: 50, apy: 5 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to record staking reward');
  });

  test('GET /api/trading/metrics/hourly handles service failure', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

    const res = await request(app)
      .get('/api/trading/metrics/hourly')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch metrics');
  });

  test('GET /api/trading/platform-stats with admin returns all data', async () => {
    (getPlatformTradeStats as jest.Mock).mockResolvedValue({ trades: 100 });
    (getPlatformMetricsByExchange as jest.Mock).mockResolvedValue({ binance: { count: 50 } });
    (getTopPerformingUsers as jest.Mock).mockResolvedValue([{ userId: 'top1', profit: 5000 }]);

    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.overall).toEqual({ trades: 100 });
    expect(res.body.data.byExchange).toEqual({ binance: { count: 50 } });
    expect(res.body.data.topUsers[0].userId).toBe('top1');
  });

  test('GET /api/trading/platform-stats errors when not admin', async () => {
    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Unauthorized');
  });

  test('GET /api/trading/platform-stats without x-is-admin header', async () => {
    const res = await request(app)
      .get('/api/trading/platform-stats')
      .set(authHeaders);

    expect(res.status).toBe(403);
  });

  test('GET /account degraded path with non-Error rejection covers ternary false branch and anonymous userId', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const exchangeAccountsModule = require('../src/exchange-accounts');
    const overviewSpy = jest.spyOn(exchangeAccountsModule, 'getExchangeOverview');
    const handler = getGetHandler('/account');

    // non-Error string matching degraded pattern → covers line 43 instanceof false ternary + line 127 || 'anonymous'
    const res = makeRes();
    overviewSpy.mockRejectedValueOnce('econnrefused');
    await handler({ headers: {} } as any, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));

    // null thrown → error ?? '' covers the ?? '' null-coalescing branch at line 43
    const res2 = makeRes();
    overviewSpy.mockRejectedValueOnce(null);
    await handler({ headers: {} } as any, res2);
    expect(res2.status).toHaveBeenCalledWith(500);

    overviewSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-mixing in production with empty price map covers ?? 0 and zero fee branches', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map());
    (recordMixingTransaction as jest.Mock).mockResolvedValue({
      tradeType: 'mixing',
      fromToken: 'BTC',
      entryPrice: 0,
      exchangeFee: 0,
      fromAmount: 1,
    });

    const handler = getPostHandler('/record-mixing');
    const res = makeRes();
    await handler(
      { body: { cryptoType: 'BTC', amount: 1 }, headers: { 'x-user-id': 'u1' }, ip: '127.0.0.1' } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(debitUserBalance).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-staking in production with equal amounts covers zero reward branch', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['ETH', 2500]]));
    (recordStakingReward as jest.Mock).mockResolvedValue({
      tradeType: 'staking',
      fromToken: 'ETH',
      toToken: 'ETH',
      fromAmount: 10,
      toAmount: 10,
    });

    const handler = getPostHandler('/record-staking');
    const res = makeRes();
    await handler(
      { body: { cryptoType: 'ETH', stakedAmount: 10, rewardAmount: 0, apy: 5 }, headers: { 'x-user-id': 'u1' }, ip: '127.0.0.1' } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(creditUserBalance).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-stripe in production with sufficient balance skips USD top-up', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (recordStripePayment as jest.Mock).mockResolvedValue({
      tradeType: 'usdt_to_crypto',
      fromToken: 'USD',
      toToken: 'BTC',
      fromAmount: 100,
      toAmount: 0.001,
    });
    // getBalance uses default 1,000,000 from beforeEach - sufficient for usdAmount 100

    const handler = getPostHandler('/record-stripe');
    const res = makeRes();
    await handler(
      { body: { usdAmount: 100, cryptoType: 'BTC', transactionId: 'tx-suf' }, headers: { 'x-user-id': 'u1' }, ip: '127.0.0.1' } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(creditUserBalance).not.toHaveBeenCalledWith('u1', 'USD', 100);

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-uniswap in production with unrecognized tradeType covers settleTradeBalances false-branch at line 102', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['ETH', 2500]]));
    (recordUniswapSwap as jest.Mock).mockResolvedValue({
      tradeType: 'other',  // unrecognized type → falls through all if blocks → covers line 102 false branch
      fromToken: 'ETH',
      fromAmount: 1,
    });

    const handler = getPostHandler('/record-uniswap');
    const res = makeRes();
    await handler(
      { body: { fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2500, transactionHash: '0xtest' }, headers: { 'x-user-id': 'u1' }, ip: '127.0.0.1' } as any,
      res,
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/update-prices handles failure gracefully', async () => {
    (updatePriceSnapshots as jest.Mock).mockRejectedValueOnce(new Error('snapshot fail'));

    const res = await request(app)
      .post('/api/trading/update-prices')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });
});

describe('Scraper routes', () => {
  test('all protected scraper routes return strict unauthorized payload without admin header', async () => {
    const cases = [
      { method: 'get', path: '/api/scrapers' },
      { method: 'get', path: '/api/scrapers/s1' },
      { method: 'post', path: '/api/scrapers', body: { name: 'x' } },
      { method: 'patch', path: '/api/scrapers/s1', body: { status: 'paused' } },
      { method: 'post', path: '/api/scrapers/s1/run' },
      { method: 'post', path: '/api/scrapers/s1/pause' },
      { method: 'post', path: '/api/scrapers/s1/resume' },
      { method: 'get', path: '/api/scrapers/s1/logs' },
      { method: 'get', path: '/api/scrapers/health/dashboard' },
      { method: 'post', path: '/api/scrapers/s1/config/test' },
    ];

    for (const c of cases) {
      const req = request(app)[c.method as 'get' | 'post' | 'patch'](c.path).set(authHeaders);
      const res = c.body ? await req.send(c.body) : await req;
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ success: false, error: 'Admin access required' });
    }
  });

  test('GET /api/scrapers requires admin header', async () => {
    const res = await request(app).get('/api/scrapers').set(authHeaders);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, error: 'Admin access required' });
  });

  test('GET /api/scrapers returns list for admin', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1' }]]);

    const res = await request(app)
      .get('/api/scrapers')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/scrapers returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .get('/api/scrapers')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });

  test('GET /api/scrapers/:id returns 404 if not found', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/scrapers/scraper-1')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(404);
  });

  test('GET /api/scrapers/:id returns details', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 's1', name: 'Main' }]])
      .mockResolvedValueOnce([[{ totalRuns: 1 }]])
      .mockResolvedValueOnce([[{ id: 'log1' }]]);

    const res = await request(app)
      .get('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.config.id).toBe('s1');
  });

  test('GET /api/scrapers/:id returns empty metrics object when no metrics row exists', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 's1', name: 'Main' }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ id: 'log1' }]]);

    const res = await request(app)
      .get('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.metrics).toEqual({});
  });

  test('GET /api/scrapers/:id requires admin', async () => {
    const res = await request(app)
      .get('/api/scrapers/s1')
      .set(authHeaders);

    expect(res.status).toBe(403);
  });

  test('GET /api/scrapers/:id handles database error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .get('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });

  test('POST /api/scrapers creates scraper', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    const res = await request(app)
      .post('/api/scrapers')
      .set(authHeaders)
      .set('x-is-admin', 'true')
      .send({ name: 'Scraper', targetUrl: 'https://example.com', selector: '.x' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.id).toMatch(/^scraper_\d+_[a-z0-9]{9}$/);
  });

  test('POST /api/scrapers requires admin', async () => {
    const res = await request(app)
      .post('/api/scrapers')
      .set(authHeaders)
      .send({ name: 'x', targetUrl: 'https://example.com', selector: '.x' });

    expect(res.status).toBe(403);
  });

  test('POST /api/scrapers handles insert failures', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .post('/api/scrapers')
      .set(authHeaders)
      .set('x-is-admin', 'true')
      .send({ name: 'Scraper', targetUrl: 'https://example.com', selector: '.x' });

    expect(res.status).toBe(500);
  });

  test('PATCH /api/scrapers/:id updates scraper', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true')
      .send({ status: 'paused', metadata: { note: 'test' } });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('updated');
  });

  test('PATCH /api/scrapers/:id skips immutable id and createdAt fields', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    const res = await request(app)
      .patch('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true')
      .send({ id: 'new-id', createdAt: '2026-01-01', status: 'paused' });

    expect(res.status).toBe(200);
    const [query, values] = mockExecute.mock.calls[0];
    expect(query).toContain('status = ?');
    expect(query).toBe('UPDATE scrapers SET status = ? WHERE id = ?');
    expect(query).not.toContain('UPDATE scrapers SET id = ?');
    expect(query).not.toContain('createdAt = ?');
    expect(values[0]).toBe('paused');
  });

  test('PATCH /api/scrapers/:id requires admin', async () => {
    const res = await request(app)
      .patch('/api/scrapers/s1')
      .set(authHeaders)
      .send({ status: 'paused' });

    expect(res.status).toBe(403);
  });

  test('PATCH /api/scrapers/:id handles db errors', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .patch('/api/scrapers/s1')
      .set(authHeaders)
      .set('x-is-admin', 'true')
      .send({ status: 'active' });

    expect(res.status).toBe(500);
  });

  test('POST /api/scrapers/:id/run triggers run', async () => {
    mockExecute.mockResolvedValueOnce([{}]);

    const res = await request(app)
      .post('/api/scrapers/s1/run')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.logId).toBeDefined();
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Scraper execution triggered');
  });

  test('POST /api/scrapers/:id/run requires admin', async () => {
    const res = await request(app)
      .post('/api/scrapers/s1/run')
      .set(authHeaders);

    expect(res.status).toBe(403);
  });

  test('POST /api/scrapers/:id/run handles failures', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));

    const res = await request(app)
      .post('/api/scrapers/s1/run')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(500);
  });

  test('POST pause/resume change status', async () => {
    mockExecute.mockResolvedValue([{}]);

    const pause = await request(app)
      .post('/api/scrapers/s1/pause')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    const resume = await request(app)
      .post('/api/scrapers/s1/resume')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(pause.status).toBe(200);
    expect(resume.status).toBe(200);
    expect(pause.body).toEqual({ success: true, message: 'Scraper paused' });
    expect(resume.body).toEqual({ success: true, message: 'Scraper resumed' });
  });

  test('POST pause/resume require admin and handle failures', async () => {
    const deniedPause = await request(app)
      .post('/api/scrapers/s1/pause')
      .set(authHeaders);
    const deniedResume = await request(app)
      .post('/api/scrapers/s1/resume')
      .set(authHeaders);

    expect(deniedPause.status).toBe(403);
    expect(deniedResume.status).toBe(403);

    mockExecute.mockRejectedValueOnce(new Error('pause fail'));
    const pauseError = await request(app)
      .post('/api/scrapers/s1/pause')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    expect(pauseError.status).toBe(500);

    mockExecute.mockRejectedValueOnce(new Error('resume fail'));
    const resumeError = await request(app)
      .post('/api/scrapers/s1/resume')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    expect(resumeError.status).toBe(500);
  });

  test('GET /api/scrapers/:id/logs returns logs with pagination', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 'l1' }]]);

    const res = await request(app)
      .get('/api/scrapers/s1/logs?limit=10&offset=1')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(10);
    expect(res.body.success).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(
      'SELECT * FROM scraper_logs WHERE scraperId = ? ORDER BY startedAt DESC LIMIT ? OFFSET ?',
      ['s1', 10, 1]
    );
  });

  test('GET /api/scrapers/:id/logs enforces admin and handles errors', async () => {
    const denied = await request(app)
      .get('/api/scrapers/s1/logs')
      .set(authHeaders);
    expect(denied.status).toBe(403);

    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const failed = await request(app)
      .get('/api/scrapers/s1/logs')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    expect(failed.status).toBe(500);
  });

  test('GET /api/scrapers/health/dashboard returns summary', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ totalScrapers: 2 }]])
      .mockResolvedValueOnce([[{ scraperId: 's1' }]]);

    const res = await request(app)
      .get('/api/scrapers/health/dashboard')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalScrapers).toBe(2);
  });

  test('GET /api/scrapers/health/dashboard falls back summary and recent arrays', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([undefined as any]);

    const res = await request(app)
      .get('/api/scrapers/health/dashboard')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({});
    expect(res.body.data.recentScrapers).toEqual([]);
  });

  test('GET /api/scrapers/health/dashboard enforces admin and handles errors', async () => {
    const denied = await request(app)
      .get('/api/scrapers/health/dashboard')
      .set(authHeaders);
    expect(denied.status).toBe(403);

    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const failed = await request(app)
      .get('/api/scrapers/health/dashboard')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    expect(failed.status).toBe(500);
  });

  test('POST /api/scrapers/:id/config/test returns 404 for unknown scraper', async () => {
    mockExecute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/scrapers/s999/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Scraper not found' });
  });

  test('POST /api/scrapers/:id/config/test enforces admin and handles DB error', async () => {
    const denied = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders);
    expect(denied.status).toBe(403);

    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const failed = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');
    expect(failed.status).toBe(500);
  });

  test('POST /api/scrapers/:id/config/test returns non-ok fetch payload', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 2000 }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false, status: 502 });

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('HTTP 502');
  });

  test('POST /api/scrapers/:id/config/test returns success payload', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 2000 }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>x</body></html>'),
      headers: { get: jest.fn().mockReturnValue('nginx') },
    });

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.httpStatus).toBe(200);
  });

  test('POST /api/scrapers/:id/config/test uses default timeout when scraper timeout is missing', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com' }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>x</body></html>'),
      headers: { get: jest.fn().mockReturnValue('nginx') },
    });

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/scrapers/:id/config/test sets unknown responseTime when server header is missing', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 2000 }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>x</body></html>'),
      headers: { get: jest.fn().mockReturnValue(null) },
    });

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.data.responseTime).toBe('unknown');
  });

  test('POST /api/scrapers/:id/config/test handles fetch exception payload', async () => {
    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 2000 }]]);
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('timeout'));

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('timeout');
  });

  test('GET /api/scrapers/health/dashboard handles undefined stats row safely', async () => {
    mockExecute
      .mockResolvedValueOnce([undefined as any])
      .mockResolvedValueOnce([[]]);

    const res = await request(app)
      .get('/api/scrapers/health/dashboard')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toEqual({});
  });

  test('POST /api/scrapers/:id/config/test executes abort callback path', async () => {
    const savedAbortController = (global as any).AbortController;
    const savedSetTimeout = global.setTimeout;
    const abortMock = jest.fn();

    class AbortControllerStub {
      public signal = {};
      public abort = abortMock;
    }

    (global as any).AbortController = AbortControllerStub as any;
    (global as any).setTimeout = ((fn: (...args: any[]) => any) => {
      fn();
      return 1;
    }) as any;

    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 1 }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>x</body></html>'),
      headers: { get: jest.fn().mockReturnValue('nginx') },
    });

    const res = await request(app)
      .post('/api/scrapers/s1/config/test')
      .set(authHeaders)
      .set('x-is-admin', 'true');

    expect(res.status).toBe(200);
    expect(abortMock).toHaveBeenCalledTimes(1);

    (global as any).AbortController = savedAbortController;
    (global as any).setTimeout = savedSetTimeout;
  });

  test('GET /api/trading/metrics computes period start date in past window', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/trading/metrics/monthly')
      .set(authHeaders)
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    const calls = (getTimeSeriesMetrics as jest.Mock).mock.calls;
    const call = calls[calls.length - 1];
    const startDate = call[2] as Date;
    const endDate = call[3] as Date;
    const diffMs = endDate.getTime() - startDate.getTime();
    const expectedMs = 365 * 24 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;

    expect(startDate.getTime()).toBeLessThan(endDate.getTime());
    expect(diffMs).toBeGreaterThan(expectedMs - dayMs);
    expect(diffMs).toBeLessThan(expectedMs + dayMs);
  });

  test('POST /api/trading/record-paypal normalizes token before price lookup', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000]]));
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({
      tradeType: 'crypto_to_usdt',
      fromToken: 'BTC',
      toToken: 'USD',
      fromAmount: 0.02,
      toAmount: 1400,
    });

    const res = await request(app)
      .post('/api/trading/record-paypal')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoAmount: 0.02, cryptoType: ' btc ', transactionId: 'tx-normalize' });

    expect(res.status).toBe(200);
    expect(getBinancePrices).toHaveBeenCalledWith(['BTC']);

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-mixing in production debits fee as exchangeFee/entryPrice', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000]]));
    (recordMixingTransaction as jest.Mock).mockResolvedValue({
      tradeType: 'mixing',
      fromToken: 'BTC',
      toToken: 'BTC',
      fromAmount: 0.2,
      toAmount: 0.2,
      entryPrice: 100,
      exchangeFee: 10,
    });

    const res = await request(app)
      .post('/api/trading/record-mixing')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'BTC', amount: 0.2, mixingFeePercent: 0.5 });

    expect(res.status).toBe(200);
    expect(debitUserBalance).toHaveBeenCalledWith('u1', 'BTC', 0.1);

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('POST /api/trading/record-staking in production credits only net reward', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['ETH', 3500]]));
    (recordStakingReward as jest.Mock).mockResolvedValue({
      tradeType: 'staking',
      fromToken: 'ETH',
      toToken: 'ETH',
      fromAmount: 10,
      toAmount: 12,
    });

    const res = await request(app)
      .post('/api/trading/record-staking')
      .set(authHeaders)
      .set('x-user-id', 'u1')
      .send({ cryptoType: 'ETH', stakedAmount: 10, rewardAmount: 2, apy: 12 });

    expect(res.status).toBe(200);
    expect(creditUserBalance).toHaveBeenCalledWith('u1', 'ETH', 2);

    process.env.NODE_ENV = originalNodeEnv;
  });

  test('unit: POST / scrapers id suffix is fixed 9 chars from base36 token', async () => {
    const handler = getScraperHandler('post', '/');
    const res = makeRes();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
    const randSpy = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    await handler({
      headers: { 'x-is-admin': 'true' },
      body: { name: 's', targetUrl: 'https://example.com', selector: '.x' },
    }, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        id: expect.stringMatching(/^scraper_1710000000000_[a-z0-9]{9}$/),
      }),
    }));

    nowSpy.mockRestore();
    randSpy.mockRestore();
  });

  test('unit: PATCH /:id builds query without trailing comma', async () => {
    const handler = getScraperHandler('patch', '/:id');
    const res = makeRes();

    await handler({
      headers: { 'x-is-admin': 'true' },
      params: { id: 's1' },
      body: { status: 'paused' },
    }, res);

    expect(mockExecute).toHaveBeenCalledWith('UPDATE scrapers SET status = ? WHERE id = ?', ['paused', 's1']);
  });

  test('unit: GET /:id/logs honors lower limit via Math.min', async () => {
    const handler = getScraperHandler('get', '/:id/logs');
    const res = makeRes();
    mockExecute.mockResolvedValueOnce([[{ id: 'l1' }]]);

    await handler({
      headers: { 'x-is-admin': 'true' },
      params: { id: 's1' },
      query: { limit: '10', offset: '1' },
    }, res);

    expect(mockExecute).toHaveBeenCalledWith(
      'SELECT * FROM scraper_logs WHERE scraperId = ? ORDER BY startedAt DESC LIMIT ? OFFSET ?',
      ['s1', 10, 1]
    );
  });

  test('unit: GET /health/dashboard uses optional chaining fallback for missing stats', async () => {
    const handler = getScraperHandler('get', '/health/dashboard');
    const res = makeRes();
    mockExecute
      .mockResolvedValueOnce([undefined as any])
      .mockResolvedValueOnce([[]]);

    await handler({
      headers: { 'x-is-admin': 'true' },
      params: {},
      query: {},
    }, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        summary: {},
        recentScrapers: [],
      },
    });
  });

  test('unit: POST /:id/config/test executes timeout abort callback', async () => {
    const handler = getScraperHandler('post', '/:id/config/test');
    const res = makeRes();
    const savedAbortController = (global as any).AbortController;
    const savedSetTimeout = global.setTimeout;
    const abortMock = jest.fn();

    class AbortControllerStub {
      public signal = {};
      public abort = abortMock;
    }

    (global as any).AbortController = AbortControllerStub as any;
    (global as any).setTimeout = ((fn: (...args: any[]) => any) => {
      fn();
      return 1;
    }) as any;

    mockExecute.mockResolvedValueOnce([[{ id: 's1', targetUrl: 'https://example.com', timeout: 1 }]]);
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('<html><body>x</body></html>'),
      headers: { get: jest.fn().mockReturnValue('nginx') },
    });

    await handler({
      headers: { 'x-is-admin': 'true' },
      params: { id: 's1' },
      query: {},
      body: {},
    }, res);

    expect(abortMock).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    (global as any).AbortController = savedAbortController;
    (global as any).setTimeout = savedSetTimeout;
  });

  test('unit: trading normalization trims and uppercases token before price lookup', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const handler = getPostHandler('/record-paypal');
    const res = makeRes();
    (getBinancePrices as jest.Mock).mockResolvedValue(new Map([['BTC', 70000]]));
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({
      tradeType: 'crypto_to_usdt',
      fromToken: 'BTC',
      toToken: 'USD',
      fromAmount: 0.02,
      toAmount: 1400,
    });

    await handler({
      body: { cryptoAmount: 0.02, cryptoType: ' btc ', transactionId: 'tx-unit' },
      headers: { 'x-user-id': 'u1' },
      ip: '127.0.0.1',
    }, res);

    expect((getBinancePrices as jest.Mock).mock.calls[0][0]).toEqual(['BTC']);
    process.env.NODE_ENV = originalNodeEnv;
  });
});
