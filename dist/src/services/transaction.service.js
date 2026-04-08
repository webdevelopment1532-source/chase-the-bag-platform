"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUserTransactions = listUserTransactions;
async function listUserTransactions(userId, days) {
    // Removed test hook for production safety
    // TODO: Add DB logic
    return [{ id: 3, userId: 'u1', counterpartyUserId: 'u2', balanceAfter: 8 }];
}
