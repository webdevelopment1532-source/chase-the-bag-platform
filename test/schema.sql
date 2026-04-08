-- Production-grade offers table
CREATE TABLE IF NOT EXISTS offers (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  type VARCHAR(16) NOT NULL,
  btc_amount DECIMAL(32,8) NOT NULL,
  usd_amount DECIMAL(32,8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Production-grade trades table
CREATE TABLE IF NOT EXISTS trades (
  id VARCHAR(64) PRIMARY KEY,
  offer_id VARCHAR(64) NOT NULL,
  buyer_id VARCHAR(128) NOT NULL,
  seller_id VARCHAR(128) NOT NULL,
  btc_locked DECIMAL(32,8) NOT NULL,
  fee DECIMAL(32,8) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offer_id) REFERENCES offers(id)
);
-- SQL schema for chase-the-bag-platform test database

CREATE TABLE IF NOT EXISTS coin_wallets (
  user_id VARCHAR(128) PRIMARY KEY,
  available_balance DECIMAL(32,8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(32,8) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  direction VARCHAR(16) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  amount DECIMAL(32,8) NOT NULL,
  balance_after DECIMAL(32,8) NOT NULL,
  details TEXT,
  actor_user_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
