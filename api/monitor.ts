import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { type } = req.query;

  res.status(200).json({
    ok: true,
    monitor: type || "none",
  });
}
