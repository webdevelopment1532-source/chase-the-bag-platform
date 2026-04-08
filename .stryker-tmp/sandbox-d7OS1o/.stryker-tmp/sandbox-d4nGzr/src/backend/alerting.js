// @ts-nocheck
// 
// src/backend/alerting.js
// Real-time alerting hook for security/audit events
const axios = require('axios');

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || 'https://your-alerting-webhook-url';

async function sendSecurityAlert(event) {
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

module.exports = { sendSecurityAlert };
