// src/backend/alerting.ts
// Real-time alerting hook for security/audit events
import axios from 'axios';

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || 'https://your-alerting-webhook-url';

export async function sendSecurityAlert(event: {
  action: string;
  userId?: string;
  ip?: string;
  timestamp?: string;
  [key: string]: any;
}) {
  try {
    await axios.post(ALERT_WEBHOOK_URL, {
      text: `[SECURITY ALERT] ${event.action} for user ${event.userId} from IP ${event.ip} at ${event.timestamp}`,
      event,
    });
  } catch (err) {
    // Log locally if alerting fails
     
    console.error('Failed to send security alert', err);
  }
}

// CommonJS compatibility for Jest tests
module.exports = { sendSecurityAlert };
