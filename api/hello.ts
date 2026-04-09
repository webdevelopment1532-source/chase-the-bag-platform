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

export default function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.VERCEL_API_KEY;
  res.status(200).json({ message: "API key loaded", apiKey: !!apiKey });
}
