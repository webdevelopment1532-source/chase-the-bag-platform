# Real-Time Alerting Hooks: Hands-On Implementation

## Audit Log Alerting
- Integrate alerting on critical audit log events (e.g., anomaly_detected, failed login, privilege escalation).
- Use a webhook, email, or SIEM integration to notify security/ops teams in real time.

### Example: Webhook Alert on Anomaly
```js
// src/backend/alerting.js
const axios = require('axios');

async function sendSecurityAlert(event) {
  await axios.post('https://your-alerting-webhook-url', {
    text: `[SECURITY ALERT] ${event.action} for user ${event.userId} from IP ${event.ip} at ${event.timestamp}`,
    event,
  });
}

module.exports = { sendSecurityAlert };
```

## Usage in Anomaly Detection
```js
// src/backend/security/anomaly-detection.ts
import { sendSecurityAlert } from '../alerting';

export function detectAnomaly(query, params, context) {
  // ...existing code...
  if (flagged) {
    auditLog.logOperation({ /* ... */ });
    sendSecurityAlert({
      action: 'anomaly_detected',
      userId: context.userId,
      ip: context.ip,
      timestamp: new Date().toISOString(),
      query,
      params,
    });
  }
  // ...
}
```

## References
- [PagerDuty Webhooks](https://support.pagerduty.com/docs/webhooks)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [SIEM Integration](https://www.elastic.co/guide/en/siem/guide/current/siem-integration.html)
