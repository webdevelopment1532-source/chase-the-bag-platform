import request from 'supertest';

jest.setTimeout(30000);

function loadApiWithEnv(env: Record<string, string | undefined>) {
  jest.resetModules();

  if (env.API_AUTH_TOKEN === undefined) {
    delete process.env.API_AUTH_TOKEN;
  } else {
    process.env.API_AUTH_TOKEN = env.API_AUTH_TOKEN;
  }

  if (env.API_ADMIN_ID === undefined) {
    delete process.env.API_ADMIN_ID;
  } else {
    process.env.API_ADMIN_ID = env.API_ADMIN_ID;
  }

  if (env.API_ADMIN_IDS === undefined) {
    delete process.env.API_ADMIN_IDS;
  } else {
    process.env.API_ADMIN_IDS = env.API_ADMIN_IDS;
  }

  if (env.CTB_CRAWLER_USER_AGENT === undefined) {
    delete process.env.CTB_CRAWLER_USER_AGENT;
  } else {
    process.env.CTB_CRAWLER_USER_AGENT = env.CTB_CRAWLER_USER_AGENT;
  }

  if (env.CTB_CRAWLER_KEY === undefined) {
    delete process.env.CTB_CRAWLER_KEY;
  } else {
    process.env.CTB_CRAWLER_KEY = env.CTB_CRAWLER_KEY;
  }

  if (env.CTB_CRAWLER_ALLOWED_IPS === undefined) {
    delete process.env.CTB_CRAWLER_ALLOWED_IPS;
  } else {
    process.env.CTB_CRAWLER_ALLOWED_IPS = env.CTB_CRAWLER_ALLOWED_IPS;
  }

  if (env.CTB_TRUST_PROXY === undefined) {
    delete process.env.CTB_TRUST_PROXY;
  } else {
    process.env.CTB_TRUST_PROXY = env.CTB_TRUST_PROXY;
  }

  const mockExecute = jest.fn().mockResolvedValue([[]]);
  const mockEnd = jest.fn().mockResolvedValue(undefined);

  jest.doMock('../src/db', () => ({
    getDbConnection: jest.fn().mockResolvedValue({ execute: mockExecute, end: mockEnd }),
  }));
  jest.doMock('../src/audit-log', () => ({
    logOperation: jest.fn().mockResolvedValue(undefined),
  }));

  const api = require('../src/api');
  return { app: api.app, mockExecute };
}

describe('api bootstrap and auth helpers', () => {
  test('uses x-api-key auth path and default admin actor fallback', async () => {
    const { app, mockExecute } = loadApiWithEnv({
      API_AUTH_TOKEN: 'token-a',
      API_ADMIN_ID: 'dashboard-admin',
      API_ADMIN_IDS: undefined,
      CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
      CTB_CRAWLER_KEY: 'crawler-key',
      CTB_CRAWLER_ALLOWED_IPS: '',
    });

    const res = await request(app)
      .get('/api/leaderboard?limit=3')
      .set('x-api-key', 'token-a');

    expect(res.status).toBe(200);
    expect(mockExecute).toHaveBeenCalled();
  });

  test('blocks likely crawler when crawler key is missing in env', async () => {
    const { app } = loadApiWithEnv({
      API_AUTH_TOKEN: 'token-b',
      API_ADMIN_ID: 'dashboard-admin',
      API_ADMIN_IDS: 'dashboard-admin',
      CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
      CTB_CRAWLER_KEY: '',
      CTB_CRAWLER_ALLOWED_IPS: '',
    });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer token-b')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'anything');

    expect(res.status).toBe(403);
  });

  test('allows approved crawler with empty allowlist (size === 0 branch)', async () => {
    const { app } = loadApiWithEnv({
      API_AUTH_TOKEN: 'token-c',
      API_ADMIN_ID: 'dashboard-admin',
      API_ADMIN_IDS: 'dashboard-admin',
      CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
      CTB_CRAWLER_KEY: 'crawler-key-c',
      CTB_CRAWLER_ALLOWED_IPS: '',
    });

    const res = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer token-c')
      .set('x-admin-user', 'dashboard-admin')
      .set('User-Agent', 'Mozilla/5.0 ChaseTheBagCrawler')
      .set('x-ctb-crawler-key', 'crawler-key-c');

    expect(res.status).toBe(200);
  });

  test('uses raw trust proxy setting and applies HSTS for secure requests', async () => {
    const { app } = loadApiWithEnv({
      API_AUTH_TOKEN: 'token-d',
      API_ADMIN_ID: 'dashboard-admin',
      API_ADMIN_IDS: 'dashboard-admin',
      CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
      CTB_CRAWLER_KEY: 'crawler-key-d',
      CTB_CRAWLER_ALLOWED_IPS: '',
      CTB_TRUST_PROXY: 'loopback',
    });

    expect(app.get('trust proxy')).toBe('loopback');

    const res = await request(app)
      .get('/healthz')
      .set('x-forwarded-proto', 'https');

    expect(res.status).toBe(200);
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  test('supports numeric trust proxy setting', () => {
    const { app } = loadApiWithEnv({
      API_AUTH_TOKEN: 'token-e',
      API_ADMIN_ID: 'dashboard-admin',
      API_ADMIN_IDS: 'dashboard-admin',
      CTB_CRAWLER_USER_AGENT: 'ChaseTheBagCrawler',
      CTB_CRAWLER_KEY: 'crawler-key-e',
      CTB_CRAWLER_ALLOWED_IPS: '',
      CTB_TRUST_PROXY: '2',
    });

    expect(app.get('trust proxy')).toBe(2);
  });
});
