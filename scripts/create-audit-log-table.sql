-- SQL schema for append-only audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Enforce append-only: no UPDATE, no DELETE
-- (Application logic should never issue UPDATE/DELETE on this table)
-- Optionally, you can add a DB trigger to prevent UPDATE/DELETE:
-- DELIMITER //
-- CREATE TRIGGER prevent_audit_log_update BEFORE UPDATE ON audit_log
-- FOR EACH ROW BEGIN
--   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';
-- END;//
-- CREATE TRIGGER prevent_audit_log_delete BEFORE DELETE ON audit_log
-- FOR EACH ROW BEGIN
--   SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';
-- END;//
-- DELIMITER ;
