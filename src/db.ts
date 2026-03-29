// MySQL database connection setup
import mysql from 'mysql2/promise';

function getDbEnv(name: 'HOST' | 'PORT' | 'USER' | 'PASS' | 'NAME') {
  return process.env[`DISCORD_GAME_DB_${name}`] ?? process.env[`DB_${name}`];
}

export async function getDbConnection() {
  const requiredVars = ['HOST', 'USER', 'NAME'] as const;
  const missingVars = requiredVars.filter((name) => !getDbEnv(name));

  if (missingVars.length > 0) {
    throw new Error(`Missing database environment variables: ${missingVars.map((name) => `DISCORD_GAME_DB_${name}`).join(', ')}`);
  }

  return mysql.createConnection({
    host: getDbEnv('HOST'),
    port: getDbEnv('PORT') ? Number(getDbEnv('PORT')) : 3306,
    user: getDbEnv('USER'),
    password: getDbEnv('PASS'),
    database: getDbEnv('NAME'),
  });
}
