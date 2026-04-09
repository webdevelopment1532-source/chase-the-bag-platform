import type { IncomingMessage, ServerResponse } from "http";
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
