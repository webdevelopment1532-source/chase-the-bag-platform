CREATE TABLE IF NOT EXISTS affiliates (
  user_id VARCHAR(20) NOT NULL PRIMARY KEY,
  status ENUM('pending', 'active', 'removed') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL DEFAULT NULL,
  approved_by VARCHAR(20) NULL DEFAULT NULL
);
