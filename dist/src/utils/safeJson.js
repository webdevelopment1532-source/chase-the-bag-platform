"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.safeJsonStringify = safeJsonStringify;
// Cyber-secure, mutation-safe JSON utility
function safeJsonParse(input, fallback = null) {
    try {
        return JSON.parse(input);
    }
    catch {
        return fallback;
    }
}
function safeJsonStringify(input, fallback = '{}') {
    try {
        return JSON.stringify(input);
    }
    catch {
        return fallback;
    }
}
