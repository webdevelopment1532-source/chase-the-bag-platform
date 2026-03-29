jest.mock('../src/trading-tracker', () => ({
  recordTrade: jest.fn(),
  recordPriceSnapshot: jest.fn(),
}));

jest.mock('node-fetch', () => jest.fn());

import fetch from 'node-fetch';
import {
  getBinancePrices,
  getCoinGeckoPrices,
  getBinanceOrderBook,
  simulateBinanceTrade,
  getUniswapPoolData,
  recordUniswapSwap,
  recordStripePayment,
  recordPayPalWithdrawal,
  recordMixingTransaction,
  recordStakingReward,
  updatePriceSnapshots,
  calculateSlippage,
} from '../src/exchange-integration';
import { recordTrade, recordPriceSnapshot } from '../src/trading-tracker';

const mockFetch = fetch as unknown as jest.Mock;
const mockRecordTrade = recordTrade as jest.Mock;
const mockRecordPriceSnapshot = recordPriceSnapshot as jest.Mock;

describe('exchange-integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getBinancePrices returns parsed price map and skips non-ok responses', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '70000.50' }) })
      .mockResolvedValueOnce({ ok: false });

    const result = await getBinancePrices(['BTC', 'ETH']);

    expect(result.get('BTC')).toBe(70000.5);
    expect(result.has('ETH')).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test('getBinancePrices returns empty map on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network'));
    const result = await getBinancePrices(['BTC']);
    expect(result.size).toBe(0);
  });

  test('getBinancePrices uses default symbols when none are provided', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '2' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '3' }) });

    const result = await getBinancePrices();

    expect(result.get('BTC')).toBe(1);
    expect(result.get('ETH')).toBe(2);
    expect(result.get('USDT')).toBe(3);
  });

  test('getCoinGeckoPrices maps API payload to normalized records', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bitcoin: {
          usd: 65000,
          usd_24h_change: 1.2,
          usd_7d_change: 4,
          usd_30d_change: 10,
          usd_market_cap: 123,
          usd_24h_vol: 456,
        },
      }),
    });

    const result = await getCoinGeckoPrices(['bitcoin']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ token: 'BIT', price: 65000, change24h: 1.2 });
  });

  test('getCoinGeckoPrices falls back missing numeric fields to 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bitcoin: {},
      }),
    });

    const result = await getCoinGeckoPrices(['bitcoin']);
    expect(result[0]).toMatchObject({
      price: 0,
      change24h: 0,
      change7d: 0,
      change30d: 0,
      marketCap: 0,
      volume24h: 0,
    });
  });

  test('getCoinGeckoPrices returns empty array when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getCoinGeckoPrices(['bitcoin']);
    expect(result).toEqual([]);
  });

  test('getCoinGeckoPrices returns empty array on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));
    const result = await getCoinGeckoPrices(['bitcoin']);
    expect(result).toEqual([]);
  });

  test('getCoinGeckoPrices supports default tokenIds parameter', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const result = await getCoinGeckoPrices();
    expect(Array.isArray(result)).toBe(true);
  });

  test('getBinanceOrderBook returns bid/ask data and mid price', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '2']], asks: [['102', '3']] }),
    });

    const result = await getBinanceOrderBook('BTCUSDT', 5);
    expect(result.mid).toBe(101);
    expect(result.bids[0][0]).toBe('100');
  });

  test('getBinanceOrderBook returns default values on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getBinanceOrderBook();
    expect(result).toEqual({ bids: [], asks: [], mid: 0 });
  });

  test('getBinanceOrderBook returns default values on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('x'));
    const result = await getBinanceOrderBook();
    expect(result).toEqual({ bids: [], asks: [], mid: 0 });
  });

  test('simulateBinanceTrade throws when prices are unavailable', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(simulateBinanceTrade('BTC', 'USDT', 1, 'u1', '127.0.0.1')).rejects.toThrow('Price data unavailable');
  });

  test('simulateBinanceTrade records completed trade', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '60000' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '1' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [['1', '1']], asks: [['1', '1']] }) });

    mockRecordTrade.mockResolvedValueOnce({ id: 't1' });

    const result = await simulateBinanceTrade('BTC', 'USDT', 1, 'u1', '127.0.0.1');
    expect(result).toEqual({ id: 't1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({
      exchange: 'binance',
      tradeType: 'crypto_swap',
      status: 'completed',
    }));
  });

  test('getUniswapPoolData returns parsed pool data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { pool: { id: 'pool1' } } }),
    });

    const result = await getUniswapPoolData('0xABCDEF');
    expect(result).toEqual({ id: 'pool1' });
  });

  test('getUniswapPoolData returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getUniswapPoolData('0xabc');
    expect(result).toBeNull();
  });

  test('getUniswapPoolData returns null when response has no pool object', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: {} }),
    });
    const result = await getUniswapPoolData('0xabc');
    expect(result).toBeNull();
  });

  test('getUniswapPoolData returns null on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('graph fail'));
    const result = await getUniswapPoolData('0xabc');
    expect(result).toBeNull();
  });

  test('recordUniswapSwap stores computed fees and metrics', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '100' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '200' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'u1' });

    const result = await recordUniswapSwap('AAA', 'BBB', 2, 1.5, 'user', 'ip', '0xhash');
    expect(result).toEqual({ id: 'u1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ exchange: 'uniswap' }));
  });

  test('recordUniswapSwap falls back prices to 0 when unavailable', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });
    mockRecordTrade.mockResolvedValueOnce({ id: 'u2' });

    await recordUniswapSwap('AAA', 'BBB', 2, 1.5, 'user', 'ip', '0xhash2');

    expect(mockRecordTrade).toHaveBeenCalledWith(
      expect.objectContaining({ entryPrice: 0, exitPrice: 0 })
    );
  });

  test('recordStripePayment stores converted trade', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '50000' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 's1' });

    const result = await recordStripePayment('u', 100, 'BTC', 'ip', 'tx1');
    expect(result).toEqual({ id: 's1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ exchange: 'stripe', tradeType: 'usdt_to_crypto' }));
  });

  test('recordStripePayment falls back crypto price to 1 when unavailable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockRecordTrade.mockResolvedValueOnce({ id: 's2' });

    await recordStripePayment('u', 100, 'BTC', 'ip', 'tx2');
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ exitPrice: 1 }));
  });

  test('recordPayPalWithdrawal stores converted withdrawal trade', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '30000' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'p1' });

    const result = await recordPayPalWithdrawal('u', 0.5, 'BTC', 'ip', 'tx2');
    expect(result).toEqual({ id: 'p1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ exchange: 'paypal', tradeType: 'crypto_to_usdt' }));
  });

  test('recordPayPalWithdrawal falls back crypto price to 1 when unavailable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockRecordTrade.mockResolvedValueOnce({ id: 'p2' });

    await recordPayPalWithdrawal('u', 2, 'BTC', 'ip', 'tx3');
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ entryPrice: 1 }));
  });

  test('recordMixingTransaction stores internal mixing record', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '1000' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'm1' });

    const result = await recordMixingTransaction('u', 'ETH', 1, 'ip', 0.5);
    expect(result).toEqual({ id: 'm1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ exchange: 'internal', tradeType: 'mixing' }));
  });

  test('recordMixingTransaction uses zero price fallback when unavailable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockRecordTrade.mockResolvedValueOnce({ id: 'm2' });

    await recordMixingTransaction('u', 'ETH', 1, 'ip', 0.5);
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ entryPrice: 0, exchangeFee: 0 }));
  });

  test('recordMixingTransaction uses default fee parameter when omitted', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '100' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'm3' });

    await recordMixingTransaction('u', 'ETH', 2, 'ip');

    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ profitPercent: -0.5 }));
  });

  test('recordStakingReward stores staking record', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '100' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'st1' });

    const result = await recordStakingReward('u', 'AAA', 10, 1, 12, 'ip');
    expect(result).toEqual({ id: 'st1' });
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ tradeType: 'staking' }));
  });

  test('recordStakingReward uses zero price fallback when unavailable', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    mockRecordTrade.mockResolvedValueOnce({ id: 'st2' });

    await recordStakingReward('u', 'AAA', 10, 1, 12, 'ip');
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({ entryPrice: 0, profit: 0 }));
  });

  test('updatePriceSnapshots writes all fetched snapshots', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bitcoin: { usd: 1, usd_24h_change: 0, usd_7d_change: 0, usd_30d_change: 0, usd_market_cap: 1, usd_24h_vol: 1 },
        ethereum: { usd: 2, usd_24h_change: 0, usd_7d_change: 0, usd_30d_change: 0, usd_market_cap: 2, usd_24h_vol: 2 },
      }),
    });

    await updatePriceSnapshots();
    expect(mockRecordPriceSnapshot).toHaveBeenCalledTimes(2);
  });

  test('updatePriceSnapshots handles empty price list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await updatePriceSnapshots();
    expect(mockRecordPriceSnapshot).not.toHaveBeenCalled();
  });

  test('calculateSlippage returns 0 for empty books', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [], asks: [] }) });
    const result = await calculateSlippage('BTCUSDT', 1, true);
    expect(result).toBe(0);
  });

  test('calculateSlippage computes slippage for buy and sell paths', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [['100', '10']], asks: [['102', '10']] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [['100', '10']], asks: [['102', '10']] }) });

    const buy = await calculateSlippage('BTCUSDT', 1, true);
    const sell = await calculateSlippage('BTCUSDT', 1, false);

    expect(buy).toBeGreaterThanOrEqual(0);
    expect(sell).toBeGreaterThanOrEqual(0);
  });

  test('calculateSlippage consumes multiple orderbook levels when amount exceeds first level', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '1'], ['99', '10']], asks: [['102', '1'], ['103', '10']] }),
    });

    const value = await calculateSlippage('BTCUSDT', 2, true);
    expect(value).toBeGreaterThanOrEqual(0);
  });

  test('calculateSlippage supports default isBuy parameter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '10']], asks: [['102', '10']] }),
    });

    const value = await calculateSlippage('BTCUSDT', 1);
    expect(value).toBeGreaterThanOrEqual(0);
  });

  test('getBinancePrices returns empty map when symbols is not iterable', async () => {
    const result = await getBinancePrices(null as any);
    expect(result.size).toBe(0);
  });

  test('getBinanceOrderBook returns defaults when best bid price is zero', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['0', '10']], asks: [['102', '3']] }),
    });
    const result = await getBinanceOrderBook('BTCUSDT');
    expect(result).toEqual({ bids: [], asks: [], mid: 0 });
  });

  test('simulateBinanceTrade throws when fromAmount is zero or negative', async () => {
    await expect(simulateBinanceTrade('BTC', 'USDT', 0, 'u1', '127.0.0.1')).rejects.toThrow(
      'Trade amount must be a positive number'
    );
    await expect(simulateBinanceTrade('BTC', 'USDT', -1, 'u1', '127.0.0.1')).rejects.toThrow(
      'Trade amount must be a positive number'
    );
  });

  test('calculateSlippage returns 0 immediately for non-positive amount', async () => {
    const result = await calculateSlippage('BTCUSDT', 0);
    expect(result).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('calculateSlippage skips invalid order book levels and computes from valid ones', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bids: [['100', '10']],
        asks: [['102', '5'], ['bad', '10'], ['103', '5']],
      }),
    });
    const result = await calculateSlippage('BTCUSDT', 20, true);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  test('calculateSlippage returns 0 when all order book levels have zero quantity', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bids: [['100', '10']],
        asks: [['102', '0']],
      }),
    });
    const result = await calculateSlippage('BTCUSDT', 5, true);
    expect(result).toBe(0);
  });

  test('getBinancePrices returns empty map when price string fails to parse as number', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ price: 'invalid' }),
    });
    const result = await getBinancePrices(['BTC']);
    expect(result.size).toBe(0);
  });

  test('getCoinGeckoPrices returns empty array when all tokenIds are empty/whitespace', async () => {
    const result = await getCoinGeckoPrices(['', '  ', '\t']);
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('getBinanceOrderBook returns defaults when bids is empty but asks is not', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [], asks: [['102', '10']] }),
    });
    const result = await getBinanceOrderBook('BTCUSDT');
    expect(result).toEqual({ bids: [], asks: [], mid: 0 });
  });

  test('getBinanceOrderBook returns defaults when asks is empty but bids is not', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '10']], asks: [] }),
    });
    const result = await getBinanceOrderBook('BTCUSDT');
    expect(result).toEqual({ bids: [], asks: [], mid: 0 });
  });

  test('recordStripePayment with zero usdAmount uses fallback denominator', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '50000' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 's3' });

    await recordStripePayment('u', 0, 'BTC', 'ip', 'tx-zero');
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({
      profitPercent: -30, // stripeFee (0.30) / fallback denominator (1) * 100
    }));
  });

  test('recordPayPalWithdrawal with zero usdValue uses fallback denominator', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ price: '30000' }) });
    mockRecordTrade.mockResolvedValueOnce({ id: 'p3' });

    await recordPayPalWithdrawal('u', 0, 'BTC', 'ip', 'tx-zero-val');
    expect(mockRecordTrade).toHaveBeenCalledWith(expect.objectContaining({
      profitPercent: -30, // paypalFee (0.30) / fallback denominator (1) * 100
    }));
  });

  test('simulateBinanceTrade metadata computes slippage with price > 0', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '60000' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '2000' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [['60000', '1']], asks: [['60100', '1']] }) });

    mockRecordTrade.mockResolvedValueOnce({ id: 't-slippage' });

    await simulateBinanceTrade('BTC', 'ETH', 1, 'u1', '127.0.0.1');
    expect(mockRecordTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          slippage: expect.any(Number),
        }),
      })
    );
  });

  test('getBinanceOrderBook with invalid limit falls back to default 20', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '10']], asks: [['102', '10']] }),
    });

    await getBinanceOrderBook('BTCUSDT', -5);
    const url = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('limit=20');
  });

  test('getBinanceOrderBook with non-finite limit falls back to default 20', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bids: [['100', '10']], asks: [['102', '10']] }),
    });

    await getBinanceOrderBook('BTCUSDT', NaN);
    const url = (mockFetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('limit=20');
  });

  test('simulateBinanceTrade with data returned for orderBook applies slippage to metadata', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '60000' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ price: '2000' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ bids: [['59950', '5']], asks: [['60050', '5']] }) });

    mockRecordTrade.mockResolvedValueOnce({ id: 't-with-book' });

    await simulateBinanceTrade('BTC', 'ETH', 1, 'u1', '127.0.0.1');
    expect(mockRecordTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          slippage: expect.any(Number),
          orderBook: expect.any(Object),
        }),
      })
    );
  });
});
