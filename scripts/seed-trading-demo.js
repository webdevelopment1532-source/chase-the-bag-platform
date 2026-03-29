const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_CONFIG = {
  host: process.env.DISCORD_GAME_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.DISCORD_GAME_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.DISCORD_GAME_DB_USER || process.env.DB_USER || 'root',
  password: process.env.DISCORD_GAME_DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DISCORD_GAME_DB_NAME || process.env.DB_NAME || 'chase_the_bag',
};

const demoTrades = [
  {
    id: 'demo_trade_1',
    userId: 'dashboard-admin',
    tradeType: 'crypto_swap',
    fromToken: 'BTC',
    toToken: 'ETH',
    fromAmount: 0.12,
    toAmount: 2.46,
    entryPrice: 68250,
    exitPrice: 3325,
    exchangeFee: 8.19,
    platformFee: 4.1,
    profit: 92.45,
    profitPercent: 1.13,
    exchange: 'binance',
    status: 'completed',
    orderId: 'demo-order-001',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed', strategy: 'swing' },
    createdHoursAgo: 2,
  },
  {
    id: 'demo_trade_2',
    userId: 'dashboard-admin',
    tradeType: 'staking',
    fromToken: 'SOL',
    toToken: 'SOL',
    fromAmount: 150,
    toAmount: 152.25,
    entryPrice: 188,
    exitPrice: 188,
    exchangeFee: 0,
    platformFee: 0,
    profit: 423,
    profitPercent: 1.5,
    exchange: 'internal',
    status: 'completed',
    orderId: 'demo-order-002',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed', apy: 18 },
    createdHoursAgo: 6,
  },
  {
    id: 'demo_trade_3',
    userId: 'discord-demo-1',
    tradeType: 'mixing',
    fromToken: 'BTC',
    toToken: 'BTC',
    fromAmount: 0.08,
    toAmount: 0.08,
    entryPrice: 68010,
    exitPrice: 68010,
    exchangeFee: 27.2,
    platformFee: 0,
    profit: -27.2,
    profitPercent: -0.5,
    exchange: 'internal',
    status: 'completed',
    orderId: 'demo-order-003',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed', rounds: 5 },
    createdHoursAgo: 12,
  },
  {
    id: 'demo_trade_4',
    userId: 'discord-demo-2',
    tradeType: 'usdt_to_crypto',
    fromToken: 'USD',
    toToken: 'ETH',
    fromAmount: 2500,
    toAmount: 0.742,
    entryPrice: 1,
    exitPrice: 3340,
    exchangeFee: 55.3,
    platformFee: 0,
    profit: -55.3,
    profitPercent: -2.21,
    exchange: 'stripe',
    status: 'completed',
    orderId: 'demo-order-004',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed' },
    createdHoursAgo: 18,
  },
  {
    id: 'demo_trade_5',
    userId: 'discord-demo-3',
    tradeType: 'crypto_to_usdt',
    fromToken: 'ETH',
    toToken: 'USD',
    fromAmount: 1.15,
    toAmount: 3724.84,
    entryPrice: 3365,
    exitPrice: 1,
    exchangeFee: 43.91,
    platformFee: 0,
    profit: -43.91,
    profitPercent: -1.14,
    exchange: 'paypal',
    status: 'completed',
    orderId: 'demo-order-005',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed' },
    createdHoursAgo: 30,
  },
  {
    id: 'demo_trade_6',
    userId: 'dashboard-admin',
    tradeType: 'crypto_swap',
    fromToken: 'SOL',
    toToken: 'BTC',
    fromAmount: 95,
    toAmount: 0.254,
    entryPrice: 190,
    exitPrice: 68400,
    exchangeFee: 18.05,
    platformFee: 9.02,
    profit: 147.86,
    profitPercent: 0.82,
    exchange: 'uniswap',
    status: 'completed',
    transactionHash: '0xdemo6',
    orderId: 'demo-order-006',
    ipAddress: '127.0.0.1',
    metadata: { source: 'demo-seed', route: 'sol-btc' },
    createdHoursAgo: 42,
  },
];

const demoSnapshots = [
  { token: 'BTC', price: 68420.12, change24h: 1.84, change7d: 5.42, change30d: 12.11, marketCap: 1350000000000, volume24h: 32500000000 },
  { token: 'ETH', price: 3341.85, change24h: 2.14, change7d: 4.63, change30d: 9.85, marketCap: 401000000000, volume24h: 18700000000 },
  { token: 'SOL', price: 189.46, change24h: 3.91, change7d: 7.4, change30d: 18.22, marketCap: 83000000000, volume24h: 6100000000 },
  { token: 'BNB', price: 611.28, change24h: 1.07, change7d: 2.98, change30d: 6.17, marketCap: 89000000000, volume24h: 2100000000 },
];

async function seed() {
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    await connection.execute("DELETE FROM trading_activities WHERE id LIKE 'demo_trade_%'");
    await connection.execute("DELETE FROM price_snapshots WHERE token IN ('BTC', 'ETH', 'SOL', 'BNB')");
    await connection.execute("DELETE FROM user_exchange_balances WHERE userId IN ('dashboard-admin', 'discord-demo-1', 'discord-demo-2', 'discord-demo-3')");
    await connection.execute("DELETE FROM user_exchange_profiles WHERE userId IN ('dashboard-admin', 'discord-demo-1', 'discord-demo-2', 'discord-demo-3')");

    for (const trade of demoTrades) {
      await connection.execute(
        `INSERT INTO trading_activities (
          id, userId, tradeType, fromToken, toToken, fromAmount, toAmount,
          entryPrice, exitPrice, exchangeFee, platformFee, profit, profitPercent,
          exchange, status, transactionHash, orderId, ipAddress, metadata, createdAt, completedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), DATE_SUB(NOW(), INTERVAL ? HOUR))`,
        [
          trade.id,
          trade.userId,
          trade.tradeType,
          trade.fromToken,
          trade.toToken,
          trade.fromAmount,
          trade.toAmount,
          trade.entryPrice,
          trade.exitPrice,
          trade.exchangeFee,
          trade.platformFee,
          trade.profit,
          trade.profitPercent,
          trade.exchange,
          trade.status,
          trade.transactionHash || null,
          trade.orderId,
          trade.ipAddress,
          JSON.stringify(trade.metadata),
          trade.createdHoursAgo,
          trade.createdHoursAgo,
        ]
      );
    }

    for (const snapshot of demoSnapshots) {
      await connection.execute(
        `INSERT INTO price_snapshots (token, price, change24h, change7d, change30d, marketCap, volume24h, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          snapshot.token,
          snapshot.price,
          snapshot.change24h,
          snapshot.change7d,
          snapshot.change30d,
          snapshot.marketCap,
          snapshot.volume24h,
        ]
      );
    }

    await connection.execute(
      `INSERT INTO user_exchange_profiles (userId, exchangeEnabled, tier, points, dailyVolumeLimit, maxTradeSize)
       VALUES
       ('dashboard-admin', true, 'VIP', 1500, 1000000, 250000),
       ('discord-demo-1', true, 'Silver', 300, 50000, 10000),
       ('discord-demo-2', true, 'Gold', 650, 250000, 50000),
       ('discord-demo-3', true, 'Bronze', 100, 10000, 2500)`
    );

    await connection.execute(
      `INSERT INTO user_exchange_balances (userId, asset, balance, holdBalance)
       VALUES
       ('dashboard-admin', 'BTC', 2.50000000, 0),
       ('dashboard-admin', 'ETH', 35.00000000, 0),
       ('dashboard-admin', 'SOL', 500.00000000, 0),
       ('dashboard-admin', 'USD', 100000.00000000, 0),
       ('discord-demo-1', 'BTC', 0.50000000, 0),
       ('discord-demo-1', 'USD', 15000.00000000, 0),
       ('discord-demo-2', 'ETH', 12.00000000, 0),
       ('discord-demo-2', 'USD', 25000.00000000, 0),
       ('discord-demo-3', 'SOL', 125.00000000, 0),
       ('discord-demo-3', 'USD', 5000.00000000, 0)`
    );

    console.log(`Seeded ${demoTrades.length} demo trades and ${demoSnapshots.length} price snapshots.`);
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Failed to seed trading demo data.', error);
  process.exitCode = 1;
});