// src/backend/siem.ts
// SIEM integration stub for security events

export function forwardToSIEM(event: any) {
  // Implement SIEM forwarding logic here
  // For now, just log
   
  console.log('[SIEM] Forwarded event:', event);
}

// CommonJS compatibility for Jest tests
module.exports = { forwardToSIEM };
