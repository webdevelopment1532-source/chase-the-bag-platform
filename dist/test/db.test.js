"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const db_1 = require("../src/db");
jest.mock('mysql2/promise', () => ({
    __esModule: true,
    default: {
        createConnection: jest.fn(),
    },
}));
describe('db', () => {
    const envBackup = { ...process.env };
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...envBackup };
        delete process.env.DISCORD_GAME_DB_HOST;
        delete process.env.DISCORD_GAME_DB_PORT;
        delete process.env.DISCORD_GAME_DB_USER;
        delete process.env.DISCORD_GAME_DB_PASS;
        delete process.env.DISCORD_GAME_DB_NAME;
        delete process.env.DB_HOST;
        delete process.env.DB_PORT;
        delete process.env.DB_USER;
        delete process.env.DB_PASS;
        delete process.env.DB_NAME;
    });
    afterAll(() => {
        process.env = envBackup;
    });
    test('throws when required env vars are missing', async () => {
        await expect((0, db_1.getDbConnection)()).rejects.toThrow('Missing database environment variables: DISCORD_GAME_DB_HOST, DISCORD_GAME_DB_USER, DISCORD_GAME_DB_NAME');
        expect(promise_1.default.createConnection).not.toHaveBeenCalled();
    });
    test('uses DISCORD_GAME_DB_* values with default port 3306', async () => {
        const mockConn = { query: jest.fn() };
        promise_1.default.createConnection.mockResolvedValue(mockConn);
        process.env.DISCORD_GAME_DB_HOST = 'db.internal';
        process.env.DISCORD_GAME_DB_USER = 'svc_user';
        process.env.DISCORD_GAME_DB_PASS = 'secret';
        process.env.DISCORD_GAME_DB_NAME = 'discord_game';
        const conn = await (0, db_1.getDbConnection)();
        expect(promise_1.default.createConnection).toHaveBeenCalledWith({
            host: 'db.internal',
            port: 3306,
            user: 'svc_user',
            password: 'secret',
            database: 'discord_game',
        });
        expect(conn).toBe(mockConn);
    });
    test('falls back to DB_* values and parses DB_PORT', async () => {
        const mockConn = { execute: jest.fn() };
        promise_1.default.createConnection.mockResolvedValue(mockConn);
        process.env.DB_HOST = 'legacy-host';
        process.env.DB_PORT = '4407';
        process.env.DB_USER = 'legacy_user';
        process.env.DB_PASS = 'legacy_pass';
        process.env.DB_NAME = 'legacy_db';
        const conn = await (0, db_1.getDbConnection)();
        expect(promise_1.default.createConnection).toHaveBeenCalledWith({
            host: 'legacy-host',
            port: 4407,
            user: 'legacy_user',
            password: 'legacy_pass',
            database: 'legacy_db',
        });
        expect(conn).toBe(mockConn);
    });
    test('DISCORD_GAME_DB values take precedence over DB_* fallback', async () => {
        const mockConn = { end: jest.fn() };
        promise_1.default.createConnection.mockResolvedValue(mockConn);
        process.env.DISCORD_GAME_DB_HOST = 'preferred-host';
        process.env.DISCORD_GAME_DB_USER = 'preferred-user';
        process.env.DISCORD_GAME_DB_NAME = 'preferred-db';
        process.env.DB_HOST = 'fallback-host';
        process.env.DB_USER = 'fallback-user';
        process.env.DB_NAME = 'fallback-db';
        await (0, db_1.getDbConnection)();
        expect(promise_1.default.createConnection).toHaveBeenCalledWith(expect.objectContaining({
            host: 'preferred-host',
            user: 'preferred-user',
            database: 'preferred-db',
        }));
    });
});
