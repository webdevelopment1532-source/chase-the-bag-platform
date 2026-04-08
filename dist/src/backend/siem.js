"use strict";
// src/backend/siem.ts
// SIEM integration stub for security events
Object.defineProperty(exports, "__esModule", { value: true });
exports.forwardToSIEM = forwardToSIEM;
function forwardToSIEM(event) {
    // Implement SIEM forwarding logic here
    // For now, just log
    console.log('[SIEM] Forwarded event:', event);
}
// CommonJS compatibility for Jest tests
module.exports = { forwardToSIEM };
