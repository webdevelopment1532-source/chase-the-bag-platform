// src/services/wallet.service.ts
// Wallet service for managing user wallets and transactions

import { v4 as uuidv4 } from "uuid";
import { Pool } from "mysql2/promise";

// Example: You should inject your DB pool from your app's db module
// import { dbPool } from '../db';

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class WalletService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async createWallet(userId: string): Promise<Wallet> {
    const id = uuidv4();
    const now = new Date();
    await this.db.execute(
      "INSERT INTO wallets (id, user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, userId, 0, now, now],
    );
    return { id, userId, balance: 0, createdAt: now, updatedAt: now };
  }

  async getWalletByUserId(userId: string): Promise<Wallet | null> {
    const [rows]: any = await this.db.execute(
      "SELECT * FROM wallets WHERE user_id = ? LIMIT 1",
      [userId],
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      balance: row.balance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateBalance(userId: string, amount: number): Promise<Wallet | null> {
    const wallet = await this.getWalletByUserId(userId);
    if (!wallet) return null;
    const newBalance = wallet.balance + amount;
    const now = new Date();
    await this.db.execute(
      "UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?",
      [newBalance, now, userId],
    );
    return { ...wallet, balance: newBalance, updatedAt: now };
  }

  async deleteWallet(userId: string): Promise<boolean> {
    const [result]: any = await this.db.execute(
      "DELETE FROM wallets WHERE user_id = ?",
      [userId],
    );
    return result.affectedRows > 0;
  }
}

// Usage example (in your app):
// import { dbPool } from '../db';
// const walletService = new WalletService(dbPool);
// await walletService.createWallet('user123');
