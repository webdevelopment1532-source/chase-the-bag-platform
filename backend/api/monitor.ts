
import { sendAlert } from "../utils/alert";

  if (req.method !== "POST") return res.status(405).end();
  const { type, message, meta } = req.body || {};
  const ts = Date.now();
  console.log(`[MONITOR]`, { type, message, meta, ts });

  // Alert on errors or slow API
  const isError = type === 'error' || (type === 'popup' && message && message.match(/failed/i));
  const isPerf = type === 'api' && meta && meta.latency && meta.latency > 1000;
  if (isError || isPerf) {
    const channel = process.env.ALERT_CHANNEL || 'slack';
    const webhookUrl = process.env.ALERT_WEBHOOK_URL || '';
    await sendAlert({
      message: `[${type}] ${message} ${meta ? JSON.stringify(meta) : ''}`,
      type,
      channel,
      webhookUrl,
    });
  }
  res.status(200).json({ ok: true });
}
