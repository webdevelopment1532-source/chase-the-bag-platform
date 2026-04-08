// @ts-nocheck
// src/backend/siem.js
// Forward audit logs and security events to SIEM
const axios = require('axios');

const SIEM_WEBHOOK_URL = process.env.SIEM_WEBHOOK_URL || 'https://your-siem-webhook-url';

async function forwardToSIEM(logEvent) {
  try {
    await axios.post(SIEM_WEBHOOK_URL, {
      ...logEvent,
      env: process.env.NODE_ENV,
      service: 'backend',
      severity: logEvent.flagged ? 'high' : 'info',
    });
  } catch (err) {
     
    console.error('Failed to forward to SIEM', err);
  }
}

module.exports = { forwardToSIEM };
