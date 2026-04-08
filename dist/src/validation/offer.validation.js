"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateOfferInput = validateCreateOfferInput;
exports.validateOfferInput = validateCreateOfferInput;
exports.validateAcceptOfferInput = validateAcceptOfferInput;
exports.validateCancelOfferInput = validateCancelOfferInput;
const attackPattern = /('|--|;|<script|<img|onerror=|onload=|javascript:|data:|\bselect\b|\bdrop\b|\bdelete\b|\binsert\b|\bupdate\b|\bexec\b|\bunion\b|\balert\b|\btruncate\b|\bxp_cmdshell\b|\\x[0-9a-f]{2}|\"|\*|\||\$|\{|\}|\[|\]|\(|\))/i;
function validateCreateOfferInput(opts) {
    if (!opts ||
        typeof opts.senderUserId !== 'string' || opts.senderUserId.trim().length === 0 || attackPattern.test(opts.senderUserId.trim()) ||
        typeof opts.recipientUserId !== 'string' || opts.recipientUserId.trim().length === 0 || attackPattern.test(opts.recipientUserId.trim()) ||
        typeof opts.amount !== 'number' || !Number.isFinite(opts.amount) || isNaN(opts.amount) || opts.amount <= 1e-6) {
        throw new Error('Invalid offer input');
    }
}
function validateAcceptOfferInput(opts) {
    if (!opts ||
        typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0 ||
        typeof opts.userId !== 'string' || opts.userId.trim().length === 0) {
        throw new Error('Invalid accept offer input');
    }
    if (attackPattern.test(opts.userId)) {
        throw new Error('Potentially malicious input detected');
    }
}
function validateCancelOfferInput(opts) {
    if (!opts ||
        typeof opts.offerId !== 'number' || !Number.isFinite(opts.offerId) || opts.offerId <= 0 ||
        typeof opts.userId !== 'string' || opts.userId.trim().length === 0) {
        throw new Error('Invalid cancel offer input');
    }
    if (attackPattern.test(opts.userId)) {
        throw new Error('Potentially malicious input detected');
    }
}
