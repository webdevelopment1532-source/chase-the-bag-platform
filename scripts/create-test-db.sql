-- SQL to create a dedicated test database and user
CREATE DATABASE IF NOT EXISTS chase_the_bag_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated test user (adjust password as needed)
CREATE USER IF NOT EXISTS 'ctb_test'@'localhost' IDENTIFIED BY 'test_password';
GRANT ALL PRIVILEGES ON chase_the_bag_test.* TO 'ctb_test'@'localhost';
FLUSH PRIVILEGES;

-- You can run this script as root or a privileged MySQL user.
