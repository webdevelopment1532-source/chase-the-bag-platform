/**
 * Exchange Integration Module
 * Handles real-time data and trading with multiple exchanges
 */

import fetch from 'node-fetch';
import { recordTrade, recordPriceSnapshot } from './trading-tracker';

const BINANCE_API = 'https://api.binance.com/api/v3';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const UNISWAP_EXPLORER_API = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
const REQUEST_TIMEOUT_MS = 5000;
const SHOULD_LOG_EXTERNAL_ERRORS =
  process.env.NODE_ENV !== 'test' || process.env.CTB_LOG_EXTERNAL_ERRORS === 'true';

function logExternalApiError(message: string, error: unknown): void {
  if (SHOULD_LOG_EXTERNAL_ERRORS) {
    console.error(message, error);
  }
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchJsonWithTimeout(url: string, init: Record<string, unknown> = {}): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new (AbortController as any)();
  /* istanbul ignore next */
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal as any,
    } as any);

    const data = response.ok ? await response.json() : null;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

interface ExchangePrice {
  token: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  volume24h: number;
}

/**
 * Fetch real-time price data from Binance
 */
export async function getBinancePrices(symbols: string[] = ['BTC', 'ETH', 'USDT']): Promise<Map<string, number>> {
  try {
    const inputSymbols = Array.isArray(symbols) ? symbols : ['BTC', 'ETH', 'USDT'];
    const normalizedSymbols = Array.from(
      new Set(
        inputSymbols
          .map((symbol) => symbol.trim().toUpperCase())
          .filter(Boolean)
      )
    ).slice(0, 25);

    const tasks = normalizedSymbols.map(async (symbol) => {
      const result = await fetchJsonWithTimeout(`${BINANCE_API}/ticker/price?symbol=${symbol}USDT`);
      if (!result.ok || !result.data) return null;

      const price = toSafeNumber((result.data as { price?: string }).price, NaN);
      if (!Number.isFinite(price) || price <= 0) return null;
      return [symbol, price] as const;
    });

    const settled = await Promise.allSettled(tasks);
    const priceMap = new Map<string, number>();

    for (const item of settled) {
      if (item.status !== 'fulfilled' || !item.value) continue;
      const [symbol, price] = item.value;
      priceMap.set(symbol, price);
    }

    return priceMap;
  } catch (error) {
    logExternalApiError('Binance API error:', error);
    return new Map();
  }
}

/**
 * Fetch comprehensive price data from CoinGecko
 */
export async function getCoinGeckoPrices(
  tokenIds: string[] = ['bitcoin', 'ethereum', 'usd-coin']
): Promise<ExchangePrice[]> {
  try {
    const inputTokenIds = Array.isArray(tokenIds) ? tokenIds : ['bitcoin', 'ethereum', 'usd-coin'];
    const normalizedTokenIds = Array.from(
      new Set(inputTokenIds.map((id) => id.trim().toLowerCase()).filter(Boolean))
    ).slice(0, 50);
    if (normalizedTokenIds.length === 0) return [];

    const params = new URLSearchParams({
      ids: normalizedTokenIds.join(','),
      vs_currencies: 'usd',
      include_market_cap: 'true',
      include_24hr_vol: 'true',
      include_24hr_change: 'true'
    });

    const result = await fetchJsonWithTimeout(`${COINGECKO_API}/simple/price?${params}`);
    if (!result.ok || !result.data) return [];

    const data = result.data as Record<string, any>;
    const prices: ExchangePrice[] = [];

    for (const [tokenId, priceData] of Object.entries(data) as any[]) {
      const symbol = tokenId.toUpperCase().substring(0, 3);
      
      prices.push({
        token: symbol,
        price: toSafeNumber(priceData?.usd),
        change24h: toSafeNumber(priceData?.usd_24h_change),
        change7d: toSafeNumber(priceData?.usd_7d_change),
        change30d: toSafeNumber(priceData?.usd_30d_change),
        marketCap: toSafeNumber(priceData?.usd_market_cap),
        volume24h: toSafeNumber(priceData?.usd_24h_vol)
      });
    }

    return prices;
  } catch (error) {
    logExternalApiError('CoinGecko API error:', error);
    return [];
  }
}

/**
 * Get Binance order book depth for slippage calculation
 */
export async function getBinanceOrderBook(
  symbol: string = 'BTCUSDT',
  limit: number = 20
): Promise<{
  bids: [string, string][];
  asks: [string, string][];
  mid: number;
}> {
  try {
    const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 1000) : 20;
    const result = await fetchJsonWithTimeout(
      `${BINANCE_API}/depth?symbol=${symbol}&limit=${normalizedLimit}`
    );

    if (!result.ok || !result.data) {
      return { bids: [], asks: [], mid: 0 };
    }

    const data = result.data as any;
    const bids = Array.isArray(data?.bids) ? data.bids : [];
    const asks = Array.isArray(data?.asks) ? data.asks : [];
    if (bids.length === 0 || asks.length === 0) {
      return { bids: [], asks: [], mid: 0 };
    }

    const bestBid = toSafeNumber(bids[0]?.[0], NaN);
    const bestAsk = toSafeNumber(asks[0]?.[0], NaN);
    if (!Number.isFinite(bestBid) || !Number.isFinite(bestAsk) || bestBid <= 0 || bestAsk <= 0) {
      return { bids: [], asks: [], mid: 0 };
    }

    const mid = (bestBid + bestAsk) / 2;

    return {
      bids,
      asks,
      mid
    };
  } catch (error) {
    logExternalApiError('Binance order book error:', error);
    return { bids: [], asks: [], mid: 0 };
  }
}

/**
 * Simulate a crypto-to-USDT trade with realistic fee calculation
 */
export async function simulateBinanceTrade(
  fromToken: string,
  toToken: string,
  fromAmount: number,
  userId: string,
  ipAddress: string
): Promise<any> {
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) {
    throw new Error('Trade amount must be a positive number');
  }

  const priceMap = await getBinancePrices([fromToken, toToken]);
  
  if (!priceMap.has(fromToken) || !priceMap.has(toToken)) {
    throw new Error('Price data unavailable');
  }

  const fromPrice = priceMap.get(fromToken)!;
  const toPrice = priceMap.get(toToken)!;

  // Calculate conversion with Binance fees (0.1%)
  const binanceFee = 0.001;
  const afterFee = fromAmount * (1 - binanceFee);
  const usdValue = afterFee * fromPrice;
  const toAmount = usdValue / toPrice;
  
  // Platform fee (0.5%)
  const platformFee = usdValue * 0.005;
  const finalToAmount = toAmount - (platformFee / toPrice);

  const profit = (finalToAmount * toPrice - fromAmount * fromPrice);
  const costBasis = fromAmount * fromPrice;
  const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

  const trade = await recordTrade({
    userId,
    tradeType: 'crypto_swap',
    fromToken,
    toToken,
    fromAmount,
    toAmount: finalToAmount,
    entryPrice: fromPrice,
    exitPrice: toPrice,
    exchangeFee: binanceFee * usdValue,
    platformFee,
    profit,
    profitPercent,
    exchange: 'binance',
    status: 'completed' as const,
    ipAddress,
    metadata: {
      slippage: fromPrice > 0 ? ((toPrice - fromPrice) / fromPrice) * 100 : 0,
      orderBook: await getBinanceOrderBook(`${fromToken}${toToken}`)
    }
  });

  return trade;
}

/**
 * Fetch Uniswap trading data
 */
export async function getUniswapPoolData(tokenAddress: string): Promise<any> {
  try {
    const normalizedTokenAddress = typeof tokenAddress === 'string' ? tokenAddress.trim().toLowerCase() : '';
    if (!normalizedTokenAddress) return null;

    const query = `
      query {
        pool(id: "${normalizedTokenAddress}") {
          id
          token0Price
          token1Price
          tvlUSD
          volumeUSD
          feeTier
        }
      }
    `;

    const result = await fetchJsonWithTimeout(UNISWAP_EXPLORER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (!result.ok || !result.data) return null;

    const payload = result.data as any;
    return payload.data?.pool || null;
  } catch (error) {
    logExternalApiError('Uniswap API error:', error);
    return null;
  }
}

/**
 * Record a Uniswap swap trade
 */
export async function recordUniswapSwap(
  fromToken: string,
  toToken: string,
  fromAmount: number,
  toAmount: number,
  userId: string,
  ipAddress: string,
  transactionHash: string
): Promise<any> {
  const prices = await getBinancePrices([fromToken, toToken]);
  const entryPrice = prices.get(fromToken) || 0;
  const exitPrice = prices.get(toToken) || 0;

  // Uniswap fee (0.05% for stable pairs, up to 1% for volatile)
  const uniswapFee = 0.003; // 0.3% average
  const exchangeFeeAmount = fromAmount * entryPrice * uniswapFee;

  const profit = (toAmount * exitPrice) - (fromAmount * entryPrice) - exchangeFeeAmount;
  const costBasis = fromAmount * entryPrice;
  const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

  return recordTrade({
    userId,
    tradeType: 'crypto_swap',
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    entryPrice,
    exitPrice,
    exchangeFee: exchangeFeeAmount,
    platformFee: 0,
    profit,
    profitPercent,
    exchange: 'uniswap',
    status: 'completed' as const,
    transactionHash,
    ipAddress
  });
}

/**
 * Record a Stripe payment (USDT purchase)
 */
export async function recordStripePayment(
  userId: string,
  usdAmount: number,
  cryptoType: string,
  ipAddress: string,
  transactionId: string
): Promise<any> {
  const prices = await getBinancePrices([cryptoType]);
  const cryptoPrice = prices.get(cryptoType) || 1;

  // Stripe fee: 2.2% + $0.30
  const stripeFee = (usdAmount * 0.022) + 0.30;
  const cryptoAmount = (usdAmount - stripeFee) / cryptoPrice;
  const denominator = usdAmount > 0 ? usdAmount : 1;

  return recordTrade({
    userId,
    tradeType: 'usdt_to_crypto',
    fromToken: 'USD',
    toToken: cryptoType,
    fromAmount: usdAmount,
    toAmount: cryptoAmount,
    entryPrice: 1,
    exitPrice: cryptoPrice,
    exchangeFee: stripeFee,
    platformFee: 0,
    profit: -stripeFee, // Negative for onboarding
    profitPercent: -(stripeFee / denominator) * 100,
    exchange: 'stripe',
    status: 'completed' as const,
    orderId: transactionId,
    ipAddress
  });
}

/**
 * Record a PayPal payment (crypto withdrawal to USD)
 */
export async function recordPayPalWithdrawal(
  userId: string,
  cryptoAmount: number,
  cryptoType: string,
  ipAddress: string,
  transactionId: string
): Promise<any> {
  const prices = await getBinancePrices([cryptoType]);
  const cryptoPrice = prices.get(cryptoType) || 1;

  const usdValue = cryptoAmount * cryptoPrice;
  
  // PayPal fee: 2.2% + $0.30 (or flat 3.49% for transfers)
  const paypalFee = Math.max((usdValue * 0.0349), (usdValue * 0.022) + 0.30);
  const usdReceived = usdValue - paypalFee;
  const denominator = usdValue > 0 ? usdValue : 1;

  return recordTrade({
    userId,
    tradeType: 'crypto_to_usdt',
    fromToken: cryptoType,
    toToken: 'USD',
    fromAmount: cryptoAmount,
    toAmount: usdReceived,
    entryPrice: cryptoPrice,
    exitPrice: 1,
    exchangeFee: paypalFee,
    platformFee: 0,
    profit: -paypalFee,
    profitPercent: -(paypalFee / denominator) * 100,
    exchange: 'paypal',
    status: 'completed' as const,
    orderId: transactionId,
    ipAddress
  });
}

/**
 * Record a crypto mixing transaction
 */
export async function recordMixingTransaction(
  userId: string,
  cryptoType: string,
  amount: number,
  ipAddress: string,
  mixingFeePercent: number = 0.5
): Promise<any> {
  const prices = await getBinancePrices([cryptoType]);
  const price = prices.get(cryptoType) || 0;

  const mixingFee = (amount * price) * (mixingFeePercent / 100);
  const profit = -mixingFee;
  const profitPercent = -mixingFeePercent;

  return recordTrade({
    userId,
    tradeType: 'mixing',
    fromToken: cryptoType,
    toToken: cryptoType,
    fromAmount: amount,
    toAmount: amount,
    entryPrice: price,
    exitPrice: price,
    exchangeFee: mixingFee,
    platformFee: 0,
    profit,
    profitPercent,
    exchange: 'internal',
    status: 'completed' as const,
    ipAddress,
    metadata: {
      mixType: 'standard',
      rounds: 5,
      privacyLevel: 'high'
    }
  });
}

/**
 * Record staking rewards
 */
export async function recordStakingReward(
  userId: string,
  cryptoType: string,
  stakedAmount: number,
  rewardAmount: number,
  apy: number,
  ipAddress: string
): Promise<any> {
  const prices = await getBinancePrices([cryptoType]);
  const price = prices.get(cryptoType) || 0;

  const rewardValue = rewardAmount * price;
  const basis = stakedAmount * price;
  const profitPercent = basis > 0 ? (rewardValue / basis) * 100 : 0;

  return recordTrade({
    userId,
    tradeType: 'staking',
    fromToken: cryptoType,
    toToken: cryptoType,
    fromAmount: stakedAmount,
    toAmount: stakedAmount + rewardAmount,
    entryPrice: price,
    exitPrice: price,
    exchangeFee: 0,
    platformFee: 0,
    profit: rewardValue,
    profitPercent,
    exchange: 'internal',
    status: 'completed' as const,
    ipAddress,
    metadata: {
      apy,
      stakePeriod: '30-days',
      rewardEmission: new Date()
    }
  });
}

/**
 * Update price snapshots for all tracked tokens
 */
export async function updatePriceSnapshots(): Promise<void> {
  const tokens = ['bitcoin', 'ethereum', 'cardano', 'solana', 'polkadot'];
  const prices = await getCoinGeckoPrices(tokens);

  await Promise.all(prices.map((price) => recordPriceSnapshot(price)));
}

/**
 * Calculate slippage for a given trade amount
 */
export async function calculateSlippage(
  symbol: string,
  amount: number,
  isBuy: boolean = true
): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const orderBook = await getBinanceOrderBook(symbol);
  
  if (orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return 0;
  }

  const side = isBuy ? orderBook.asks : orderBook.bids;
  let remaining = amount;
  let totalCost = 0;
  let filledAmount = 0;

  for (const [price, qty] of side) {
    const levelPrice = toSafeNumber(price, NaN);
    const levelQty = toSafeNumber(qty, NaN);
    if (!Number.isFinite(levelPrice) || !Number.isFinite(levelQty) || levelPrice <= 0 || levelQty <= 0) {
      continue;
    }

    const take = Math.min(remaining, levelQty);
    
    totalCost += take * levelPrice;
    filledAmount += take;
    remaining -= take;

    if (remaining <= 0) break;
  }

  const midPrice = orderBook.mid;
  if (!Number.isFinite(midPrice) || midPrice <= 0 || filledAmount <= 0) {
    return 0;
  }

  const executedPrice = totalCost / filledAmount;
  const slippage = Math.abs((executedPrice - midPrice) / midPrice) * 100;

  return slippage;
}
