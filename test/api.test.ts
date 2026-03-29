jest.mock('../src/db');
jest.mock('../src/audit-log');

jest.setTimeout(20000);

import request from 'supertest';
import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';
import { app, startApiServer } from '../src/api';

const mockExecute = jest.fn();
const mockEnd = jest.fn().mockResolvedValue(undefined);
const mockConn = { execute: mockExecute, end: mockEnd };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;
const mockLog = logOperation as jest.MockedFunction<typeof logOperation>;

const AUTH_TOKEN = 'test-token-abc';
const CRAWLER_KEY = 'ctb-crawler-key-123';

beforeAll(() => {
  process.env.API_AUTH_TOKEN = AUTH_TOKEN;
  process.env.API_ADMIN_ID = 'dashboard-admin';
  process.env.API_ADMIN_IDS = 'dashboard-admin,security-admin';
  process.env.CTB_CRAWLER_USER_AGENT = 'ChaseTheBagCrawler';
  process.env.CTB_CRAWLER_KEY = CRAWLER_KEY;
  process.env.CTB_CRAWLER_ALLOWED_IPS = '127.0.0.1,::1,::ffff:127.0.0.1';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  mockLog.mockResolvedValue(undefined);
});

// ---- Auth middleware ----
describe('API authentication', () => {
  test('blocks non-approved crawler user-agent', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Googlebot/2.1');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Crawler access is forbidden');
  });

  test('allows approved Chase The Bag crawler identity', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', CRAWLER_KEY);
    expect(res.status).toBe(200);
  });

  test('blocks crawler when IP is not allowlisted', async () => {
    const savedIps = process.env.CTB_CRAWLER_ALLOWED_IPS;
    process.env.CTB_CRAWLER_ALLOWED_IPS = '10.0.0.9';
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', CRAWLER_KEY);
    expect(res.status).toBe(403);
    process.env.CTB_CRAWLER_ALLOWED_IPS = savedIps;
  });

  test('returns 503 when API_AUTH_TOKEN is not configured', async () => {
    const saved = process.env.API_AUTH_TOKEN;
    delete process.env.API_AUTH_TOKEN;
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(503);
    process.env.API_AUTH_TOKEN = saved;
  });

  test('returns 401 when no auth headers are provided', async () => {
    const res = await request(app).get('/api/leaderboard');
    expect(res.status).toBe(401);
  });

  test('rejects CTB crawler when CTB_CRAWLER_USER_AGENT and CTB_CRAWLER_KEY env vars are absent', async () => {
    const savedUa = process.env.CTB_CRAWLER_USER_AGENT;
    const savedKey = process.env.CTB_CRAWLER_KEY;
    delete process.env.CTB_CRAWLER_USER_AGENT;
    delete process.env.CTB_CRAWLER_KEY;
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler');
    expect(res.status).toBe(403);
    process.env.CTB_CRAWLER_USER_AGENT = savedUa!;
    process.env.CTB_CRAWLER_KEY = savedKey!;
  });

  test('allows CTB crawler when CTB_CRAWLER_ALLOWED_IPS is not configured', async () => {
    const savedIps = process.env.CTB_CRAWLER_ALLOWED_IPS;
    delete process.env.CTB_CRAWLER_ALLOWED_IPS;
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`)
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', CRAWLER_KEY);
    expect(res.status).toBe(200);
    process.env.CTB_CRAWLER_ALLOWED_IPS = savedIps!;
  });

  test('returns 401 with wrong bearer token', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer wrong-token');
    expect(res.status).toBe(401);
  });

  test('returns 401 with wrong x-api-key', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set('x-api-key', 'bad-key');
    expect(res.status).toBe(401);
  });

  test('accepts valid bearer token', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${AUTH_TOKEN}`);
    expect(res.status).toBe(200);
  });

  test('accepts valid x-api-key header', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .get('/api/leaderboard')
      .set('x-api-key', AUTH_TOKEN);
    expect(res.status).toBe(200);
  });
});

// ---- GET /api/leaderboard ----
describe('GET /api/leaderboard', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/leaderboard')
      .set(auth)
      .set('x-admin-user', 'random-user');
    expect(res.status).toBe(403);
  });

  test('returns leaderboard rows', async () => {
    const rows = [{ user: 'alice', score: 100 }];
    mockExecute.mockResolvedValueOnce([rows]);
    const res = await request(app).get('/api/leaderboard').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('clamps limit to 500', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await request(app).get('/api/leaderboard?limit=9999').set(auth);
    const limit = mockExecute.mock.calls[0][1][0];
    expect(limit).toBe(500);
  });

  test('clamps limit minimum to 1', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await request(app).get('/api/leaderboard?limit=-5').set(auth);
    const limit = mockExecute.mock.calls[0][1][0];
    expect(limit).toBe(1);
  });

  test('floors non-integer numeric limit values', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await request(app).get('/api/leaderboard?limit=9.9').set(auth);
    const limit = mockExecute.mock.calls[0][1][0];
    expect(limit).toBe(9);
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).get('/api/leaderboard').set(auth);
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

// ---- GET /api/game-results ----
describe('GET /api/game-results', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/game-results')
      .set(auth)
      .set('x-admin-user', 'non-admin');
    expect(res.status).toBe(403);
  });

  test('returns game results', async () => {
    const rows = [{ id: 1, user: 'bob', game: 'dice', result: 'win', score: 5 }];
    mockExecute.mockResolvedValueOnce([rows]);
    const res = await request(app).get('/api/game-results').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('filters by valid game type', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/game-results?game=dice').set(auth);
    expect(res.status).toBe(200);
    expect(mockExecute.mock.calls[0][1]).toContain('dice');
  });

  test('returns 400 for invalid game filter', async () => {
    const res = await request(app).get('/api/game-results?game=<script>').set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid game');
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).get('/api/game-results').set(auth);
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/affiliates ----
describe('GET /api/affiliates', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/affiliates')
      .set(auth)
      .set('x-admin-user', 'random-user');
    expect(res.status).toBe(403);
  });

  test('returns all affiliates', async () => {
    const rows = [{ user_id: 'u1', status: 'active' }];
    mockExecute.mockResolvedValueOnce([rows]);
    const res = await request(app).get('/api/affiliates').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('filters by valid affiliate status', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/affiliates?status=active').set(auth);
    expect(res.status).toBe(200);
    expect(mockExecute.mock.calls[0][1]).toContain('active');
  });

  test('returns 400 for invalid status filter', async () => {
    const res = await request(app).get('/api/affiliates?status=hacked').set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid');
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('db fail'));
    const res = await request(app).get('/api/affiliates').set(auth);
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/codes ----
describe('GET /api/codes', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/codes')
      .set(auth)
      .set('x-admin-user', 'intruder');
    expect(res.status).toBe(403);
  });

  test('returns codes', async () => {
    const rows = [{ code: 'ABC', source: 'stake.us' }];
    mockExecute.mockResolvedValueOnce([rows]);
    const res = await request(app).get('/api/codes').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('falls back to default code limit for non-numeric query values', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/codes?limit=abc').set(auth);
    expect(res.status).toBe(200);
    expect(mockExecute.mock.calls[0][1][0]).toBe(100);
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/codes').set(auth);
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/crawler-status ----
describe('GET /api/crawler-status', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/crawler-status')
      .set(auth)
      .set('x-admin-user', 'intruder');
    expect(res.status).toBe(403);
  });

  test('returns crawler status payload for admin users', async () => {
    const res = await request(app)
      .get('/api/crawler-status')
      .set(auth)
      .set('x-admin-user', 'dashboard-admin');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('active');
    expect(res.body).toHaveProperty('running');
    expect(res.body).toHaveProperty('totalRuns');
    expect(res.body).toHaveProperty('totalCodesFound');
    expect(res.body).toHaveProperty('consecutiveFailures');
  });

  test('returns 500 when crawler status provider throws', async () => {
    const crawlerService = require('../src/crawler-service');
    const statusSpy = jest
      .spyOn(crawlerService, 'getStakeCrawlerStatus')
      .mockImplementation(() => {
        throw new Error('crawler status fail');
      });

    const res = await request(app)
      .get('/api/crawler-status')
      .set(auth)
      .set('x-admin-user', 'dashboard-admin');

    expect(res.status).toBe(500);
    statusSpy.mockRestore();
  });
});

// ---- GET /api/audit-log ----
describe('GET /api/audit-log', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/audit-log')
      .set(auth)
      .set('x-admin-user', 'intruder');
    expect(res.status).toBe(403);
  });

  test('returns audit log entries', async () => {
    const rows = [{ id: 1, user_id: 'u1', action: 'test' }];
    mockExecute.mockResolvedValueOnce([rows]);
    const res = await request(app).get('/api/audit-log').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/audit-log').set(auth);
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/stats ----
describe('GET /api/stats', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/stats')
      .set(auth)
      .set('x-admin-user', 'not-admin');
    expect(res.status).toBe(403);
  });

  test('returns platform stats', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: 10 }]])
      .mockResolvedValueOnce([[{ total: 20 }]])
      .mockResolvedValueOnce([[{ total: 5 }]])
      .mockResolvedValueOnce([[{ total: 15 }]]);
    const res = await request(app).get('/api/stats').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ players: 10, games: 20, affiliates: 5, codes: 15 });
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/stats').set(auth);
    expect(res.status).toBe(500);
  });
});

// ---- GET /api/overview ----
describe('GET /api/overview', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns 403 when requester is not an API admin', async () => {
    const res = await request(app)
      .get('/api/overview')
      .set(auth)
      .set('x-admin-user', 'non-admin');
    expect(res.status).toBe(403);
  });

  test('returns overview with stats, gameMix, resultMix and dailyGames', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ total: 1 }]])  // players
      .mockResolvedValueOnce([[{ total: 2 }]])  // games
      .mockResolvedValueOnce([[{ total: 3 }]])  // affiliates
      .mockResolvedValueOnce([[{ total: 4 }]])  // codes
      .mockResolvedValueOnce([[]])               // gameMix
      .mockResolvedValueOnce([[]])               // resultMix
      .mockResolvedValueOnce([[]])               // dailyRows
    const res = await request(app).get('/api/overview').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body).toHaveProperty('gameMix');
    expect(res.body).toHaveProperty('resultMix');
    expect(res.body).toHaveProperty('dailyGames');
    expect(res.body).toHaveProperty('lastUpdated');
  });

  test('returns 500 on DB error', async () => {
    mockExecute.mockRejectedValueOnce(new Error('fail'));
    const res = await request(app).get('/api/overview').set(auth);
    expect(res.status).toBe(500);
  });
});

describe('startApiServer', () => {
  test('invokes app.listen and logs startup URL', () => {
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation(((port: any, cb?: any) => {
      if (typeof cb === 'function') cb();
      return { close: jest.fn() } as any;
    }) as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    startApiServer(4321);

    expect(listenSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('API server running on http://localhost:4321');

    listenSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('uses default port when no argument is provided', () => {
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation(((port: any, cb?: any) => {
      if (typeof cb === 'function') cb();
      return { close: jest.fn() } as any;
    }) as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    startApiServer();

    expect(listenSpy).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(logSpy).toHaveBeenCalledWith('API server running on http://localhost:3001');

    listenSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('Community and check-in endpoints', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('GET /api/community/leaderboard defaults category and clamps limit', async () => {
    const leaderboardModule = require('../src/leaderboard');
    const spy = jest.spyOn(leaderboardModule, 'getLeaderboard').mockResolvedValueOnce([{ userId: 'u1' }]);

    const res = await request(app)
      .get('/api/community/leaderboard?category=invalid&limit=999')
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(spy).toHaveBeenCalledWith('points', 50);
    spy.mockRestore();
  });

  test('GET /api/checkin/status requires user id and handles provider failure', async () => {
    const missing = await request(app)
      .get('/api/checkin/status')
      .set(auth);
    expect(missing.status).toBe(400);

    const checkinModule = require('../src/checkin');
    const spy = jest.spyOn(checkinModule, 'getCheckinStatus').mockRejectedValueOnce(new Error('down'));
    const fail = await request(app)
      .get('/api/checkin/status?userId=u1')
      .set(auth);

    expect(fail.status).toBe(200);
    expect(fail.body.success).toBe(true);
    expect(fail.body.data).toBeNull();
    spy.mockRestore();
  });

  test('POST /api/checkin returns success payload with achievements and handles failed check-in', async () => {
    const checkinModule = require('../src/checkin');
    const achievementModule = require('../src/achievements');

    const checkinSpy = jest.spyOn(checkinModule, 'performCheckin').mockResolvedValueOnce({
      success: true,
      message: 'ok',
      pointsAwarded: 10,
      currentStreak: 2,
      longestStreak: 3,
      totalCheckins: 4,
      alreadyCheckedIn: false,
    });
    const achSpy = jest.spyOn(achievementModule, 'checkAndAwardAchievements').mockResolvedValueOnce([{ name: 'A' }]);

    const ok = await request(app)
      .post('/api/checkin')
      .set(auth)
      .set('x-user-id', 'u1')
      .send({});

    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data.newAchievements).toEqual([{ name: 'A' }]);

    checkinSpy.mockResolvedValueOnce({
      success: false,
      message: 'broken',
      pointsAwarded: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,
      alreadyCheckedIn: false,
    });

    const fail = await request(app)
      .post('/api/checkin')
      .set(auth)
      .set('x-user-id', 'u1')
      .send({});

    expect(fail.status).toBe(500);
    expect(fail.body.success).toBe(false);

    checkinSpy.mockRestore();
    achSpy.mockRestore();
  });

  test('GET /api/achievements requires user id and returns fallback empty earned list', async () => {
    const missing = await request(app)
      .get('/api/achievements')
      .set(auth);
    expect(missing.status).toBe(400);

    const achievementModule = require('../src/achievements');
    const spy = jest.spyOn(achievementModule, 'getEarnedAchievements').mockRejectedValueOnce(new Error('down'));

    const res = await request(app)
      .get('/api/achievements?userId=u1')
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.earned).toEqual([]);
    spy.mockRestore();
  });
});

describe('Degraded mode fallbacks', () => {
  const auth = { 'Authorization': `Bearer ${AUTH_TOKEN}` };

  test('returns degraded payloads for db connection errors when not in test env', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    mockExecute.mockRejectedValue(new Error('ECONNREFUSED db down'));

    const stats = await request(app).get('/api/stats').set(auth);
    const overview = await request(app).get('/api/overview').set(auth);
    const audit = await request(app).get('/api/audit-log').set(auth);
    const affiliates = await request(app).get('/api/affiliates').set(auth);
    const games = await request(app).get('/api/game-results').set(auth);
    const leaderboard = await request(app).get('/api/leaderboard').set(auth);
    const codes = await request(app).get('/api/codes').set(auth);

    expect(stats.status).toBe(200);
    expect(stats.body.degraded).toBe(true);
    expect(overview.status).toBe(200);
    expect(overview.body.degraded).toBe(true);
    expect(audit.status).toBe(200);
    expect(audit.body).toEqual([]);
    expect(affiliates.status).toBe(200);
    expect(affiliates.body).toEqual([]);
    expect(games.status).toBe(200);
    expect(games.body).toEqual([]);
    expect(leaderboard.status).toBe(200);
    expect(leaderboard.body).toEqual([]);
    expect(codes.status).toBe(200);
    expect(codes.body).toEqual([]);

    process.env.NODE_ENV = prev;
  });
});

describe('Public root/health routes', () => {
  test('GET / and /healthz return ok payloads', async () => {
    const root = await request(app).get('/');
    const health = await request(app).get('/healthz');

    expect(root.status).toBe(200);
    expect(root.body).toMatchObject({ service: 'discord-game-server-api', status: 'ok' });
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });
});
