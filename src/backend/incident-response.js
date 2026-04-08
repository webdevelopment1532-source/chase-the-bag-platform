// src/backend/incident-response.js
// Automated incident response playbook trigger
const { sendSecurityAlert } = require('./alerting');
const { logOperation } = require('../../audit-log.js');

// Internal helpers for testability
const helpers = {
  async disableUser(userId) {
    // TODO: Implement DB update to disable user
    logOperation('DISABLE_USER', { userId, timestamp: new Date().toISOString() });
    // Simulate async DB op
    return Promise.resolve();
  },
  async notifyAdmin(event) {
    logOperation('NOTIFY_ADMIN', { event, timestamp: new Date().toISOString() });
    // Simulate async notification
    return Promise.resolve();
  }
};

async function triggerPlaybook(event, injected = helpers) {
  if (event.action === 'anomaly_detected' && event.flagged) {
    try {
      await injected.disableUser(event.userId);
      await injected.notifyAdmin(event);
      await sendSecurityAlert({ ...event, playbook: 'triggered', timestamp: new Date().toISOString() });
      logOperation('INCIDENT_RESPONSE', { event, status: 'SOAR actions completed', timestamp: new Date().toISOString() });
    } catch (err) {
      logOperation('INCIDENT_RESPONSE_ERROR', { event, error: err && err.message, timestamp: new Date().toISOString() });
       
      console.error('Incident response playbook error:', err);
    }
  } else {
    logOperation('INCIDENT_RESPONSE_IGNORED', { event, timestamp: new Date().toISOString() });
  }
}

module.exports = { triggerPlaybook, helpers };
