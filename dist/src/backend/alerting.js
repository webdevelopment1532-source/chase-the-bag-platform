"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSecurityAlert = sendSecurityAlert;
// src/backend/alerting.ts
// Real-time alerting hook for security/audit events
const axios_1 = __importDefault(require("axios"));
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || 'https://your-alerting-webhook-url';
async function sendSecurityAlert(event) {
    try {
        await axios_1.default.post(ALERT_WEBHOOK_URL, {
            text: `[SECURITY ALERT] ${event.action} for user ${event.userId} from IP ${event.ip} at ${event.timestamp}`,
            event,
        });
    }
    catch (err) {
        // Log locally if alerting fails
        console.error('Failed to send security alert', err);
    }
}
// CommonJS compatibility for Jest tests
module.exports = { sendSecurityAlert };
