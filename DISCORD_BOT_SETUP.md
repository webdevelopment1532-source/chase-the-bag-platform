# Discord Bot Configuration Guide

## Quick Setup (Development)

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and name it (e.g., "Chase The Bag Bot")
3. Go to the "Bot" tab and click "Add Bot"
4. Under TOKEN, click "Reset Token" and copy it (this is your `DISCORD_TOKEN`)
5. Copy the CLIENT ID from the General Information tab (this is your `DISCORD_CLIENT_ID`)

### 2. Configure Bot Permissions

**In Developer Portal:**
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select permissions:
   - Message Content Intent (required for message parsing)
   - Read/Write Messages
   - Send Messages
   - Embed Links
   - Read Message History
   - Use Slash Commands

4. Copy the generated URL and open it in a browser to invite bot to your server

### 3. Update .env File

```bash
# Discord app credentials
DISCORD_TOKEN=your-bot-token-here
DISCORD_CLIENT_ID=your-client-id-here
DISCORD_PUBLIC_KEY=your-public-key-from-dev-portal
OWNER_DISCORD_USER_ID=your-discord-user-id

# Game & Channel Configuration
GAME_CHANNEL_ID=your-game-channel-id
COIN_EXCHANGE_CHANNEL_ID=your-coin-exchange-channel-id
COIN_EXCHANGE_ADMIN_IDS=user-id-1,user-id-2
```

### 4. Find Your IDs

**Your Discord User ID:**
- Enable Developer Mode (Settings → App Settings → Advanced → Developer Mode)
- Right-click on your username and select "Copy User ID"

**Channel IDs:**
- Enable Developer Mode
- Right-click on a channel and select "Copy Channel ID"

### 5. Start the Bot

```bash
npm run start  # Starts the bot in production mode
npm run dev    # Starts with hot-reload (better for development)
```

## Available Discord Commands

### Game Commands
- `!blackjack <bet>` - Play blackjack
- `!plinko <multiplier>` - Play plinko
- `!mines <difficulty>` - Play mines

### Code Commands
- `!latestcodes` - Show recently scraped promo codes
- `!code` - Generate a selfmade code

### Admin Commands (Owner Only)
- `!chart` - Display game statistics charts
- `!stats` - Show platform statistics
- `!export` - Export platform data as ZIP

### Coin Exchange Commands
- `!wallet` - Check coin wallet balance
- `!exchange <amount> <user>` - Transfer coins
- `!offers` - View open offers

## Troubleshooting

**"Missing DISCORD_TOKEN" error**
→ Set DISCORD_TOKEN in .env file

**Bot doesn't respond to messages**
→ Check that Message Content Intent is enabled in Developer Portal

**Commands not showing up**
→ Ensure bot has slash commands permission enabled

**Permission denied errors**
→ Verify bot role has enough permissions in the Discord server

## Testing the Bot

Once configured and running:

1. Check logs for "Logged in as [BotName]#[0000]!"
2. Type a command in the configured GAME_CHANNEL_ID
3. Bot should respond with game or code information

## Security Notes

- Never commit `.env` files to version control
- Rotate DISCORD_TOKEN regularly if compromised
- Use separate bot accounts for dev/prod environments
- Restrict API_AUTH_TOKEN to secure values in production

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DISCORD_TOKEN | Yes | Bot authentication token |
| DISCORD_CLIENT_ID | Yes | Application client ID |
| DISCORD_PUBLIC_KEY | No | Public key for slash commands |
| OWNER_DISCORD_USER_ID | Yes | Discord user ID of owner |
| GAME_CHANNEL_ID | Yes | Channel for game commands |
| COIN_EXCHANGE_CHANNEL_ID | No | Channel for exchange commands |
| COMMAND_COOLDOWN_MS | No | Rate limit per user (default: 1200ms) |

