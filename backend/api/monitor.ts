import type { IncomingMessage, ServerResponse } from "http";
import { sendAlert } from "../utils/alert";
type VercelRequest = IncomingMessage & {
  body?: any;
  query?: any;
  cookies?: any;
};
type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  end: (body?: any) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { type, message, meta } = req.body || {};
  const ts = Date.now();
  console.log(`[MONITOR]`, { type, message, meta, ts });

  // Alert on errors or slow API
  const isError =
    type === "error" ||
    (type === "popup" && message && message.match(/failed/i));
  const isPerf = type === "api" && meta && meta.latency && meta.latency > 1000;
  let channel: "slack" | "discord" | "email" | undefined = process.env
    .ALERT_CHANNEL as any;
  if (!channel || !["slack", "discord", "email"].includes(channel))
    channel = "slack";
  const webhookUrl = process.env.ALERT_WEBHOOK_URL || "";
  if (isError || isPerf) {
    await sendAlert({
      message: `[${type}] ${message} ${meta ? JSON.stringify(meta) : ""}`,
      type,
      channel,
      webhookUrl,
    });
  }
  res.status(200).json({ ok: true });
}
