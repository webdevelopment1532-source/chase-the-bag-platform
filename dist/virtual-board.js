"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVirtualBoardData = getVirtualBoardData;
// Virtual board for real-time code tracking
const db_1 = require("./db");
const audit_log_1 = require("./audit-log");
// Optionally pass user/server for logging
async function getVirtualBoardData(userId, serverId) {
    const db = await (0, db_1.getDbConnection)();
    const [rows] = await db.execute('SELECT code, source, created_at FROM codes ORDER BY created_at DESC LIMIT 50');
    if (userId && serverId) {
        await (0, audit_log_1.logOperation)({ userId, serverId, action: 'view_virtual_board', details: `Viewed ${rows.length} codes` });
    }
    return rows;
}
