/**
 * Trading Dashboard API Routes
 * Endpoints for accessing trading data, analytics, and real-time updates
 */

import { Router, Request, Response } from 'express';
import {
  recordTrade,
  getUserTrades,
  getUserTradeStats,
  getTimeSeriesMetrics,
  getPlatformTradeStats,
  getPriceHistory,
  getPlatformMetricsByExchange,
  getTopPerformingUsers
} from '../trading-tracker';
import type { Trade } from '../trading-tracker';
import {
  assertExchangeAccess,
  awardExchangePoints,
  creditUserBalance,
  debitUserBalance,
  getBalance,
  getExchangeOverview,
} from '../exchange-accounts';
import {
  getBinancePrices,
  getCoinGeckoPrices,
  simulateBinanceTrade,
  recordUniswapSwap,
  recordStripePayment,
  recordPayPalWithdrawal,
  recordMixingTransaction,
  recordStakingReward,
  updatePriceSnapshots,
  calculateSlippage
} from '../exchange-integration';

const router = Router();

function shouldUseTradingDegradedMode(error: unknown): boolean {
  if (process.env.NODE_ENV === 'test') return false;
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /(access denied|er_access_denied_error|econnrefused|enotfound|cannot connect|connection|er_no_such_table|doesn't exist)/i.test(message);
}

function emptyTradeStats() {
  return {
    totalTrades: 0,
    totalVolume: 0,
    totalProfit: 0,
    totalLoss: 0,
    profitPercent: 0,
    winRate: 0,
    averageTradeSize: 0,
    largestWin: 0,
    largestLoss: 0,
    bestPerformingToken: 'N/A',
    worstPerformingToken: 'N/A'
  };
}

function shouldEnforceExchangeAccounts(): boolean {
  return process.env.NODE_ENV !== 'test';
}

async function estimateUsdVolume(token: string, amount: number): Promise<number> {
  const normalizedToken = token.trim().toUpperCase();
  if (normalizedToken === 'USD' || normalizedToken === 'USDT') return amount;
  const prices = await getBinancePrices([normalizedToken]);
  return (prices.get(normalizedToken) ?? 0) * amount;
}

async function settleTradeBalances(userId: string, trade: Trade): Promise<void> {
  if (trade.tradeType === 'crypto_swap') {
    await debitUserBalance(userId, trade.fromToken, Number(trade.fromAmount));
    await creditUserBalance(userId, trade.toToken, Number(trade.toAmount));
    return;
  }

  if (trade.tradeType === 'usdt_to_crypto') {
    await debitUserBalance(userId, 'USD', Number(trade.fromAmount));
    await creditUserBalance(userId, trade.toToken, Number(trade.toAmount));
    return;
  }

  if (trade.tradeType === 'crypto_to_usdt') {
    await debitUserBalance(userId, trade.fromToken, Number(trade.fromAmount));
    await creditUserBalance(userId, 'USD', Number(trade.toAmount));
    return;
  }

  if (trade.tradeType === 'mixing') {
    const price = Number(trade.entryPrice) || 0;
    const feeInToken = price > 0 ? Number(trade.exchangeFee) / price : 0;
    if (feeInToken > 0) {
      await debitUserBalance(userId, trade.fromToken, feeInToken);
    }
    return;
  }

  if (trade.tradeType === 'staking') {
    const rewardAmount = Math.max(0, Number(trade.toAmount) - Number(trade.fromAmount));
    if (rewardAmount > 0) {
      await creditUserBalance(userId, trade.toToken, rewardAmount);
    }
  }
}

async function postTradeRewards(userId: string, trade: Trade): Promise<void> {
  const usdVolume = await estimateUsdVolume(trade.fromToken, Number(trade.fromAmount));
  const pointsDelta = Math.max(5, Math.round(usdVolume / 100));
  await awardExchangePoints(userId, pointsDelta);
}

router.get('/account', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const overview = await getExchangeOverview(userId);
    res.json({ success: true, data: overview });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: {
          profile: {
            userId: (req.headers['x-user-id'] as string || 'anonymous'),
            exchangeEnabled: true,
            tier: 'Bronze',
            points: 0,
            dailyVolumeLimit: 10000,
            maxTradeSize: 2500,
          },
          balances: [],
          limits: {
            usedDailyVolume: 0,
            remainingDailyVolume: 10000,
          },
        },
        degraded: true,
      });
    }

    res.status(500).json({ success: false, error: 'Failed to fetch exchange account' });
  }
});

router.post('/account/top-up', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { userId, asset, amount } = req.body;
    if (!userId || !asset || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid top-up request' });
    }

    await creditUserBalance(String(userId), String(asset), Number(amount));
    const overview = await getExchangeOverview(String(userId));
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to top up exchange balance' });
  }
});

/**
 * GET /api/trading/user-trades
 * Get all trades for the authenticated user with pagination and filters
 */
router.get('/user-trades', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const filter = {
      tradeType: req.query.tradeType as string,
      exchange: req.query.exchange as string,
      minProfit: req.query.minProfit ? parseFloat(req.query.minProfit as string) : undefined,
      maxProfit: req.query.maxProfit ? parseFloat(req.query.maxProfit as string) : undefined,
      status: req.query.status as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const trades = await getUserTrades(userId, { limit, offset, filter });

    res.json({
      success: true,
      data: trades,
      pagination: { limit, offset, total: trades.length }
    });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: [],
        pagination: { limit: 50, offset: 0, total: 0 },
        degraded: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trades'
    });
  }
});

/**
 * GET /api/trading/stats
 * Get comprehensive trading statistics for the user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const stats = await getUserTradeStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: emptyTradeStats(),
        degraded: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

/**
 * GET /api/trading/metrics/:period
 * Get time-series metrics (hourly, daily, weekly, monthly, yearly)
 */
router.get('/metrics/:period', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const period = req.params.period as 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    
    if (!['hourly', 'daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period'
      });
    }

    const dayMap: Record<string, number> = {
      hourly: 1,
      daily: 30,
      weekly: 90,
      monthly: 365,
      yearly: 1825
    };

    const days = dayMap[period];
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await getTimeSeriesMetrics(userId, period, startDate, endDate);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: [],
        degraded: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

/**
 * GET /api/trading/platform-stats
 * Get global platform trading statistics (admin only)
 */
router.get('/platform-stats', async (req: Request, res: Response) => {
  try {
    // Verify admin access
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const stats = await getPlatformTradeStats();
    const byExchange = await getPlatformMetricsByExchange();
    const topUsers = await getTopPerformingUsers(10);

    res.json({
      success: true,
      data: {
        overall: stats,
        byExchange,
        topUsers
      }
    });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: {
          overall: emptyTradeStats(),
          byExchange: {},
          topUsers: []
        },
        degraded: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform stats'
    });
  }
});

/**
 * GET /api/trading/prices
 * Get current prices for multiple tokens
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const tokens = req.query.tokens 
      ? (req.query.tokens as string).split(',')
      : ['BTC', 'ETH', 'USDT', 'BNB', 'SOL'];

    const prices = await getBinancePrices(tokens);
    const priceData: Record<string, number> = {};

    for (const [token, price] of prices) {
      priceData[token] = price;
    }

    res.json({
      success: true,
      data: priceData,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices'
    });
  }
});

/**
 * GET /api/trading/price-history/:token
 * Get historical price data for a token
 */
router.get('/price-history/:token', async (req: Request, res: Response) => {
  try {
    const token = (req.params.token as string).toUpperCase();
    const days = Math.min(parseInt(req.query.days as string) || 7, 365);

    const history = await getPriceHistory(token, days);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    if (shouldUseTradingDegradedMode(error)) {
      return res.json({
        success: true,
        data: [],
        degraded: true
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price history'
    });
  }
});

/**
 * POST /api/trading/simulate-binance-trade
 * Simulate a Binance crypto swap and record the trade
 */
router.post('/simulate-binance-trade', async (req: Request, res: Response) => {
  try {
    const { fromToken, toToken, fromAmount } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    if (!fromToken || !toToken || !fromAmount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (shouldEnforceExchangeAccounts()) {
      const requestedUsdVolume = await estimateUsdVolume(fromToken, Number(fromAmount));
      await assertExchangeAccess(userId, requestedUsdVolume);
      const balance = await getBalance(userId, fromToken);
      if (balance < Number(fromAmount)) {
        return res.status(400).json({ success: false, error: `Insufficient ${fromToken} balance` });
      }
    }

    const trade = await simulateBinanceTrade(
      fromToken,
      toToken,
      fromAmount,
      userId,
      ipAddress
    );

    if (shouldEnforceExchangeAccounts()) {
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to simulate trade'
    });
  }
});

/**
 * POST /api/trading/record-uniswap
 * Record a Uniswap swap
 */
router.post('/record-uniswap', async (req: Request, res: Response) => {
  try {
    const { fromToken, toToken, fromAmount, toAmount, transactionHash } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    const trade = await recordUniswapSwap(
      fromToken,
      toToken,
      fromAmount,
      toAmount,
      userId,
      ipAddress,
      transactionHash
    );

    if (shouldEnforceExchangeAccounts()) {
      const requestedUsdVolume = await estimateUsdVolume(fromToken, Number(fromAmount));
      await assertExchangeAccess(userId, requestedUsdVolume);
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record Uniswap trade'
    });
  }
});

/**
 * POST /api/trading/record-stripe
 * Record a Stripe USDT purchase
 */
router.post('/record-stripe', async (req: Request, res: Response) => {
  try {
    const { usdAmount, cryptoType, transactionId } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    const trade = await recordStripePayment(
      userId,
      usdAmount,
      cryptoType,
      ipAddress,
      transactionId
    );

    if (shouldEnforceExchangeAccounts()) {
      await assertExchangeAccess(userId, Number(usdAmount));
      const usdBalance = await getBalance(userId, 'USD');
      if (usdBalance < Number(usdAmount)) {
        await creditUserBalance(userId, 'USD', Number(usdAmount));
      }
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record Stripe payment'
    });
  }
});

/**
 * POST /api/trading/record-paypal
 * Record a PayPal withdrawal
 */
router.post('/record-paypal', async (req: Request, res: Response) => {
  try {
    const { cryptoAmount, cryptoType, transactionId } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    const trade = await recordPayPalWithdrawal(
      userId,
      cryptoAmount,
      cryptoType,
      ipAddress,
      transactionId
    );

    if (shouldEnforceExchangeAccounts()) {
      const requestedUsdVolume = await estimateUsdVolume(cryptoType, Number(cryptoAmount));
      await assertExchangeAccess(userId, requestedUsdVolume);
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record PayPal withdrawal'
    });
  }
});

/**
 * POST /api/trading/record-mixing
 * Record a crypto mixing transaction
 */
router.post('/record-mixing', async (req: Request, res: Response) => {
  try {
    const { cryptoType, amount, mixingFeePercent } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    const trade = await recordMixingTransaction(
      userId,
      cryptoType,
      amount,
      ipAddress,
      mixingFeePercent || 0.5
    );

    if (shouldEnforceExchangeAccounts()) {
      const requestedUsdVolume = await estimateUsdVolume(cryptoType, Number(amount));
      await assertExchangeAccess(userId, requestedUsdVolume);
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record mixing transaction'
    });
  }
});

/**
 * POST /api/trading/record-staking
 * Record a staking reward
 */
router.post('/record-staking', async (req: Request, res: Response) => {
  try {
    const { cryptoType, stakedAmount, rewardAmount, apy } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anonymous';
    const ipAddress = req.ip || 'unknown';

    const trade = await recordStakingReward(
      userId,
      cryptoType,
      stakedAmount,
      rewardAmount,
      apy,
      ipAddress
    );

    if (shouldEnforceExchangeAccounts()) {
      const requestedUsdVolume = await estimateUsdVolume(cryptoType, Number(stakedAmount));
      await assertExchangeAccess(userId, requestedUsdVolume);
      await settleTradeBalances(userId, trade);
      await postTradeRewards(userId, trade);
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record staking reward'
    });
  }
});

/**
 * GET /api/trading/slippage
 * Calculate expected slippage for a trade
 */
router.get('/slippage', async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    const amount = req.query.amount as string;
    const isBuy = req.query.isBuy !== 'false';

    if (!symbol || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    const slippage = await calculateSlippage(
      symbol,
      parseFloat(amount),
      isBuy
    );

    res.json({
      success: true,
      data: { slippage, symbol, amount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate slippage'
    });
  }
});

/**
 * POST /api/trading/update-prices
 * Manually trigger price snapshot update (admin only)
 */
router.post('/update-prices', async (req: Request, res: Response) => {
  try {
    const isAdmin = req.headers['x-is-admin'] === 'true';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    await updatePriceSnapshots();

    res.json({
      success: true,
      message: 'Price snapshots updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update prices'
    });
  }
});

export default router;
