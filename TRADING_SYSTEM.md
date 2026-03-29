# Advanced Trading System Setup Guide

## Overview

The Chase The Bag platform now includes a comprehensive trading analytics system with real-time price tracking, trading history, scraper/crawler management, and virtual trading simulation.

### Features

1. **Trading Activity Tracker** - Record and analyze all user trades across multiple exchanges
2. **Real-Time Price Feeds** - WebSocket-based live price updates from Binance & CoinGecko
3. **Time-Series Analytics** - Trading metrics aggregated by hour, day, week, month, and year
4. **Platform Statistics** - Administrator dashboard showing top performers and platform health
5. **Scraper Management** - Advanced control panel for managing web scrapers with metrics
6. **Virtual Trading Board** - Simulate trades and view projected P&L
7. **Multi-Exchange Support** - Binance, Uniswap, Stripe, PayPal, and internal mixing/staking

---

## Installation & Setup

### 1. Database Initialization

Create all required tables for the trading system:

```bash
# From root directory
node scripts/init-trading-db.js
```

This will create:
- `trading_activities` - All user trades
- `price_snapshots` - Historical price data
- `scrapers` - Scraper configurations
- `scraper_metrics` - Scraper performance metrics
- `scraper_logs` - Execution logs
- `user_trading_settings` - Per-user preferences
- `trading_alerts` - User-configured alerts
- `trading_statistics` - Aggregated stats snapshots
- `platform_metrics` - Global platform performance

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# Trading Exchange APIs
BINANCE_API_KEY=your_binance_key
BINANCE_API_SECRET=your_binance_secret
UNISWAP_ROUTER_ADDRESS=0xE592427A0AEce92De3Edee1F18E0157C05861564

# Payment Processors
STRIPE_API_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
PAYPAL_CLIENT_ID=your_paypal_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# Blockchain
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_key

# Trading Parameters
MAX_TRADE_SIZE=10000
DEFAULT_SLIPPAGE_TOLERANCE=0.5
AUTO_PRICE_UPDATE_INTERVAL_MS=120000
WEBSOCKET_MESSAGE_RATE_LIMIT=100

# Webhook for volume notifications
TRADE_VOLUME_WEBHOOK_URL=your_webhook_url
```

### 3. Start the System

The trading system starts automatically with the main application:

```bash
npm run dev
```

The system includes:
- **API Server** on port 3001 (`/api/trading`, `/api/scrapers`)
- **WebSocket Server** on `/ws/trading` for live price feeds
- **Background Services** for price updates and scraper execution

---

## API Endpoints

### Trading Endpoints

#### Get User Trades
```
GET /api/trading/user-trades?limit=50&offset=0
Query Parameters:
  - tradeType: crypto_to_usdt, usdt_to_crypto, crypto_swap, mixing, staking
  - exchange: binance, uniswap, stripe, paypal, internal, stake.us
  - status: pending, completed, failed, cancelled
  - minProfit: 0
  - maxProfit: 1000
  - startDate: 2024-01-01
  - endDate: 2024-12-31

Headers:
  - x-user-id: user123
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "trade_1234567890",
      "userId": "user123",
      "tradeType": "crypto_swap",
      "fromToken": "BTC",
      "toToken": "USDT",
      "fromAmount": 1.5,
      "toAmount": 45000,
      "entryPrice": 30000,
      "exitPrice": 30000,
      "exchangeFee": 45,
      "platformFee": 225,
      "profit": 225,
      "profitPercent": 0.5,
      "exchange": "binance",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

#### Get User Statistics
```
GET /api/trading/stats

Headers:
  - x-user-id: user123
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalTrades": 45,
    "totalVolume": 150000,
    "totalProfit": 3500,
    "totalLoss": 1200,
    "profitPercent": 1.5,
    "winRate": 0.68,
    "averageTradeSize": 3333.33,
    "largestWin": 2500,
    "largestLoss": -800,
    "bestPerformingToken": "BTC",
    "worstPerformingToken": "ETH"
  }
}
```

#### Get Time-Series Metrics
```
GET /api/trading/metrics/{period}
Path Parameters:
  - period: hourly, daily, weekly, monthly, yearly

Headers:
  - x-user-id: user123
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "period": "daily",
      "volumeIn": 50000,
      "volumeOut": 51200,
      "profitLoss": 1200,
      "tradeCount": 15,
      "uniqueTokens": 4,
      "averagePrice": 30500
    }
  ]
}
```

#### Get Platform Statistics (Admin)
```
GET /api/trading/platform-stats

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "overall": {
      "totalTrades": 5000,
      "totalVolume": 50000000,
      "totalProfit": 500000,
      "totalLoss": 100000,
      ...
    },
    "byExchange": {
      "binance": {
        "tradeCount": 3000,
        "totalVolume": 30000000,
        "totalProfit": 300000,
        "averageProfit": 1.2
      },
      ...
    },
    "topUsers": [
      {
        "userId": "user456",
        "totalTrades": 150,
        "totalProfit": 45000,
        "avgProfit": 2.5,
        "totalVolume": 500000
      }
    ]
  }
}
```

#### Get Current Prices
```
GET /api/trading/prices?tokens=BTC,ETH,USDT,BNB

Response:
{
  "success": true,
  "data": {
    "BTC": 45000.50,
    "ETH": 2500.75,
    "USDT": 1.00,
    "BNB": 320.45
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Simulate Binance Trade
```
POST /api/trading/simulate-binance-trade

Headers:
  - x-user-id: user123
  - Authorization: Bearer {token}
  - Content-Type: application/json

Request Body:
{
  "fromToken": "BTC",
  "toToken": "USDT",
  "fromAmount": 1.5
}

Response:
{
  "success": true,
  "data": {
    "id": "trade_1234567890",
    "fromAmount": 1.5,
    "toAmount": 44752.50,
    "entryPrice": 30000,
    "exitPrice": 30000,
    "exchangeFee": 45,
    "platformFee": 225,
    "profit": 225,
    "profitPercent": 0.5,
    "exchange": "binance",
    "status": "completed"
  }
}
```

### Scraper Management Endpoints

#### List All Scrapers
```
GET /api/scrapers

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "scraper_main_bonus_codes",
      "name": "Main Bonus Code Scraper",
      "enabled": true,
      "status": "active",
      "interval": 300000,
      "timeout": 10000,
      "retryCount": 3,
      "totalRuns": 1250,
      "successfulRuns": 1245,
      "failedRuns": 5,
      "consecutiveFailures": 0,
      "lastSuccessAt": "2024-01-15T10:25:00Z"
    }
  ]
}
```

#### Get Scraper Details
```
GET /api/scrapers/{id}

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "config": {
      "id": "scraper_main_bonus_codes",
      "name": "Main Bonus Code Scraper",
      ...
    },
    "metrics": {
      "totalRuns": 1250,
      "successfulRuns": 1245,
      "errorRate": 0.4,
      "averageRunTime": 2500,
      "lastSuccessAt": "2024-01-15T10:25:00Z"
    },
    "recentLogs": [
      {
        "id": "log_1234567890",
        "type": "auto",
        "status": "success",
        "itemsCollected": 15,
        "startedAt": "2024-01-15T10:25:00Z",
        "completedAt": "2024-01-15T10:25:02Z"
      }
    ]
  }
}
```

#### Create New Scraper
```
POST /api/scrapers

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}
  - Content-Type: application/json

Request Body:
{
  "name": "New Scraper",
  "interval": 300000,
  "timeout": 10000,
  "retryCount": 3,
  "retryDelay": 5000,
  "maxConcurrent": 5,
  "userAgent": "ChaseTheBagCrawler/1.0",
  "allowedIPs": ["127.0.0.1"],
  "rateLimit": 60,
  "targetUrl": "https://example.com",
  "selector": ".item"
}

Response:
{
  "success": true,
  "data": { "id": "scraper_new_123" }
}
```

#### Pause/Resume Scraper
```
POST /api/scrapers/{id}/pause
POST /api/scrapers/{id}/resume

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Scraper paused"
}
```

#### Run Scraper Manually
```
POST /api/scrapers/{id}/run

Headers:
  - x-is-admin: true
  - Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Scraper execution triggered",
  "logId": "log_1234567890"
}
```

---

## WebSocket Real-Time Updates

Connect to WebSocket at `/ws/trading` for live price updates:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/trading');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_auth_token',
  userId: 'user123'
}));

// Subscribe to price updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['prices']
}));

// Listen for price updates
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  
  if (type === 'price-update') {
    console.log('BTC:', data.BTC.price, 'Change:', data.BTC.changePercent + '%');
  }
};

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channels: ['prices']
}));
```

---

## Frontend Dashboard Components

### TradingDashboard Component

Main dashboard with 5 tabs:

1. **Overview** - Current prices, user stats, platform stats, top performers
2. **Activity** - Trade history with filters and detailed view
3. **Analytics** - Time-series metrics with hourly/daily/weekly/monthly/yearly breakdowns
4. **Scrapers** - Scraper management with pause/resume/run controls
5. **Virtual Board** - Trade simulation with real-time price calculations

### AdvancedPriceChart Component

Canvas-based price chart with:
- Real-time WebSocket updates
- Grid lines and price labels
- Area under curve visualization
- Multiple timeframes (1h, 24h, 7d, 30d)
- Live/offline indicator

---

## Architecture

### Module Structure

```
src/
├── trading-tracker.ts       # Core trading logic & database queries
├── exchange-integration.ts   # Exchange APIs (Binance, Uniswap, Stripe, PayPal)
├── websocket-server.ts       # WebSocket for real-time updates
├── routes/
│   ├── trading.ts           # Trading API endpoints
│   └── scrapers.ts          # Scraper management endpoints
├── api.ts                    # Express app setup & integration
└── index.ts                  # Main bot entrypoint

frontend/
├── components/
│   ├── TradingDashboard.jsx  # Main dashboard interface
│   ├── AdvancedPriceChart.jsx# Real-time price chart
│   └── ...
└── ...
```

### Data Flow

1. **User initiates trade** → API records trade in database
2. **Exchange integration** fetches real-time prices from Binance/APIs
3. **WebSocket server** broadcasts price updates every 2 seconds
4. **Frontend** subscribes to WebSocket, updates UI in real-time
5. **Analytics** aggregates trades into time-series buckets
6. **Scrapers** run on schedule, post results to Discord + database
7. **Alerts** trigger Discord notifications on failures or volume thresholds

---

## Configuration Examples

### Basic Setup

```env
# .env
API_AUTH_TOKEN=your_long_secure_token
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
MAX_TRADE_SIZE=10000
AUTO_PRICE_UPDATE_INTERVAL_MS=120000
```

### Advanced Scraper Config

```json
{
  "name": "Stake.us Bonus Scraper",
  "enabled": true,
  "interval": 300000,
  "timeout": 15000,
  "retryCount": 5,
  "retryDelay": 10000,
  "maxConcurrent": 10,
  "userAgent": "ChaseTheBagCrawler/1.0",
  "allowedIPs": ["your_server_ip"],
  "rateLimit": 120,
  "targetUrl": "https://www.stake.us/promotions",
  "selector": ".bonus-code-item",
  "metadata": {
    "description": "Scrapes latest Stake.us bonus codes",
    "category": "promotions",
    "owner": "admin@example.com"
  }
}
```

---

## Performance Metrics

- **Price Updates**: 1 update per 2 seconds per token (configurable)
- **Trade Recording**: < 100ms
- **Scraper Runs**: Configurable 5min-1hour intervals
- **WebSocket Connections**: Supports 1000+ concurrent clients
- **API Rate Limits**: 120 req/min standard, 30 req/min sensitive endpoints
- **Database Queries**: Indexed for < 50ms response on large datasets

---

## Troubleshooting

### WebSocket Connection Fails
```
Check:
- Frontend URL matches backend host
- WebSocket path is /ws/trading
- CORS is enabled in express
- Firewall allows WebSocket connections
```

### Price Data Not Updating
```
Check:
- BINANCE_API_KEY is valid
- setInterval is running (check logs)
- WebSocket clients subscribed to 'prices'
- Network connectivity to Binance API
```

### Scraper Failures
```
Check:
- Target URL is accessible
- Selector matches DOM structure
- IP is in allowlist
- Rate limits aren't being exceeded
- Network timeout from target site
```

### Database Connection Issues
```
Check:
- DB credentials in .env
- MySQL/MariaDB service running
- Port 3306 is accessible
- Database exists and tables created
```

---

## Next Steps

1. ✅ Initialize database
2. ✅ Configure environment variables
3. ✅ Start application
4. ✅ Access dashboard at `/trading`
5. ✅ Monitor scraper status via Discord or API
6. ✅ Create trading alerts for specific conditions
7. ✅ Integrate with external webhooks for volume notifications

---

## Support & API Docs

For detailed API documentation, see:
- Trading: `/src/routes/trading.ts`
- Scrapers: `/src/routes/scrapers.ts`
- WebSocket: `/src/websocket-server.ts`
- Core Logic: `/src/trading-tracker.ts`

For issues or questions, check the test files:
- `/test/trading.test.ts`
- `/test/scraper.test.ts`
- `/test/api.test.ts`
