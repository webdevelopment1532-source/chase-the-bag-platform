// @ts-nocheck
import type { Express } from 'express';
import http from 'http';

describe('api helpers and routes', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...envBackup };
    process.env.API_AUTH_TOKEN = 'secret-token';
    process.env.API_ADMIN_ID = 'admin-1';
  });

  afterAll(() => {
    process.env = envBackup;
  });

  async function loadApiModule(overrides?: {
    dbExecute?: jest.Mock;
    logOperation?: jest.Mock;
    getCoinExchangeOverview?: jest.Mock;
    listCoinWallets?: jest.Mock;
    listCoinOffers?: jest.Mock;
    listCoinTransactions?: jest.Mock;
    getRagIndex?: jest.Mock;
    answerWithContext?: jest.Mock;
    queryRag?: jest.Mock;
  }) {
    jest.resetModules();

    const dbExecute = overrides?.dbExecute ?? jest.fn().mockResolvedValue([[], []]);
    const dbEnd = jest.fn().mockResolvedValue(undefined);
    const dbMock = { execute: dbExecute, end: dbEnd };
    const logOperation = overrides?.logOperation ?? jest.fn().mockResolvedValue(undefined);

    jest.doMock('../src/db', () => ({
      getDbConnection: jest.fn().mockResolvedValue(dbMock),
    }));

    jest.doMock('../src/audit-log', () => ({
      logOperation,
    }));

    jest.doMock('../src/coin-exchange', () => ({
      getCoinExchangeOverview: overrides?.getCoinExchangeOverview ?? jest.fn().mockResolvedValue({ totalWallets: 2 }),
      listCoinWallets: overrides?.listCoinWallets ?? jest.fn().mockResolvedValue([{ userId: 'u1' }]),
      listCoinOffers: overrides?.listCoinOffers ?? jest.fn().mockResolvedValue([{ id: 1 }]),
      listCoinTransactions: overrides?.listCoinTransactions ?? jest.fn().mockResolvedValue([{ id: 5 }]),
    }));

    jest.doMock('../src/rag', () => ({
      getRagIndex: overrides?.getRagIndex ?? jest.fn().mockResolvedValue({ chunksIndexed: 3 }),
      answerWithContext: overrides?.answerWithContext ?? jest.fn().mockResolvedValue({ answer: 'ok' }),
      queryRag: overrides?.queryRag ?? jest.fn().mockResolvedValue({ results: [] }),
    }));

    const api = await import('../src/api');
    return { api, dbExecute, dbEnd, logOperation };
  }

  async function makeRequest(app: Express, path: string, options?: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
  }) {
    const server = await new Promise<http.Server>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to bind test server');
      }

      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method: options?.method ?? 'GET',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json',
          ...(options?.headers ?? {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      const text = await response.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = text;
      }

      return { status: response.status, json };
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  }

  test('getProvidedToken prefers bearer token over x-api-key', async () => {
    const { api } = await loadApiModule();
    const req = {
      header: (name: string) => {
        if (name === 'authorization') return 'Bearer abc123';
        if (name === 'x-api-key') return 'fallback';
        return undefined;
      },
    } as any;

    expect(api.getProvidedToken(req)).toBe('abc123');
  });

  test('getProvidedToken falls back to x-api-key and then empty string', async () => {
    const { api } = await loadApiModule();
    expect(
      api.getProvidedToken({
        header: (name: string) => (name === 'x-api-key' ? 'key-123' : undefined),
      } as any)
    ).toBe('key-123');

    expect(
      api.getProvidedToken({
        header: () => undefined,
      } as any)
    ).toBe('');
  });

  test('getLimit clamps and floors values', async () => {
    const { api } = await loadApiModule();
    expect(api.getLimit(undefined, 5, 10)).toBe(5);
    expect(api.getLimit(0, 5, 10)).toBe(1);
    expect(api.getLimit(99, 5, 10)).toBe(10);
    expect(api.getLimit(4.9, 5, 10)).toBe(4);
  });

  test('authenticateApi returns 401 for invalid token', async () => {
    const { api } = await loadApiModule();
    const req = {
      header: () => 'Bearer wrong-token',
    } as any;
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const next = jest.fn();

    api.authenticateApi(req, { status, json } as any, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticateApi returns 503 when auth token is not configured', async () => {
    process.env.API_AUTH_TOKEN = '';
    const { api } = await loadApiModule();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    api.authenticateApi({ header: () => undefined } as any, { status, json } as any, jest.fn());

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: 'API authentication is not configured on server.' });
  });

  test('authenticateApi returns 503 when API_AUTH_TOKEN env is missing', async () => {
    delete process.env.API_AUTH_TOKEN;
    const { api } = await loadApiModule();
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();

    api.authenticateApi({ header: () => undefined } as any, { status, json } as any, jest.fn());

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ error: 'API authentication is not configured on server.' });
  });

  test('auditApiAccess falls back to API_ADMIN_ID when x-admin-user is absent', async () => {
    const { api, logOperation } = await loadApiModule();
    await api.auditApiAccess('api_action', {
      header: () => undefined,
      method: 'GET',
      path: '/api/test',
    } as any);

    expect(logOperation).toHaveBeenCalledWith({
      userId: 'admin-1',
      serverId: 'api',
      action: 'api_action',
      details: 'GET /api/test',
    });
  });

  test('auditApiAccess falls back to dashboard-admin when API_ADMIN_ID env is missing', async () => {
    delete process.env.API_ADMIN_ID;
    const { api, logOperation } = await loadApiModule();

    await api.auditApiAccess('api_action', {
      header: () => undefined,
      method: 'GET',
      path: '/api/default-admin',
    } as any);

    expect(logOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'dashboard-admin',
        details: 'GET /api/default-admin',
      })
    );
  });

  test('auditApiAccess uses x-admin-user when provided', async () => {
    const { api, logOperation } = await loadApiModule();
    await api.auditApiAccess('api_action', {
      header: (name: string) => (name === 'x-admin-user' ? 'owner-7' : undefined),
      method: 'PATCH',
      path: '/api/owner',
    } as any);

    expect(logOperation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-7', details: 'PATCH /api/owner' })
    );
  });

  test('auditApiAccess swallows logging failures', async () => {
    const { api } = await loadApiModule({
      logOperation: jest.fn().mockRejectedValue(new Error('audit failed')),
    });

    await expect(
      api.auditApiAccess('api_action', {
        header: () => 'root',
        method: 'POST',
        path: '/api/test',
      } as any)
    ).resolves.toBeUndefined();
  });

  test('leaderboard route returns rows for authorized request', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ user: 'alpha', score: 50 }], []]);
    const { api, dbEnd } = await loadApiModule({ dbExecute: execute });

    const response = await makeRequest(api.app, '/api/leaderboard?limit=7');

    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ user: 'alpha', score: 50 }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT user, score FROM leaderboard ORDER BY score DESC LIMIT ?',
      [7]
    );
    expect(dbEnd).toHaveBeenCalledTimes(1);
  });

  test('game-results route rejects invalid game filter', async () => {
    const { api } = await loadApiModule();
    const response = await makeRequest(api.app, '/api/game-results?game=badgame');

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Invalid game filter.' });
  });

  test('game-results route uses filtered query for valid game', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ game: 'dice' }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/game-results?game=dice&limit=3');

    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ game: 'dice' }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT id, user, game, result, score, created_at FROM game_results WHERE game = ? ORDER BY created_at DESC LIMIT ?',
      ['dice', 3]
    );
  });

  test('game-results route uses unfiltered query when game is omitted', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ game: 'blackjack' }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/game-results');

    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ game: 'blackjack' }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT id, user, game, result, score, created_at FROM game_results ORDER BY created_at DESC LIMIT ?',
      [100]
    );
  });

  test('game-results route returns 500 on db failure', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('game results failed'));
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/game-results');

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: 'game results failed' });
  });

  test('affiliates route rejects invalid status filter', async () => {
    const { api } = await loadApiModule();
    const response = await makeRequest(api.app, '/api/affiliates?status=bogus');

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Invalid affiliate status filter.' });
  });

  test('affiliates route returns filtered rows for valid status', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ user_id: 'u1', status: 'active' }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/affiliates?status=active');

    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ user_id: 'u1', status: 'active' }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates WHERE status = ? ORDER BY requested_at DESC',
      ['active']
    );
  });

  test('affiliates route uses unfiltered query when status is omitted', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ user_id: 'u2', status: 'pending' }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/affiliates');

    expect(response.status).toBe(200);
    expect(response.json).toEqual([{ user_id: 'u2', status: 'pending' }]);
    expect(execute).toHaveBeenCalledWith(
      'SELECT user_id, status, requested_at, approved_at, approved_by FROM affiliates ORDER BY requested_at DESC'
    );
  });

  test('affiliates route returns 500 on db failure', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('affiliates failed'));
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/affiliates');

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: 'affiliates failed' });
  });

  test('codes and audit-log routes return rows with clamped limits', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ code: 'ABC' }], []])
      .mockResolvedValueOnce([[{ action: 'view' }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });

    const codesResponse = await makeRequest(api.app, '/api/codes?limit=999');
    const auditResponse = await makeRequest(api.app, '/api/audit-log?limit=0');

    expect(codesResponse.status).toBe(200);
    expect(codesResponse.json).toEqual([{ code: 'ABC' }]);
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.json).toEqual([{ action: 'view' }]);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      'SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT ?',
      [500]
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      'SELECT id, user_id, server_id, action, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [1]
    );
  });

  test('codes and audit-log routes return 500 on db failure', async () => {
    const { api: codesApi } = await loadApiModule({
      dbExecute: jest.fn().mockRejectedValue(new Error('codes failed')),
    });
    const codesResponse = await makeRequest(codesApi.app, '/api/codes');
    expect(codesResponse.status).toBe(500);
    expect(codesResponse.json).toEqual({ error: 'codes failed' });

    const { api: auditApi } = await loadApiModule({
      dbExecute: jest.fn().mockRejectedValue(new Error('audit log failed')),
    });
    const auditResponse = await makeRequest(auditApi.app, '/api/audit-log');
    expect(auditResponse.status).toBe(500);
    expect(auditResponse.json).toEqual({ error: 'audit log failed' });
  });

  test('stats route returns summary payload', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ total: 10 }], []])
      .mockResolvedValueOnce([[{ total: 20 }], []])
      .mockResolvedValueOnce([[{ total: 2 }], []])
      .mockResolvedValueOnce([[{ total: 8 }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/stats');

    expect(response.status).toBe(200);
    expect(response.json).toEqual({ players: 10, games: 20, affiliates: 2, codes: 8 });
  });

  test('stats route returns 500 when db query fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('stats failed'));
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/stats');

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: 'stats failed' });
  });

  test('overview route returns analytics payload with timestamp', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[{ total: 2 }], []])
      .mockResolvedValueOnce([[{ total: 3 }], []])
      .mockResolvedValueOnce([[{ total: 4 }], []])
      .mockResolvedValueOnce([[{ game: 'dice', total: 9 }], []])
      .mockResolvedValueOnce([[{ result: 'win', total: 8 }], []])
      .mockResolvedValueOnce([[{ day: '2026-04-01', total: 7 }], []]);
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/overview');

    expect(response.status).toBe(200);
    expect(response.json).toEqual(
      expect.objectContaining({
        stats: { players: 1, games: 2, affiliates: 3, codes: 4 },
        gameMix: [{ game: 'dice', total: 9 }],
        resultMix: [{ result: 'win', total: 8 }],
        dailyGames: [{ day: '2026-04-01', total: 7 }],
        lastUpdated: expect.any(String),
      })
    );
  });

  test('overview route returns 500 when overview query fails', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('overview failed'));
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/overview');

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: 'overview failed' });
  });

  test('exchange routes return mocked integration payloads', async () => {
    const getCoinExchangeOverview = jest.fn().mockResolvedValue({ totalWallets: 2 });
    const listCoinWallets = jest.fn().mockResolvedValue([{ userId: 'wallet-1' }]);
    const listCoinOffers = jest.fn().mockResolvedValue([{ id: 9, status: 'open' }]);
    const listCoinTransactions = jest.fn().mockResolvedValue([{ id: 5, userId: 'u1' }]);
    const { api } = await loadApiModule({
      getCoinExchangeOverview,
      listCoinWallets,
      listCoinOffers,
      listCoinTransactions,
    });

    const overview = await makeRequest(api.app, '/api/exchange/overview');
    const wallets = await makeRequest(api.app, '/api/exchange/wallets?limit=0');
    const offers = await makeRequest(api.app, '/api/exchange/offers?status=open&limit=999');
    const transactions = await makeRequest(api.app, '/api/exchange/transactions?userId=user-1&limit=3');

    expect(overview.json).toEqual({ totalWallets: 2 });
    expect(wallets.json).toEqual([{ userId: 'wallet-1' }]);
    expect(offers.json).toEqual([{ id: 9, status: 'open' }]);
    expect(transactions.json).toEqual([{ id: 5, userId: 'u1' }]);
    expect(listCoinWallets).toHaveBeenCalledWith(1);
    expect(listCoinOffers).toHaveBeenCalledWith(500, 'open');
    expect(listCoinTransactions).toHaveBeenCalledWith(3, 'user-1');
  });

  test('exchange routes return 500 when integrations fail', async () => {
    const { api: overviewApi } = await loadApiModule({
      getCoinExchangeOverview: jest.fn().mockRejectedValue(new Error('overview integration failed')),
    });
    const overview = await makeRequest(overviewApi.app, '/api/exchange/overview');
    expect(overview.status).toBe(500);
    expect(overview.json).toEqual({ error: 'overview integration failed' });

    const { api: walletsApi } = await loadApiModule({
      listCoinWallets: jest.fn().mockRejectedValue(new Error('wallets failed')),
    });
    const wallets = await makeRequest(walletsApi.app, '/api/exchange/wallets');
    expect(wallets.status).toBe(500);
    expect(wallets.json).toEqual({ error: 'wallets failed' });

    const { api: offersApi } = await loadApiModule({
      listCoinOffers: jest.fn().mockRejectedValue(new Error('offers failed')),
    });
    const offers = await makeRequest(offersApi.app, '/api/exchange/offers');
    expect(offers.status).toBe(500);
    expect(offers.json).toEqual({ error: 'offers failed' });

    const { api: txApi } = await loadApiModule({
      listCoinTransactions: jest.fn().mockRejectedValue(new Error('transactions failed')),
    });
    const transactions = await makeRequest(txApi.app, '/api/exchange/transactions');
    expect(transactions.status).toBe(500);
    expect(transactions.json).toEqual({ error: 'transactions failed' });
  });

  test('coin exchange offers route rejects invalid status', async () => {
    const { api } = await loadApiModule();
    const response = await makeRequest(api.app, '/api/exchange/offers?status=weird');

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Invalid offer status filter.' });
  });

  test('rag query route rejects missing query body', async () => {
    const { api } = await loadApiModule();
    const response = await makeRequest(api.app, '/api/rag/query', { method: 'POST', body: {} });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Missing query string in request body.' });
  });

  test('rag routes return success payloads and clamp topK', async () => {
    const getRagIndex = jest.fn().mockResolvedValue({ chunksIndexed: 7 });
    const answerWithContext = jest.fn().mockResolvedValue({ answer: 'contextual' });
    const queryRag = jest.fn().mockResolvedValue({ results: [{ id: '1' }] });
    const { api } = await loadApiModule({ getRagIndex, answerWithContext, queryRag });

    const indexResponse = await makeRequest(api.app, '/api/rag/index?refresh=true');
    const queryResponse = await makeRequest(api.app, '/api/rag/query', {
      method: 'POST',
      body: { query: 'hello', topK: 999 },
    });
    const retrieveResponse = await makeRequest(api.app, '/api/rag/retrieve?query=hello&topK=0');

    expect(indexResponse.status).toBe(200);
    expect(indexResponse.json).toEqual({ ok: true, stats: { chunksIndexed: 7 } });
    expect(queryResponse.json).toEqual({ answer: 'contextual' });
    expect(retrieveResponse.json).toEqual({ results: [{ id: '1' }] });
    expect(getRagIndex).toHaveBeenCalledWith(true);
    expect(answerWithContext).toHaveBeenCalledWith('hello', 10);
    expect(queryRag).toHaveBeenCalledWith('hello', 1);
  });

  test('rag routes return 500 when backing services fail', async () => {
    const { api: indexApi } = await loadApiModule({
      getRagIndex: jest.fn().mockRejectedValue(new Error('index failed')),
    });
    const indexResponse = await makeRequest(indexApi.app, '/api/rag/index');
    expect(indexResponse.status).toBe(500);
    expect(indexResponse.json).toEqual({ error: 'index failed' });

    const { api: queryApi } = await loadApiModule({
      answerWithContext: jest.fn().mockRejectedValue(new Error('query failed')),
    });
    const queryResponse = await makeRequest(queryApi.app, '/api/rag/query', {
      method: 'POST',
      body: { query: 'hello' },
    });
    expect(queryResponse.status).toBe(500);
    expect(queryResponse.json).toEqual({ error: 'query failed' });

    const { api: retrieveApi } = await loadApiModule({
      queryRag: jest.fn().mockRejectedValue(new Error('retrieve failed')),
    });
    const retrieveResponse = await makeRequest(retrieveApi.app, '/api/rag/retrieve?query=hello');
    expect(retrieveResponse.status).toBe(500);
    expect(retrieveResponse.json).toEqual({ error: 'retrieve failed' });
  });

  test('rag retrieve route rejects missing query parameter', async () => {
    const { api } = await loadApiModule();
    const response = await makeRequest(api.app, '/api/rag/retrieve');

    expect(response.status).toBe(400);
    expect(response.json).toEqual({ error: 'Missing query parameter.' });
  });

  test('leaderboard route returns 500 on db failure', async () => {
    const execute = jest.fn().mockRejectedValue(new Error('db down'));
    const { api } = await loadApiModule({ dbExecute: execute });
    const response = await makeRequest(api.app, '/api/leaderboard');

    expect(response.status).toBe(500);
    expect(response.json).toEqual({ error: 'db down' });
  });

  test('startApiServer listens on provided port', async () => {
    const { api } = await loadApiModule();
    const listen = jest.spyOn(api.app, 'listen').mockImplementation(((port: number, callback?: () => void) => {
      callback?.();
      return { close: jest.fn() } as any;
    }) as any);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    api.startApiServer(4010);

    expect(listen).toHaveBeenCalledWith(4010, expect.any(Function));
    expect(consoleSpy).toHaveBeenCalledWith('API server running on http://localhost:4010');

    listen.mockRestore();
    consoleSpy.mockRestore();
  });

  test('startApiServer listens on default port when omitted', async () => {
    const { api } = await loadApiModule();
    const listen = jest.spyOn(api.app, 'listen').mockImplementation(((port: number, callback?: () => void) => {
      callback?.();
      return { close: jest.fn() } as any;
    }) as any);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    api.startApiServer();

    expect(listen).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(consoleSpy).toHaveBeenCalledWith('API server running on http://localhost:3001');

    listen.mockRestore();
    consoleSpy.mockRestore();
  });
});
