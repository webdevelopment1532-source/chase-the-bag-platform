CREATE TABLE IF NOT EXISTS coin_wallets (
  user_id VARCHAR(64) NOT NULL PRIMARY KEY,
  available_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coin_exchange_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_user_id VARCHAR(64) NOT NULL,
  recipient_user_id VARCHAR(64) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  status ENUM('open', 'accepted', 'cancelled') NOT NULL DEFAULT 'open',
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL DEFAULT NULL,
  cancelled_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_coin_exchange_offers_status_created (status, created_at),
  INDEX idx_coin_exchange_offers_sender (sender_user_id),
  INDEX idx_coin_exchange_offers_recipient (recipient_user_id)
);

CREATE TABLE IF NOT EXISTS coin_exchange_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  counterparty_user_id VARCHAR(64) NULL,
  direction ENUM('credit', 'debit') NOT NULL,
  kind ENUM('grant', 'transfer', 'offer_lock', 'offer_accept', 'offer_cancel') NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  balance_after DECIMAL(18,2) NOT NULL,
  offer_id INT NULL,
  details VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coin_exchange_transactions_user_created (user_id, created_at),
  INDEX idx_coin_exchange_transactions_offer (offer_id)
);

ALTER TABLE coin_wallets
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL;

ALTER TABLE coin_exchange_offers
  MODIFY COLUMN sender_user_id VARCHAR(64) NOT NULL,
  MODIFY COLUMN recipient_user_id VARCHAR(64) NOT NULL;

ALTER TABLE coin_exchange_transactions
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL,
  MODIFY COLUMN counterparty_user_id VARCHAR(64) NULL;

CREATE TABLE IF NOT EXISTS coin_exchange_allowlist (
  server_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  added_by_user_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (server_id, user_id),
  INDEX idx_coin_exchange_allowlist_server_created (server_id, created_at)
);