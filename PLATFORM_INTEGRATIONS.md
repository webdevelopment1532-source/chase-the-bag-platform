# Platform Integrations

## Vercel Deployment

- **Production URL:** https://chase-the-bag-platform-kjeq-theta.vercel.app/
- **Project Name:** chase-the-bag-platform
- **Environment Variables:**
  - Set in Vercel dashboard for secure backend/frontend operation (e.g., `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, database credentials, etc.)
- **CI/CD:**
  - Deploys automatically from GitHub via Vercel
  - Environment variables are injected securely

## Discord Bot Integration

### Discord OAuth Client Information

- **Client ID:** 1489245551622099135
- **Client Secret:** (Set in environment variables, never commit to code)
- **Redirect URIs:**
  - https://chase-the-bag-platform-kjeq-theta.vercel.app/api/discord-auth
  - http://localhost:3000/api/discord-auth (for local development)

> The redirect URI in the Discord Developer Portal must exactly match the one used in your OAuth flow and environment variables.

- **Bot Name:** Chase The Bag Coin Exchange
- **Application ID:** 1489245551622099135
- **Public Key:** 942beb5c1a9b1fce9d876af0e4d4fe076e54f7fb959e73204797010a938ebcdf
- **Bot Token (for testing only, do NOT use in production):**

  [REDACTED]

  > ⚠️ **Warning:** Never commit production tokens to version control. Rotate this token if it is ever exposed. Use only for local/testing purposes.

- **Invite Link:** (Generate from Discord Developer Portal with required permissions)
- **OAuth Redirect URI:** Set in both Discord Developer Portal and Vercel environment variables
- **Setup Notes:**
  - Configure bot credentials in `.env` or Vercel environment variables
  - See DISCORD_BOT_SETUP.md for detailed setup and command list

---

For more details, see README.md, PLATFORM_OVERVIEW.md, and DISCORD_BOT_SETUP.md.
