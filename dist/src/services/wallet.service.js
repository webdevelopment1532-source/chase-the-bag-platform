"use strict";
// src/services/wallet.service.ts
// Wallet service for managing user wallets and transactions
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const uuid_1 = require("uuid");
class WalletService {
    constructor(db) {
        this.db = db;
    }
    async createWallet(userId) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        await this.db.execute("INSERT INTO wallets (id, user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", [id, userId, 0, now, now]);
        return { id, userId, balance: 0, createdAt: now, updatedAt: now };
    }
    async getWalletByUserId(userId) {
        const [rows] = await this.db.execute("SELECT * FROM wallets WHERE user_id = ? LIMIT 1", [userId]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            balance: row.balance,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async updateBalance(userId, amount) {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet)
            return null;
        const newBalance = wallet.balance + amount;
        const now = new Date();
        await this.db.execute("UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?", [newBalance, now, userId]);
        return { ...wallet, balance: newBalance, updatedAt: now };
    }
    async deleteWallet(userId) {
        const [result] = await this.db.execute("DELETE FROM wallets WHERE user_id = ?", [userId]);
        return result.affectedRows > 0;
    }
}
exports.WalletService = WalletService;
// Usage example (in your app):
// import { dbPool } from '../db';
// const walletService = new WalletService(dbPool);
// await walletService.createWallet('user123');
