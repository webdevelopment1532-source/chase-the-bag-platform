process.env.API_AUTH_TOKEN = 'test-token-advanced';
process.env.API_ADMIN_ID = 'dashboard-admin';

jest.mock('../src/trading-tracker', () => ({
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
  simulateBinanceTrade: jest.fn(),
  recordUniswapSwap: jest.fn(),
  recordStripePayment: jest.fn(),
  recordPayPalWithdrawal: jest.fn(),
  recordMixingTransaction: jest.fn(),
  recordStakingReward: jest.fn(),
  calculateSlippage: jest.fn(),
  updatePriceSnapshots: jest.fn(),
}));

import request from 'supertest';
import { app } from '../src/api';
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
  calculateSlippage,
  updatePriceSnapshots,
} from '../src/exchange-integration';

const authHeaders = {
  Authorization: 'Bearer test-token-advanced',
};

describe('Trading routes branch coverage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET user-trades without x-user-id uses anonymous', async () => {
    (getUserTrades as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/user-trades').set(authHeaders);
    expect(res.status).toBe(200);
    const [userId] = (getUserTrades as jest.Mock).mock.calls[0];
    expect(userId).toBe('anonymous');
  });

  test('GET stats without x-user-id uses anonymous', async () => {
    (getUserTradeStats as jest.Mock).mockResolvedValue({});
    const res = await request(app).get('/api/trading/stats').set(authHeaders);
    expect(res.status).toBe(200);
    expect(getUserTradeStats).toHaveBeenCalledWith('anonymous');
  });

  test('GET metrics weekly test', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/metrics/weekly').set(authHeaders).set('x-user-id', 'u1');
    expect(res.status).toBe(200);
  });

  test('GET metrics monthly test', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/metrics/monthly').set(authHeaders).set('x-user-id', 'u1');
    expect(res.status).toBe(200);
  });

  test('GET metrics yearly test', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/metrics/yearly').set(authHeaders).set('x-user-id', 'u1');
    expect(res.status).toBe(200);
  });

  test('GET metrics without user id defaults anonymous', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/metrics/daily').set(authHeaders);
    expect(res.status).toBe(200);
  });

  test('POST record-uniswap without x-user-id', async () => {
    (recordUniswapSwap as jest.Mock).mockResolvedValue({ id: 'u1' });
    const res = await request(app).post('/api/trading/record-uniswap').set(authHeaders)
      .send({ fromToken: 'ETH', toToken: 'USDT', fromAmount: 1, toAmount: 2000 });
    expect(res.status).toBe(200);
  });

  test('POST record-stripe without x-user-id', async () => {
    (recordStripePayment as jest.Mock).mockResolvedValue({ id: 's1' });
    const res = await request(app).post('/api/trading/record-stripe').set(authHeaders)
      .send({ usdAmount: 100, cryptoType: 'USDT', transactionId: 'tx1' });
    expect(res.status).toBe(200);
  });

  test('POST record-paypal without x-user-id', async () => {
    (recordPayPalWithdrawal as jest.Mock).mockResolvedValue({ id: 'p1' });
    const res = await request(app).post('/api/trading/record-paypal').set(authHeaders)
      .send({ cryptoAmount: 0.01, cryptoType: 'BTC', transactionId: 'tx2' });
    expect(res.status).toBe(200);
  });

  test('POST record-mixing without x-user-id', async () => {
    (recordMixingTransaction as jest.Mock).mockResolvedValue({ id: 'm1' });
    const res = await request(app).post('/api/trading/record-mixing').set(authHeaders)
      .send({ cryptoType: 'BTC', amount: 0.2 });
    expect(res.status).toBe(200);
  });

  test('POST record-staking without x-user-id', async () => {
    (recordStakingReward as jest.Mock).mockResolvedValue({ id: 'st1' });
    const res = await request(app).post('/api/trading/record-staking').set(authHeaders)
      .send({ cryptoType: 'ETH', stakedAmount: 32, rewardAmount: 0.5, apy: 4 });
    expect(res.status).toBe(200);
  });

  test('POST simulate-binance-trade without x-user-id', async () => {
    (simulateBinanceTrade as jest.Mock).mockResolvedValue({ id: 'sim1' });
    const res = await request(app).post('/api/trading/simulate-binance-trade').set(authHeaders)
      .send({ fromToken: 'BTC', toToken: 'ETH', fromAmount: 1 });
    expect(res.status).toBe(200);
  });

  test('GET slippage with isBuy=false', async () => {
    (calculateSlippage as jest.Mock).mockResolvedValue(0.25);
    const res = await request(app).get('/api/trading/slippage?symbol=BTCUSDT&amount=1&isBuy=false').set(authHeaders);
    expect(res.status).toBe(200);
    expect(calculateSlippage).toHaveBeenCalledWith('BTCUSDT', 1, false);
  });

  test('GET slippage with isBuy=true', async () => {
    (calculateSlippage as jest.Mock).mockResolvedValue(0.1);
    const res = await request(app).get('/api/trading/slippage?symbol=ETH&amount=10&isBuy=true').set(authHeaders);
    expect(res.status).toBe(200);
    expect(calculateSlippage).toHaveBeenCalledWith('ETH', 10, true);
  });

  test('GET slippage default isBuy true', async () => {
    (calculateSlippage as jest.Mock).mockResolvedValue(0.15);
    const res = await request(app).get('/api/trading/slippage?symbol=BNB&amount=5').set(authHeaders);
    expect(res.status).toBe(200);
    expect(calculateSlippage).toHaveBeenCalledWith('BNB', 5, true);
  });

  test('GET price-history with large days capped', async () => {
    (getPriceHistory as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/price-history/BTC?days=730').set(authHeaders);
    expect(res.status).toBe(200);
    expect(getPriceHistory).toHaveBeenCalledWith('BTC', 365);
  });

  test('GET price-history default days 7', async () => {
    (getPriceHistory as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get('/api/trading/price-history/ETH').set(authHeaders);
    expect(res.status).toBe(200);
    expect(getPriceHistory).toHaveBeenCalledWith('ETH', 7);
  });

  test('GET platform-stats error handling', async () => {
    (getPlatformTradeStats as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/trading/platform-stats').set(authHeaders).set('x-is-admin', 'true');
    expect(res.status).toBe(500);
  });

  test('GET platform-stats unauthorized', async () => {
    const res = await request(app).get('/api/trading/platform-stats').set(authHeaders);
    expect(res.status).toBe(403);
  });

  test('GET metrics error handling', async () => {
    (getTimeSeriesMetrics as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/trading/metrics/daily').set(authHeaders);
    expect(res.status).toBe(500);
  });
});
