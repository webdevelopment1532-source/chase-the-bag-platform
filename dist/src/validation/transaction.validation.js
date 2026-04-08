"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateListUserTransactionsInput = validateListUserTransactionsInput;
const attackPattern = /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i;
function validateListUserTransactionsInput(userId, days) {
    if (typeof userId !== 'string' || userId.trim().length === 0 || attackPattern.test(userId) ||
        typeof days !== 'number' || !Number.isFinite(days) || isNaN(days) || days <= 1e-6) {
        throw new Error('Invalid transaction query input');
    }
}
