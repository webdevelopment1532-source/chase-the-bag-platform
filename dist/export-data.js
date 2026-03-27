"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAllDataZip = exportAllDataZip;
// Utility to export all operational data as a zip archive
const db_1 = require("./db");
const archiver_1 = __importDefault(require("archiver"));
// @ts-ignore
const fs_1 = __importDefault(require("fs"));
async function exportAllDataZip(outputPath = 'exported_data.zip') {
    const db = await (0, db_1.getDbConnection)();
    const tables = ['codes', 'leaderboard', 'game_results', 'audit_logs'];
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    const output = fs_1.default.createWriteStream(outputPath);
    archive.pipe(output);
    for (const table of tables) {
        const [rows] = await db.execute(`SELECT * FROM ${table}`);
        archive.append(JSON.stringify(rows, null, 2), { name: `${table}.json` });
    }
    await archive.finalize();
    return outputPath;
}
// Usage: await exportAllDataZip('backup.zip');
