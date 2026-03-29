// db.ts reads env vars at call-time so we use jest.isolateModules + require in each test.
jest.mock('mysql2/promise');

describe('getDbConnection', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Clear all relevant env vars
    for (const key of [
      'DISCORD_GAME_DB_HOST', 'DISCORD_GAME_DB_USER', 'DISCORD_GAME_DB_NAME',
      'DISCORD_GAME_DB_PASS', 'DISCORD_GAME_DB_PORT',
      'DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PASS', 'DB_PORT',
    ]) delete process.env[key];
  });

  afterAll(() => {
    Object.assign(process.env, origEnv);
  });

  test('throws when HOST, USER and NAME are all missing', async () => {
    const { getDbConnection } = require('../src/db');
    await expect(getDbConnection()).rejects.toThrow('Missing database environment variables');
  });

  test('error message lists the missing DISCORD_GAME_DB_HOST key', async () => {
    const { getDbConnection } = require('../src/db');
    await expect(getDbConnection()).rejects.toThrow('DISCORD_GAME_DB_HOST');
  });

  test('throws when only HOST is set (USER and NAME still missing)', async () => {
    process.env.DISCORD_GAME_DB_HOST = 'localhost';
    const { getDbConnection } = require('../src/db');
    await expect(getDbConnection()).rejects.toThrow('Missing database environment variables');
  });

  test('throws when HOST and USER are set but NAME is missing', async () => {
    process.env.DISCORD_GAME_DB_HOST = 'localhost';
    process.env.DISCORD_GAME_DB_USER = 'root';
    const { getDbConnection } = require('../src/db');
    await expect(getDbConnection()).rejects.toThrow('Missing database environment variables');
  });

  test('uses DB_ fallback env vars', async () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'root';
    process.env.DB_NAME = 'testdb';
    const mysql = require('mysql2/promise');
    mysql.createConnection = jest.fn().mockResolvedValue({});
    const { getDbConnection } = require('../src/db');
    const conn = await getDbConnection();
    expect(conn).toBeDefined();
    expect(mysql.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'localhost', user: 'root', database: 'testdb' })
    );
  });

  test('defaults port to 3306 when not set', async () => {
    process.env.DISCORD_GAME_DB_HOST = 'localhost';
    process.env.DISCORD_GAME_DB_USER = 'root';
    process.env.DISCORD_GAME_DB_NAME = 'mydb';
    const mysql = require('mysql2/promise');
    mysql.createConnection = jest.fn().mockResolvedValue({});
    const { getDbConnection } = require('../src/db');
    await getDbConnection();
    expect(mysql.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3306 })
    );
  });

  test('uses custom port when DISCORD_GAME_DB_PORT is set', async () => {
    process.env.DISCORD_GAME_DB_HOST = 'localhost';
    process.env.DISCORD_GAME_DB_USER = 'root';
    process.env.DISCORD_GAME_DB_NAME = 'mydb';
    process.env.DISCORD_GAME_DB_PORT = '3307';
    const mysql = require('mysql2/promise');
    mysql.createConnection = jest.fn().mockResolvedValue({});
    const { getDbConnection } = require('../src/db');
    await getDbConnection();
    expect(mysql.createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ port: 3307 })
    );
  });
});
