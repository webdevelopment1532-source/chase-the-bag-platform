jest.mock('../src/exchange-integration', () => ({
  getBinancePrices: jest.fn(),
}));

import { getBinancePrices } from '../src/exchange-integration';
import { getCachedPrice, startPriceFeed } from '../src/price-feed';

const mockGetBinancePrices = getBinancePrices as jest.MockedFunction<typeof getBinancePrices>;

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('price-feed', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('logs disabled message when channel env is missing', () => {
    delete process.env.CTB_PRICE_FEED_CHANNEL_ID;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    startPriceFeed({ channels: { cache: new Map() } } as any);
    expect(logSpy).toHaveBeenCalledWith('[PriceFeed] CTB_PRICE_FEED_CHANNEL_ID not set — price feed disabled');

    logSpy.mockRestore();
  });

  test('posts feed update and caches prices after initial timer', async () => {
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';
    process.env.CTB_PRICE_FEED_INTERVAL_MS = String(60_000);

    const send = jest.fn().mockResolvedValue(undefined);
    const channel = { send };
    const client = { channels: { cache: new Map([['prices', channel]]) } };

    mockGetBinancePrices.mockResolvedValueOnce(new Map([
      ['BTC', 50000],
      ['ETH', 3000],
      ['SOL', 150],
      ['BNB', 400],
      ['ADA', 0.7],
      ['MATIC', 1.2],
    ]));

    startPriceFeed(client as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(1);
    expect(getCachedPrice('btc')).toBe(50000);
    expect(mockGetBinancePrices).toHaveBeenCalledWith(['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'MATIC']);
  });

  test('returns cached value by uppercase and zero when not present', () => {
    expect(getCachedPrice('not-real')).toBe(0);
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';
    const send = jest.fn().mockResolvedValue(undefined);
    const client = { channels: { cache: new Map([['prices', { send }]]) } };

    mockGetBinancePrices.mockResolvedValueOnce(new Map([
      ['BTC', 12345],
      ['ETH', 1],
      ['SOL', 1],
      ['BNB', 1],
      ['ADA', 1],
      ['MATIC', 1],
    ]));

    startPriceFeed(client as any);
    jest.advanceTimersByTime(10_000);

    return flushPromises().then(() => {
      expect(getCachedPrice('btc')).toBe(12345);
      expect(getCachedPrice('BTC')).toBe(12345);
    });
  });

  test('uses minimum 5 minute interval and logs fetch failures', async () => {
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';
    process.env.CTB_PRICE_FEED_INTERVAL_MS = String(1_000);

    const send = jest.fn().mockResolvedValue(undefined);
    const client = { channels: { cache: new Map([['prices', { send }]]) } };

    mockGetBinancePrices
      .mockResolvedValueOnce(new Map([
        ['BTC', 1],
        ['ETH', 1],
        ['SOL', 1],
        ['BNB', 1],
        ['ADA', 1],
        ['MATIC', 1],
      ]))
      .mockRejectedValueOnce(new Error('api down'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    startPriceFeed(client as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith('[PriceFeed] Failed to post update:', expect.any(Error));
    errorSpy.mockRestore();
  });

  test('returns early when channel is missing, non-sendable, or prices are empty', async () => {
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';

    const noChannelClient = { channels: { cache: new Map() } };
    startPriceFeed(noChannelClient as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    const nonSendClient = { channels: { cache: new Map([['prices', {}]]) } };
    startPriceFeed(nonSendClient as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    const send = jest.fn().mockResolvedValue(undefined);
    const emptyPriceClient = { channels: { cache: new Map([['prices', { send }]]) } };
    mockGetBinancePrices.mockResolvedValueOnce(new Map());
    startPriceFeed(emptyPriceClient as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(send).not.toHaveBeenCalled();
  });

  test('handles mixed up/down/flat moves across interval updates', async () => {
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';
    process.env.CTB_PRICE_FEED_INTERVAL_MS = String(300_000);

    const send = jest.fn().mockResolvedValue(undefined);
    const client = { channels: { cache: new Map([['prices', { send }]]) } };

    mockGetBinancePrices
      .mockResolvedValueOnce(new Map([
        ['BTC', 100],
        ['ETH', 100],
        ['SOL', 100],
        ['BNB', 100],
        ['ADA', 100],
        ['MATIC', 100],
      ]))
      .mockResolvedValueOnce(new Map([
        ['BTC', 101],
        ['ETH', 99],
        ['SOL', 100],
        ['BNB', 101],
        ['ADA', 99],
        ['MATIC', 100],
      ]));

    startPriceFeed(client as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(2);
  });

  test('covers sparse prices and bullish sentiment branches', async () => {
    process.env.CTB_PRICE_FEED_CHANNEL_ID = 'prices';
    process.env.CTB_PRICE_FEED_INTERVAL_MS = String(300_000);

    const send = jest.fn().mockResolvedValue(undefined);
    const client = { channels: { cache: new Map([['prices', { send }]]) } };

    mockGetBinancePrices
      .mockResolvedValueOnce(new Map([
        ['BTC', 100],
        ['ETH', 100],
        ['SOL', 100],
        ['BNB', 100],
        ['ADA', 100],
        ['MATIC', 100],
      ]))
      .mockResolvedValueOnce(new Map([
        ['BTC', 110],
        ['ETH', 110],
        ['SOL', 110],
        ['BNB', 110],
      ]));

    startPriceFeed(client as any);
    jest.advanceTimersByTime(10_000);
    await flushPromises();

    jest.advanceTimersByTime(5 * 60 * 1000);
    await flushPromises();

    expect(send).toHaveBeenCalledTimes(2);
  });
});
