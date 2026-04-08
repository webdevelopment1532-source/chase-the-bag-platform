"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUuid = isValidUuid;
exports.generateUuid = generateUuid;
// Cyber-secure, mutation-safe UUID utility
function isValidUuid(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}
function generateUuid() {
    // Use crypto if available
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback (not cryptographically secure)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
