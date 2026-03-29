CREATE DATABASE IF NOT EXISTS discord_game_server;

CREATE USER IF NOT EXISTS 'discord_bot'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON discord_game_server.* TO 'discord_bot'@'localhost';
FLUSH PRIVILEGES;