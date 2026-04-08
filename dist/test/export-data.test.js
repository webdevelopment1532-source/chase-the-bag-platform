"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var appendMock;
var pipeMock;
var finalizeMock;
var createWriteStreamMock;
describe('export-data deep tests', () => {
    async function loadModule(dbExecute) {
        jest.resetModules();
        appendMock = jest.fn();
        pipeMock = jest.fn();
        finalizeMock = jest.fn().mockResolvedValue(undefined);
        createWriteStreamMock = jest.fn(() => ({ on: jest.fn() }));
        jest.doMock('../src/db', () => ({
            getDbConnection: jest.fn().mockResolvedValue({ execute: dbExecute }),
        }));
        jest.doMock('archiver', () => {
            return jest.fn(() => ({
                append: appendMock,
                pipe: pipeMock,
                finalize: finalizeMock,
            }));
        });
        jest.doMock('fs', () => ({
            createWriteStream: createWriteStreamMock,
        }));
        const mod = await Promise.resolve().then(() => __importStar(require('../src/export-data')));
        return mod;
    }
    beforeEach(() => {
        jest.clearAllMocks();
    });
    test('exportAllDataZip exports all tables and returns custom output path', async () => {
        const execute = jest
            .fn()
            .mockResolvedValueOnce([[{ code: 'A1' }], []])
            .mockResolvedValueOnce([[{ user: 'u1', score: 10 }], []])
            .mockResolvedValueOnce([[{ user: 'u1', game: 'dice' }], []])
            .mockResolvedValueOnce([[{ action: 'test' }], []]);
        const { exportAllDataZip } = await loadModule(execute);
        const outputPath = await exportAllDataZip('backup.zip');
        expect(outputPath).toBe('backup.zip');
        expect(createWriteStreamMock).toHaveBeenCalledWith('backup.zip');
        expect(pipeMock).toHaveBeenCalledTimes(1);
        expect(execute).toHaveBeenCalledTimes(4);
        expect(execute).toHaveBeenNthCalledWith(1, 'SELECT * FROM codes');
        expect(execute).toHaveBeenNthCalledWith(2, 'SELECT * FROM leaderboard');
        expect(execute).toHaveBeenNthCalledWith(3, 'SELECT * FROM game_results');
        expect(execute).toHaveBeenNthCalledWith(4, 'SELECT * FROM audit_logs');
        expect(appendMock).toHaveBeenNthCalledWith(1, JSON.stringify([{ code: 'A1' }], null, 2), { name: 'codes.json' });
        expect(appendMock).toHaveBeenNthCalledWith(2, JSON.stringify([{ user: 'u1', score: 10 }], null, 2), { name: 'leaderboard.json' });
        expect(appendMock).toHaveBeenNthCalledWith(3, JSON.stringify([{ user: 'u1', game: 'dice' }], null, 2), { name: 'game_results.json' });
        expect(appendMock).toHaveBeenNthCalledWith(4, JSON.stringify([{ action: 'test' }], null, 2), { name: 'audit_logs.json' });
        expect(finalizeMock).toHaveBeenCalledTimes(1);
    });
    test('exportAllDataZip uses default path when omitted', async () => {
        const execute = jest.fn().mockResolvedValue([[], []]);
        const { exportAllDataZip } = await loadModule(execute);
        const outputPath = await exportAllDataZip();
        expect(outputPath).toBe('exported_data.zip');
        expect(createWriteStreamMock).toHaveBeenCalledWith('exported_data.zip');
    });
});
