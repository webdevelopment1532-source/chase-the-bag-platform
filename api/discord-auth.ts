import type { VercelRequest, VercelResponse } from "@vercel/node";
import DiscordOauth2 from "discord-oauth2";

const oauth = new DiscordOauth2({
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: process.env.DISCORD_REDIRECT_URI!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests for OAuth callback
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const code = req.query["code"];
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    // Exchange code for token
    const token = await oauth.tokenRequest({
      code,
      scope: "identify email",
      grantType: "authorization_code",
    });

    // Fetch user info
    const user = await oauth.getUser(token.access_token);

    return res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "OAuth failed" });
  }
}
