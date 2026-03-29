/**
 * Trading Activity Tracker Module
 * Manages all trading activities: crypto-to-USDT, USDT-to-crypto, mixing, staking
 */

import { getDbConnection } from './db';

export interface Trade {
  id: string;
  userId: string;
  tradeType: 'crypto_to_usdt' | 'usdt_to_crypto' | 'crypto_swap' | 'mixing' | 'staking' | 'unstaking';
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  entryPrice: number;
  exitPrice: number;
  exchangeFee: number;
  platformFee: number;
  profit: number;
  profitPercent: number;
  exchange: 'binance' | 'uniswap' | 'stripe' | 'paypal' | 'internal' | 'stake.us';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionHash?: string;
  orderId?: string;
  createdAt: Date;
  completedAt?: Date;
  ipAddress: string;
  metadata?: Record<string, any>;
}

export interface TradeStats {
  totalTrades: number;
  totalVolume: number;
  totalProfit: number;
  totalLoss: number;
  profitPercent: number;
  winRate: number;
  averageTradeSize: number;
  largestWin: number;
  largestLoss: number;
  bestPerformingToken: string;
  worstPerformingToken: string;
}

export interface TimeSeriesMetrics {
  timestamp: Date;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  volumeIn: number;
  volumeOut: number;
  profitLoss: number;
  tradeCount: number;
  uniqueTokens: number;
  averagePrice: number;
}

export interface PriceSnapshot {
  token: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  volume24h: number;
  timestamp: Date;
}

/**
 * Record a new trade in the database
 */
export async function recordTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade> {
  const db = await getDbConnection();
  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const query = `
    INSERT INTO trading_activities (
      id, userId, tradeType, fromToken, toToken, fromAmount, toAmount,
      entryPrice, exitPrice, exchangeFee, platformFee, profit, profitPercent,
      exchange, status, transactionHash, orderId, ipAddress, metadata, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  const metadata = JSON.stringify(trade.metadata || {});
  
  await db.execute(query, [
    tradeId,
    trade.userId,
    trade.tradeType,
    trade.fromToken,
    trade.toToken,
    trade.fromAmount,
    trade.toAmount,
    trade.entryPrice,
    trade.exitPrice,
    trade.exchangeFee,
    trade.platformFee,
    trade.profit,
    trade.profitPercent,
    trade.exchange,
    trade.status,
    trade.transactionHash || null,
    trade.orderId || null,
    trade.ipAddress,
    metadata
  ]);

  return {
    ...trade,
    id: tradeId,
    createdAt: new Date()
  };
}

/**
 * Get all trades for a user with optional filters
 */
export async function getUserTrades(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    filter?: {
      tradeType?: string;
      exchange?: string;
      minProfit?: number;
      maxProfit?: number;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    };
  }
): Promise<Trade[]> {
  const db = await getDbConnection();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  
  let query = 'SELECT * FROM trading_activities WHERE userId = ?';
  const params: any[] = [userId];

  if (options?.filter) {
    if (options.filter.tradeType) {
      query += ' AND tradeType = ?';
      params.push(options.filter.tradeType);
    }
    if (options.filter.exchange) {
      query += ' AND exchange = ?';
      params.push(options.filter.exchange);
    }
    if (options.filter.minProfit !== undefined) {
      query += ' AND profit >= ?';
      params.push(options.filter.minProfit);
    }
    if (options.filter.maxProfit !== undefined) {
      query += ' AND profit <= ?';
      params.push(options.filter.maxProfit);
    }
    if (options.filter.startDate) {
      query += ' AND createdAt >= ?';
      params.push(options.filter.startDate);
    }
    if (options.filter.endDate) {
      query += ' AND createdAt <= ?';
      params.push(options.filter.endDate);
    }
    if (options.filter.status) {
      query += ' AND status = ?';
      params.push(options.filter.status);
    }
  }

  query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [trades] = await db.execute(query, params);
  return (trades as any[]).map(t => ({
    ...t,
    metadata: JSON.parse(t.metadata || '{}')
  }));
}

/**
 * Get aggregated trading statistics for a user
 */
export async function getUserTradeStats(userId: string): Promise<TradeStats> {
  const db = await getDbConnection();
  
  const query = `
    SELECT
      COUNT(*) as totalTrades,
      SUM(fromAmount) as totalVolume,
      SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) as totalProfit,
      SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END) as totalLoss,
      AVG(profitPercent) as avgProfitPercent,
      SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) / COUNT(*) as winRate,
      AVG(fromAmount) as averageTradeSize,
      MAX(CASE WHEN profit > 0 THEN profit ELSE NULL END) as largestWin,
      MIN(CASE WHEN profit < 0 THEN profit ELSE NULL END) as largestLoss
    FROM trading_activities
    WHERE userId = ? AND status = 'completed'
  `;

  const [rows] = await db.execute(query, [userId]) as any;
  const stats = (rows as any[])[0];

  // Get best/worst performing tokens
  const tokenQuery = `
    SELECT 
      toToken,
      SUM(profit) as totalProfit
    FROM trading_activities
    WHERE userId = ? AND status = 'completed'
    GROUP BY toToken
    ORDER BY totalProfit DESC
    LIMIT 1
  `;

  const [bestToken] = await db.execute(tokenQuery, [userId]) as any;
  const [worstToken] = await db.execute(
    tokenQuery.replace('DESC LIMIT 1', 'ASC LIMIT 1'),
    [userId]
  ) as any;

  return {
    totalTrades: stats.totalTrades || 0,
    totalVolume: stats.totalVolume || 0,
    totalProfit: stats.totalProfit || 0,
    totalLoss: stats.totalLoss || 0,
    profitPercent: stats.avgProfitPercent || 0,
    winRate: stats.winRate || 0,
    averageTradeSize: stats.averageTradeSize || 0,
    largestWin: stats.largestWin || 0,
    largestLoss: stats.largestLoss || 0,
    bestPerformingToken: bestToken?.[0]?.toToken || 'N/A',
    worstPerformingToken: worstToken?.[0]?.toToken || 'N/A'
  };
}

/**
 * Get time-series metrics for analytics dashboards
 */
export async function getTimeSeriesMetrics(
  userId: string,
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  startDate: Date,
  endDate: Date
): Promise<TimeSeriesMetrics[]> {
  const db = await getDbConnection();

  const periodFormats: Record<string, string> = {
    hourly: '%Y-%m-%d %H:00:00',
    daily: '%Y-%m-%d',
    weekly: '%Y-W%v',
    monthly: '%Y-%m',
    yearly: '%Y'
  };

  const query = `
    SELECT
      DATE_FORMAT(createdAt, ?) as bucketTime,
      SUM(fromAmount) as volumeIn,
      SUM(toAmount) as volumeOut,
      SUM(profit) as profitLoss,
      COUNT(*) as tradeCount,
      COUNT(DISTINCT toToken) as uniqueTokens,
      AVG((exitPrice + entryPrice) / 2) as averagePrice
    FROM trading_activities
    WHERE userId = ? AND status = 'completed'
      AND createdAt >= ? AND createdAt <= ?
    GROUP BY DATE_FORMAT(createdAt, ?)
    ORDER BY createdAt ASC
  `;

  const format = periodFormats[period];
  const [metrics] = await db.execute(query, [
    format,
    userId,
    startDate,
    endDate,
    format
  ]);

  return (metrics as any[]).map(m => ({
    timestamp: new Date(m.bucketTime),
    period,
    volumeIn: m.volumeIn || 0,
    volumeOut: m.volumeOut || 0,
    profitLoss: m.profitLoss || 0,
    tradeCount: m.tradeCount || 0,
    uniqueTokens: m.uniqueTokens || 0,
    averagePrice: m.averagePrice || 0
  }));
}

/**
 * Get global platform trading metrics
 */
export async function getPlatformTradeStats(): Promise<TradeStats> {
  const db = await getDbConnection();
  
  const query = `
    SELECT
      COUNT(*) as totalTrades,
      SUM(fromAmount) as totalVolume,
      SUM(CASE WHEN profit > 0 THEN profit ELSE 0 END) as totalProfit,
      SUM(CASE WHEN profit < 0 THEN ABS(profit) ELSE 0 END) as totalLoss,
      AVG(profitPercent) as avgProfitPercent,
      SUM(CASE WHEN profit > 0 THEN 1 ELSE 0 END) / COUNT(*) as winRate,
      AVG(fromAmount) as averageTradeSize,
      MAX(CASE WHEN profit > 0 THEN profit ELSE NULL END) as largestWin,
      MIN(CASE WHEN profit < 0 THEN profit ELSE NULL END) as largestLoss
    FROM trading_activities
    WHERE status = 'completed'
  `;

  const [rows] = await db.execute(query, []);
  const stats = (rows as any[])[0];

  return {
    totalTrades: stats.totalTrades || 0,
    totalVolume: stats.totalVolume || 0,
    totalProfit: stats.totalProfit || 0,
    totalLoss: stats.totalLoss || 0,
    profitPercent: stats.avgProfitPercent || 0,
    winRate: stats.winRate || 0,
    averageTradeSize: stats.averageTradeSize || 0,
    largestWin: stats.largestWin || 0,
    largestLoss: stats.largestLoss || 0,
    bestPerformingToken: 'BTC',
    worstPerformingToken: 'USDT'
  };
}

/**
 * Get price snapshot history
 */
export async function getPriceHistory(
  token: string,
  days: number = 7
): Promise<PriceSnapshot[]> {
  const db = await getDbConnection();
  
  const query = `
    SELECT * FROM price_snapshots
    WHERE token = ? AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    ORDER BY timestamp DESC
  `;

  const [snapshots] = await db.execute(query, [token, days]);
  return snapshots as PriceSnapshot[];
}

/**
 * Record price snapshot for analytics
 */
export async function recordPriceSnapshot(snapshot: Omit<PriceSnapshot, 'timestamp'>): Promise<void> {
  const db = await getDbConnection();
  
  const query = `
    INSERT INTO price_snapshots 
    (token, price, change24h, change7d, change30d, marketCap, volume24h, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;

  await db.execute(query, [
    snapshot.token,
    snapshot.price,
    snapshot.change24h,
    snapshot.change7d,
    snapshot.change30d,
    snapshot.marketCap,
    snapshot.volume24h
  ]);
}

/**
 * Get aggregated platform metrics by exchange
 */
export async function getPlatformMetricsByExchange(): Promise<Record<string, any>> {
  const db = await getDbConnection();
  
  const query = `
    SELECT
      exchange,
      COUNT(*) as tradeCount,
      SUM(fromAmount) as totalVolume,
      SUM(profit) as totalProfit,
      AVG(profitPercent) as avgProfit
    FROM trading_activities
    WHERE status = 'completed'
    GROUP BY exchange
    ORDER BY totalVolume DESC
  `;

  const [results] = await db.execute(query, []);
  
  const metrics: Record<string, any> = {};
  for (const row of results as any[]) {
    metrics[row.exchange] = {
      tradeCount: row.tradeCount,
      totalVolume: row.totalVolume,
      totalProfit: row.totalProfit,
      averageProfit: row.avgProfit
    };
  }
  
  return metrics;
}

/**
 * Get top performing users
 */
export async function getTopPerformingUsers(limit: number = 10): Promise<any[]> {
  const db = await getDbConnection();
  
  const query = `
    SELECT
      userId,
      COUNT(*) as totalTrades,
      SUM(profit) as totalProfit,
      AVG(profitPercent) as avgProfit,
      SUM(fromAmount) as totalVolume
    FROM trading_activities
    WHERE status = 'completed'
    GROUP BY userId
    ORDER BY totalProfit DESC
    LIMIT ?
  `;

  const [results] = await db.execute(query, [limit]);
  return results as any[];
}
