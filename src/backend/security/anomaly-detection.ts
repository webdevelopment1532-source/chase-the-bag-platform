// Advanced anomaly detection for DB queries
// Logs and flags suspicious query patterns, high frequency, or abnormal data access

import * as auditLog from "../../audit-log";
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
import { sendSecurityAlert } from "../alerting";
const { forwardToSIEM } = require("../siem");
const { triggerPlaybook } = require("../incident-response");

const SUSPICIOUS_PATTERNS = [
  /sleep\s*\(/i, // time-based injection
  /union\s+select/i,
  /or\s+1=1/i,
  /drop\s+table/i,
  /--/,
  /\/\*/,
  /information_schema/i,
  /benchmark\s*\(/i,
];

export function detectAnomaly(
  query: string,
  params: any[] | null | undefined,
  context: { userId?: string; ip?: string },
) {
  const safeParams = Array.isArray(params) ? params : [];
  let flagged = false;
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(query)) {
      flagged = true;
      break;
    }
  }
  if (flagged || safeParams.length > 10) {
    const event = {
      userId: context.userId || "",
      serverId: "",
      action: "anomaly_detected",
      details: `query=${query}, params=${JSON.stringify(safeParams)}, ip=${context.ip}, timestamp=${new Date().toISOString()}, flagged=${flagged}`,
    };
    auditLog.logOperation(event);
    // Real-time alerting hook
    sendSecurityAlert(event);
    // Forward to SIEM
    forwardToSIEM(event);
    // Automated incident response
    triggerPlaybook(event);
  }
  return flagged;
}
