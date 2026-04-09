import DiscordOauth2 from "discord-oauth2";
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

const oauth = new DiscordOauth2({
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: process.env.DISCORD_REDIRECT_URI!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ error: "Missing code" });

    // Exchange code for token
    const token = await oauth.tokenRequest({
      code,
      scope: "identify email",
      grantType: "authorization_code",
    });

    // Fetch user info
    const user = await oauth.getUser(token.access_token);

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OAuth failed" });
  }
}
