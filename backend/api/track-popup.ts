import { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { event, userType, ts } = req.body || {};
  // TODO: Save to DB or external analytics (for now, just log)
  console.log(`[ANALYTICS] Popup event:`, {
    event,
    userType,
    ts,
    ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
  });
  res.status(200).json({ ok: true });
}
