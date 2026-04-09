"use strict";
// Advanced anomaly detection for DB queries
// Logs and flags suspicious query patterns, high frequency, or abnormal data access
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAnomaly = detectAnomaly;
const auditLog = __importStar(require("../../audit-log"));
// Use TypeScript wrapper for audit-log
// import * as auditLog from '../../audit-log';
// import { logOperation } from '../../audit-log';
// ...existing code...
const alerting_1 = require("../alerting");
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
function detectAnomaly(query, params, context) {
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
            details: `Anomaly detected. query=${query}, params=${JSON.stringify(safeParams)}, ip=${context.ip}, timestamp=${new Date().toISOString()}, flagged=${flagged}`,
            ip: context.ip,
            timestamp: new Date().toISOString(),
        };
        auditLog.logOperation({
            userId: event.userId,
            serverId: event.serverId,
            action: event.action,
            details: event.details,
        });
        // Real-time alerting hook
        (0, alerting_1.sendSecurityAlert)(event);
        // Forward to SIEM
        forwardToSIEM(event);
        // Automated incident response
        triggerPlaybook(event);
    }
    return flagged;
}
