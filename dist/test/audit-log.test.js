"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_log_1 = require("../src/audit-log");
const db_1 = require("../src/db");
jest.mock('../src/db', () => ({
    getDbConnection: jest.fn(),
}));
describe('audit-log', () => {
    test('writes audit row and closes connection', async () => {
        const execute = jest.fn().mockResolvedValue([[], []]);
        const end = jest.fn().mockResolvedValue(undefined);
        db_1.getDbConnection.mockResolvedValue({ execute, end });
        await (0, audit_log_1.logOperation)({
            userId: 'u-1',
            serverId: 's-1',
            action: 'test_action',
            details: 'details text',
        });
        expect(db_1.getDbConnection).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledWith('INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)', ['u-1', 's-1', 'test_action', 'details text']);
        expect(end).toHaveBeenCalledTimes(1);
    });
    test('stores null details when omitted and still closes connection on failure', async () => {
        const execute = jest.fn().mockRejectedValue(new Error('db failed'));
        const end = jest.fn().mockResolvedValue(undefined);
        db_1.getDbConnection.mockResolvedValue({ execute, end });
        await expect((0, audit_log_1.logOperation)({
            userId: 'u-2',
            serverId: 's-2',
            action: 'test_action',
        })).rejects.toThrow('db failed');
        expect(execute).toHaveBeenCalledWith('INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)', ['u-2', 's-2', 'test_action', null]);
        expect(end).toHaveBeenCalledTimes(1);
    });
});
