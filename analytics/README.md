# Analytics, Alerts, and Dashboards

## Real-Time Alerts

- Set `ALERT_WEBHOOK_URL` and `ALERT_CHANNEL` (slack/discord/email) in your environment (Vercel/CI/CD).
- All popup failures, API errors, and latency spikes trigger alerts to your channel.

## Dashboards

- Use Vercel Analytics for serverless/API monitoring.
- For advanced dashboards, connect backend logs to Grafana, Superset, or your preferred tool.
- All popup events are logged via `/api/track-popup` (see backend/api/track-popup.ts).

## Advanced User Segmentation

- Extend popup logic in `frontend/App.tsx` to segment users by premium, frequent, or new (e.g., using user roles from Discord or usage patterns).
- Tailor popup content and analytics by user type.

## Example: Setting up Slack Alerts

1. Create a Slack Incoming Webhook and copy the URL.
2. Set `ALERT_WEBHOOK_URL` in your Vercel/CI/CD environment.
3. Set `ALERT_CHANNEL=slack`.

## Example: Grafana Dashboard

- Export logs from Vercel or your DB to a time-series database (e.g., Prometheus, InfluxDB).
- Connect Grafana to visualize popup impressions, clicks, dismissals, login trends, and API latency.
