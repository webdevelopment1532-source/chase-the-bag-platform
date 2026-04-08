"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateGetCoinWalletInput = validateGetCoinWalletInput;
const attackPattern = /('|--|;|<script|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|"|\*|\||\$|\{|\}|\[|\]|\(|\)|#)/i;
function validateGetCoinWalletInput(opts) {
    if (!opts ||
        typeof opts.userId !== 'string' || opts.userId.trim().length === 0 || attackPattern.test(opts.userId)) {
        throw new Error('Invalid wallet input');
    }
}
