/**
 * Comprehensive tests for TradingWebSocketServer.
 *
 * Strategy:
 *  - Mock the `ws` module with EventEmitter-backed classes so that `.on()` /
 *    `.emit()` work naturally throughout the source code.
 *  - Mock `exchange-integration` so no real HTTP calls are made.
 *  - Helper `flushPromises()` drains the microtask queue for async handlers.
 */

// ── Module mocks must be declared before any imports ──────────────────────────

jest.mock('../src/exchange-integration', () => ({
  getBinancePrices: jest.fn(),
  getCoinGeckoPrices: jest.fn(),
}));

jest.mock('ws', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { EventEmitter } = require('events') as typeof import('events');

  class MockWebSocket extends EventEmitter {
    static readonly OPEN = 1;
    readyState = 1; // OPEN by default
    send = jest.fn();
  }

  class MockWebSocketServer extends EventEmitter {
    close = jest.fn();
  }

  return { WebSocket: MockWebSocket, WebSocketServer: MockWebSocketServer };
});

// ── Actual imports ─────────────────────────────────────────────────────────────

import { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { TradingWebSocketServer } from '../src/websocket-server';
import { getBinancePrices } from '../src/exchange-integration';

// ── Typed helpers ──────────────────────────────────────────────────────────────

const mockFetchPrices = getBinancePrices as jest.Mock;

/** Drain the microtask queue for deeply-nested async chains. */
async function flushPromises(): Promise<void> {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

/** Access the private `wss` field for test control. */
function internalWss(srv: TradingWebSocketServer): WebSocketServer {
  return (srv as any).wss as WebSocketServer;
}

/** Create a fresh mock WebSocket client that behaves like an EventEmitter. */
function createClient(): WebSocket & { send: jest.Mock } {
  return new (WebSocket as any)() as WebSocket & { send: jest.Mock };
}

/** Simulate a WebSocket connection from the server side. */
function connect(srv: TradingWebSocketServer, ws: WebSocket): void {
  internalWss(srv).emit('connection', ws, {});
}

/** Emit a JSON message from the browser-side WebSocket. */
function send(ws: WebSocket, payload: object): void {
  (ws as any).emit('message', JSON.stringify(payload));
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('TradingWebSocketServer', () => {
  let server: TradingWebSocketServer;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetchPrices.mockResolvedValue(new Map([['BTC', 50000], ['ETH', 3000], ['BNB', 400]]));
    server = new TradingWebSocketServer({} as Server);
  });

  afterEach(() => {
    server.shutdown();
    jest.useRealTimers();
  });

  // ── Connection lifecycle ───────────────────────────────────────────────────

  test('initial connection count is 0', () => {
    expect(server.getConnectionCount()).toBe(0);
  });

  test('sends welcome message on new connection', () => {
    const ws = createClient();
    connect(server, ws);

    expect(ws.send).toHaveBeenCalledTimes(1);
    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('connected');
    expect(typeof msg.clientId).toBe('string');
  });

  test('connection count increments after each connection', () => {
    connect(server, createClient());
    connect(server, createClient());
    expect(server.getConnectionCount()).toBe(2);
  });

  test('connection count drops to 0 after client close', () => {
    const ws = createClient();
    connect(server, ws);
    (ws as any).emit('close');
    expect(server.getConnectionCount()).toBe(0);
  });

  test('shutdown clears interval when present and still closes server when interval is absent', () => {
    const clearSpy = jest.spyOn(global, 'clearInterval');

    server.shutdown();
    expect(clearSpy).toHaveBeenCalled();

    const serverNoInterval = new TradingWebSocketServer({} as Server);
    (serverNoInterval as any).priceUpdateInterval = undefined;
    const closeSpy = jest.spyOn((serverNoInterval as any).wss, 'close');
    serverNoInterval.shutdown();
    expect(closeSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });

  test('ws error event is logged to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const ws = createClient();
    connect(server, ws);
    (ws as any).emit('error', new Error('connection-reset'));
    expect(spy).toHaveBeenCalledWith('WebSocket error:', expect.any(Error));
    spy.mockRestore();
  });

  // ── Auth message ───────────────────────────────────────────────────────────

  test('auth with valid long token → authenticated response', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'auth', token: 'x'.repeat(21), userId: 'player-1' });
    await flushPromises();

    const call = (ws.send as jest.Mock).mock.calls[0][0];
    const msg = JSON.parse(call);
    expect(msg.type).toBe('authenticated');
    expect(msg.userId).toBe('player-1');
  });

  test('auth without explicit userId falls back to "anonymous"', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'auth', token: 'x'.repeat(21) });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.userId).toBe('anonymous');
  });

  test('auth with short token (≤20 chars) → auth-failed', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'auth', token: 'short' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('auth-failed');
  });

  test('auth with no token → auth-failed', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'auth' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('auth-failed');
  });

  test('auth error in send path → error response', async () => {
    const ws = createClient();
    connect(server, ws);
    // Make the next ws.send (the auth response) throw so the catch block runs
    (ws.send as jest.Mock).mockImplementationOnce(() => {
      throw new Error('broken-pipe');
    });

    send(ws, { type: 'auth', token: 'x'.repeat(21) });
    await flushPromises();

    const calls = (ws.send as jest.Mock).mock.calls.map(([m]) => JSON.parse(m));
    const errorMsg = calls.find((m) => m.type === 'error');
    expect(errorMsg).toBeDefined();
  });

  // ── Subscribe / Unsubscribe ────────────────────────────────────────────────

  test('subscribe with array of channels → subscribed response', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'subscribe', channels: ['prices', 'trade-updates'] });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('subscribed');
    expect(msg.channels).toEqual(['prices', 'trade-updates']);
  });

  test('subscribe with single string channel → subscribed response', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'subscribe', channels: 'prices' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('subscribed');
  });

  test('subscribe to price:TOKEN channel adds token to tracked set', async () => {
    const ws = createClient();
    connect(server, ws);

    send(ws, { type: 'subscribe', channels: ['price:DOGE'] });
    await flushPromises();

    // Advance past the 2-second price update interval and flush
    jest.advanceTimersByTime(2000);
    await flushPromises();

    // The tracked tokens now include DOGE, so getBinancePrices receives it
    const calls = mockFetchPrices.mock.calls;
    const allTokens = calls.flatMap(([tokens]) => tokens as string[]);
    expect(allTokens).toContain('DOGE');
  });

  test('unsubscribe with array of channels → unsubscribed response', async () => {
    const ws = createClient();
    connect(server, ws);
    send(ws, { type: 'subscribe', channels: ['prices'] });
    await flushPromises();
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'unsubscribe', channels: ['prices'] });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('unsubscribed');
  });

  test('unsubscribe with single string channel → unsubscribed response', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'unsubscribe', channels: 'prices' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('unsubscribed');
  });

  // ── get-prices message ─────────────────────────────────────────────────────

  test('get-prices with explicit tokens array → prices response', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'get-prices', tokens: ['BTC', 'ETH'] });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('prices');
    expect(msg.data).toMatchObject({ BTC: 50000, ETH: 3000 });
  });

  test('get-prices without tokens uses default token set', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'get-prices' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('prices');
  });

  test('get-prices failure falls back to error message', async () => {
    mockFetchPrices.mockRejectedValueOnce(new Error('fetch-failed'));
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'get-prices', tokens: ['BTC'] });
    await flushPromises();

    expect((ws.send as jest.Mock).mock.calls[0][0]).toContain('Invalid message format');
  });

  // ── Unknown / invalid messages ─────────────────────────────────────────────

  test('unknown message type → error response with type info', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    send(ws, { type: 'UNSUPPORTED_OP' });
    await flushPromises();

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('error');
    expect(msg.message).toContain('UNSUPPORTED_OP');
  });

  test('malformed JSON → error with "Invalid message format"', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    (ws as any).emit('message', 'not-json{{{{');
    await flushPromises();

    expect((ws.send as jest.Mock).mock.calls[0][0]).toContain('Invalid message format');
  });

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  test('broadcastTradeUpdate sends trade-update to all connected clients', () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    server.broadcastTradeUpdate('user-1', { id: 'trade-42', profit: 500 });

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('trade-update');
    expect(msg.userId).toBe('user-1');
  });

  test('broadcastLeaderboardUpdate sends leaderboard-update', () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    server.broadcastLeaderboardUpdate([{ user: 'Alice', score: 9000 }]);

    const msg = JSON.parse((ws.send as jest.Mock).mock.calls[0][0]);
    expect(msg.type).toBe('leaderboard-update');
    expect(msg.data[0].user).toBe('Alice');
  });

  test('broadcast skips clients whose readyState is not OPEN', () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    (ws as any).readyState = 3; // CLOSED
    server.broadcastTradeUpdate('user-1', { id: 't0' });

    expect(ws.send).not.toHaveBeenCalled();
  });

  // ── Price-update subscription filtering ───────────────────────────────────

  test('client subscribed to "prices" receives price-update broadcast', async () => {
    const ws = createClient();
    connect(server, ws);
    send(ws, { type: 'subscribe', channels: ['prices'] });
    await flushPromises();
    (ws.send as jest.Mock).mockClear();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    const calls = (ws.send as jest.Mock).mock.calls;
    const hasPriceUpdate = calls.some(([m]) => m.includes('"price-update"'));
    expect(hasPriceUpdate).toBe(true);
  });

  test('client subscribed to "price:TOKEN" receives price-update broadcast', async () => {
    const ws = createClient();
    connect(server, ws);
    send(ws, { type: 'subscribe', channels: ['price:BTC'] });
    await flushPromises();
    (ws.send as jest.Mock).mockClear();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    const hasPriceUpdate = (ws.send as jest.Mock).mock.calls.some(([m]) =>
      m.includes('"price-update"')
    );
    expect(hasPriceUpdate).toBe(true);
  });

  test('client with unrelated subscription does NOT receive price-update', async () => {
    const ws = createClient();
    connect(server, ws);
    send(ws, { type: 'subscribe', channels: ['trade-feed'] });
    await flushPromises();
    (ws.send as jest.Mock).mockClear();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    const hasPriceUpdate = (ws.send as jest.Mock).mock.calls.some(([m]) =>
      m.includes('"price-update"')
    );
    expect(hasPriceUpdate).toBe(false);
  });

  test('client with no subscriptions receives price-update broadcast', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    jest.advanceTimersByTime(2000);
    await flushPromises();

    const hasPriceUpdate = (ws.send as jest.Mock).mock.calls.some(([m]) =>
      m.includes('"price-update"')
    );
    expect(hasPriceUpdate).toBe(true);
  });

  // ── Price update interval ──────────────────────────────────────────────────

  test('price update interval tracks price change relative to lastPrice', async () => {
    const ws = createClient();
    connect(server, ws);
    (ws.send as jest.Mock).mockClear();

    // First tick: BTC = 50000 (no lastPrice yet → change = 0)
    jest.advanceTimersByTime(2000);
    await flushPromises();

    // Second tick: BTC = 51000 (change should be 2%)
    mockFetchPrices.mockResolvedValueOnce(new Map([['BTC', 51000]]));
    jest.advanceTimersByTime(2000);
    await flushPromises();

    const priceCalls = (ws.send as jest.Mock).mock.calls
      .map(([m]) => JSON.parse(m))
      .filter((m) => m.type === 'price-update');

    expect(priceCalls.length).toBeGreaterThanOrEqual(2);
    const secondUpdate = priceCalls[1];
    expect(secondUpdate.data.BTC.price).toBe(51000);
    expect(Number(secondUpdate.data.BTC.changePercent)).toBeCloseTo(2, 0);
  });

  test('price update interval logs error and continues on fetch failure', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchPrices.mockRejectedValueOnce(new Error('api-down'));

    jest.advanceTimersByTime(2000);
    await flushPromises();

    expect(spy).toHaveBeenCalledWith('Price update error:', expect.any(Error));
    spy.mockRestore();

    // Service keeps running — next interval should succeed
    mockFetchPrices.mockResolvedValueOnce(new Map([['BTC', 50000]]));
    jest.advanceTimersByTime(2000);
    await flushPromises();
    expect(mockFetchPrices).toHaveBeenCalledTimes(2);
  });

  // ── Shutdown ───────────────────────────────────────────────────────────────

  test('shutdown clears the price-update interval', () => {
    const spy = jest.spyOn(global, 'clearInterval');
    server.shutdown();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('shutdown calls wss.close()', () => {
    server.shutdown();
    expect(internalWss(server).close).toHaveBeenCalled();
  });

  test('second shutdown with no active interval is safe (no throw)', () => {
    server.shutdown();
    expect(() => server.shutdown()).not.toThrow();
  });

  test('shutdown called before any price update interval is initialized', () => {
    // Create server and shut it down immediately before any interval ticks
    const earlyShutdown = new TradingWebSocketServer({} as Server);
    expect(() => earlyShutdown.shutdown()).not.toThrow();
  });

  test('broadcast with price-update to client with closed connection → client not sent', () => {
    const ws = createClient();
    connect(server, ws);
    send(ws, { type: 'subscribe', channels: ['prices'] });
    (ws as any).readyState = 3; // CLOSED before broadcast
    const callsBefore = (ws.send as jest.Mock).mock.calls.length;

    jest.advanceTimersByTime(2000);

    // No new messages sent to closed ws
    expect((ws.send as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});
