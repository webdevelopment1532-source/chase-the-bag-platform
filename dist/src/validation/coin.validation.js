"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGrantCoinsInput = validateGrantCoinsInput;
const attackPattern = /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i;
function validateGrantCoinsInput(opts) {
    const { actorUserId, targetUserId, amount, serverId } = opts;
    for (const field of [actorUserId, targetUserId, serverId]) {
        if (typeof field !== 'string' || field.trim().length === 0 || attackPattern.test(field)) {
            throw new Error('Missing or malicious user/server info');
        }
    }
    if (typeof amount !== 'number' || isNaN(amount) || !Number.isFinite(amount) || amount <= 1e-6)
        throw new Error('Invalid amount');
}
