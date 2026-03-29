import request from 'supertest';

jest.setTimeout(30000);

type EnvInput = Record<string, string | undefined>;

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

function loadApi(overrides: {
  env?: EnvInput;
  executeImpl?: jest.Mock;
  getLeaderboardImpl?: jest.Mock;
  getCheckinStatusImpl?: jest.Mock;
  performCheckinImpl?: jest.Mock;
  checkAndAwardAchievementsImpl?: jest.Mock;
  getEarnedAchievementsImpl?: jest.Mock;
} = {}) {
  jest.resetModules();

  const env: EnvInput = {
    API_AUTH_TOKEN: 'mutation-token',
    API_ADMIN_ID: 'dashboard-admin',
    API_ADMIN_IDS: 'dashboard-admin',
    CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
    CTB_CRAWLER_KEY: 'crawler-key',
    CTB_CRAWLER_ALLOWED_IPS: '',
    CTB_TRUST_PROXY: undefined,
    CTB_CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
    ...(overrides.env ?? {}),
  };

  Object.entries(env).forEach(([key, value]) => setEnv(key, value));

  const mockExecute = overrides.executeImpl ?? jest.fn().mockResolvedValue([[]]);
  const mockEnd = jest.fn().mockResolvedValue(undefined);
  const mockGetLeaderboard = overrides.getLeaderboardImpl ?? jest.fn().mockResolvedValue([]);
  const mockGetCheckinStatus = overrides.getCheckinStatusImpl ?? jest.fn().mockResolvedValue({ alreadyCheckedIn: false });
  const mockPerformCheckin = overrides.performCheckinImpl
    ?? jest.fn().mockResolvedValue({ success: true, message: 'ok', pointsAwarded: 5, currentStreak: 2, longestStreak: 3, totalCheckins: 10, alreadyCheckedIn: false });
  const mockCheckAndAwardAchievements = overrides.checkAndAwardAchievementsImpl ?? jest.fn().mockResolvedValue([]);
  const mockGetEarnedAchievements = overrides.getEarnedAchievementsImpl ?? jest.fn().mockResolvedValue([]);

  jest.doMock('../src/db', () => ({
    getDbConnection: jest.fn().mockResolvedValue({ execute: mockExecute, end: mockEnd }),
  }));
  jest.doMock('../src/audit-log', () => ({
    logOperation: jest.fn().mockResolvedValue(undefined),
  }));
  jest.doMock('../src/crawler-service', () => ({
    getStakeCrawlerStatus: jest.fn().mockReturnValue({ status: 'ok' }),
  }));
  jest.doMock('../src/leaderboard', () => ({
    getLeaderboard: mockGetLeaderboard,
  }));
  jest.doMock('../src/checkin', () => ({
    getCheckinStatus: mockGetCheckinStatus,
    performCheckin: mockPerformCheckin,
  }));
  jest.doMock('../src/achievements', () => ({
    ALL_ACHIEVEMENTS: [{ id: 'a1' }, { id: 'a2' }],
    checkAndAwardAchievements: mockCheckAndAwardAchievements,
    getEarnedAchievements: mockGetEarnedAchievements,
  }));

  const api = require('../src/api');
  return {
    app: api.app,
    mocks: {
      mockExecute,
      mockGetLeaderboard,
      mockGetCheckinStatus,
      mockPerformCheckin,
      mockCheckAndAwardAchievements,
      mockGetEarnedAchievements,
    },
  };
}

describe('api mutation targets', () => {
  test('parses CTB_TRUST_PROXY using trim and lowercase checks', () => {
    const { app: appOn } = loadApi({ env: { CTB_TRUST_PROXY: '  ON  ' } });
    expect(appOn.get('trust proxy')).toBe(true);

    const { app: appOff } = loadApi({ env: { CTB_TRUST_PROXY: '  0  ' } });
    expect(appOff.get('trust proxy')).toBe(false);
  });

  test('accepts allowed CORS origin from trimmed env list', async () => {
    const { app } = loadApi({ env: { CTB_CORS_ORIGINS: ' http://good.test , , http://localhost:5173 ' } });

    const res = await request(app)
      .options('/api/overview')
      .set('Origin', 'http://good.test')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://good.test');
  });

  test('auth accepts bearer and x-api-key when token/header values include whitespace', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([[]]);
    const { app } = loadApi({ env: { API_AUTH_TOKEN: 'token-space' }, executeImpl: execute });

    const bearer = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer token-space   ')
      .set('x-admin-user', 'dashboard-admin');

    const apiKey = await request(app)
      .get('/api/leaderboard')
      .set('x-api-key', 'token-space   ')
      .set('x-admin-user', 'dashboard-admin');

    expect(bearer.status).toBe(200);
    expect(apiKey.status).toBe(200);
  });

  test('auth bearer parser trims internal leading spaces after Bearer prefix', async () => {
    const { app } = loadApi({ env: { API_AUTH_TOKEN: 'mutation-token' } });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer    mutation-token')
      .set('x-admin-user', 'dashboard-admin');

    expect(res.status).toBe(200);
  });

  test('auth accepts configured token with trailing whitespace in env', async () => {
    const { app } = loadApi({ env: { API_AUTH_TOKEN: 'mutation-token   ' } });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('x-api-key', 'mutation-token')
      .set('x-admin-user', 'dashboard-admin');

    expect(res.status).toBe(200);
  });

  test('admin identity and configured admin list are trimmed', async () => {
    const { app } = loadApi({
      env: {
        API_ADMIN_IDS: ' dashboard-admin , security-admin , ',
      },
    });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', ' security-admin ');

    expect(res.status).toBe(200);
  });

  test('crawler approval trims UA/key and normalizes trusted proxy IP', async () => {
    const { app } = loadApi({
      env: {
        CTB_TRUST_PROXY: '1',
        CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler   ',
        CTB_CRAWLER_ALLOWED_IPS: '127.0.0.1',
      },
    });

    const ok = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'crawler-key   ')
      .set('X-Forwarded-For', '::ffff:127.0.0.1   ');

    const spoofed = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'crawler-key')
      .set('X-Forwarded-For', 'abc::ffff:127.0.0.1');

    expect(ok.status).toBe(200);
    expect(spoofed.status).toBe(403);
  });

  test('crawler config trims allowed IPs from env list', async () => {
    const { app } = loadApi({
      env: {
        CTB_TRUST_PROXY: '1',
        CTB_CRAWLER_ALLOWED_IPS: ' 127.0.0.1 ',
      },
    });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'crawler-key')
      .set('X-Forwarded-For', '::ffff:127.0.0.1');

    expect(res.status).toBe(200);
  });

  test('crawler config trims key value from env', async () => {
    const { app } = loadApi({
      env: {
        CTB_CRAWLER_KEY: 'crawler-key   ',
      },
    });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'crawler-key');

    expect(res.status).toBe(200);
  });

  test('configured auth token is trimmed before comparison', async () => {
    const { app } = loadApi({ env: { API_AUTH_TOKEN: 'token-trim   ' } });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer token-trim')
      .set('x-admin-user', 'dashboard-admin');

    expect(res.status).toBe(200);
  });

  test('game and affiliate status filters accept trimmed query values', async () => {
    const execute = jest.fn().mockResolvedValue([[]]);
    const { app } = loadApi({ executeImpl: execute });

    const game = await request(app)
      .get('/api/game-results?game= dice ')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin');

    const affiliate = await request(app)
      .get('/api/affiliates?status= active ')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-admin-user', 'dashboard-admin');

    expect(game.status).toBe(200);
    expect(affiliate.status).toBe(200);
  });

  test('community leaderboard clamps limit and defaults category', async () => {
    const getLeaderboardImpl = jest.fn().mockResolvedValue([]);
    const { app, mocks } = loadApi({ getLeaderboardImpl });

    const high = await request(app)
      .get('/api/community/leaderboard?category=unknown&limit=999')
      .set('Authorization', 'Bearer mutation-token');

    const low = await request(app)
      .get('/api/community/leaderboard?category=profit&limit=0')
      .set('Authorization', 'Bearer mutation-token');

    expect(high.status).toBe(200);
    expect(low.status).toBe(200);
    expect(mocks.mockGetLeaderboard.mock.calls[0]).toEqual(['points', 50]);
    expect(mocks.mockGetLeaderboard.mock.calls[1]).toEqual(['profit', 1]);
  });

  test('community leaderboard returns empty data when provider throws', async () => {
    const getLeaderboardImpl = jest.fn().mockRejectedValue(new Error('down'));
    const { app } = loadApi({ getLeaderboardImpl });

    const res = await request(app)
      .get('/api/community/leaderboard?category=points&limit=10')
      .set('Authorization', 'Bearer mutation-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  test('api limiter eventually returns 429 under burst traffic', async () => {
    const { app } = loadApi();
    let saw429 = false;

    for (let i = 0; i < 140; i += 1) {
      const res = await request(app)
        .get('/api/leaderboard')
        .set('Authorization', 'Bearer mutation-token')
        .set('x-admin-user', 'dashboard-admin');
      if (res.status === 429) {
        saw429 = true;
        break;
      }
    }

    expect(saw429).toBe(true);
  });

  test('checkin status returns null on provider error', async () => {
    const { app } = loadApi({ getCheckinStatusImpl: jest.fn().mockRejectedValue(new Error('down')) });

    const res = await request(app)
      .get('/api/checkin/status')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  test('checkin endpoint uses optional body access and error fallback payload', async () => {
    const { app } = loadApi({
      performCheckinImpl: jest.fn().mockRejectedValue(new Error('boom')),
      checkAndAwardAchievementsImpl: jest.fn().mockRejectedValue(new Error('down')),
    });

    const missingUser = await request(app)
      .post('/api/checkin')
      .set('Authorization', 'Bearer mutation-token')
      .send({});

    const failed = await request(app)
      .post('/api/checkin')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-user-id', 'u1')
      .send({});

    expect(missingUser.status).toBe(400);
    expect(failed.status).toBe(500);
    expect(failed.body.error).toContain('boom');
  });

  test('checkin endpoint handles undefined req.body for non-json content', async () => {
    const { app } = loadApi();

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', 'Bearer mutation-token')
      .set('Content-Type', 'text/plain')
      .send('raw-text-payload');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('checkin error fallback handles undefined rejection value safely', async () => {
    const { app } = loadApi({
      performCheckinImpl: jest.fn().mockRejectedValue(undefined),
    });

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-user-id', 'u1')
      .send({});

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('error');
  });

  test('checkin success continues when achievements awarding fails', async () => {
    const { app } = loadApi({
      performCheckinImpl: jest.fn().mockResolvedValue({ success: true, message: 'ok', pointsAwarded: 3, currentStreak: 4, longestStreak: 4, totalCheckins: 4, alreadyCheckedIn: false }),
      checkAndAwardAchievementsImpl: jest.fn().mockRejectedValue(new Error('ach fail')),
    });

    const res = await request(app)
      .post('/api/checkin')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-user-id', 'u1')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newAchievements).toEqual([]);
  });

  test('achievements endpoint tolerates earned achievements provider failure', async () => {
    const { app } = loadApi({ getEarnedAchievementsImpl: jest.fn().mockRejectedValue(new Error('down')) });

    const res = await request(app)
      .get('/api/achievements')
      .set('Authorization', 'Bearer mutation-token')
      .set('x-user-id', 'u1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.earned).toEqual([]);
    expect(res.body.data.total).toBe(2);
  });
});
