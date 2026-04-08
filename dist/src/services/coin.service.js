"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantCoins = grantCoins;
const db_1 = require("../models/db");
const coin_validation_1 = require("../validation/coin.validation");
async function grantCoins(opts) {
    // ...existing code...
    (0, coin_validation_1.validateGrantCoinsInput)(opts);
    const { actorUserId, targetUserId, amount, serverId, details } = opts;
    const userId = `${serverId}:${targetUserId}`;
    const actorId = `${serverId}:${actorUserId}`;
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        // Update wallet balance
        await conn.execute(`INSERT INTO wallets (user_id, balance, currency) VALUES (?, ?, 'USD')
       ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)`, [userId, amount]);
        // Write to audit log
        await conn.execute(`INSERT INTO audit_log (user_id, operation, details) VALUES (?, 'grantCoins', ?)`, [actorId, details || '']);
        // Get new balances
        const [rows] = await conn.execute(`SELECT balance FROM wallets WHERE user_id = ? AND currency = 'USD'`, [userId]);
        await conn.commit();
        return {
            userId,
            availableBalance: rows[0]?.balance || 0,
            lockedBalance: 0,
            totalBalance: rows[0]?.balance || 0,
        };
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
