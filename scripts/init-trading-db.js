/**
 * Database Schema Initialization Script
 * Creates all required tables for trading system, scraper management, and analytics
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_CONFIG = {
  host: process.env.DISCORD_GAME_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.DISCORD_GAME_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.DISCORD_GAME_DB_USER || process.env.DB_USER || 'root',
  password: process.env.DISCORD_GAME_DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DISCORD_GAME_DB_NAME || process.env.DB_NAME || 'chase_the_bag',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✓ Connected to database');

    console.log('\n📋 Creating tables...');

    // 1. Trading Activities Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trading_activities (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        tradeType ENUM('crypto_to_usdt', 'usdt_to_crypto', 'crypto_swap', 'mixing', 'staking', 'unstaking') NOT NULL,
        fromToken VARCHAR(20) NOT NULL,
        toToken VARCHAR(20) NOT NULL,
        fromAmount DECIMAL(20, 8) NOT NULL,
        toAmount DECIMAL(20, 8) NOT NULL,
        entryPrice DECIMAL(20, 8) NOT NULL,
        exitPrice DECIMAL(20, 8) NOT NULL,
        exchangeFee DECIMAL(18, 8) NOT NULL DEFAULT 0,
        platformFee DECIMAL(18, 8) NOT NULL DEFAULT 0,
        profit DECIMAL(20, 8) NOT NULL,
        profitPercent DECIMAL(10, 4) NOT NULL,
        exchange ENUM('binance', 'uniswap', 'stripe', 'paypal', 'internal', 'stake.us') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        transactionHash VARCHAR(255),
        orderId VARCHAR(100),
        ipAddress VARCHAR(45),
        metadata JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_exchange (exchange),
        INDEX idx_status (status),
        INDEX idx_createdAt (createdAt),
        INDEX idx_profit (profit)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created trading_activities table');

    // 2. Price Snapshots Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS price_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token VARCHAR(20) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        change24h DECIMAL(10, 4) NOT NULL DEFAULT 0,
        change7d DECIMAL(10, 4) NOT NULL DEFAULT 0,
        change30d DECIMAL(10, 4) NOT NULL DEFAULT 0,
        marketCap BIGINT,
        volume24h BIGINT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created price_snapshots table');

    // 3. Scrapers Configuration Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scrapers (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        \`interval\` INT NOT NULL DEFAULT 300000,
        \`timeout\` INT NOT NULL DEFAULT 10000,
        retryCount INT NOT NULL DEFAULT 3,
        retryDelay INT NOT NULL DEFAULT 5000,
        maxConcurrent INT NOT NULL DEFAULT 5,
        userAgent VARCHAR(255),
        allowedIPs JSON,
        rateLimit INT NOT NULL DEFAULT 60,
        targetUrl VARCHAR(1000),
        selector VARCHAR(500),
        metadata JSON,
        status ENUM('active', 'paused', 'error', 'disabled') DEFAULT 'active',
        lastRun TIMESTAMP,
        lastError TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created scrapers table');

    // 4. Scraper Metrics Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scraper_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        scraperId VARCHAR(100) NOT NULL UNIQUE,
        totalRuns INT DEFAULT 0,
        successfulRuns INT DEFAULT 0,
        failedRuns INT DEFAULT 0,
        averageRunTime DECIMAL(10, 3) DEFAULT 0,
        lastRunTime DECIMAL(10, 3),
        itemsCollected INT DEFAULT 0,
        dataSize BIGINT DEFAULT 0,
        errorRate DECIMAL(5, 2) DEFAULT 0,
        lastSuccessAt TIMESTAMP,
        lastFailureAt TIMESTAMP,
        consecutiveFailures INT DEFAULT 0,
        healthScore INT DEFAULT 100,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (scraperId) REFERENCES scrapers(id) ON DELETE CASCADE,
        INDEX idx_healthScore (healthScore),
        INDEX idx_lastSuccess (lastSuccessAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created scraper_metrics table');

    // 5. Scraper Logs Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scraper_logs (
        id VARCHAR(100) PRIMARY KEY,
        scraperId VARCHAR(100) NOT NULL,
        type ENUM('auto', 'manual', 'scheduled') DEFAULT 'auto',
        status ENUM('pending', 'running', 'success', 'failed', 'timeout') DEFAULT 'pending',
        itemsCollected INT DEFAULT 0,
        dataSize BIGINT DEFAULT 0,
        error TEXT,
        startedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMP,
        duration INT,
        metadata JSON,
        INDEX idx_scraperId (scraperId),
        INDEX idx_status (status),
        INDEX idx_startedAt (startedAt),
        FOREIGN KEY (scraperId) REFERENCES scrapers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created scraper_logs table');

    // 6. User Trading Preferences Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_trading_settings (
        userId VARCHAR(100) PRIMARY KEY,
        autoTradingEnabled BOOLEAN DEFAULT false,
        maxTradeSize DECIMAL(20, 8),
        preferredExchange ENUM('binance', 'uniswap', 'stripe', 'paypal') DEFAULT 'binance',
        allowMixing BOOLEAN DEFAULT true,
        mixingFeePercent DECIMAL(5, 2) DEFAULT 0.5,
        riskLevel ENUM('low', 'medium', 'high') DEFAULT 'medium',
        slippageTolerance DECIMAL(5, 2) DEFAULT 0.5,
        twoFactorAuthEnabled BOOLEAN DEFAULT false,
        apiKeysEncrypted JSON,
        webSocketNotificationsEnabled BOOLEAN DEFAULT true,
        emailNotificationsEnabled BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_autoTrading (autoTradingEnabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created user_trading_settings table');

    // 7. Trading Alerts Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trading_alerts (
        id VARCHAR(100) PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        alertType ENUM('price_change', 'trade_executed', 'profit_target', 'loss_limit', 'high_volume', 'scraper_error') NOT NULL,
        \`condition\` JSON NOT NULL,
        isActive BOOLEAN DEFAULT true,
        lastTriggeredAt TIMESTAMP,
        notificationChannels JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userId (userId),
        INDEX idx_alertType (alertType),
        INDEX idx_isActive (isActive)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created trading_alerts table');

    // 8. Trading Statistics (Daily/Weekly snapshots for fast queries)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS trading_statistics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(100) NOT NULL,
        period ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
        bucketDate DATE NOT NULL,
        totalTrades INT DEFAULT 0,
        successfulTrades INT DEFAULT 0,
        totalVolume DECIMAL(20, 8) DEFAULT 0,
        totalProfit DECIMAL(20, 8) DEFAULT 0,
        averageProfitPercent DECIMAL(10, 4) DEFAULT 0,
        winRate DECIMAL(5, 2) DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_period (userId, period, bucketDate),
        INDEX idx_userId (userId),
        INDEX idx_bucketDate (bucketDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created trading_statistics table');

    // 9. Platform Performance Index
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS platform_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        metricDate DATE NOT NULL UNIQUE,
        totalActiveUsers INT DEFAULT 0,
        totalTrades INT DEFAULT 0,
        totalVolume DECIMAL(20, 8) DEFAULT 0,
        totalProfit DECIMAL(20, 8) DEFAULT 0,
        averageTradeSize DECIMAL(20, 8) DEFAULT 0,
        healthScore INT DEFAULT 100,
        uptime DECIMAL(5, 2) DEFAULT 100,
        avgResponseTime INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_date (metricDate)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created platform_metrics table');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_exchange_profiles (
        userId VARCHAR(100) PRIMARY KEY,
        exchangeEnabled BOOLEAN DEFAULT true,
        tier ENUM('Bronze', 'Silver', 'Gold', 'VIP') NOT NULL DEFAULT 'Bronze',
        points INT NOT NULL DEFAULT 0,
        dailyVolumeLimit DECIMAL(20, 8) NOT NULL DEFAULT 10000,
        maxTradeSize DECIMAL(20, 8) NOT NULL DEFAULT 2500,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tier (tier),
        INDEX idx_enabled (exchangeEnabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created user_exchange_profiles table');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_exchange_balances (
        userId VARCHAR(100) NOT NULL,
        asset VARCHAR(20) NOT NULL,
        balance DECIMAL(24, 8) NOT NULL DEFAULT 0,
        holdBalance DECIMAL(24, 8) NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, asset),
        INDEX idx_asset (asset)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created user_exchange_balances table');

    console.log('\n✅ All tables created successfully!\n');

    // Insert sample scraper configurations
    console.log('📝 Inserting sample scraper configuration...');
    await connection.execute(`
      INSERT IGNORE INTO scrapers 
      (id, name, enabled, \`interval\`, \`timeout\`, retryCount, retryDelay, maxConcurrent, 
       userAgent, allowedIPs, rateLimit, targetUrl, selector, status)
      VALUES 
      ('scraper_main_bonus_codes', 'Main Bonus Code Scraper', true, 300000, 10000, 3, 5000, 5,
       'ChaseTheBagCrawler/1.0', '["127.0.0.1", "::1"]', 60, 'https://www.stake.us', 
       '.bonus-code-item', 'active'),
      ('scraper_secondary_promotions', 'Promotions Monitor', true, 600000, 15000, 2, 3000, 3,
       'ChaseTheBagCrawler/1.0', '["127.0.0.1", "::1"]', 30, 'https://www.stake.us/promotions', 
       '.promo-item', 'active')
    `);
    console.log('✓ Sample scraper configuration inserted');

    // Initialize metrics for sample scrapers
    await connection.execute(`
      INSERT IGNORE INTO scraper_metrics (scraperId, totalRuns, successfulRuns, failedRuns)
      VALUES 
      ('scraper_main_bonus_codes', 0, 0, 0),
      ('scraper_secondary_promotions', 0, 0, 0)
    `);
    console.log('✓ Scraper metrics initialized');

    // 12. User Check-ins Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_checkins (
        userId VARCHAR(100) PRIMARY KEY,
        currentStreak INT NOT NULL DEFAULT 0,
        longestStreak INT NOT NULL DEFAULT 0,
        lastCheckin DATE,
        totalCheckins INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created user_checkins table');

    // 13. User Achievements Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        userId VARCHAR(100) NOT NULL,
        achievementId VARCHAR(100) NOT NULL,
        earnedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (userId, achievementId),
        INDEX idx_userId (userId),
        INDEX idx_earnedAt (earnedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ Created user_achievements table');

    await connection.execute(`
      INSERT IGNORE INTO user_exchange_profiles
      (userId, exchangeEnabled, tier, points, dailyVolumeLimit, maxTradeSize)
      VALUES
      ('dashboard-admin', true, 'VIP', 1500, 1000000, 250000),
      ('discord-demo-1', true, 'Silver', 300, 50000, 10000),
      ('discord-demo-2', true, 'Gold', 650, 250000, 50000),
      ('discord-demo-3', true, 'Bronze', 100, 10000, 2500)
    `);
    console.log('✓ Exchange profiles initialized');

    await connection.execute(`
      INSERT IGNORE INTO user_exchange_balances (userId, asset, balance, holdBalance)
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
      ('discord-demo-3', 'USD', 5000.00000000, 0)
    `);
    console.log('✓ Exchange balances initialized');

    console.log('\n🎉 Database initialization complete!\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

// Run initialization
initializeDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
