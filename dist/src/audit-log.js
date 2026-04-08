"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logOperation = logOperation;
// Audit log for all payout, code, and user operations
// Only logs actions for users and Discord servers on this bot
const db_1 = require("./db");
async function logOperation({ userId, serverId, action, details, }) {
    const db = await (0, db_1.getDbConnection)();
    try {
        await db.execute("INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)", [userId, serverId, action, details || null]);
    }
    finally {
        await db.end();
    }
}
// Example usage:
// await logOperation({ userId: message.author.id, serverId: message.guild.id, action: 'payout', details: 'Paid $10 to user' });
